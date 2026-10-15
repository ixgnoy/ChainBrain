// Playing a scene: on a linked phone the console types it to the phone's agent (the owner still confirms there);
// otherwise the built-in network plays it here. One piece of logic for the Judges tab and the presenter stepper.
import { useCallback, useRef, useState } from "react";
import type { Actions, Scene, SayResult } from "./network";

export const PLAY_TIMEOUT_MS = 15_000;
export const NO_ANSWER = "The phone did not answer in time. Open the Agent tab on the phone and try again.";

export type PlayState = { id: string; step: "scene" | "follow"; busy: boolean; ok?: boolean; text?: string; pocket?: string };

const within = <T,>(p: Promise<T>, ms: number): Promise<T | "timeout"> =>
  new Promise((res, rej) => { const t = setTimeout(() => res("timeout"), ms); p.then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); }); });

/** Sends one line to the linked phone and always comes back with something to show. */
export async function sayOnPhone(say: NonNullable<Actions["say"]>, text: string, preset?: string | null, ms = PLAY_TIMEOUT_MS): Promise<SayResult> {
  try {
    const r = await within(say(text, preset), ms);
    return r === "timeout" ? { ok: false, text: NO_ANSWER } : { ok: !!r.ok, text: r.text || (r.ok ? "Sent to the phone." : "The phone could not do that."), pocket: r.pocket };
  } catch (e) { return { ok: false, text: (e as Error).message || NO_ANSWER }; }
}

export function usePlay(actions: Actions, linked: boolean, refresh?: () => void) {
  const [state, setState] = useState<PlayState>();
  const live = useRef(0);
  const run = useCallback(async (scene: Scene, step: "scene" | "follow") => {
    const mine = ++live.current;
    const set = (s: Partial<PlayState>) => { if (live.current === mine) setState((x) => ({ id: scene.id, step, busy: false, ...(x?.id === scene.id ? x : {}), ...s })); };
    setState({ id: scene.id, step, busy: true });
    if (linked && actions.say) {
      const text = step === "scene" ? scene.text : scene.followUp ?? "";
      const r = await sayOnPhone(actions.say, text, step === "scene" ? scene.preset : null);
      set({ busy: false, step, ok: r.ok, text: r.text, pocket: r.pocket });
    } else if (actions.runScene) {
      try { const r = await actions.runScene(scene.id); set({ busy: false, step, ok: true, text: "Played. Watch it in Live.", pocket: r?.pocket }); }
      catch (e) { set({ busy: false, step, ok: false, text: (e as Error).message || "That scene could not run." }); }
    } else set({ busy: false, step, ok: false, text: "Scenes can be played when the built-in network or a linked phone is on." });
    refresh?.();
  }, [actions, linked, refresh]);
  return {
    state,
    canPlay: !!((linked && actions.say) || actions.runScene),
    play: (s: Scene) => run(s, "scene"),
    followUp: (s: Scene) => run(s, "follow"),
    clear: () => { live.current++; setState(undefined); },
  };
}

/** Plays one scene once and says how it went: typed to the linked phone, or run by the built-in network. */
export async function playScene(actions: Actions, linked: boolean, scene: Scene): Promise<SayResult> {
  if (linked && actions.say) return sayOnPhone(actions.say, scene.text, scene.preset);
  if (actions.runScene) {
    try { const r = await actions.runScene(scene.id); return { ok: true, text: "Played.", pocket: r?.pocket }; }
    catch (e) { return { ok: false, text: (e as Error).message || "That scene could not run." }; }
  }
  return { ok: false, text: "Scenes can be played when the built-in network or a linked phone is on." };
}
