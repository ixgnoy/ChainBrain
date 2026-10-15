// Live: the agent's decisions, the pocket's balance and rules, and what each seller sees, side by side
// (spec "Demo layout": chat with trace on the left, the active pocket on the right).
// Every column is keyed on the ONE pocket passed in, so a render never mixes one pocket's trace with another's balance.
import { useEffect, useMemo, useRef, useState } from "react";
import { ShieldAlert, ShieldCheck, Check, Minus, Wallet, Clock } from "lucide-react";
import { useNetwork } from "./useNetwork";
import { Expected, PhoneTag, Reason, TxHash, Verdict, clock, pocketStatus, usd, NEVER } from "./parts";
import { argsOf, evidenceOf, injectionOf, plainSummary, type Injection } from "./story";
import { txLabel } from "./network";
import { orList, worstCase, worstSegments } from "./worst";
import { decisionsOf, durationLabel, groupTurns, holdKeys, offsetLabel, waiting, type DecisionKind, type Turn } from "./liveRules";
import { Disclosure, EmptyState, SegmentBar, Tracker } from "./kit";
import { traceRows, untrustedOf, type TraceRow } from "../lib/trace";
import { eventPocket, samePocket, type WalletEvent } from "../lib/events";
import { salesFor } from "../seller/data";
import { Button, Card } from "../seller/ui";
import { attemptsFrom } from "@sim/checks";
import { ChecksPanel } from "./ChecksPath";
import { Scorecard } from "./Scorecard";
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

/** A column card: a plain heading row (title left, small figures or a control right), then its body. */
function Column({ title, meta, right, children, className, bodyClass, bodyRef, onBodyScroll, bodyEvents }: {
  title: React.ReactNode; meta?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string; bodyClass?: string;
  bodyRef?: React.Ref<HTMLDivElement>; onBodyScroll?: React.UIEventHandler<HTMLDivElement>; bodyEvents?: React.HTMLAttributes<HTMLDivElement>;
}) {
  return (
    <Card className={cn("flex min-h-0 flex-col overflow-hidden", className)}>
      <header className="flex min-h-12 items-center justify-between gap-3 border-b border-line px-4 sm:px-5">
        <h2 className="flex min-w-0 items-center truncate text-[15px] font-semibold leading-5">{title}</h2>
        <div className="flex shrink-0 items-center gap-3 text-[12px] leading-4 text-muted">{meta}{right}</div>
      </header>
      <div ref={bodyRef} onScroll={onBodyScroll} {...bodyEvents} className={cn("min-h-0 flex-1 px-4 sm:px-5", bodyClass)}>{children}</div>
    </Card>
  );
}

/** The agent read an order inside a seller's free content and did not act on it (scene 5). */
function InjectionRow({ inj, at, name, turnAt }: { inj: Injection; at: number; name: string; turnAt: number }) {
  return (
    <li data-testid="injection-row" className="grid grid-cols-[1fr_auto] gap-x-3 border-b border-line py-3 sm:grid-cols-[56px_1fr_auto]">
      <span className="num hidden pt-0.5 text-[12px] text-muted sm:block">{offsetLabel(at - turnAt)}</span>
      <div className="min-w-0">
        <div className="flex items-center gap-2"><ShieldAlert className="size-4 shrink-0 text-warning" {...I} /><span className="t-name text-[14px] font-medium leading-5">{name} tried to give the agent an order</span></div>
        {inj.lines.slice(0, 2).map((l, i) => <p key={i} className="t-body mt-1.5 border-l-2 border-warning pl-3 text-[14px] italic leading-5 text-ink2 [overflow-wrap:anywhere]">“{l}”</p>)}
        <p className="mt-1.5 text-[12px] leading-4 text-muted">Seller text is read as data, never as instructions. Nothing was sent.</p>
      </div>
      <div className="pt-0.5"><Verdict kind="stepup">INJECTION IGNORED</Verdict></div>
    </li>
  );
}

/** Tool arguments and the raw result behind one disclosure: Pretty (key and value) or JSON. Text is cleaned, never HTML. */
function CallDetails({ r }: { r: TraceRow }) {
  const [mode, setMode] = useState<"pretty" | "json">("pretty");
  const args = r.event.args && typeof r.event.args === "object" ? (r.event.args as Record<string, unknown>) : {};
  const pairs = (o: Record<string, unknown>) => Object.entries(o).filter(([, v]) => typeof v !== "object" || v === null).slice(0, 8).map(([k, v]) => [k, cleanText(v, 120)] as const);
  const json = JSON.stringify({ call: { tool: r.label, args }, result: r.result }, (_k, v) => (typeof v === "string" ? cleanText(v, 400) : v), 2)?.slice(0, 4000) ?? "";
  const seg = (m: "pretty" | "json", label: string) => <button type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={cn("h-7 rounded-full px-3 text-[12px] font-semibold", mode === m ? "bg-ink text-on-accent" : "bg-fill text-ink2 hover:bg-line")}>{label}</button>;
  return (
    <Disclosure summary="Call" className="mt-1">
      <div className="rounded-[12px] bg-canvas p-3">
        <div className="mb-2 flex gap-1.5">{seg("pretty", "Pretty")}{seg("json", "JSON")}</div>
        {mode === "json" ? <pre className="num max-h-56 overflow-auto whitespace-pre-wrap break-words text-[12px] leading-4 text-ink2">{json}</pre> : (
          <dl className="grid grid-cols-[88px_1fr] gap-x-3 gap-y-1 text-[12px] leading-4">
            <dt className="text-muted">Call</dt><dd className="num break-words font-medium">{r.label}</dd>
            {pairs(args).map(([k, v]) => <div key={`a-${k}`} className="col-span-2 grid grid-cols-subgrid"><dt className="text-muted">{k}</dt><dd className="num break-words">{v}</dd></div>)}
            {r.result && typeof r.result === "object" && pairs(r.result).map(([k, v]) => <div key={`r-${k}`} className="col-span-2 grid grid-cols-subgrid"><dt className="text-muted">→ {k}</dt><dd className="num break-words">{v}</dd></div>)}
          </dl>
        )}
      </div>
    </Disclosure>
  );
}

const isExpected = (r: TraceRow) => (r.kind === "refused" && (r.reasons.length > 0 || r.event.type === "refusal" || r.event.type === "disclosure")) || (r.event.type === "forced" && !!r.event.reverted);

/** One decision: when (since the turn began), who and what, the plain outcome, one verdict. The code sits quietly beneath. */
function TraceItem({ r, turnAt, present, inj }: { r: TraceRow; turnAt: number; present?: boolean; inj?: boolean }) {
  const untrusted = r.result ? untrustedOf({ type: "trace", phase: "tool_result", at: r.at, result: r.result }) : untrustedOf(r.event);
  const isText = r.label === "reply" || r.label === "thinking";
  const tool = r.event.type === "trace" && !isText;
  const quiet = !!present && tool; // presenter mode: raw tool calls fade back, the plain outcome stays
  const name = r.label === "reply" ? "Agent" : r.label;
  const fresh = Date.now() - r.at < 1500; // only a row that just arrived slides in (a re-render must never replay it half-faded)
  const sentence = tool ? (r.running ? "Working…" : cleanText(plainSummary(r.title) || r.title, 400)) : cleanText(r.title, 400);
  const hasCall = tool && !r.running && (!!r.result || !!argsOf(r.title));
  return (
    <li className={cn("grid grid-cols-[1fr_auto] gap-x-3 border-b border-line last:border-0 sm:grid-cols-[56px_1fr_auto]", quiet ? "py-2.5" : "py-3", fresh && "fade-up")}>
      <span className="num hidden pt-0.5 text-[12px] leading-5 text-muted sm:block" title={clock(r.at)}>{offsetLabel(r.at - turnAt)}</span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className={cn("t-name font-medium leading-5", quiet ? "text-[13px] text-ink2" : "text-[14px]", isText ? "text-ink2" : "text-ink")}>{name}</span>
          {r.actor !== name && <span className="text-[12px] text-muted">{r.actor}</span>}
          <span className="num text-[12px] text-muted sm:hidden">{offsetLabel(r.at - turnAt)}</span>
        </div>
        <p className={cn("t-body mt-0.5 break-words text-[14px] leading-5", isText ? "text-ink" : quiet ? "text-muted" : "text-ink2")}>{sentence}</p>
        {r.reasons.length > 0 && <div className="mt-1 space-y-0.5">{r.reasons.map((c) => <Reason key={c} code={c} />)}</div>}
        {hasCall && <CallDetails r={r} />}
        {untrusted && !inj && (
          <div className={cn("mt-2 rounded-[12px] px-3.5 py-2.5 text-[13px] leading-5", untrusted.injection ? "bg-negative-soft text-ink" : "bg-fill text-ink2")}>
            <div className={cn("mb-1 flex items-center gap-1.5 text-[12px] font-semibold", untrusted.injection ? "text-negative" : "text-muted")}>{untrusted.injection && <ShieldAlert className="size-3.5" {...I} />}{untrusted.injection ? "Instruction-like text from a seller · treated as data, not obeyed" : `Seller content${untrusted.source ? ` · ${untrusted.source}` : ""} · treated as data`}</div>
            <p className="line-clamp-4 whitespace-pre-wrap break-words">{untrusted.text}</p>
          </div>
        )}
        {r.tx && <div className="mt-1"><TxHash hash={r.tx} /></div>}
      </div>
      <div className="pt-0.5">{(r.running || r.verdict) && <Verdict kind={r.kind}>{r.running ? "Working" : r.verdict}</Verdict>}</div>
    </li>
  );
}

/** Sticky heading of one turn: what was asked, when, how many calls, how long, and (once) that refusals here are expected. */
function TurnHeader({ t, expected }: { t: Turn; expected: boolean }) {
  return (
    <li className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-line bg-card px-4 py-2 sm:-mx-5 sm:px-5" aria-label={`Turn at ${clock(t.at)}`}>
      <span className="min-w-0 truncate text-[12px] font-semibold uppercase leading-4 tracking-[0.06em] text-muted">{t.task ? `Task · ${t.task}` : "Agent turn"}</span>
      <span className="num text-[12px] leading-4 text-muted">{clock(t.at)} · {t.calls} {t.calls === 1 ? "call" : "calls"}{t.end > t.at ? ` · ${durationLabel(t.end - t.at)}` : ""}</span>
      {expected && <Expected className="ml-auto" />}
    </li>
  );
}

/** "Can lose at most US$X, only to A or B", with a meter split into what was spent and what could still be lost. */
function WorstCase({ w, refused, ignored }: { w: ReturnType<typeof worstCase>; refused: number; ignored: number }) {
  const segs = worstSegments(w);
  const total = segs.reduce((n, s) => n + s.value, 0n);
  const share = (v: bigint) => (total > 0n ? Number((v * 10_000n) / total) / 10_000 : 0);
  const spent = segs.find((s) => s.key === "spent");
  return (
    <div data-testid="worst-case" className="mt-4 rounded-[14px] bg-canvas p-4">
      <p className="text-[12px] font-semibold uppercase leading-4 tracking-[0.06em] text-muted">Worst case</p>
      <p className="t-body mt-1.5 text-[15px] leading-6 text-ink2">
        {w.stopped ? <b className="font-semibold text-ink" data-testid="worst-max">Stopped: the agent can't spend.</b> : <>If the agent is hijacked, it can lose at most <b className="num font-semibold text-ink" data-testid="worst-max">{usd(w.max)}</b>, only to {orList(w.to)}.</>}
      </p>
      <div className="mt-3"><SegmentBar label="Share of the funding still at risk" barTestId="worst-bar" segments={segs.map((s) => ({ key: s.key, share: share(s.value) }))} /></div>
      <div className="num mt-2 flex flex-wrap justify-between gap-x-3 gap-y-0.5 text-[12px] leading-4 text-muted">
        <span className="inline-flex flex-wrap items-center gap-x-3">
          {w.stopped ? <span>{w.fundedKnown ? `${usd(w.funded)} was funded in total` : "Stopped"}</span> : <>
            <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-accent" aria-hidden />Can still be lost {usd(w.max)}</span>
            {spent ? <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-ink" aria-hidden />Spent so far {usd(spent.value)}</span> : <span>Nothing spent yet</span>}
          </>}
        </span>
        {(refused > 0 || ignored > 0) && <span>{[refused > 0 && `${refused} refused`, ignored > 0 && `${ignored} injected ${ignored === 1 ? "order" : "orders"} ignored`].filter(Boolean).join(", ")}, nothing moved</span>}
      </div>
    </div>
  );
}

const DECISION_TONE: Record<DecisionKind, string> = { paid: "bg-accent", refused: "bg-faint", blocked: "bg-ink", ignored: "bg-warning", settled: "bg-negative" };
/** Judge evidence at a glance: the last decisions as blocks, the counts in words, the last transactions. */
function EvidenceStrip({ ev, decisions }: { ev: ReturnType<typeof evidenceOf>; decisions: ReturnType<typeof decisionsOf> }) {
  const items: { k: string; label: string; tx?: string }[] = [
    ...(ev.paid ? [{ k: "paid", label: `${ev.paid} paid${ev.cosigned ? `, ${ev.cosigned} co-signed` : ""}`, tx: ev.lastPaidTx }] : []),
    ...(ev.refused ? [{ k: "refused", label: `${ev.refused} refused` }] : []),
    ...(ev.injections ? [{ k: "inj", label: `${ev.injections} injection${ev.injections > 1 ? "s" : ""} ignored` }] : []),
    ...(ev.blocked ? [{ k: "blocked", label: `${ev.blocked} transfer${ev.blocked > 1 ? "s" : ""} reverted`, tx: ev.lastBlockedTx }] : []),
  ];
  if (!items.length) return null;
  return (
    <div data-testid="evidence" className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[20px] bg-card px-4 py-3 sm:px-5">
      <Tracker label="Last decisions" data={decisions.map((d) => ({ key: d.key, className: DECISION_TONE[d.kind], tip: d.tip }))} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] leading-5 text-ink2">
        {items.map((i) => <span key={i.k} className="inline-flex items-center gap-2"><span className="font-medium">{i.label}</span>{i.tx && <TxHash hash={i.tx} />}</span>)}
      </div>

    </div>
  );
}

const COLS = [["agent", "Agent"], ["pocket", "Pocket"], ["sellers", "Sellers"]] as const;
type Col = (typeof COLS)[number][0];

export function Live({ pocket, present, goJudges }: { pocket?: string; present?: boolean; goJudges?: () => void }) {
  const { events, pockets, txs, cfg, nameOf, isPhone } = useNetwork();
  const [col, setCol] = useState<Col>("agent");
  const p = pockets.find((x) => samePocket(x.address, pocket));
  const mine = useMemo(() => forPocket(events, pocket), [events, pocket]);
  const allRows = useMemo(() => traceRows(mine).filter((r) => r.label !== "thinking"), [mine]); // oldest first
  const names = new Map(cfg.sellers.map((s) => [s.id, s.name]));
  const injOf = (r: TraceRow) => (r.label === "get_quote" && r.result ? injectionOf(r.result, r.event.args) : null);

  // ---- live feed: rows keep their place while someone reads (scrolled down, paused, pointer moving over the list)
  const [paused, setPaused] = useState(false);
  const [away, setAway] = useState(false);
  const [hover, setHover] = useState(false);
  const [released, setReleased] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(hoverTimer.current), []);
  const keys = useMemo(() => allRows.flatMap((r) => (injOf(r) ? [`${r.key}-inj`, r.key] : [r.key])), [allRows]); // eslint-disable-line react-hooks/exhaustive-deps
  const held = useRef<Set<string> | null>(null);
  held.current = holdKeys(held.current, keys, !present && !released && (paused || away || hover));
  const waitingN = waiting(keys, held.current);
  const shown = held.current ? allRows.filter((r) => held.current!.has(r.key)) : allRows;
  const turns = useMemo(() => groupTurns(shown), [shown]);
  const apply = () => { setPaused(false); setReleased(true); scroller.current?.scrollTo({ top: 0 }); };

  const history = useMemo(() => {
    const chain = txs.filter((t) => samePocket(t.pocket, pocket)).map((t) => ({ key: `${t.hash}-${t.kind}-${t.logIndex}`, label: txLabel(t), amount: t.amount, hash: t.hash, bad: false }));
    const forced = mine.filter((e) => e.type === "forced").map((e) => ({ key: `f-${e.tx}`, label: e.reverted ? "Blocked transfer" : "Forced transfer settled", amount: BigInt(e.amount ?? 0), hash: e.tx as string, bad: !e.reverted }));
    return [...chain, ...forced].reverse();
  }, [txs, mine, pocket]);
  const perSeller = useMemo(() => cfg.sellers.map((s) => ({ s, rows: salesFor(mine, s.id) })).filter((x) => x.rows.length), [cfg, mine]);
  const worst = useMemo(() => (p ? worstCase(p, txs, (id) => names.get(id) ?? id) : undefined), [p, txs, cfg]); // eslint-disable-line react-hooks/exhaustive-deps
  const ev = useMemo(() => evidenceOf(mine), [mine]);
  const attempts = useMemo(() => attemptsFrom(mine, { sellerName: (id) => names.get(id) ?? id }), [mine, cfg]); // eslint-disable-line react-hooks/exhaustive-deps
  const decisions = useMemo(() => decisionsOf(mine), [mine]);
  const refused = mine.filter((e) => e.type === "refusal" || e.type === "disclosure" || (e.type === "forced" && e.reverted)).length;

  if (!pocket) return <Card><EmptyState icon={<Wallet {...I} />} title="No pocket on the network yet">Create one in the phone app and it shows up here.</EmptyState></Card>;
  const st = p ? pocketStatus(p) : undefined;
  const calls = allRows.filter((r) => r.event.type === "trace" && r.label !== "reply").length;

  // ---- columns
  const trace = (
    <Column key="agent" title="Agent" meta={<span className="num">{calls} {calls === 1 ? "call" : "calls"}</span>}
      right={!present && <button type="button" aria-pressed={paused} onClick={() => { setPaused((x) => !x); setReleased(false); }} className="relative inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-[13px] font-semibold text-accent before:absolute before:-inset-y-2 before:inset-x-0 before:content-[''] hover:bg-accent-soft">{!paused && <span className="size-2 rounded-full bg-accent" aria-hidden />}{paused ? "Resume" : "Pause"}</button>}
      className={cn(present ? "xl:h-full xl:max-h-full" : "xl:max-h-[calc(100dvh-190px)]", !present && col !== "agent" && "max-xl:hidden", "max-xl:max-h-[calc(100dvh-250px)]")}
      bodyClass="trace-list relative overflow-y-auto pb-2" bodyRef={scroller} onBodyScroll={(e) => setAway(e.currentTarget.scrollTop > 24)}
      bodyEvents={{ onPointerMove: () => { setHover(true); clearTimeout(hoverTimer.current); hoverTimer.current = setTimeout(() => setHover(false), 2500); }, onPointerLeave: () => { clearTimeout(hoverTimer.current); setHover(false); setReleased(false); } }}>
      {waitingN > 0 && <div className="sticky top-2 z-20 flex justify-center"><button type="button" onClick={apply} className="h-8 rounded-full bg-ink px-3 text-[13px] font-semibold text-on-accent">{waitingN} new</button></div>}
      {turns.length ? <ol aria-label="Agent trace">{[...turns].reverse().map((t) => {
        const rows = [...t.rows].reverse();
        const expected = t.rows.some((r) => isExpected(r) || !!injOf(r));
        return [
          <TurnHeader key={`${t.key}-h`} t={t} expected={expected} />,
          ...rows.flatMap((r) => {
            const inj = injOf(r);
            return [...(inj ? [<InjectionRow key={`${r.key}-inj`} inj={inj} at={r.doneAt ?? r.at} turnAt={t.at} name={names.get(inj.sellerId) ?? inj.sellerId} />] : []), <TraceItem key={r.key} r={r} turnAt={t.at} present={present} inj={!!inj} />];
          }),
        ];
      })}</ol> : present
        ? <EmptyState icon={<Clock {...I} />} title="Ready" className="h-full">Press Play to start scene 1.</EmptyState>
        : <EmptyState icon={<Clock {...I} />} title="No agent activity yet" action={goJudges && <Button variant="outline" className="h-10 px-5" onClick={goJudges}>Open the Judges tab</Button>}>Ask the agent from the phone app, or play a scene from the Judges tab.</EmptyState>}
    </Column>
  );

  const pocketCol = (
    <Column key="pocket" title={<>{nameOf(pocket)}{isPhone(pocket) && <PhoneTag />}</>} meta={p ? <span className="num">Owner {shortAddr(p.owner)}</span> : "Reading the contract…"}
      className={cn(!present && "xl:sticky xl:top-[88px] xl:max-h-[calc(100dvh-190px)]", !present && col !== "pocket" && "max-xl:hidden", present && "xl:h-full")} bodyClass="overflow-y-auto pb-5">
      {p && worst && (
        <>
          <div className="py-5 text-center">
            <div className="text-[13px] leading-5 text-muted">{worst.stopped ? "Held in a stopped pocket" : "Balance, the agent's whole budget"}</div>
            <div className={cn("num mt-1 font-bold tracking-[-0.02em]", worst.stopped ? "text-[32px] leading-10 text-muted" : "text-[40px] leading-[44px]")} data-testid="pocket-balance" data-stopped={worst.stopped ? "true" : undefined}>{usd(p.balance)}{worst.stopped && p.balance > 0n && <span className="ml-2 text-[16px] font-semibold tracking-normal"> to return</span>}</div>
          </div>
          {!present && (
            <dl className="grid grid-cols-[130px_1fr] items-center gap-y-2.5 border-y border-line py-4 text-[14px] leading-5">
              <dt className="text-muted">Status</dt><dd>{st && <Verdict kind={st.kind}>{st.label}</Verdict>}</dd>
              <dt className="text-muted">Cap per payment</dt><dd className="num font-medium">{usd(p.cap)}</dd>
              <dt className="text-muted">Asks you above</dt><dd className="num font-medium">{p.askAbove === NEVER ? "Never asks" : p.askAbove === 0n ? "Every time" : usd(p.askAbove)}</dd>
              <dt className="text-muted">Ends</dt><dd className="num font-medium">{new Date(p.expiresAt * 1000).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</dd>
              <dt className="text-muted">Agent</dt><dd className="num font-medium">{shortAddr(p.agent)}</dd>
            </dl>
          )}
          <WorstCase w={worst} refused={refused} ignored={ev.injections} />
          {!present && (
            <>
              <h3 className="mb-2 mt-5 text-[12px] font-semibold uppercase leading-4 tracking-[0.06em] text-muted">Allowed sellers</h3>
              <ul className="space-y-1.5">{cfg.sellers.map((s) => {
                const ok = p.allowed.includes(s.id);
                return <li key={s.id} className={cn("flex items-center gap-2 text-[14px] leading-5", ok ? "text-ink" : "text-muted")}>{ok ? <Check className="size-4 text-accent" {...I} aria-hidden /> : <Minus className="size-4 text-faint" {...I} aria-hidden />}<span className="font-medium">{s.name}</span><span className="text-[13px] text-muted">{ok ? "allowed" : "not allowed"}</span></li>;
              })}</ul>
            </>
          )}
        </>
      )}
      <h3 className="mb-1 mt-5 text-[12px] font-semibold uppercase leading-4 tracking-[0.06em] text-muted">{present ? "Last transaction" : "On-chain"}</h3>
      {history.length ? (
        <ul>{(present ? history.slice(0, 1) : history).map((h) => (
          <li key={h.key} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border-b border-line py-2.5 last:border-0">
            <span className={cn("t-body min-w-0 flex-1 break-words text-[14px] font-medium", h.bad ? "text-negative" : "text-ink")}>{h.label}{h.label === "Blocked transfer" && <> <Expected className="align-middle" /></>}</span>
            {h.amount != null && h.amount > 0n && <span className="num shrink-0 text-[14px] text-ink2">{usd(h.amount)}</span>}
            <span className="shrink-0"><TxHash hash={h.hash} /></span>
          </li>
        ))}</ul>
      ) : <p className="py-3 text-[14px] text-muted">Nothing on-chain for this pocket yet.</p>}
      {present && <SellerStrip perSeller={perSeller} />}
    </Column>
  );

  const sellers = (
    <Column key="sellers" title="Sellers" meta={<span>{perSeller.length} {perSeller.length === 1 ? "shop" : "shops"}</span>} className={cn(col !== "sellers" && "max-xl:hidden", "max-xl:max-h-[calc(100dvh-250px)] xl:max-h-[calc(100dvh-190px)]")} bodyClass="overflow-y-auto pb-3">
      {perSeller.length ? perSeller.map(({ s, rows: rs }) => {
        const got = rs.filter((r) => r.outcome === "paid").reduce((n, r) => n + (r.amount ?? 0n), 0n);
        return (
          <section key={s.id} className="border-b border-line py-3.5 last:border-0">
            <div className="flex items-center gap-3"><span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-fill text-[13px] font-semibold text-ink">{s.name[0]}</span><div className="min-w-0 flex-1 truncate text-[14px] font-semibold">{s.name}</div>{got > 0n ? <span className="num shrink-0 text-[14px] font-semibold text-positive">+{usd(got)}</span> : <span className="shrink-0 text-[13px] text-muted">Nothing paid</span>}</div>
            <ul className="mt-2 space-y-1.5 pl-11">{dedupe(rs).map(({ r, n }) => (
              <li key={r.key} className="t-body text-[13px] leading-5">
                {r.outcome === "paid"
                  ? <span className="text-ink2">Paid {usd(r.amount)}{r.cosigned ? " · owner co-signed" : ""}</span>
                  : <span><span className="font-semibold text-negative">Refused</span><span className="text-ink2"> · {r.why}</span>{n > 1 && <span className="num ml-1 font-semibold text-ink2">×{n}</span>}</span>}
                <span className="num ml-2 text-[12px] text-muted">{clock(r.at)}</span>
              </li>
            ))}</ul>
          </section>
        );
      }) : <EmptyState icon={<ShieldCheck {...I} />} title="Nothing from the sellers yet">No shop has been paid or refused from this pocket.</EmptyState>}
    </Column>
  );

  return (
    <div data-present={present ? "true" : undefined} className={cn(present && "xl:grid xl:h-[calc(100dvh-var(--stepper-h,90px)-88px)] xl:grid-cols-[minmax(0,1fr)_370px] xl:gap-3")}>
      <div className={cn(present && "flex min-h-0 min-w-0 flex-col gap-3 max-xl:mb-3")}>
        <div className={cn(!present && "mb-3", present && "shrink-0")}><ChecksPanel attempts={attempts} present={present} /></div>
        {!present && <EvidenceStrip ev={ev} decisions={decisions} />}
        {!present && (
          <div role="tablist" aria-label="Live view" className="mb-3 flex h-11 gap-1 rounded-full bg-fill p-1 xl:hidden">
            {COLS.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={col === id} onClick={() => setCol(id)} className={cn("flex-1 rounded-full text-[14px] font-semibold transition-colors", col === id ? "bg-card text-ink" : "text-ink2")}>{label}</button>)}
          </div>
        )}
        <div className={cn("grid gap-3", present ? "min-h-0 flex-1 xl:grid-cols-2" : "items-start xl:grid-cols-[1.35fr_1fr_0.95fr]")}>
          {trace}{pocketCol}{!present && sellers}
        </div>
      </div>
      {present && <Scorecard pocket={pocket} />}
    </div>
  );
}

/** Presenter mode: each shop in one line under the pocket. */
function SellerStrip({ perSeller }: { perSeller: { s: { id: string; name: string }; rows: ReturnType<typeof salesFor> }[] }) {
  if (!perSeller.length) return null;
  return (
    <>
      <h3 className="mb-1 mt-5 text-[12px] font-semibold uppercase leading-4 tracking-[0.06em] text-muted">Sellers</h3>
      <ul>{perSeller.map(({ s, rows }) => {
        const got = rows.filter((r) => r.outcome === "paid").reduce((n, r) => n + (r.amount ?? 0n), 0n);
        const no = rows.filter((r) => r.outcome === "refused").length;
        return <li key={s.id} className="t-body flex items-center justify-between gap-3 border-b border-line py-2 text-[14px] last:border-0"><span className="font-medium">{s.name}</span><span className="num text-ink2">{got > 0n ? <span className="font-semibold text-positive">+{usd(got)}</span> : "Nothing paid"}{no > 0 && <span className="text-muted"> · {no} refused</span>}</span></li>;
      })}</ul>
    </>
  );
}
