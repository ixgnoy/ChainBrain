// The intent confirm card: the server's fixed three-line template (Buy / Price / Deadline), rendered in our style. Never rewritten by the AI.
import React from "react";
import { View } from "react-native";
import { useTheme } from "../theme";
import { Button } from "../ui/primitives";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { cleanText } from "../lib/sanitize";
import { radius } from "../tokens";

const LABEL: Record<string, string> = { Buy: "Buy", Price: "Limits", Deadline: "Deadline" };
export const parseIntent = (text: string) =>
  cleanText(text, 600).split("\n").map((l) => { const i = l.indexOf(":"); return i > 0 && i < 12 ? { k: l.slice(0, i), v: l.slice(i + 1).trim() } : { k: "", v: l.trim() }; }).filter((x) => x.v);

export function IntentCard({ text, onConfirm, onDecline, busy, error, compact }: { text: string; onConfirm?(): void; onDecline?(): void; busy?: boolean; error?: string | null; compact?: boolean }) {
  const { c } = useTheme();
  const rows = parseIntent(text);
  return (
    <View style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: c.infoBorder, backgroundColor: c.bgElev1, overflow: "hidden" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 12, backgroundColor: c.infoBg }}>
        <Icon name="sparkle" size={16} color={c.agent} />
        <T v="bodySm" weight="semi" style={{ flex: 1 }}>Confirm this task</T>
        <T v="caption" color="text3">fixed template</T>
      </View>
      <View style={{ padding: 14, gap: 10 }}>
        {rows.map((r, i) => (
          <View key={i} style={{ gap: 2 }}>
            {r.k ? <T v="caption" color="text3">{(LABEL[r.k] ?? r.k).toUpperCase()}</T> : null}
            <T v="bodySm" weight={r.k === "Buy" ? "semi" : undefined}>{r.v}</T>
          </View>
        ))}
        {!compact && <T v="caption" color="text3">Your agent can only spend within this task. It is shown from a fixed template, not written by the AI.</T>}
        {error ? <T v="bodySm" color="refused">{error}</T> : null}
        {(onConfirm || onDecline) && (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 2 }}>
            {onDecline && <Button label="Decline" kind="secondary" small style={{ flex: 1 }} disabled={busy} onPress={onDecline} />}
            {onConfirm && <Button label="Confirm" small style={{ flex: 1 }} loading={busy} onPress={onConfirm} />}
          </View>
        )}
      </View>
    </View>
  );
}
