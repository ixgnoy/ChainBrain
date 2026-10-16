// The task confirmation card: the server's fixed three-line template (Buy / Price / Deadline), never rewritten by the AI.
import React from "react";
import { View } from "react-native";
import { c, radius } from "../tokens";
import { Button } from "../ui/kit";
import { T } from "../ui/Text";
import { Rise, firstTime } from "../ui/Rise";
import { haptic } from "../haptics";
import { cleanText } from "../lib/sanitize";

const LABEL: Record<string, string> = { Buy: "Buy", Price: "Limits", Deadline: "Deadline" };
/** "2026-10-15 23:59 HKT" (the server's fixed template) as the owner says it: "Tonight, 23:59", "Tomorrow, 09:00", "17 Oct, 23:59". */
export function deadlineWords(v: string, now = new Date()): string {
  const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}) HKT$/.exec(v.trim());
  if (!m) return v;
  const d = new Date(Date.parse(`${m[1]}T${m[2]}:00+08:00`));
  if (Number.isNaN(d.getTime())) return v;
  const hm = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(d) - day(now)) / 86_400_000);
  if (diff === 0) return `${d.getHours() >= 18 ? "Tonight" : "Today"}, ${hm}`;
  if (diff === 1) return `Tomorrow, ${hm}`;
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, ${hm}`;
}
export const parseIntent = (text: string) =>
  cleanText(text, 600).split("\n").map((l) => { const i = l.indexOf(":"); return i > 0 && i < 12 ? { k: l.slice(0, i), v: l.slice(i + 1).trim() } : { k: "", v: l.trim() }; })
    .filter((x) => x.v).map((x) => (x.k === "Deadline" ? { ...x, v: deadlineWords(x.v) } : x));

export function IntentCard({ text, onConfirm, onDecline, busy, error, flat, enter, title = "Your agent wants to start this task" }: { title?: string; text: string; onConfirm?(): void; onDecline?(): void; busy?: boolean; error?: string | null; flat?: boolean; /** chat: enter once (scale 0.96 to 1, 12 pt rise, snappy) with a medium haptic: the owner is needed */ enter?: boolean | string }) {
  const rows = parseIntent(text);
  const card = (
    <View style={{ borderRadius: radius.tile, borderCurve: "continuous", backgroundColor: flat ? c.canvas : c.canvas, padding: 16, gap: 12 }}>
      <T v="head">{title}</T>
      {rows.map((r, i) => (
        <View key={i} style={{ gap: 1 }}>
          {r.k ? <T v="cap" color="muted">{LABEL[r.k] ?? r.k}</T> : null}
          <T v="body" w={r.k === "Buy" ? "semi" : "regular"}>{r.v}</T>
        </View>
      ))}
      {error ? <T v="sub" color="negative">{error}</T> : null}
      {(onConfirm || onDecline) && (
        <View style={{ gap: 8, marginTop: 4 }}>
          {onConfirm && <Button label="Confirm" loading={busy} onPress={onConfirm} />}
          {onDecline && <Button label="Decline" kind="text" disabled={busy} onPress={onDecline} />}
        </View>
      )}
    </View>
  );
  return enter ? <Rise from={0.96} dy={12} spring="snappy" exit onEnter={() => { if (firstTime(`intent:${typeof enter === "string" ? enter : text}`)) haptic.medium(); }}>{card}</Rise> : card;
}
