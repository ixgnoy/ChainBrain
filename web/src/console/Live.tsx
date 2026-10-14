// Live: the agent's decisions, the pocket's balance and rules, and what each seller sees, side by side
// (spec "Demo layout": chat with trace on the left, the active pocket on the right).
// Every column is keyed on the ONE pocket passed in, so a render never mixes one pocket's trace with another's balance.
import { useMemo } from "react";
import { ShieldAlert, Bot, Store, Link2 } from "lucide-react";
import { useNetwork } from "./useNetwork";
import { Expected, PhoneTag, Reason, TxHash, Verdict, clock, pocketStatus, usd, NEVER } from "./parts";
import { argsOf, evidenceOf, injectionOf, plainSummary, type Injection } from "./story";
import { txLabel } from "./network";
import { orList, worstCase } from "./worst";
import { traceRows, untrustedOf, type TraceRow } from "../lib/trace";
import { eventPocket, samePocket, type WalletEvent } from "../lib/events";
import { salesFor } from "../seller/data";
import { Avatar, Card, Empty, Pill } from "../seller/ui";
import { cleanText } from "../lib/sanitize";
import { shortAddr } from "../shared";
import { cn } from "../lib/cn";

const forPocket = (evs: WalletEvent[], p?: string) => evs.filter((e) => samePocket(eventPocket(e), p));
const I = { strokeWidth: 1.75 } as const;

/** Newest first: identical consecutive refusals (same reason, same seller) collapse into one row with a count. */
function dedupe(rows: ReturnType<typeof salesFor>) {
  const out: { r: (typeof rows)[number]; n: number }[] = [];
  for (const r of rows) {
    const prev = out.at(-1);
    if (prev && r.outcome === "refused" && prev.r.outcome === "refused" && prev.r.reasons.join() === r.reasons.join() && prev.r.why === r.why) prev.n++;
    else out.push({ r, n: 1 });
  }
  return out;
}

function Column({ title, icon, sub, children, className }: { title: React.ReactNode; icon: React.ReactNode; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("flex min-h-0 flex-col overflow-hidden", className)}>
      <header className="flex items-center gap-3 px-5 pb-3 pt-5"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent [&_svg]:size-[18px]">{icon}</span><div className="min-w-0"><h2 className="text-[17px] font-semibold leading-6">{title}</h2>{sub && <p className="text-[13px] text-muted">{sub}</p>}</div></header>
      <div className="live-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-8">{children}</div>
    </Card>
  );
}

/** The agent read an order inside a seller's free content and did not act on it (scene 5). */
function InjectionRow({ inj, at, name }: { inj: Injection; at: number; name: string }) {
  return (
    <li data-testid="injection-row" className="border-b border-line py-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="num w-[62px] shrink-0 text-[12px] text-muted">{clock(at)}</span>
        <ShieldAlert className="size-4 shrink-0 text-warning" {...I} />
        <span className="text-[14px] font-semibold">{name} tried to give the agent an order</span>
        <span className="ml-auto flex items-center gap-1.5"><Expected /><Verdict kind="stepup">INJECTION IGNORED</Verdict></span>
      </div>
      {inj.lines.slice(0, 2).map((l, i) => <p key={i} className="t-body mt-2 ml-[70px] border-l-2 border-warning pl-3 text-[14px] italic leading-5 text-ink2 [overflow-wrap:anywhere]">“{l}”</p>)}
      <p className="mt-1.5 pl-[70px] text-[13px] text-muted">Seller text is read as data, never as instructions. Nothing was sent.</p>
    </li>
  );
}

function TraceItem({ r, present, inj }: { r: TraceRow; present?: boolean; inj?: boolean }) {
  const untrusted = r.result ? untrustedOf({ type: "trace", phase: "tool_result", at: r.at, result: r.result }) : untrustedOf(r.event);
  const isText = r.label === "reply" || r.label === "thinking";
  const tool = r.event.type === "trace" && !isText;
  const quiet = !!present && tool; // presenter mode: raw tool calls fade back, the plain outcome stays
  const name = r.label === "reply" ? "Agent" : r.label;
  const fresh = Date.now() - r.at < 1500; // only a row that just arrived slides in (a re-render must never replay it half-faded)
  const expected = r.kind === "refused" && (r.reasons.length > 0 || r.event.type === "refusal" || r.event.type === "disclosure") || (r.event.type === "forced" && !!r.event.reverted);
  const args = tool ? argsOf(r.title) : "";
  const summary = tool ? plainSummary(r.title) : "";
  return (
    <li className={cn("border-b border-line last:border-0", quiet ? "py-2.5" : "py-3.5", fresh && "fade-up")}>
      <div className="flex items-center gap-2">
        <span className="num w-[62px] shrink-0 text-[12px] text-muted">{clock(r.at)}</span>
        <span className={cn("font-semibold", !quiet && "t-name", quiet ? "text-[13px] text-ink2" : "text-[14px]", isText ? "text-ink2" : quiet ? "" : "text-ink")}>{name}</span>
        {r.actor !== name && <span className="text-[12px] text-muted">{r.actor}</span>}
        <span className="ml-auto flex items-center gap-1.5">{expected && <Expected />}<Verdict kind={r.kind}>{r.running ? "Working" : r.verdict}</Verdict></span>
      </div>
      {quiet ? (
        <>
          <p className="mt-0.5 break-words pl-[70px] text-[14px] leading-5 text-muted">{r.running ? "Working…" : cleanText(summary || r.title, 400)}</p>
          {args && <details className="pl-[70px] text-[12px] text-muted"><summary className="inline-block cursor-pointer">Call details</summary><p className="num mt-0.5 break-words">{name}({args})</p></details>}
        </>
      ) : (
        <p className={cn("t-body mt-1 break-words pl-[70px] text-[14px] leading-5", isText ? "text-ink" : "text-ink2")}>{cleanText(r.title, 400)}</p>
      )}
      {r.reasons.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5 pl-[70px]">{r.reasons.map((c) => <Reason key={c} code={c} />)}</div>}
      {untrusted && !inj && (
        <div className={cn("ml-[70px] mt-2 rounded-[12px] px-3.5 py-2.5 text-[13px] leading-5", untrusted.injection ? "bg-negative-soft text-ink" : "bg-fill text-ink2")}>
          <div className={cn("mb-1 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.06em]", untrusted.injection ? "text-negative" : "text-muted")}>{untrusted.injection && <ShieldAlert className="size-3.5" {...I} />}{untrusted.injection ? "Instruction-like text from a seller · treated as data, not obeyed" : `Seller content${untrusted.source ? ` · ${untrusted.source}` : ""} · treated as data`}</div>
          <p className="line-clamp-4 whitespace-pre-wrap break-words">{untrusted.text}</p>
        </div>
      )}
      {r.tx && <div className="mt-1.5 pl-[70px]"><TxHash hash={r.tx} /></div>}
    </li>
  );
}

/** "Can lose at most US$X, only to A or B", with a bar that shrinks only when money leaves. */
function WorstCase({ w, refused, ignored }: { w: ReturnType<typeof worstCase>; refused: number; ignored: number }) {
  return (
    <div data-testid="worst-case" className="mt-2 rounded-[14px] bg-fill px-4 py-3.5">
      <p className="t-body text-[14px] leading-5 text-ink2">
        <span className="font-semibold text-ink">Worst case · </span>
        {w.stopped ? <b className="font-semibold text-ink" data-testid="worst-max">Stopped: the agent can't spend.</b> : <>if the agent is hijacked, it can lose at most <b className="num font-semibold text-ink" data-testid="worst-max">{usd(w.max)}</b>, only to {orList(w.to)}.</>}
      </p>
      <div role="meter" aria-label="Share of the funding still at risk" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(w.share * 100)} className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
        <div data-testid="worst-bar" className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out" style={{ width: `${Math.round(w.share * 1000) / 10}%` }} />
      </div>
      <div className="num mt-1.5 flex flex-wrap justify-between gap-x-3 text-[12px] text-muted">
        <span>{w.stopped ? (w.fundedKnown ? `${usd(w.funded)} was funded in total` : "Stopped") : `${usd(w.max)} of ${usd(w.funded)} funded`}</span>
        {(refused > 0 || ignored > 0) && <span>{[refused > 0 && `${refused} refused`, ignored > 0 && `${ignored} injected ${ignored === 1 ? "order" : "orders"} ignored`].filter(Boolean).join(", ")}, nothing moved</span>}
      </div>
    </div>
  );
}

/** Judge evidence at a glance: the last transaction and the verdicts, always above the fold of the middle column. */
function EvidenceStrip({ ev }: { ev: ReturnType<typeof evidenceOf> }) {
  const items: { k: string; label: string; tx?: string; tone: "accent" | "warning" | "neutral" }[] = [
    ...(ev.paid ? [{ k: "paid", label: `${ev.paid} paid${ev.cosigned ? `, ${ev.cosigned} co-signed` : ""}`, tx: ev.lastPaidTx, tone: "accent" as const }] : []),
    ...(ev.refused ? [{ k: "refused", label: `${ev.refused} refused`, tone: "neutral" as const }] : []),
    ...(ev.injections ? [{ k: "inj", label: `${ev.injections} injection${ev.injections > 1 ? "s" : ""} ignored`, tone: "warning" as const }] : []),
    ...(ev.blocked ? [{ k: "blocked", label: `${ev.blocked} transfer${ev.blocked > 1 ? "s" : ""} reverted`, tx: ev.lastBlockedTx, tone: "accent" as const }] : []),
  ];
  if (!items.length) return null;
  return (
    <div data-testid="evidence" className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
      {items.map((i) => <span key={i.k} className="inline-flex items-center gap-2"><Pill tone={i.tone}>{i.label}</Pill>{i.tx && <TxHash hash={i.tx} />}</span>)}
    </div>
  );
}

export function Live({ pocket, present }: { pocket?: string; present?: boolean }) {
  const { events, pockets, txs, cfg, nameOf, isPhone } = useNetwork();
  const p = pockets.find((x) => samePocket(x.address, pocket));
  const mine = useMemo(() => forPocket(events, pocket), [events, pocket]);
  const rows = useMemo(() => traceRows(mine).filter((r) => r.label !== "thinking").reverse(), [mine]);
  const names = new Map(cfg.sellers.map((s) => [s.id, s.name]));
  const history = useMemo(() => {
    const chain = txs.filter((t) => samePocket(t.pocket, pocket)).map((t) => ({ key: `${t.hash}-${t.kind}-${t.logIndex}`, label: txLabel(t), amount: t.amount, hash: t.hash, bad: false }));
    const forced = mine.filter((e) => e.type === "forced").map((e) => ({ key: `f-${e.tx}`, label: e.reverted ? "Blocked transfer" : "Forced transfer settled", amount: BigInt(e.amount ?? 0), hash: e.tx as string, bad: !e.reverted }));
    return [...chain, ...forced].reverse();
  }, [txs, mine, pocket]);
  const perSeller = useMemo(() => cfg.sellers.map((s) => ({ s, rows: salesFor(mine, s.id) })).filter((x) => x.rows.length), [cfg, mine]);
  const worst = useMemo(() => (p ? worstCase(p, txs, (id) => names.get(id) ?? id) : undefined), [p, txs, cfg]); // eslint-disable-line react-hooks/exhaustive-deps
  const ev = useMemo(() => evidenceOf(mine), [mine]);
  const refused = mine.filter((e) => e.type === "refusal" || e.type === "disclosure" || (e.type === "forced" && e.reverted)).length;

  if (!pocket) return <Card><Empty>No pocket on the network yet. Create one in the phone app.</Empty></Card>;
  const st = p ? pocketStatus(p) : undefined;

  return (
    <div data-present={present ? "true" : undefined} className={cn("grid gap-3 xl:grid-cols-[1.35fr_1fr_0.95fr]", present ? "xl:h-[calc(100dvh-var(--stepper-h,150px)-170px)]" : "xl:h-[calc(100dvh-210px)]")}>
      <Column title="Agent" sub="Every tool call, its result and the rule it hit" icon={<Bot {...I} />} className="max-xl:max-h-[70dvh] xl:min-h-0">
        {rows.length ? <ol aria-label="Agent trace">{rows.flatMap((r) => {
          const inj = r.label === "get_quote" && r.result ? injectionOf(r.result, r.event.args) : null;
          return [...(inj ? [<InjectionRow key={`${r.key}-inj`} inj={inj} at={r.doneAt ?? r.at} name={names.get(inj.sellerId) ?? inj.sellerId} />] : []), <TraceItem key={r.key} r={r} present={present} inj={!!inj} />];
        })}</ol> : <Empty>No agent activity in this pocket yet. Ask the agent from the phone app.</Empty>}
      </Column>

      <Column title={<>{nameOf(pocket)}{isPhone(pocket) && <PhoneTag />}</>} sub={p ? `Owner ${shortAddr(p.owner)} · agent ${shortAddr(p.agent)}` : "Reading the contract…"} icon={<Link2 {...I} />} className="max-xl:max-h-[70dvh]">
        {p && worst && (
          <>
            <div className="py-3 text-center">
              <div className="text-[14px] text-muted">{worst.stopped ? "Held in a stopped pocket" : "Balance (the agent's whole budget)"}</div>
              <div className={cn("num mt-1 font-bold tracking-[-0.02em]", worst.stopped ? "text-[40px] leading-[48px] text-muted" : "text-[44px] leading-[48px]")} data-testid="pocket-balance" data-stopped={worst.stopped ? "true" : undefined}>{usd(p.balance)}{worst.stopped && p.balance > 0n && <span className="ml-2 text-[18px] font-semibold tracking-normal"> to return</span>}</div>
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">{st && <Verdict kind={st.kind}>{st.label}</Verdict>}<Pill>Cap {usd(p.cap)}</Pill><Pill>{p.askAbove === NEVER ? "Never asks" : p.askAbove === 0n ? "Asks every time" : `Asks above ${usd(p.askAbove)}`}</Pill><Pill tone="neutral">Ends {new Date(p.expiresAt * 1000).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</Pill></div>
            </div>
            <WorstCase w={worst} refused={refused} ignored={ev.injections} />
            <EvidenceStrip ev={ev} />
            <h3 className="mb-2 mt-5 text-[14px] font-semibold text-muted">Allowed sellers</h3>
            <div className="flex flex-wrap gap-1.5">{cfg.sellers.map((s) => <Pill key={s.id} tone={p.allowed.includes(s.id) ? "accent" : "neutral"} className={p.allowed.includes(s.id) ? "" : "text-muted line-through"}>{s.name}</Pill>)}</div>
          </>
        )}
        <h3 className="mb-1 mt-5 text-[14px] font-semibold text-muted">On-chain</h3>
        {history.length ? (
          <ul>{history.map((h) => (
            <li key={h.key} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border-b border-line py-2.5 last:border-0">
              <span className={cn("t-body min-w-0 flex-1 break-words text-[14px] font-medium", h.bad ? "text-negative" : "text-ink")}>{h.label}{h.label === "Blocked transfer" && <> <Expected className="align-middle" /></>}</span>
              {h.amount != null && h.amount > 0n && <span className="num shrink-0 text-[14px] text-ink2">{usd(h.amount)}</span>}
              <span className="shrink-0"><TxHash hash={h.hash} /></span>
            </li>
          ))}</ul>
        ) : <p className="py-3 text-[14px] text-muted">Nothing on-chain for this pocket yet.</p>}
      </Column>

      <Column title="Sellers" sub="What each shop sees from this pocket" icon={<Store {...I} />} className="max-xl:max-h-[70dvh]">
        {perSeller.length ? perSeller.map(({ s, rows: rs }) => {
          const got = rs.filter((r) => r.outcome === "paid").reduce((n, r) => n + (r.amount ?? 0n), 0n);
          return (
            <section key={s.id} className="border-b border-line py-3 last:border-0">
              <div className="flex items-center gap-3"><Avatar tone="lilac" size={36}>{s.name[0]}</Avatar><div className="font-semibold">{s.name}</div>{got > 0n ? <span className="num ml-auto text-[14px] font-semibold text-positive">+{usd(got)}</span> : <span className="ml-auto text-[13px] text-muted">Nothing paid</span>}</div>
              <ul className="mt-2 space-y-2 pl-12">{dedupe(rs).map(({ r, n }) => (
                <li key={r.key} className="t-body text-[13px] leading-5">
                  {r.outcome === "paid" ? <span className="text-ink2">Paid {usd(r.amount)}{r.cosigned ? " · owner co-signed" : ""}</span> : (
                    <>
                      <span className="inline-flex flex-wrap items-center gap-1.5"><Verdict kind="refused">Refused</Verdict>{r.reasons[0] && <span className="rounded-full bg-negative-soft px-2 py-0.5 text-[11px] font-semibold text-negative">{r.reasons[0]}</span>}<Expected />{n > 1 && <span className="num text-[12px] font-semibold text-ink2">×{n}</span>}</span>
                      <span className="mt-0.5 block text-muted">{r.why}</span>
                    </>
                  )}
                  <span className="text-muted">{r.outcome === "paid" ? " · " : ""}{r.outcome === "paid" ? clock(r.at) : <span className="num text-[12px]">{clock(r.at)}</span>}</span>
                </li>
              ))}</ul>
            </section>
          );
        }) : <Empty>No seller has been paid or refused from this pocket yet.</Empty>}
      </Column>
    </div>
  );
}
