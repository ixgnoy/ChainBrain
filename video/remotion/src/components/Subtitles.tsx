import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import lines from "../vo-lines.json";
import timeline from "../timeline.json";
import words from "../vo-words.json";
import zhSubs from "../subs-zh.json";
import { C, F } from "../theme";
import { TYPESET } from "../scenes/Face";
import { TEAM_LINE } from "../scenes/V3";

type Word = { w: string; s: number; e: number };
export type Page = { id: string; text: string; start: number; end: number; zh?: string };

// Optional Simplified Chinese line under each English page: one entry per English sentence (subs-zh.json).
const ZH = zhSubs as { enabled: boolean; lines: Record<string, string[]> };
// a word ends a sentence on . ? ! (but not inside an initialism such as "A.I.")
const endsSentence = (w: string) => /[.?!]$/.test(w) && !/^([A-Z]\.)+$/.test(w);

// A Chinese sentence may carry "|" split points: when it spans as many English pages as it has parts, each page
// shows its part; otherwise (a new voice moves the page breaks) every page shows the whole sentence.
function assignZh(linePages: { p: Page; ks: number[] }[], zh: string[]) {
  linePages.forEach(({ p, ks }, j) => {
    const text = ks
      .map((k) => {
        const parts = (zh[k] ?? "").split("|");
        const span = linePages.filter((x) => x.ks.includes(k));
        if (parts.length > 1 && span.length === parts.length && ks.length === 1) return parts[span.findIndex((x) => x === linePages[j])];
        return parts.join("");
      })
      .join("");
    p.zh = text || undefined;
  });
}

// Burned-in English subtitles: the script's words, timed by Whisper, at most two lines a page.
export function buildPages(): Page[] {
  const pages: Page[] = [];
  const at = new Map(timeline.vo.map((v) => [v.id, v.at]));
  for (const line of lines as { id: string; text: string }[]) {
    const t0 = at.get(line.id);
    const ws = (words as Record<string, Word[]>)[line.id];
    if (t0 === undefined || !ws) continue;
    const zh = ZH.enabled ? ZH.lines[line.id] : undefined;
    // sentence index of each word, so a page shows the Chinese of the sentences it covers
    const sent: number[] = [];
    ws.reduce((k, w) => (sent.push(k), endsSentence(w.w) ? k + 1 : k), 0);
    let cur: Word[] = [];
    let first = 0;
    const linePages: { p: Page; ks: number[] }[] = [];
    const flush = () => {
      if (!cur.length) return;
      const ks = [...new Set(sent.slice(first, first + cur.length))];
      const p: Page = { id: line.id, text: cur.map((w) => w.w).join(" "), start: t0 + cur[0].s - 0.05, end: t0 + cur[cur.length - 1].e + 0.3 };
      linePages.push({ p, ks });
      pages.push(p);
      first += cur.length;
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
    if (zh) assignZh(linePages, zh);
  }
  // readable for non-native viewers (at most ~17 characters a second), but never overlapping the next page
  for (let i = 0; i < pages.length; i++) {
    pages[i].end = Math.max(pages[i].end, pages[i].start + pages[i].text.length / 17);
    if (i < pages.length - 1) pages[i].end = Math.min(pages[i].end, pages[i + 1].start - 0.02);
  }
  return pages;
}

const PAGES = buildPages();
// a line the picture already sets in big type (an on-camera clip's line beside the face, the team slide's headline)
// isn't repeated at the bottom (the .srt keeps it)
const SHOWN = PAGES.filter((p) => !TYPESET.has(p.id) && p.id !== TEAM_LINE);

export const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const i = SHOWN.findIndex((x) => t >= x.start && t < x.end);
  if (i < 0) return null;
  const p = SHOWN[i];
  const fadeIn = Math.min(1, (t - p.start) / 0.12);
  const fadeOut = Math.min(1, (p.end - t) / 0.12);
  // the Chinese line holds steady when the next page continues the same sentence
  const prev = SHOWN[i - 1];
  const next = SHOWN[i + 1];
  const zhIn = prev && prev.zh === p.zh && p.start - prev.end < 0.2 ? 1 : fadeIn;
  const zhOut = next && next.zh === p.zh && next.start - p.end < 0.2 ? 1 : fadeOut;
  const zhOpacity = p.zh ? Math.min(zhIn, zhOut) : 0;
  const en = Math.min(fadeIn, fadeOut);
  const box = Math.max(en, zhOpacity);
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
        opacity: box,
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
          textWrap: "balance",
        }}
      >
        <div style={{ opacity: en / box }}>{p.text}</div>
        {p.zh ? (
          <div style={{ opacity: zhOpacity / box, fontFamily: F.cjk, fontWeight: 500, fontSize: 33, lineHeight: 1.35, color: "rgba(242,241,238,0.86)", marginTop: 4, letterSpacing: "0.02em" }}>
            {p.zh}
          </div>
        ) : null}
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
  return PAGES.map((p, i) => `${i + 1}\n${ts(p.start)} --> ${ts(p.end)}\n${p.text}${p.zh ? `\n${p.zh}` : ""}\n`).join("\n");
}
