import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import lines from "../vo-lines.json";
import timeline from "../timeline.json";
import words from "../vo-words.json";
import { C, F } from "../theme";

type Word = { w: string; s: number; e: number };
export type Page = { text: string; start: number; end: number };

// Burned-in English subtitles: the script's words, timed by Whisper, at most two lines a page.
export function buildPages(): Page[] {
  const pages: Page[] = [];
  const at = new Map(timeline.vo.map((v) => [v.id, v.at]));
  for (const line of lines as { id: string; text: string }[]) {
    const t0 = at.get(line.id);
    const ws = (words as Record<string, Word[]>)[line.id];
    if (t0 === undefined || !ws) continue;
    let cur: Word[] = [];
    const flush = () => {
      if (!cur.length) return;
      pages.push({ text: cur.map((w) => w.w).join(" "), start: t0 + cur[0].s - 0.05, end: t0 + cur[cur.length - 1].e + 0.3 });
      cur = [];
    };
    ws.forEach((w, i) => {
      cur.push(w);
      const chars = cur.map((x) => x.w).join(" ").length;
      const rest = ws.length - i - 1;
      const punct = /[.,:;?!]$/.test(w.w);
      const end = /[.?!]$/.test(w.w) && !/^([A-Z]\.)+$/.test(w.w); // "A.I." doesn't end a sentence
      if ((end && chars >= 20 && rest > 0) || (punct && chars >= 45 && rest >= 3) || chars >= 84) flush();
    });
    flush();
  }
  // readable for non-native viewers (at most ~17 characters a second), but never overlapping the next page
  for (let i = 0; i < pages.length; i++) {
    pages[i].end = Math.max(pages[i].end, pages[i].start + pages[i].text.length / 17);
    if (i < pages.length - 1) pages[i].end = Math.min(pages[i].end, pages[i + 1].start - 0.02);
  }
  return pages;
}

const PAGES = buildPages();

export const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const p = PAGES.find((x) => t >= x.start && t < x.end);
  if (!p) return null;
  const fadeIn = Math.min(1, (t - p.start) / 0.12);
  const fadeOut = Math.min(1, (p.end - t) / 0.12);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 34,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        opacity: Math.min(fadeIn, fadeOut),
        zIndex: 20,
      }}
    >
      <div
        style={{
          maxWidth: 1340,
          padding: "10px 24px 12px",
          borderRadius: 14,
          background: "rgba(8,9,11,0.78)",
          color: C.text,
          fontFamily: F.body,
          fontWeight: 600,
          fontSize: 38,
          lineHeight: 1.3,
          textAlign: "center",
          letterSpacing: "0.005em",
        }}
      >
        {p.text}
      </div>
    </div>
  );
};

/** SRT text of the same pages, for the .srt delivered beside the MP4. */
export function srt(): string {
  const ts = (s: number) => {
    const ms = Math.round(s * 1000);
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    const r = ms % 1000;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(r).padStart(3, "0")}`;
  };
  return PAGES.map((p, i) => `${i + 1}\n${ts(p.start)} --> ${ts(p.end)}\n${p.text}\n`).join("\n");
}
