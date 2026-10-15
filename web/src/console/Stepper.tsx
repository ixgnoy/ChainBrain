// Presenter mode's scene stepper: eight numbered steps pinned to the bottom, the selected one with its one-line
// expected outcome and the same Play logic as the Judges tab (typed on the linked phone, or played by the built-in network).
// Its status line comes from the phone's own events (story.ts): what to do next on the phone, "Working…", "Done".
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check, Play } from "lucide-react";
import { useNetwork } from "./useNetwork";
import { usePlay } from "./play";
import { copyFor, shortFor } from "./sceneCopy";
import { Kbd } from "./kit";
import { phoneStatus } from "./story";
import { eventPocket, samePocket } from "../lib/events";
import { Button, Pill } from "../seller/ui";
import { cn } from "../lib/cn";

export function Stepper({ pocket, onExit }: { pocket?: string; onExit?: () => void }) {
  const { scenes, actions, linked, refresh, events } = useNetwork();
  const { state, play, followUp, canPlay } = usePlay(actions, linked, refresh);
  const [i, setI] = useState(0);
  const [done, setDone] = useState<Set<string>>(() => new Set());
  const [started, setStarted] = useState<{ id: string; at: number }>();
  const [tick, setTick] = useState(0);
  const root = useRef<HTMLElement>(null);

  // the columns above reserve exactly this much room, however tall the status line makes it
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty("--stepper-h", `${Math.ceil(el.getBoundingClientRect().height) + 12}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => { ro.disconnect(); document.documentElement.style.removeProperty("--stepper-h"); };
  }, [scenes.length]);

  const s = scenes.length ? scenes[Math.min(i, scenes.length - 1)] : undefined;
  const mine = s && state?.id === s.id ? state : undefined;
  const target = started && state?.id === started.id ? state?.pocket ?? pocket : pocket;
  // a linked phone has its own clock: how far it runs from this laptop, read when its newest event arrived
  const skew = useRef(0);
  useMemo(() => { skew.current = linked && events.length ? Math.max(...events.slice(-20).map((e) => e.at)) - Date.now() : 0; }, [events.length, linked]); // eslint-disable-line react-hooks/exhaustive-deps
  const status = useMemo(() => {
    const evs = events.filter((e) => samePocket(eventPocket(e), target));
    const k = Math.abs(skew.current) > 1500 ? skew.current : 0; // small differences are just latency
    return phoneStatus(evs, { since: started ? started.at + k : undefined, linked, now: Date.now() + k });
  }, [events, target, started, linked, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 5000); return () => clearInterval(t); }, []); // a quiet phone ages out of "Working…"

  // keyboard: left and right step through the scenes, Space plays, Escape leaves (typing in a field is left alone)
  const keys = useRef({ n: 0, go: () => {}, exit: () => {} });
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || t?.closest("input, textarea, select, [contenteditable], [role='dialog']")) return;
      if (e.key === "ArrowRight") { setI((x) => Math.min(x + 1, keys.current.n - 1)); e.preventDefault(); }
      else if (e.key === "ArrowLeft") { setI((x) => Math.max(x - 1, 0)); e.preventDefault(); }
      else if (e.key === " " && !t?.closest("button, a")) { keys.current.go(); e.preventDefault(); }
      else if (e.key === "Escape") keys.current.exit();
    };
    addEventListener("keydown", on);
    return () => removeEventListener("keydown", on);
  }, []);

  // a finished turn marks its scene and moves the highlight to the next one
  useEffect(() => {
    if (status.kind !== "done" || !started || state?.busy || done.has(started.id)) return;
    setDone((d) => new Set(d).add(started.id));
    const n = scenes.findIndex((x) => x.id === started.id);
    if (n >= 0 && n < scenes.length - 1) setI((cur) => (cur === n ? n + 1 : cur));
  }, [status.kind, started, state?.busy, scenes, done]);

  if (!s) return null;
  const c = copyFor(s.id);
  const begin = (fn: () => Promise<void>) => { setStarted({ id: s.id, at: Date.now() }); return fn(); };
  const failed = mine && !mine.busy && !mine.ok;
  keys.current = { n: scenes.length, go: () => { if (canPlay && !state?.busy) void begin(() => play(s)); }, exit: () => onExit?.() };
  const line = failed ? mine.text : mine?.busy ? (linked ? "Sent to the phone…" : "Playing…") : status.text;
  return (
    <section ref={root} aria-label="Scenes" className="fixed inset-x-3 bottom-3 z-30 mx-auto max-w-[1100px] rounded-[20px] bg-card p-3 shadow-[0_8px_24px_rgba(17,19,24,0.08)] sm:p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 sm:flex-nowrap">
        <ol className="flex shrink-0 gap-1">
          {scenes.map((x, n) => {
            const fin = done.has(x.id), on = n === i;
            return (
              <li key={x.id} className="flex w-11 flex-col items-center gap-1 xl:w-[60px]">
                <button type="button" title={x.title} onClick={() => setI(n)} aria-label={`Scene ${x.id}: ${x.title}${fin ? " (finished)" : ""}`} aria-current={on ? "step" : undefined}
                  className={cn("num grid size-11 place-items-center rounded-full text-[15px] font-semibold transition-colors", on ? "bg-accent text-on-accent" : fin ? "bg-ink text-on-accent hover:bg-ink2" : "bg-fill text-ink2 hover:bg-line")}>
                  {fin && !on ? <Check className="size-5" strokeWidth={2.25} aria-hidden /> : x.id}
                </button>
                <span aria-hidden className={cn("hidden w-full truncate text-center text-[12px] leading-4 xl:block", on ? "font-semibold text-ink" : "text-muted")}>{shortFor(x.id)}</span>
              </li>
            );
          })}
        </ol>
        <div className="min-w-0 flex-1 basis-60">
          <div className="flex flex-wrap items-center gap-2"><span className="text-[16px] font-semibold">{s.title}</span>{c && <Pill tone={c.tone}>{c.outcome}</Pill>}</div>
          <p className="mt-0.5 text-[14px] leading-5 text-ink2">{c?.seeing ?? s.note}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="mr-2 hidden items-center gap-1.5 text-[12px] text-muted 2xl:inline-flex" aria-hidden><Kbd>←</Kbd><Kbd>→</Kbd>step<Kbd>Space</Kbd>play</span>
          {mine?.ok && s.followUp && mine.step === "scene" && <Button variant="outline" disabled={mine.busy} onClick={() => void begin(() => followUp(s))}>Then send</Button>}
          <Button disabled={!canPlay || !!state?.busy} onClick={() => void begin(() => play(s))}><Play className="size-4" strokeWidth={1.75} />{mine?.busy ? "Playing…" : "Play"}</Button>
        </div>
      </div>
      <p role="status" data-testid="stepper-status" data-kind={failed ? "error" : status.kind} className={cn("mt-2 min-h-10 pl-1 text-[14px] leading-5 font-medium", failed ? "text-negative" : status.kind === "done" ? "text-accent" : status.kind === "working" || status.kind === "idle" ? "text-ink2" : "text-ink")}>{line}{!failed && status.kind === "done" && started && <span className="font-normal text-muted"> · scene {started.id} finished</span>}</p>
    </section>
  );
}
