import timeline from "./timeline.json";
import words from "./vo-words.json";

type W = { w: string; s: number; e: number };
const AT = new Map(timeline.vo.map((v) => [v.id, v.at]));
const WORDS = words as Record<string, W[]>;

/** Absolute second a voice-over line starts. */
export const voAt = (id: string) => AT.get(id) ?? 0;

/** Absolute second the `nth` word of line `id` starting with `word` (case-insensitive) is spoken. */
export function wordAt(id: string, word: string, nth = 0): number {
  const k = word.toLowerCase();
  let n = 0;
  for (const w of WORDS[id] ?? []) {
    if (w.w.toLowerCase().replace(/[^a-z0-9-]/g, "").startsWith(k)) {
      if (n === nth) return voAt(id) + w.s;
      n++;
    }
  }
  return voAt(id);
}

/** Absolute second line `id` finishes. */
export function voEnd(id: string): number {
  const ws = WORDS[id] ?? [];
  return voAt(id) + (ws.length ? ws[ws.length - 1].e : 0);
}

export const sceneStart = (id: string) => timeline.scenes.find((s) => s.id === id)?.start ?? 0;
export const sceneEnd = (id: string) => timeline.scenes.find((s) => s.id === id)?.end ?? 0;
