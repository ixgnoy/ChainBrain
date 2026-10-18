// Live: the agent's decisions, the pocket's balance and rules, and what each seller sees, side by side
// (spec "Demo layout": chat with trace on the left, the active pocket on the right).
// Every column is keyed on the ONE pocket passed in, so a render never mixes one pocket's trace with another's balance.
import { useEffect, useMemo, useRef, useState } from "react";
import { ShieldAlert, ShieldCheck, Check, Minus, Wallet, Clock, Timer, Bot } from "lucide-react";
import { useNetwork } from "./useNetwork";
import { Expected, PhoneTag, Reason, TxHash, Verdict, clock, pocketStatus, hkd, NEVER, AgentTag, SellerLogo } from "./parts";
import { argsOf, evidenceOf, injectionOf, plainSummary, type Injection } from "./story";
import { txLabel } from "./network";
import { orList, worstCase } from "./worst";
import { LAYERS, PROTECT_HEADLINE, layerCounts } from "@sim/protect";
import { decisionsOf, durationLabel, groupTurns, holdKeys, offsetLabel, waiting, type DecisionKind, type Turn } from "./liveRules";
import { Disclosure, EmptyState, Tracker } from "./kit";
import { traceRows, untrustedOf, type TraceRow } from "../lib/trace";
import { eventPocket, samePocket, type WalletEvent } from "../lib/events";
import { salesFor } from "../seller/data";
import { Button, Card, Fig } from "../seller/ui";
import { toBig, type PocketState } from "./chain";
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
      <header className="flex min-h-14 items-center justify-between gap-3 border-b border-line px-4 sm:px-5">
        <h2 className="flex min-w-0 items-center truncate text-[18px] font-bold leading-6 tracking-[-0.02em]">{title}</h2>
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
        <div className="flex items-center gap-2"><ShieldAlert className="size-4 shrink-0 text-blue-ink" {...I} /><span className="t-name text-[14px] font-bold leading-5">{name} tried to give the agent an order</span></div>
        {inj.lines.slice(0, 2).map((l, i) => <p key={i} className="t-body mt-1.5 border-l-2 border-blue-ink pl-3 text-[14px] italic leading-5 text-ink2 [overflow-wrap:anywhere]">“{l}”</p>)}
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
  const seg = (m: "pretty" | "json", label: string) => <button type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={cn("h-7 rounded-full px-3 text-[12px] font-bold", mode === m ? "bg-ink text-on-accent" : "bg-card text-ink2 hover:bg-line")}>{label}</button>;
  return (
    <Disclosure summary="Call" className="mt-1">
      <div className="tile p-3">
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
          <span className={cn("t-name font-bold leading-5", quiet ? "text-[13px] text-ink2" : "text-[14px]", isText ? "text-ink2" : "text-ink")}>{name}</span>
          {r.actor !== name && <span className="text-[12px] text-muted">{r.actor}</span>}
          <span className="num text-[12px] text-muted sm:hidden">{offsetLabel(r.at - turnAt)}</span>
        </div>
        <p className={cn("t-body mt-0.5 break-words text-[14px] leading-5", isText ? "text-ink" : quiet ? "text-muted" : "text-ink2")}>{sentence}</p>
        {r.reasons.length > 0 && <div className="mt-1 space-y-0.5">{r.reasons.map((c) => <Reason key={c} code={c} />)}</div>}
        {hasCall && <CallDetails r={r} />}
        {untrusted && !inj && (
          <div className={cn("mt-2 rounded-[12px] px-3.5 py-2.5 text-[13px] leading-5", untrusted.injection ? "bg-blue-soft text-ink" : "bg-tile text-ink2")}>
            <div className={cn("mb-1 flex items-center gap-1.5 text-[12px] font-semibold", untrusted.injection ? "text-blue-ink" : "text-muted")}>{untrusted.injection && <ShieldAlert className="size-3.5" {...I} />}{untrusted.injection ? "Instruction-like text from a seller · treated as data, not obeyed" : `Seller content${untrusted.source ? ` · ${untrusted.source}` : ""} · treated as data`}</div>
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
    <li className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-line bg-card px-4 py-2.5 sm:-mx-5 sm:px-5" aria-label={`Turn at ${clock(t.at)}`}>
      <span className="eyebrow min-w-0 truncate text-ink">{t.task ? `Task · ${t.task}` : "Agent turn"}</span>
      <span className="num text-[12px] leading-4 text-muted">{clock(t.at)} · {t.calls} {t.calls === 1 ? "call" : "calls"}{t.end > t.at ? ` · ${durationLabel(t.end - t.at)}` : ""}</span>
      {expected && <Expected className="ml-auto" />}
    </li>
  );
}

/** "Protected by ChainBrain": the four layers every payment from this pocket passes, each with what it has done so far
 *  (shared/sim/protect.ts), and who the pocket may pay at all. */
function Protected({ events, to, stopped }: { events: WalletEvent[]; to: string[]; stopped: boolean }) {
  const counts = layerCounts(events as never[]);
  return (
    <div data-testid="protected-layers" className="card p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-ink text-on-accent"><ShieldCheck className="size-5" {...I} /></span>
        <div className="min-w-0"><p className="text-[18px] font-bold leading-6 tracking-[-0.02em]">Protected by ChainBrain</p><p className="text-[12px] leading-4 text-muted">{PROTECT_HEADLINE}</p></div>
      </div>
      <ul className="mt-3.5 grid gap-2 sm:grid-cols-2">
        {LAYERS.map((l) => (
          <li key={l.key} className="tile flex items-start gap-2.5 px-3.5 py-3">
            <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-green-ink" strokeWidth={2.6} />
            <span className="min-w-0"><span className="block text-[14px] font-bold leading-5">{l.name}</span><span className="block text-[12px] leading-4 text-muted">{l.line}</span><span className="num mt-1 block text-[12px] font-semibold leading-4 text-ink2" data-testid={`layer-${l.key}`}>{counts[l.key]}</span></span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[13px] leading-5 text-ink2" data-testid="protected-to">{stopped ? <b className="font-bold text-ink">Stopped: this pocket can't pay anyone.</b> : <>Pays only {orList(to)}. Your main wallet is out of reach.</>}</p>
    </div>
  );
}

// Hatch blocks: paid = ink hatch, refused = grey hatch, blocked = solid vermillion, ignored = powder blue, settled (money moved) = vermillion ink.
const DECISION_TONE: Record<DecisionKind, string> = { paid: "hatch [--hatch:var(--color-ink)] bg-card shadow-[inset_0_0_0_1.5px_var(--color-ink)]", refused: "hatch [--hatch:var(--color-faint)] bg-card shadow-[inset_0_0_0_1.5px_var(--color-faint)]", blocked: "bg-vermillion", ignored: "bg-blue", settled: "bg-vermillion-ink" };
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
    <div data-testid="evidence" className="card mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 sm:px-5">
      <Tracker label="Last decisions" data={decisions.map((d) => ({ key: d.key, className: DECISION_TONE[d.kind], tip: d.tip }))} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] leading-5 text-ink2">
        {items.map((i) => <span key={i.k} className="inline-flex items-center gap-2"><span className="font-semibold">{i.label}</span>{i.tx && <TxHash hash={i.tx} />}</span>)}
      </div>

    </div>
  );
}

/** The pocket as a card, VaultBank's anatomy like the phone: the name, a black stripe carrying the holding agent on a white pill,
 *  the balance as a figure, the rules in one line, the short pocket number big at the bottom with the expiry. Stopped: the
 *  white hatch face. Owner and holder under the card. */
function PocketCard({ p, name, phone, stopped, status, present }: { p: PocketState; name: string; phone: boolean; stopped: boolean; status?: ReturnType<typeof pocketStatus>; present?: boolean }) {
  const { cfg } = useNetwork();
  const ask = p.askAbove === NEVER ? "never asks" : p.askAbove === 0n ? "asks every time" : `asks above ${hkd(p.askAbove)}`;
  const ends = new Date(p.expiresAt * 1000).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <div>
      <div className={cn("pocket-face", stopped ? "pocket-frozen hatch" : "pocket-blue")}>
        <div className="flex items-center justify-between gap-3 px-5 pt-4">
          <h2 className="flex min-w-0 flex-wrap items-center font-extrabold text-[22px] leading-7">{name}{phone && <PhoneTag />}</h2>
          {status && <Verdict kind={status.kind}>{status.label}</Verdict>}
        </div>
        <div className={cn("pocket-band mt-3 flex h-11 items-center gap-2 px-5", stopped && "bg-ink2")}>
          <span className="inline-flex min-w-0 items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 text-[12px] font-semibold text-ink">
            <AgentTag agentKey={p.agent} serverAgent={cfg.agent} className="bg-transparent px-0" />
            <span aria-hidden className={cn("size-2 shrink-0 rounded-full", stopped ? "bg-vermillion" : "bg-green")} />
            <span className="truncate">{stopped ? (p.frozen && !p.revoked ? "Frozen" : "Stopped") : "Agent pocket"}</span>
          </span>
        </div>
        <div className="px-5 pt-3">
          <div className={cn("eyebrow", stopped ? "text-muted" : "text-blue-ink")}>{stopped ? (p.frozen && !p.revoked ? "Held in a frozen pocket" : "Held in a stopped pocket") : "Available"}</div>
          <div className={cn("figure mt-0.5 text-[48px] leading-[52px]", stopped && "text-ink2")} data-testid="pocket-balance" data-stopped={stopped ? "true" : undefined}><Fig text={hkd(p.balance)} />{stopped && !(p.frozen && !p.revoked) && p.balance > 0n && <span className="ml-2 font-sans text-[16px] font-bold tracking-normal"> to return</span>}</div>
        </div>
        <div className="flex items-end justify-between gap-3 px-5 pb-4 pt-4">
          <div className="min-w-0">
            {!present && <div className="text-[13px] font-medium leading-5 text-ink2"><ShieldCheck className="mr-1 inline size-3.5 align-[-2px]" {...I} aria-hidden />Cap {hkd(p.cap)} · {ask}</div>}
            <div className="flex items-center gap-2"><span className="font-extrabold num whitespace-nowrap text-[24px] leading-8" aria-label={`Pocket contract ending ${p.address.slice(-4)}`}>0x…{p.address.slice(-4).toLowerCase()}</span><span className="shrink-0 rounded-[5px] bg-ink/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink2">Contract</span></div>
          </div>
          <span className="num inline-flex shrink-0 items-center gap-1.5 pb-1 text-[13px] font-semibold"><Timer className="size-3.5" {...I} aria-hidden />Until {ends}</span>
        </div>
      </div>
      {!present && (
        <dl className="mt-3 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1.5 px-1 text-[12px] leading-4 text-ink2">
          <dt className="flex items-center gap-1.5 font-semibold"><Bot className="size-3.5" {...I} aria-hidden />Held by</dt><dd className="text-right"><AgentTag agentKey={p.agent} serverAgent={cfg.agent} /></dd>
          <dt className="font-semibold">Owner</dt><dd className="num text-right font-bold">{shortAddr(p.owner)}</dd>
        </dl>
      )}
    </div>
  );
}

const COLS = [["agent", "Agent"], ["pocket", "Pocket"], ["sellers", "Sellers"]] as const;
type Col = (typeof COLS)[number][0];

export function Live({ pocket, present, goJudges }: { pocket?: string; present?: boolean; goJudges?: () => void }) {
  const { events, pockets, txs, cfg, nameOf, isPhone, attempts: allAttempts } = useNetwork();
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
    const forced = mine.filter((e) => e.type === "forced").map((e) => ({ key: `f-${e.tx}`, label: e.reverted ? "Blocked transfer" : "Forced transfer settled", amount: toBig(e.amount), hash: e.tx as string, bad: !e.reverted }));
    return [...chain, ...forced].reverse();
  }, [txs, mine, pocket]);
  const perSeller = useMemo(() => cfg.sellers.map((s) => ({ s, rows: salesFor(mine, s.id) })).filter((x) => x.rows.length), [cfg, mine]);
  const worst = useMemo(() => (p ? worstCase(p, txs, (id) => names.get(id) ?? id) : undefined), [p, txs, cfg]); // eslint-disable-line react-hooks/exhaustive-deps
  const ev = useMemo(() => evidenceOf(mine), [mine]);
  const attempts = useMemo(() => allAttempts.filter((a) => samePocket(a.pocket, pocket)), [allAttempts, pocket]);
  const decisions = useMemo(() => decisionsOf(mine), [mine]);

  if (!pocket) return <Card><EmptyState icon={<Wallet {...I} />} title="No pocket on the network yet">Create one in the phone app and it shows up here.</EmptyState></Card>;
  const st = p ? pocketStatus(p) : undefined;
  const calls = allRows.filter((r) => r.event.type === "trace" && r.label !== "reply").length;

  // ---- columns
  const trace = (
    <Column key="agent" title="Agent" meta={<span className="num">{calls} {calls === 1 ? "call" : "calls"}</span>}
      right={!present && <button type="button" aria-pressed={paused} onClick={() => { setPaused((x) => !x); setReleased(false); }} className="pressable relative inline-flex h-9 items-center gap-1.5 rounded-full bg-tile px-3.5 text-[13px] font-bold text-ink shadow-[inset_0_0_0_1px_var(--color-tile-stroke)] before:absolute before:-inset-y-1 before:inset-x-0 before:content-[''] hover:bg-line">{!paused && <span className="size-2 rounded-full bg-vermillion" aria-hidden />}{paused ? "Resume" : "Pause"}</button>}
      className={cn(present ? "xl:h-full xl:max-h-full" : "xl:max-h-[calc(100dvh-190px)]", !present && col !== "agent" && "max-xl:hidden", "max-xl:max-h-[calc(100dvh-250px)]")}
      bodyClass="trace-list relative overflow-y-auto pb-2" bodyRef={scroller} onBodyScroll={(e) => setAway(e.currentTarget.scrollTop > 24)}
      bodyEvents={{ onPointerMove: () => { setHover(true); clearTimeout(hoverTimer.current); hoverTimer.current = setTimeout(() => setHover(false), 2500); }, onPointerLeave: () => { clearTimeout(hoverTimer.current); setHover(false); setReleased(false); } }}>
      {waitingN > 0 && <div className="sticky top-2 z-20 flex justify-center"><button type="button" onClick={apply} className="pressable h-8 rounded-full bg-ink px-3.5 text-[13px] font-bold text-on-accent shadow-level3">{waitingN} new</button></div>}
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
        : <EmptyState icon={<Clock {...I} />} title="No agent activity yet" action={goJudges && <Button variant="soft" className="h-10 px-5" onClick={goJudges}>Open the Judges tab</Button>}>Ask the agent from the phone app, or play a scene from the Judges tab.</EmptyState>}
    </Column>
  );

  const pocketCol = (
    <div key="pocket" className={cn("flex min-h-0 flex-col gap-3 overflow-y-auto pb-1 [&>*]:shrink-0", !present && "xl:sticky xl:top-[88px] xl:max-h-[calc(100dvh-190px)]", !present && col !== "pocket" && "max-xl:hidden", present && "xl:h-full")}>
      {p && worst ? (
        <>
          <PocketCard p={p} name={nameOf(pocket)} phone={isPhone(pocket)} stopped={worst.stopped} status={st} present={present} />
          <Protected events={mine} to={worst.to} stopped={worst.stopped} />
          {!present && (
            <Card className="p-4 sm:p-5">
              <h3 className="mb-3 text-[18px] font-bold leading-6 tracking-[-0.02em]">Allowed sellers</h3>
              <ul className="space-y-1.5">{cfg.sellers.map((s) => {
                const ok = p.allowed.includes(s.id);
                return <li key={s.id} className={cn("tile flex items-center gap-3 px-3.5 py-2.5 text-[14px] leading-5", ok ? "text-ink" : "text-muted")}><span aria-hidden className={cn("grid size-6 shrink-0 place-items-center rounded-full", ok ? "bg-ink text-on-accent" : "bg-line text-muted")}>{ok ? <Check className="size-3.5" strokeWidth={3} /> : <Minus className="size-3.5" strokeWidth={3} />}</span><SellerLogo id={s.id} name={s.name} className={cn("size-6 rounded-[7px] text-[11px]", !ok && "opacity-45 grayscale")} /><span className="font-bold">{s.name}</span><span className="ml-auto text-[13px] text-muted">{ok ? "allowed" : "not allowed"}</span></li>;
              })}</ul>
            </Card>
          )}
        </>
      ) : <div className="card hatch hatch-soft grid min-h-40 place-items-center p-6 text-[14px] font-semibold text-muted"><span className="rounded-full bg-card px-4 py-2">Reading the contract…</span></div>}
      <Card className="p-4 sm:p-5">
        <h3 className="mb-1 text-[18px] font-bold leading-6 tracking-[-0.02em]">{present ? "Last transaction" : "On-chain"}</h3>
        {history.length ? (
          <ul>{(present ? history.slice(0, 1) : history).map((h) => (
            <li key={h.key} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border-b border-line py-2.5 last:border-0">
              <span className={cn("t-body min-w-0 flex-1 break-words text-[14px] font-semibold", h.bad ? "text-vermillion-ink" : "text-ink")}>{h.label}{h.label === "Blocked transfer" && <> <Expected className="align-middle" /></>}</span>
              {h.amount != null && h.amount > 0n && <span className="num shrink-0 text-[14px] font-bold text-ink2">{hkd(h.amount)}</span>}
              <span className="shrink-0"><TxHash hash={h.hash} /></span>
            </li>
          ))}</ul>
        ) : <p className="py-3 text-[14px] text-muted">Nothing on-chain for this pocket yet.</p>}
        {present && <SellerStrip perSeller={perSeller} />}
      </Card>
    </div>
  );

  const sellers = (
    <Column key="sellers" title="Sellers" meta={<span>{perSeller.length} {perSeller.length === 1 ? "shop" : "shops"}</span>} className={cn(col !== "sellers" && "max-xl:hidden", "max-xl:max-h-[calc(100dvh-250px)] xl:max-h-[calc(100dvh-190px)]")} bodyClass="overflow-y-auto pb-3">
      {perSeller.length ? perSeller.map(({ s, rows: rs }) => {
        const got = rs.filter((r) => r.outcome === "paid").reduce((n, r) => n + (r.amount ?? 0n), 0n);
        return (
          <section key={s.id} className="border-b border-line py-3.5 last:border-0">
            <div className="flex items-center gap-3"><SellerLogo id={s.id} name={s.name} /><div className="min-w-0 flex-1 truncate text-[15px] font-bold tracking-[-0.01em]">{s.name}</div>{got > 0n ? <span className="num shrink-0 text-[14px] font-bold text-green-ink">+{hkd(got)}</span> : <span className="shrink-0 text-[13px] text-muted">Nothing paid</span>}</div>
            <ul className="mt-2 space-y-1.5 pl-12">{dedupe(rs).map(({ r, n }) => (
              <li key={r.key} className="t-body text-[13px] leading-5">
                {r.outcome === "paid"
                  ? <span className="text-ink2">Paid {hkd(r.amount)}{r.cosigned ? " · owner co-signed" : ""}</span>
                  : <span><span className="font-bold text-vermillion-ink">Refused</span><span className="text-ink2"> · {r.why}</span>{n > 1 && <span className="num ml-1 font-semibold text-ink2">×{n}</span>}</span>}
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
          <div role="tablist" aria-label="Live view" className="card mb-3 flex h-12 gap-1 rounded-full p-1 xl:hidden">
            {COLS.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={col === id} onClick={() => setCol(id)} className={cn("pressable flex-1 rounded-full text-[14px] font-bold", col === id ? "bg-ink text-on-accent" : "text-ink2 hover:bg-tile")}>{label}</button>)}
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
      <h3 className="eyebrow mb-1 mt-5 text-muted">Sellers</h3>
      <ul>{perSeller.map(({ s, rows }) => {
        const got = rows.filter((r) => r.outcome === "paid").reduce((n, r) => n + (r.amount ?? 0n), 0n);
        const no = rows.filter((r) => r.outcome === "refused").length;
        return <li key={s.id} className="t-body flex items-center justify-between gap-3 border-b border-line py-2 text-[14px] last:border-0"><span className="flex items-center gap-2 font-medium"><SellerLogo id={s.id} name={s.name} className="size-6 rounded-[7px] text-[11px]" />{s.name}</span><span className="num text-ink2">{got > 0n ? <span className="font-bold text-green-ink">+{hkd(got)}</span> : "Nothing paid"}{no > 0 && <span className="text-muted"> · {no} refused</span>}</span></li>;
      })}</ul>
    </>
  );
}
