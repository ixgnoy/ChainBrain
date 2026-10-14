// Live: the agent's decisions, the pocket's balance and rules, and what each seller sees, side by side
// (spec "Demo layout": chat with trace on the left, the active pocket on the right).
import { useMemo } from "react";
import { ShieldAlert, Bot, Store, Link2 } from "lucide-react";
import { useNetwork } from "./useNetwork";
import { Reason, TxHash, Verdict, clock, pocketStatus, pocketTag, usd, NEVER } from "./parts";
import { txLabel } from "./network";
import { traceRows, untrustedOf, type TraceRow } from "../lib/trace";
import { samePocket, type WalletEvent } from "../lib/events";

const forPocket = (evs: WalletEvent[], p?: string) => evs.filter((e) => samePocket(e.pocket, p));
import { salesFor } from "../seller/data";
import { Avatar, Card, Empty, Pill } from "../seller/ui";
import { cleanText } from "../lib/sanitize";
import { shortAddr } from "../shared";
import { cn } from "../lib/cn";

const I = { strokeWidth: 1.75 } as const;

function Column({ title, icon, sub, children, className }: { title: string; icon: React.ReactNode; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("flex min-h-0 flex-col overflow-hidden", className)}>
      <header className="flex items-center gap-3 px-5 pb-3 pt-5"><span className="grid size-9 place-items-center rounded-full bg-accent-soft text-accent [&_svg]:size-[18px]">{icon}</span><div><h2 className="text-[17px] font-semibold leading-6">{title}</h2>{sub && <p className="text-[13px] text-muted">{sub}</p>}</div></header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
    </Card>
  );
}

function TraceItem({ r }: { r: TraceRow }) {
  const untrusted = r.result ? untrustedOf({ type: "trace", phase: "tool_result", at: r.at, result: r.result }) : untrustedOf(r.event);
  const isText = r.label === "reply" || r.label === "thinking";
  return (
    <li className="fade-up border-b border-line py-3.5 last:border-0">
      <div className="flex items-center gap-2">
        <span className="num w-[62px] shrink-0 text-[12px] text-muted">{clock(r.at)}</span>
        <span className={cn("text-[14px] font-semibold", isText ? "text-ink2" : "text-ink")}>{r.label === "reply" ? "Agent" : r.label}</span>
        <span className="text-[12px] text-faint">{r.actor}</span>
        <span className="ml-auto"><Verdict kind={r.kind}>{r.running ? "Working" : r.verdict}</Verdict></span>
      </div>
      <p className={cn("mt-1 break-words pl-[70px] text-[14px] leading-5", isText ? "text-ink" : "text-ink2")}>{cleanText(r.title, 400)}</p>
      {r.reasons.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5 pl-[70px]">{r.reasons.map((c) => <Reason key={c} code={c} />)}</div>}
      {untrusted && (
        <div className={cn("ml-[70px] mt-2 rounded-[12px] px-3.5 py-2.5 text-[13px] leading-5", untrusted.injection ? "bg-negative-soft text-ink" : "bg-fill text-ink2")}>
          <div className={cn("mb-1 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.06em]", untrusted.injection ? "text-negative" : "text-muted")}>{untrusted.injection && <ShieldAlert className="size-3.5" {...I} />}{untrusted.injection ? "Instruction-like text from a seller · treated as data, not obeyed" : `Seller content${untrusted.source ? ` · ${untrusted.source}` : ""} · treated as data`}</div>
          <p className="line-clamp-4 whitespace-pre-wrap break-words">{untrusted.text}</p>
        </div>
      )}
      {r.tx && <div className="mt-1.5 pl-[70px]"><TxHash hash={r.tx} /></div>}
    </li>
  );
}

export function Live({ pocket }: { pocket?: string }) {
  const { events, pockets, txs, cfg } = useNetwork();
  const p = pockets.find((x) => samePocket(x.address, pocket));
  const rows = useMemo(() => traceRows(forPocket(events, pocket)).filter((r) => r.label !== "thinking").reverse(), [events, pocket]);
  const names = new Map(cfg.sellers.map((s) => [s.id, s.name]));
  const history = useMemo(() => {
    const chain = txs.filter((t) => samePocket(t.pocket, pocket)).map((t) => ({ key: `${t.hash}-${t.kind}-${t.logIndex}`, label: txLabel(t), amount: t.amount, hash: t.hash, bad: false }));
    const forced = events.filter((e) => e.type === "forced" && samePocket(e.pocket, pocket)).map((e) => ({ key: `f-${e.tx}`, label: e.reverted ? "Forced transfer · reverted" : "Forced transfer · settled", amount: BigInt(e.amount ?? 0), hash: e.tx as string, bad: !e.reverted }));
    return [...chain, ...forced].reverse();
  }, [txs, events, pocket]);
  const perSeller = useMemo(() => cfg.sellers.map((s) => ({ s, rows: salesFor(forPocket(events, pocket), s.id) })).filter((x) => x.rows.length), [cfg, events, pocket]);

  if (!pocket) return <Card><Empty>No pocket on the network yet. Create one in the phone app.</Empty></Card>;
  const st = p ? pocketStatus(p) : undefined;
  const allowed = p ? p.allowed.map((id) => names.get(id) ?? id) : [];

  return (
    <div className="grid gap-3 xl:h-[calc(100dvh-230px)] xl:grid-cols-[1.35fr_1fr_0.95fr]">
      <Column title="Agent" sub="Every tool call, its result and the rule it hit" icon={<Bot {...I} />} className="xl:min-h-0">
        {rows.length ? <ol aria-label="Agent trace">{rows.map((r) => <TraceItem key={r.key} r={r} />)}</ol> : <Empty>No agent activity in this pocket yet. Ask the agent from the phone app.</Empty>}
      </Column>

      <Column title={pocketTag(pocket)} sub={p ? `Owner ${shortAddr(p.owner)} · agent ${shortAddr(p.agent)}` : "Reading the contract…"} icon={<Link2 {...I} />}>
        {p && (
          <>
            <div className="py-3 text-center">
              <div className="text-[14px] text-muted">Balance (the agent's whole budget)</div>
              <div className="num mt-1 text-[44px] font-bold leading-[48px] tracking-[-0.02em]" data-testid="pocket-balance">{usd(p.balance)}</div>
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">{st && <Verdict kind={st.kind}>{st.label}</Verdict>}<Pill>Cap {usd(p.cap)}</Pill><Pill>{p.askAbove === NEVER ? "Never asks" : p.askAbove === 0n ? "Asks every time" : `Asks above ${usd(p.askAbove)}`}</Pill><Pill tone="neutral">Ends {new Date(p.expiresAt * 1000).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</Pill></div>
            </div>
            <p className="mt-2 rounded-[14px] bg-fill px-4 py-3 text-[14px] leading-5 text-ink2"><span className="font-semibold text-ink">Worst case:</span> if the agent is hijacked, it can lose at most {usd(p.balance)}, and only to {allowed.join(" or ") || "nobody"}.</p>
            <h3 className="mb-2 mt-5 text-[14px] font-semibold text-muted">Allowed sellers</h3>
            <div className="flex flex-wrap gap-1.5">{cfg.sellers.map((s) => <Pill key={s.id} tone={p.allowed.includes(s.id) ? "accent" : "neutral"} className={p.allowed.includes(s.id) ? "" : "text-faint line-through"}>{s.name}</Pill>)}</div>
          </>
        )}
        <h3 className="mb-1 mt-5 text-[14px] font-semibold text-muted">On-chain</h3>
        {history.length ? (
          <ul>{history.map((h) => (
            <li key={h.key} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
              <span className={cn("min-w-0 truncate text-[14px] font-medium", h.bad ? "text-negative" : "text-ink")}>{h.label}</span>
              {h.amount != null && h.amount > 0n && <span className="num shrink-0 text-[14px] text-ink2">{usd(h.amount)}</span>}
              <span className="ml-auto shrink-0"><TxHash hash={h.hash} /></span>
            </li>
          ))}</ul>
        ) : <p className="py-3 text-[14px] text-muted">Reading the chain…</p>}
      </Column>

      <Column title="Sellers" sub="What each shop sees from this pocket" icon={<Store {...I} />}>
        {perSeller.length ? perSeller.map(({ s, rows: rs }) => (
          <section key={s.id} className="border-b border-line py-3 last:border-0">
            <div className="flex items-center gap-3"><Avatar tone="lilac" size={36}>{s.name[0]}</Avatar><div className="font-semibold">{s.name}</div><span className="num ml-auto text-[14px] font-semibold text-positive">+{usd(rs.filter((r) => r.outcome === "paid").reduce((n, r) => n + (r.amount ?? 0n), 0n))}</span></div>
            <ul className="mt-2 space-y-1.5 pl-12">{rs.map((r) => (
              <li key={r.key} className="text-[13px] leading-5">
                {r.outcome === "paid" ? <span className="text-ink2">Paid {usd(r.amount)}{r.cosigned ? " · owner co-signed" : ""}</span> : <span className="text-negative">Refused: {r.why}</span>}
                <span className="text-muted"> · {clock(r.at)}</span>
              </li>
            ))}</ul>
          </section>
        )) : <Empty>No seller has been paid or refused from this pocket yet.</Empty>}
      </Column>
    </div>
  );
}
