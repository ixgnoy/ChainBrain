// The checks path: Agent → Wallet tools → Pocket contract (ERC-1271) → Seller, with the gates of one attempt lit in order.
// A ring glides from gate to gate (about 150 ms each) and stops, with a small shake, at the gate that refused. Driven only
// by the wallet's events (shared/sim/checks.ts), so it reads the same on the built-in network, a linked phone and a server.
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Minus, RotateCcw, ShieldCheck, TriangleAlert, X } from "lucide-react";
import type { Attempt, Gate, GateState } from "@sim/checks";
import { attemptWord, gateWord, groupGates, headlineParts, idlePath, sequenceLength, tokenTone } from "./checksView";
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

const NODE: Record<GateState, string> = {
  pass: "bg-accent text-on-accent",
  stop: "bg-negative text-on-accent",
  skip: "bg-fill text-faint",
  fooled: "bg-warning-soft text-warning ring-2 ring-warning",
  idle: "bg-canvas text-faint ring-1 ring-inset ring-line",
};
const GroupBg = "gate-group";

export function GateIcon({ state, size = 32, draw }: { state: GateState; size?: number; draw?: boolean }) {
  const cls = "size-[55%]";
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-full transition-colors duration-200", NODE[state])} style={{ width: size, height: size }}>
      {state === "pass" ? <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" className={draw ? "tick-draw" : undefined} /></svg>
        : state === "stop" ? <X className={cls} strokeWidth={2.75} />
        : state === "fooled" ? <TriangleAlert className={cls} strokeWidth={2.25} />
        : state === "skip" ? <Minus className={cls} strokeWidth={2.5} />
        : <span className="size-1.5 rounded-full bg-faint opacity-60" />}
    </span>
  );
}

const SR: Record<GateState, string> = { pass: "passed", stop: "stopped it", skip: "not needed or bypassed", fooled: "fooled", idle: "not reached" };

export function ChecksPath({ attempt, run = 0, big }: { attempt?: Attempt; run?: number; big?: boolean }) {
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
    if (!el || !w || !revealed) { setPos(null); return; }
    const r = el.getBoundingClientRect(), wr = w.getBoundingClientRect();
    setPos({ x: r.left - wr.left + r.width / 2, y: r.top - wr.top + r.height / 2 });
  }, [revealed, key, width]);

  const groups = useMemo(() => groupGates(gates), [gates]);
  const showRing = !reduced && !!pos && !!attempt;
  const ringColor = tone === "stop" ? "border-negative" : tone === "fooled" ? "border-warning" : "border-accent";

  return (
    <div ref={wrap} data-testid="checks-path" data-kind={attempt?.kind ?? "none"} data-verdict={attempt?.verdict ?? "none"} data-attempt={attempt?.id} data-done={finished ? "true" : "false"} className="relative">
      <div className="gate-row">
        {groups.map((g, gi) => (
          <Fragment key={g.layer}>
            {gi > 0 && <span aria-hidden className="gate-arrow"><ArrowRight className="size-4" strokeWidth={1.75} /></span>}
            <section aria-label={g.title} className={cn(GroupBg, "max-lg:mt-0")} style={{ flexGrow: g.gates.length, flexBasis: 0 }}>
              <h3 className="mb-3 text-[12px] font-semibold uppercase leading-4 tracking-[0.06em] text-muted lg:text-center">{g.title}</h3>
              <ol className="gate-list">
                {g.gates.map((gate, k) => {
                  const idx = g.offset + k;
                  const shown: Gate = idx < revealed ? gate : { ...gate, state: "idle" };
                  const state = shown.state;
                  const w = gateWord(shown);
                  return (
                    <li key={gate.id} data-testid={`gate-${gate.id}`} data-state={state} className="gate">
                      <span ref={(el) => { nodes.current[idx] = el; }} className="relative grid size-8 shrink-0 place-items-center">
                        <GateIcon state={state} draw={!reduced} />
                      </span>
                      <div className="gate-body">
                        <div className={cn("font-semibold leading-[18px]", big ? "text-[15px]" : "text-[13px]", state === "idle" ? "text-faint" : "text-ink")}>{gate.title}<span className="sr-only"> {SR[state]}</span></div>
                        {state === "stop" && shown.code && <span data-testid={`gate-${gate.id}-code`} className="mt-1.5 inline-flex max-w-full items-center break-all rounded-full bg-negative-soft px-2.5 py-1 text-[12px] font-bold leading-4 tracking-[0.02em] text-negative">{shown.code}</span>}
                        {state === "stop" && shown.note && <p className="mt-1 text-[12px] leading-4 text-ink2">{shown.note}</p>}
                        {state === "fooled" && <><span className="mt-1.5 inline-flex items-center rounded-full bg-warning-soft px-2.5 py-1 text-[12px] font-bold leading-4 text-warning">Fooled</span>{shown.note && <p className="mt-1 text-[12px] leading-4 text-ink2">{shown.note}</p>}</>}
                        {state === "skip" && <p className="mt-0.5 text-[12px] leading-4 text-muted"><span className="font-semibold">{w.word}</span>{w.text ? ` · ${w.text}` : ""}</p>}
                        {state === "pass" && shown.note && <p className="mt-0.5 text-[12px] leading-4 text-muted">{shown.note}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          </Fragment>
        ))}
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
  return (
    <div data-testid="checks-headline" className={cn("mt-4 flex items-start gap-3 rounded-[14px] bg-canvas px-4 py-3.5 transition-opacity duration-200", show ? "opacity-100" : "opacity-0")}>
      <span aria-hidden className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-full", a.aiFooled ? "bg-warning-soft text-warning" : a.verdict === "paid" && !a.attack ? "bg-accent-soft text-accent" : "bg-accent-soft text-accent")}>
        {a.aiFooled ? <TriangleAlert className="size-4" strokeWidth={2} /> : a.verdict === "paid" ? <Check className="size-4" strokeWidth={2.5} /> : <ShieldCheck className="size-4" strokeWidth={2} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("font-semibold leading-6 [overflow-wrap:anywhere]", big ? "text-[22px] leading-8" : "text-[16px]")}>{main}</p>
        {sub && <p className={cn("mt-0.5 text-ink2 [overflow-wrap:anywhere]", big ? "text-[16px] leading-6" : "text-[14px] leading-5")}>{sub}</p>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-semibold", VERDICT_TONE[word])}>{word}</span>
        {stop && a.code && <span className="num hidden text-[12px] font-bold text-negative sm:block">{a.code}</span>}
      </div>
    </div>
  );
}

const DOT: Record<string, string> = { paid: "bg-accent", blocked: "bg-ink", refused: "bg-warning" };

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
              className={cn("inline-flex h-11 max-w-[260px] items-center gap-2 rounded-full px-3.5 text-left text-[13px] transition-colors", on ? "bg-ink text-on-accent" : "bg-canvas text-ink2 hover:bg-fill")}>
              <span aria-hidden className={cn("size-2 shrink-0 rounded-full", a.aiFooled ? "bg-warning" : DOT[a.verdict])} />
              <span className="min-w-0 truncate"><span className="font-semibold">{attemptWord(a)}</span><span className={on ? "opacity-80" : "text-muted"}> · {a.title}</span></span>
              <span className={cn("num hidden shrink-0 text-[12px] sm:inline", on ? "opacity-70" : "text-muted")}>{clock(a.at)}</span>
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
    <section aria-label="Checks path" className={cn("rounded-[20px] bg-card p-4 sm:p-5", present && "sm:p-6")}>
      <header className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="text-[15px] font-semibold leading-5">Checks path</h2>
        <span className="min-w-0 flex-1 truncate text-[13px] text-muted">{current ? <>{current.title} · <span className="num">{clock(current.at)}</span>{pinned ? " · earlier attempt" : ""}</> : "Every payment and every attack travels this path"}</span>
        {current && <button type="button" onClick={() => setRun((x) => x + 1)} className="relative inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold text-accent before:absolute before:-inset-y-2 before:inset-x-0 before:content-[''] hover:bg-accent-soft"><RotateCcw className="size-3.5" strokeWidth={2} aria-hidden />Replay</button>}
        {pinned && <button type="button" onClick={() => { setPicked(undefined); setRun((x) => x + 1); }} className="relative inline-flex h-8 items-center rounded-full px-2.5 text-[13px] font-semibold text-accent before:absolute before:-inset-y-2 before:inset-x-0 before:content-[''] hover:bg-accent-soft">Back to latest</button>}
      </header>
      <ChecksPath attempt={current} run={run} big={present} />
      {current ? <AttemptHeadline a={current} show={doneKey === key} big={present} /> : <p className="mt-4 rounded-[14px] bg-canvas px-4 py-3.5 text-[14px] text-ink2">Waiting for the first payment or attack on this pocket.</p>}
      {!present && <AttemptStrip attempts={attempts} selected={current?.id} onSelect={(id) => { setPicked(id === latest?.id ? undefined : id); setRun((x) => x + 1); }} />}
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
          {i > 0 && <span aria-hidden className="h-0.5 w-3 rounded bg-line" />}
          <span title={`${g.title}${g.code ? ` · ${g.code}` : ""}`} className="inline-flex items-center gap-1.5"><GateIcon state={g.state} size={22} /><span className={cn("text-[12px] font-medium", g.state === "stop" ? "font-bold text-negative" : "text-ink2")}>{g.state === "stop" ? g.code ?? g.title : <span className="hidden sm:inline">{g.title}</span>}</span></span>
        </li>
      ))}
    </ol>
  );
}
