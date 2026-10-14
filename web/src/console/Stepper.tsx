// Presenter mode's scene stepper: eight numbered steps pinned to the bottom, the selected one with its one-line
// expected outcome and the same Play logic as the Judges tab (typed on the linked phone, or played by the built-in network).
// Its status line comes from the phone's own events (story.ts): what to do next on the phone, "Working…", "Done".
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check, Play } from "lucide-react";
import { useNetwork } from "./useNetwork";
import { usePlay } from "./play";
import { copyFor } from "./sceneCopy";
import { phoneStatus } from "./story";
import { eventPocket, samePocket } from "../lib/events";
import { Button, Pill } from "../seller/ui";
import { cn } from "../lib/cn";

export function Stepper({ pocket }: { pocket?: string }) {
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
  const status = useMemo(() => {
    const evs = events.filter((e) => samePocket(eventPocket(e), target));
    return phoneStatus(evs, { since: started?.at, linked, now: Date.now() });
  }, [events, target, started, linked, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 5000); return () => clearInterval(t); }, []); // a quiet phone ages out of "Working…"

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
  const line = failed ? mine.text : mine?.busy ? (linked ? "Sent to the phone…" : "Playing…") : status.text;
  return (
    <section ref={root} aria-label="Scenes" className="fixed inset-x-3 bottom-3 z-30 mx-auto max-w-[1100px] rounded-[20px] bg-card p-3 shadow-[0_8px_24px_rgba(17,19,24,0.08)] sm:p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 sm:flex-nowrap">
        <ol className="flex shrink-0 gap-1.5">
          {scenes.map((x, n) => (
            <li key={x.id}>
              <button type="button" onClick={() => setI(n)} aria-label={`Scene ${x.id}: ${x.title}${done.has(x.id) ? " (finished)" : ""}`} aria-current={n === i ? "step" : undefined}
                className={cn("num relative grid size-11 place-items-center rounded-full text-[15px] font-semibold transition-colors", n === i ? "bg-accent text-on-accent" : done.has(x.id) ? "bg-accent-soft text-accent hover:bg-line" : "bg-fill text-ink2 hover:bg-line")}>
                {done.has(x.id) && n !== i ? <Check className="size-5" strokeWidth={2.25} aria-hidden /> : x.id}
                {done.has(x.id) && n === i && <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-card text-accent" aria-hidden><Check className="size-3" strokeWidth={3} /></span>}
              </button>
            </li>
          ))}
        </ol>
        <div className="min-w-0 flex-1 basis-60">
          <div className="flex flex-wrap items-center gap-2"><span className="text-[16px] font-semibold">{s.title}</span>{c && <Pill tone={c.tone}>{c.outcome}</Pill>}</div>
          <p className="mt-0.5 text-[14px] leading-5 text-ink2">{c?.seeing ?? s.note}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {mine?.ok && s.followUp && mine.step === "scene" && <Button variant="outline" disabled={mine.busy} onClick={() => void begin(() => followUp(s))}>Then send</Button>}
          <Button disabled={!canPlay || !!state?.busy} onClick={() => void begin(() => play(s))}><Play className="size-4" strokeWidth={1.75} />{mine?.busy ? "Playing…" : "Play"}</Button>
        </div>
      </div>
      {line && <p role="status" data-testid="stepper-status" data-kind={failed ? "error" : status.kind} className={cn("mt-2 pl-1 text-[14px] font-medium", failed ? "text-negative" : status.kind === "done" ? "text-accent" : status.kind === "working" || status.kind === "idle" ? "text-ink2" : "text-ink")}>{line}{!failed && status.kind === "done" && started && <span className="font-normal text-muted"> · scene {started.id} finished</span>}</p>}
    </section>
  );
}
