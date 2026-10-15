// Presenter mode's scene stepper: eight numbered steps pinned to the bottom, the selected one with its one-line
// expected outcome and the same Play logic as the Judges tab (typed on the linked phone, or played by the built-in network).
// Its status line comes from the phone's own events (story.ts): what to do next on the phone, "Working…", "Done".
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check, CircleHelp, Play } from "lucide-react";
import { useNetwork } from "./useNetwork";
import { usePlay } from "./play";
import { activeStep } from "./stepRule";
import { copyFor } from "./sceneCopy";
import { Kbd } from "./kit";
import { phoneStatus } from "./story";
import { eventPocket, samePocket } from "../lib/events";
import { Button, Pill } from "../seller/ui";
import { cn } from "../lib/cn";

export function Stepper({ pocket, onExit }: { pocket?: string; onExit?: () => void }) {
  const { scenes, actions, linked, refresh, events, storyScene } = useNetwork();
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

  const running = !!state?.busy || status.kind === "working" || status.kind === "confirm" || status.kind === "approve" || status.kind === "answer";
  const act = activeStep({ ids: scenes.map((x) => x.id), manual: i, storyScene, linked, sent: started?.id, running });
  const s = scenes.length ? scenes[act.index] : undefined;
  const mine = s && state?.id === s.id ? state : undefined;
  // the built-in story plays by itself: the highlight follows it, and a scene it leaves is marked finished
  const driven = act.driven && !linked;
  const lastStory = useRef<string | undefined>(undefined);
  useEffect(() => {
    const prev = lastStory.current;
    lastStory.current = storyScene;
    if (linked) return;
    if (storyScene) { const n = scenes.findIndex((x) => x.id === storyScene); if (n >= 0) setI(n); }
    if (prev && prev !== storyScene && scenes.some((x) => x.id === prev)) setDone((d) => new Set(d).add(prev));
  }, [storyScene, linked, scenes]);

  // keyboard: left and right step through the scenes, Space plays, Escape leaves (typing in a field is left alone)
  const [help, setHelp] = useState(false);
  const keys = useRef({ n: 0, go: () => {}, exit: () => {}, help: false, setHelp: (() => {}) as (v: boolean) => void });
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || t?.closest("input, textarea, select, [contenteditable], [role='dialog']")) return;
      if (e.key === "ArrowRight") { setI((x) => Math.min(x + 1, keys.current.n - 1)); e.preventDefault(); }
      else if (e.key === "ArrowLeft") { setI((x) => Math.max(x - 1, 0)); e.preventDefault(); }
      else if ((e.key === " " || e.key === "Enter") && !t?.closest("button, a")) { keys.current.go(); e.preventDefault(); }
      else if (e.key === "r" || e.key === "R") window.dispatchEvent(new Event("cb:reset-score"));
      else if (e.key === "e" || e.key === "E") location.hash = "evidence";
      else if (e.key === "?") keys.current.setHelp(!keys.current.help);
      else if (e.key === "Escape") { if (keys.current.help) keys.current.setHelp(false); else keys.current.exit(); }
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
  keys.current = { n: scenes.length, go: () => { if (canPlay && !state?.busy && !driven) void begin(() => play(s)); }, exit: () => onExit?.(), help, setHelp };
  const storyLine = storyScene === "A" ? "Playing · privilege escalation" : storyScene ? `Playing · scene ${storyScene}` : "";
  const line = failed ? mine.text : driven ? storyLine : mine?.busy ? (linked ? "Sent to the phone…" : "Playing…") : status.text;
  const kind = failed ? "error" : driven ? "working" : status.kind;
  const tone = cn("font-medium", failed ? "text-negative" : kind === "done" ? "text-accent" : kind === "working" || kind === "idle" ? "text-ink2" : "text-ink");
  return (
    <section ref={root} aria-label="Scenes" className="fixed inset-x-3 bottom-3 z-30 mx-auto max-w-[1100px] rounded-[20px] bg-card px-3 py-2.5 shadow-[0_8px_24px_rgba(17,19,24,0.08)] sm:px-4">
      <div className="flex items-center gap-3">
        <ol className="chip-row flex min-w-0 shrink-0 gap-1 overflow-x-auto max-md:flex-1">
          {scenes.map((x, n) => {
            const fin = done.has(x.id), on = n === act.index;
            return (
              <li key={x.id} className="shrink-0">
                <button type="button" title={`${x.title}${copyFor(x.id) ? `: ${copyFor(x.id)!.seeing}` : ""}`} onClick={() => setI(n)} aria-label={`Scene ${x.id}: ${x.title}${fin ? " (finished)" : ""}`} aria-current={on ? "step" : undefined}
                  className={cn("num grid size-11 place-items-center rounded-full text-[14px] font-semibold transition-colors md:size-10", on ? (driven ? "bg-accent text-on-accent ring-2 ring-accent ring-offset-2" : "bg-accent text-on-accent") : fin ? "bg-ink text-on-accent hover:bg-ink2" : "bg-fill text-ink2 hover:bg-line")}>
                  {fin && !on ? <Check className="size-4" strokeWidth={2.5} aria-hidden /> : x.id}
                </button>
              </li>
            );
          })}
        </ol>
        <div className="hidden min-w-0 flex-1 items-center gap-x-3 md:flex">
          <span className="shrink-0 text-[15px] font-semibold">{s.title}</span>
          {c && <Pill tone={c.tone} className="shrink-0">{c.outcome}</Pill>}
          <p role="status" data-testid="stepper-status" data-kind={kind} className={cn("min-w-0 truncate text-[14px] leading-5", tone)}>{line}{!failed && !driven && status.kind === "done" && started && <span className="font-normal text-muted"> · scene {started.id} finished</span>}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" aria-label="Keyboard shortcuts" aria-expanded={help} onClick={() => setHelp((h) => !h)} className="hidden size-10 place-items-center rounded-full text-muted hover:bg-fill hover:text-ink md:grid"><CircleHelp className="size-5" strokeWidth={1.75} aria-hidden /></button>
          {mine?.ok && s.followUp && mine.step === "scene" && <Button variant="outline" className="h-10 px-4" disabled={mine.busy} onClick={() => void begin(() => followUp(s))}>Then send</Button>}
          <Button className="h-11 px-5 max-md:size-11 max-md:px-0 md:h-10" aria-label={`Play scene ${s.id}`} disabled={!canPlay || !!state?.busy || driven} onClick={() => void begin(() => play(s))}><Play className="size-4" strokeWidth={1.75} /><span className="max-md:sr-only">{mine?.busy ? "Playing…" : driven ? "Story playing" : "Play"}</span></Button>
        </div>
      </div>
      {help && (
        <div data-testid="shortcuts" role="dialog" aria-label="Keyboard shortcuts" className="absolute bottom-full right-0 mb-2 w-[min(320px,100%)] rounded-[20px] bg-card p-4 shadow-[0_8px_24px_rgba(17,19,24,0.08)]">
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">Shortcuts</h3>
          <dl className="space-y-2 text-[14px]">
            {([["Space / Enter", "Play the selected scene"], ["← →", "Previous / next scene"], ["R", "Reset the scorecard"], ["E", "Open Evidence"], ["?", "This list"], ["Esc", "Exit presenter"]] as const).map(([k, v]) => <div key={k} className="flex items-center justify-between gap-4"><dt><Kbd>{k}</Kbd></dt><dd className="text-ink2">{v}</dd></div>)}
          </dl>
        </div>
      )}
      <p role="status" aria-hidden className={cn("mt-1.5 truncate text-[13px] leading-5 md:hidden", tone)}>{s.title}{line ? ` · ${line}` : ""}</p>
    </section>
  );
}
