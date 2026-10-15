// The checks path: Agent → Wallet tools → Pocket contract (ERC-1271) → Seller, with the gates of one attempt lit in order.
// A ring glides from gate to gate (about 150 ms each) and stops, with a small shake, at the gate that refused. Driven only
// by the wallet's events (shared/sim/checks.ts), so it reads the same on the built-in network, a linked phone and a server.
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Minus, RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import type { Attempt, Gate, GateState } from "@sim/checks";
import { LAYER_TAG, attemptWord, collapsiblePrefix, gateWord, groupGates, headlineParts, idlePath, sequenceLength, tokenTone } from "./checksView";
import { clock } from "./parts";
import { cn } from "../lib/cn";

const STEP_MS = 150;

export function useReducedMotion(): boolean {
  const [r, setR] = useState(() => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const m = matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setR(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return r;
}

// A gate that stopped an attack is a win, not a failure: navy shield (held here), teal when the agent itself refused. Red is kept for money that moved.
const NODE: Record<GateState, string> = {
  pass: "bg-accent text-on-accent",
  stop: "bg-ink text-on-accent",
  skip: "bg-fill text-faint",
  fooled: "bg-warning-soft text-warning ring-2 ring-warning",
  idle: "bg-canvas text-faint ring-1 ring-inset ring-line",
};
const GroupBg = "gate-group";

export function GateIcon({ state, layer, size = 32, draw }: { state: GateState; layer?: string; size?: number; draw?: boolean }) {
  const cls = "size-[55%]";
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-full transition-colors duration-200", NODE[state], state === "stop" && layer === "agent" && "bg-accent")} style={{ width: size, height: size }}>
      {state === "pass" ? <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" className={draw ? "tick-draw" : undefined} /></svg>
        : state === "stop" ? <ShieldCheck className={cls} strokeWidth={2.25} />
        : state === "fooled" ? <TriangleAlert className={cls} strokeWidth={2.25} />
        : state === "skip" ? <Minus className={cls} strokeWidth={2.5} />
        : <span className="size-1.5 rounded-full bg-faint opacity-60" />}
    </span>
  );
}

/** A reason code, always on one line (it may be wider than a narrow gate and then centres on it). */
export function CodePill({ code, layer, className, testId }: { code: string; layer?: string; className?: string; testId?: string }) {
  return (
    <span data-testid={testId} className={cn("inline-flex shrink-0 items-center whitespace-nowrap rounded-[10px] px-2 py-1 text-[11px] font-bold leading-[14px] tracking-[0.01em]", layer === "agent" ? "bg-accent-soft text-accent" : "bg-ink text-on-accent", className)}>
      <span>{code}</span>
    </span>
  );
}

const SR: Record<GateState, string> = { pass: "passed", stop: "stopped it", skip: "not needed or bypassed", fooled: "fooled", idle: "not reached" };

// Compact (presenter) wording: the full names stay in the tooltip and for screen readers.
const SHORT: Partial<Record<string, string>> = { signature: "Signature", active: "Active", seller: "Seller", cap: "Cap", budget: "Balance", cosign: "Ask-me", intent: "Task", owner: "Owner only", privacy: "No leaks", paid: "Paid" };

export function ChecksPath({ attempt, run = 0, big, compact }: { attempt?: Attempt; run?: number; big?: boolean; compact?: boolean }) {
  const reduced = useReducedMotion();
  const gates: Gate[] = attempt?.gates ?? idlePath();
  const total = attempt ? sequenceLength(gates) : 0;
  const key = `${attempt?.id ?? "none"}:${run}`;
  const [st, setSt] = useState({ key: "", n: 0 });
  useEffect(() => {
    if (!attempt) return;
    if (reduced) { setSt({ key, n: total }); return; }
    let n = Math.min(1, total);
    setSt({ key, n });
    if (total <= 1) return;
    const t = setInterval(() => { n++; setSt({ key, n }); if (n >= total) clearInterval(t); }, STEP_MS);
    return () => clearInterval(t);
  }, [key, reduced, total]); // eslint-disable-line react-hooks/exhaustive-deps
  const revealed = attempt ? (st.key === key ? st.n : 0) : 0;
  const finished = !!attempt && revealed >= total;
  const tone = tokenTone(gates, revealed);

  const wrap = useRef<HTMLDivElement>(null);
  const nodes = useRef<(HTMLElement | null)[]>([]);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => { const on = () => setWidth(innerWidth); addEventListener("resize", on); return () => removeEventListener("resize", on); }, []);
  useLayoutEffect(() => {
    const el = nodes.current[Math.max(0, revealed - 1)], w = wrap.current;
    if (!el || !w || !revealed || el.getClientRects().length === 0) { setPos(null); return; } // a folded gate (narrow screens) has no place to glide to
    const r = el.getBoundingClientRect(), wr = w.getBoundingClientRect();
    setPos({ x: r.left - wr.left + r.width / 2, y: r.top - wr.top + r.height / 2 });
  }, [revealed, key, width]);

  const groups = useMemo(() => groupGates(gates), [gates]);
  const fold = attempt ? collapsiblePrefix(gates) : 0;
  const showRing = !reduced && !!pos && !!attempt;
  const ringColor = tone === "stop" ? "border-ink" : tone === "fooled" ? "border-warning" : "border-accent";

  return (
    <div ref={wrap} data-testid="checks-path" data-kind={attempt?.kind ?? "none"} data-verdict={attempt?.verdict ?? "none"} data-attempt={attempt?.id} data-done={finished ? "true" : "false"} className="relative">
      {fold > 0 && revealed >= fold && <p data-testid="checks-folded" className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-ink2 lg:hidden"><GateIcon state="pass" size={24} />{fold} checks passed</p>}
      <div className={cn("gate-row", !attempt && "max-lg:hidden")}>
        {groups.map((g, gi) => {
          const hidden = (x: (typeof groups)[number]) => x.offset + x.gates.length <= fold;
          return (
          <Fragment key={g.layer}>
            {gi > 0 && <span aria-hidden className={cn("gate-arrow", (hidden(g) || hidden(groups[gi - 1])) && "max-lg:hidden")}><ArrowRight className="size-4" strokeWidth={1.75} /></span>}
            <section aria-label={g.title} className={cn(GroupBg, hidden(g) && "max-lg:hidden")} style={{ flexGrow: g.layer === "contract" ? g.gates.length : 1.4, flexBasis: 0 }}>
              <h3 className="text-[12px] font-semibold uppercase leading-4 tracking-[0.06em] text-muted lg:text-center">{g.title}</h3>
              <p data-testid={`layer-${g.layer}`} className={cn("mb-3 mt-0.5 text-[12px] leading-4 lg:text-center", LAYER_TAG[g.layer].strong ? "font-semibold text-accent" : "text-muted")}>{LAYER_TAG[g.layer].text}</p>
              <ol className="gate-list">
                {g.gates.map((gate, k) => {
                  const idx = g.offset + k;
                  const shown: Gate = idx < revealed ? gate : { ...gate, state: "idle" };
                  const state = shown.state;
                  const w = gateWord(shown);
                  return (
                    <li key={gate.id} data-testid={`gate-${gate.id}`} data-state={state} className={cn("gate", idx < fold && "max-lg:hidden")}>
                      <span ref={(el) => { nodes.current[idx] = el; }} className="relative grid size-8 shrink-0 place-items-center">
                        <GateIcon state={state} layer={gate.layer} draw={!reduced} />
                      </span>
                      <div className="gate-body">
                        <div title={gate.title} className={cn("font-semibold leading-[18px]", big ? "text-[15px]" : "text-[13px]", state === "idle" ? "text-faint" : "text-ink")}>{compact ? <><span aria-hidden>{SHORT[gate.id] ?? gate.title}</span><span className="sr-only">{gate.title}</span></> : gate.title}<span className="sr-only"> {SR[state]}</span></div>
                        {state === "stop" && shown.code && <div className="mt-1.5 flex max-lg:justify-start lg:justify-center"><CodePill code={shown.code} layer={gate.layer} testId={`gate-${gate.id}-code`} /></div>}
                        {state === "stop" && shown.note && <p className="mt-1 text-[12px] leading-4 text-ink2">{shown.note}</p>}
                        {state === "fooled" && <><span className="mt-1.5 inline-flex items-center rounded-full bg-warning-soft px-2.5 py-1 text-[12px] font-bold leading-4 text-warning">Fooled</span>{shown.note && <p className="mt-1 text-[12px] leading-4 text-ink2">{shown.note}</p>}</>}
                        {state === "skip" && <p className="mt-0.5 text-[12px] leading-4 text-muted"><span className="font-semibold">{w.word}</span>{w.text && !compact ? ` · ${w.text}` : ""}</p>}
                        {state === "pass" && shown.note && <p className="mt-0.5 text-[12px] leading-4 text-muted">{shown.note}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          </Fragment>
          );
        })}
      </div>
      {showRing && (
        <span aria-hidden className="pointer-events-none absolute left-0 top-0 z-10" style={{ transform: `translate(${pos!.x}px, ${pos!.y}px)`, transition: "transform 150ms cubic-bezier(0.2, 0.7, 0.2, 1)" }}>
          <span className={cn("absolute -left-[22px] -top-[22px] size-11 rounded-full border-2 transition-colors duration-150", ringColor, finished && tone === "stop" && "ring-shake", finished && tone === "go" && "opacity-0 transition-opacity duration-500")} />
        </span>
      )}
    </div>
  );
}

const VERDICT_TONE: Record<string, string> = { Paid: "bg-accent-soft text-accent", "Not stopped": "bg-negative text-on-accent", Blocked: "bg-ink text-on-accent", Refused: "bg-ink text-on-accent" };

/** The sentence under the path: what happened, which gate decided, and the code. */
export function AttemptHeadline({ a, show = true, big }: { a: Attempt; show?: boolean; big?: boolean }) {
  const { main, sub } = headlineParts(a);
  const stop = a.gates.find((g) => g.state === "stop");
  const word = attemptWord(a);
  const kept = (a.kind === "hijack" || a.kind === "forced") && a.verdict === "blocked" && !!a.amount;
  return (
    <div data-testid="checks-headline" className={cn("flex items-start gap-3 rounded-[14px] bg-canvas px-4 py-3.5 transition-opacity duration-200", show ? "opacity-100" : "opacity-0")}>
      <span aria-hidden className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-full", a.aiFooled ? "bg-warning-soft text-warning" : a.verdict === "paid" && !a.attack ? "bg-accent-soft text-accent" : "bg-accent-soft text-accent")}>
        {a.aiFooled ? <TriangleAlert className="size-4" strokeWidth={2} /> : a.verdict === "paid" ? <Check className="size-4" strokeWidth={2.5} /> : <ShieldCheck className="size-4" strokeWidth={2} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("font-semibold leading-6 [overflow-wrap:anywhere]", big ? "text-[19px] leading-7" : "text-[16px]")}>{main}</p>
        {sub && <p className={cn("mt-0.5 text-ink2 [overflow-wrap:anywhere]", big ? "text-[16px] leading-6" : "text-[14px] leading-5")}>{sub}</p>}
        {kept && <p data-testid="checks-kept" className={cn("mt-1 font-semibold text-accent", big ? "text-[16px] leading-6" : "text-[14px] leading-5")}>US${a.amount} would have left the pocket. US$0.00 did.</p>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-semibold", VERDICT_TONE[word])}>{word}</span>
        {stop && a.code && <span className="hidden sm:block"><CodePill code={a.code} layer={stop.layer} /></span>}
      </div>
    </div>
  );
}

const DOT: Record<string, string> = { paid: "bg-accent", blocked: "bg-ink", refused: "bg-accent" };

export function AttemptStrip({ attempts, selected, onSelect, limit = 14 }: { attempts: Attempt[]; selected?: string; onSelect(id: string): void; limit?: number }) {
  const shown = [...attempts].reverse().slice(0, limit);
  if (!shown.length) return null;
  return (
    <ol data-testid="attempt-strip" aria-label="Recent attempts" className="chip-row -mx-1 mt-3 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
      {shown.map((a) => {
        const on = a.id === selected;
        return (
          <li key={a.id} className="snap-start">
            <button type="button" data-testid="attempt-chip" data-kind={a.kind} data-verdict={a.verdict} aria-pressed={on} onClick={() => onSelect(a.id)}
              className={cn("flex min-h-11 w-[200px] items-start gap-2 rounded-[14px] px-3.5 py-2 text-left text-[13px] transition-colors", on ? "bg-ink text-on-accent" : "bg-canvas text-ink2 hover:bg-fill")}>
              <span aria-hidden className={cn("mt-[5px] size-2 shrink-0 rounded-full", a.aiFooled ? "bg-warning" : on ? "bg-white" : DOT[a.verdict])} />
              <span className="min-w-0 flex-1"><span className="flex items-baseline justify-between gap-2"><span className="font-semibold">{attemptWord(a)}</span><span className={cn("num text-[12px]", on ? "opacity-70" : "text-muted")}>{clock(a.at)}</span></span><span className={cn("block truncate text-[12px] leading-4", on ? "opacity-80" : "text-muted")}>{a.title}</span></span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** The whole panel: the path of one attempt (the latest unless one was picked), its sentence, and the recent attempts to replay. */
export function ChecksPanel({ attempts, present }: { attempts: Attempt[]; present?: boolean }) {
  const [picked, setPicked] = useState<string>();
  const [run, setRun] = useState(0);
  const latest = attempts.at(-1);
  const current = (picked && attempts.find((a) => a.id === picked)) || latest;
  // a new attempt arriving takes over unless the reader has pinned an older one
  const pinned = !!picked && picked !== latest?.id;
  const [doneKey, setDoneKey] = useState("");
  const reduced = useReducedMotion();
  const key = `${current?.id}:${run}`;
  useEffect(() => {
    if (!current) return;
    if (reduced) { setDoneKey(key); return; }
    const t = setTimeout(() => setDoneKey(key), Math.max(1, sequenceLength(current.gates)) * STEP_MS + 120);
    return () => clearTimeout(t);
  }, [key, reduced]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section aria-label="Checks path" className={cn("flex flex-col rounded-[20px] bg-card p-4 sm:p-5", present && "xl:p-4")}>
      <header className="order-1 mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="text-[15px] font-semibold leading-5">Checks path</h2>
        <span className="order-last w-full min-w-0 text-[13px] leading-5 text-muted sm:order-none sm:w-auto sm:flex-1 sm:truncate">{current ? <>{current.title} · <span className="num">{clock(current.at)}</span>{pinned ? " · earlier attempt" : ""}</> : "Every payment and every attack travels this path"}</span>
        {current && <button type="button" onClick={() => setRun((x) => x + 1)} className="relative inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold text-accent before:absolute before:-inset-y-2 before:inset-x-0 before:content-[''] hover:bg-accent-soft"><RotateCcw className="size-3.5" strokeWidth={2} aria-hidden />Replay</button>}
        {pinned && <button type="button" onClick={() => { setPicked(undefined); setRun((x) => x + 1); }} className="relative inline-flex h-8 items-center rounded-full px-2.5 text-[13px] font-semibold text-accent before:absolute before:-inset-y-2 before:inset-x-0 before:content-[''] hover:bg-accent-soft">Back to latest</button>}
      </header>
      <div className="order-3 sm:order-2"><ChecksPath attempt={current} run={run} big={present} compact={present} /></div>
      {current ? <div className="order-2 mb-3 sm:order-3 sm:mb-0 sm:mt-4"><AttemptHeadline a={current} show={doneKey === key} big={present} /></div> : <p className="order-3 mt-4 rounded-[14px] bg-canvas px-4 py-3.5 text-[14px] text-ink2">Waiting for the first payment or attack on this pocket.</p>}
      <div className="order-4">{!present && <AttemptStrip attempts={attempts} selected={current?.id} onSelect={(id) => { setPicked(id === latest?.id ? undefined : id); setRun((x) => x + 1); }} />}</div>
    </section>
  );
}

/** A small, still row of a gate list (arena cards, the explorer): nodes joined by a line, the refusing gate's code beside it. */
export function GateStrip({ attempt }: { attempt: Attempt }) {
  const gates = attempt.gates.slice(0, Math.max(1, sequenceLength(attempt.gates)));
  return (
    <ol data-testid="gate-strip" className="flex flex-wrap items-center gap-x-1 gap-y-2">
      {gates.map((g, i) => (
        <li key={g.id} data-state={g.state} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden className="hidden h-0.5 w-3 rounded bg-line sm:block" />}
          <span title={`${g.title}${g.code ? ` · ${g.code}` : ""}`} className="inline-flex items-center gap-1.5"><GateIcon state={g.state} layer={g.layer} size={22} />{g.state === "stop" ? (g.code ? <CodePill code={g.code} layer={g.layer} /> : <span className="text-[12px] font-medium text-ink2">{g.title}</span>) : <span className="hidden text-[12px] font-medium text-ink2 sm:inline">{g.title}</span>}</span>
        </li>
      ))}
    </ol>
  );
}
