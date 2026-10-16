// Named things the auto-play (lib/autoplay.ts) can press, the way a finger would. A screen registers a target while
// it is mounted; the handler plays the real gesture (press dip, knob slide, hold fill, typing) and then calls the same
// function a person's tap would. The latest registration of a name wins, so a sheet on top of a screen takes over.
// No React Native imports: Node tests load this file (the hook only needs React).
import { useEffect, useRef } from "react";

export type TargetName =
  | "home.newPocket"      // Home: "New pocket" round action (opens the wizard)
  | "wizard.preset"       // wizard step 1: pick a preset; arg: "research" | "one-purchase"
  | "wizard.continue"     // wizard: Continue
  | "wizard.create"       // wizard last step: slide to create and fund (resolves when the slide commits)
  | "wizard.open"         // wizard success: "Open pocket"
  | "composer"            // Agent: type `arg.text` at a natural pace into the input, then press send (resolves once sent)
  | "question.answer"     // question sheet: tap one-tap answer number `arg` (0 = first)
  | "intent.confirm"      // intent card: Confirm
  | "approval.slide"      // approval sheet: slide to approve (resolves when the slide commits)
  | "revoke.open"         // Agent: the Stop button beside the composer (opens the revoke sheet)
  | "revoke.hold"         // revoke sheet: hold to revoke (resolves when the hold completes)
  | "return.open"         // stopped card: Return funds (opens the return sheet)
  | "return.slide"        // return sheet: slide to return
  | "picker.open"         // Agent header: the pocket name (opens the pocket picker)
  | "picker.pocket"       // pocket picker: pick the pocket named `arg`
  | "deadend.fix"         // dead-end card: "Raise cap and budget to …"
  | "rules.slide"         // rules sheet: slide to save
  | "deadend.askAgain"    // dead-end card after the fix: "Ask again, max …"
  | "home.connect"        // Home: "Connect" tile (opens Connect)
  | "connect.agent"       // Connect: pick the agent `arg` ("claude" | "chatgpt")
  | "connect.copy"        // Connect: Copy link (the agent then opens it and asks for consent)
  | "consent.allow"       // consent sheet: slide to allow (creates and funds the agent's new pocket)
  | "consent.done"        // consent success: "See Claude" (opens the agent's page)
  | "inbox.open"          // Home header: the bell (opens the Approvals inbox)
  | "inbox.review"        // Approvals inbox: review the first waiting request of agent `arg` (opens the approval sheet)
  | "dock.open"           // the ask dock: open the newest waiting request of `arg` {agent, kind} (the cheque)
  | "radar.open"          // a Radar alert card or row: open the Radar alert page
  | "sheet.close"         // any open sheet that should be dismissed (success screens)
  | "home.compose"        // Home: "New pocket app" (opens the compose flow)
  | "compose.text"        // compose: type `arg.text` into the sentence field, then compose (resolves when the app has assembled)
  | "compose.create"      // compose: slide to create the pocket app (resolves when the slide commits)
  | "compose.open"        // compose success: open the new pocket app (the card flies into it)
  | "compose.manual"      // compose: "Set it up step by step instead" (the wizard)
  | "routine.runNow";     // pocket app: "Run … next … now"

/** Return false when the control cannot act yet (not laid out, disabled): the press is retried. */
type Handler = (arg?: any) => unknown | Promise<unknown>;
const stacks = new Map<TargetName, Handler[]>();
const watchers = new Set<() => void>();
const changed = () => watchers.forEach((f) => f());

export function registerTarget(name: TargetName, h: Handler): () => void {
  const s = stacks.get(name) ?? [];
  s.push(h); stacks.set(name, s); changed();
  return () => { const x = stacks.get(name); if (!x) return; const i = x.lastIndexOf(h); if (i >= 0) x.splice(i, 1); changed(); };
}
export const hasTarget = (name: TargetName) => (stacks.get(name)?.length ?? 0) > 0;
/** Tests: forget every target. */
export const resetTargets = () => { stacks.clear(); changed(); };

/** Waits up to `ms` for the target to be on screen, then runs it. False when it never showed up. */
export async function pressTarget(name: TargetName, arg?: unknown, ms = 8000, alive: () => boolean = () => true): Promise<boolean> {
  if (!hasTarget(name)) {
    const ok = await new Promise<boolean>((res) => {
      const done = (v: boolean) => { clearTimeout(t); clearInterval(iv); watchers.delete(on); res(v); };
      const t = setTimeout(() => done(false), ms);
      const iv = setInterval(() => { if (!alive()) done(false); }, 200); // a stopped auto-play stops waiting too
      const on = () => { if (hasTarget(name)) done(true); };
      watchers.add(on);
    });
    if (!ok || !alive()) return false;
  }
  // a handler that cannot act yet (a slide before layout, a disabled control) returns false: try again until `ms`
  const until = Date.now() + ms;
  for (;;) {
    const s = stacks.get(name);
    const r = s?.length ? await s[s.length - 1](arg) : false;
    if (r !== false) return true;
    if (!alive() || Date.now() > until) return false;
    await new Promise((res) => setTimeout(res, 250));
  }
}

/** Registers `handler` under `name` while the component is mounted (and `enabled`). The latest handler is always used. */
export function useAutoplayTarget(name: TargetName, handler: Handler, enabled = true) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => (enabled ? registerTarget(name, (a) => ref.current(a)) : undefined), [name, enabled]);
}

// ---- auto-play running state (screens hide nothing; the Agent header uses it for the long-press toggle)
let running = false;
let run = 0; // bumps on every start and stop: a gesture from an earlier run never commits into a later one
const runWatchers = new Set<() => void>();
export const autoplayRunning = () => running;
/** The current run's id: a long handler takes it when it starts, then checks `autoplayAlive(id)` before committing. */
export const autoplayRun = () => run;
/** True while auto-play runs (and, given `id`, while it is still the same run that started the gesture). */
export const autoplayAlive = (id?: number) => running && (id == null || id === run);
export const setAutoplayRunning = (on: boolean) => { run++; if (running !== on) { running = on; runWatchers.forEach((f) => f()); } };
export const onAutoplay = (f: () => void) => { runWatchers.add(f); return () => void runWatchers.delete(f); };

/** Types `text` one character at a time with a human rhythm (faster inside words, a beat after punctuation). */
export async function typeOut(text: string, onText: (sofar: string) => void, o: { cps?: number; cancelled?: () => boolean; sleep?: (ms: number) => Promise<void> } = {}) {
  const sleep = o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const base = 1000 / (o.cps ?? 26);
  let seed = text.length * 7919;
  const jitter = () => { seed = (seed * 16807) % 2147483647; return (seed / 2147483647 - 0.5) * base * 0.8; };
  for (let i = 1; i <= text.length; i++) {
    if (o.cancelled?.()) return;
    onText(text.slice(0, i));
    const ch = text[i - 1];
    await sleep(Math.max(12, base + jitter() + (/[.,!?]/.test(ch) ? base * 3 : ch === " " ? base * 0.6 : 0)));
  }
}
