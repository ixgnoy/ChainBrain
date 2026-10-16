// Whether the intro is still showing. It shows on the first launch (and when replayed from Settings); Home waits for it so its
// entrance plays as the intro lets go instead of behind it. No React Native imports.
import { useSyncExternalStore } from "react";

let done = false;
const subs = new Set<() => void>();
export const introDone = () => done;
export function finishIntro() { if (!done) { done = true; subs.forEach((f) => f()); } }
export const useIntroDone = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => done, () => done);

/** Settings' "How ChainBrain works" asks the shell to show the intro again. */
const replays = new Set<() => void>();
export const replayIntro = () => replays.forEach((f) => f());
export function onReplayIntro(f: () => void) { replays.add(f); return () => { replays.delete(f); }; }
/** Storage key: set once the owner has been through (or skipped) the intro. */
export const INTRO_SEEN_KEY = "cb.introSeen";
