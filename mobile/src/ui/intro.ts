// Whether the first-launch intro is still showing. It shows on every launch; Home waits for it so its entrance plays as the
// intro lets go instead of behind it. No React Native imports.
import { useSyncExternalStore } from "react";

let done = false;
const subs = new Set<() => void>();
export const introDone = () => done;
export function finishIntro() { if (!done) { done = true; subs.forEach((f) => f()); } }
export const useIntroDone = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => done, () => done);
