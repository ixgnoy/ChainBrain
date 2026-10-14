// The task confirmation card: the server's fixed three-line template (Buy / Price / Deadline), never rewritten by the AI.
import React from "react";
import { View } from "react-native";
import { c } from "../tokens";
import { Button } from "../ui/kit";
import { T } from "../ui/Text";
import { Rise, firstTime } from "../ui/Rise";
import { haptic } from "../haptics";
import { cleanText } from "../lib/sanitize";

const LABEL: Record<string, string> = { Buy: "Buy", Price: "Limits", Deadline: "Deadline" };
export const parseIntent = (text: string) =>
  cleanText(text, 600).split("\n").map((l) => { const i = l.indexOf(":"); return i > 0 && i < 12 ? { k: l.slice(0, i), v: l.slice(i + 1).trim() } : { k: "", v: l.trim() }; }).filter((x) => x.v);

export function IntentCard({ text, onConfirm, onDecline, busy, error, flat, enter, title = "Your agent wants to start this task" }: { title?: string; text: string; onConfirm?(): void; onDecline?(): void; busy?: boolean; error?: string | null; flat?: boolean; /** chat: enter once (scale 0.96 to 1, 12 pt rise, snappy) with a medium haptic: the owner is needed */ enter?: boolean | string }) {
  const rows = parseIntent(text);
  const card = (
    <View style={{ borderRadius: 20, backgroundColor: flat ? c.canvas : c.canvas, padding: 16, gap: 12 }}>
      <T v="row" w="semi">{title}</T>
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
