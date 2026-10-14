// What the agent did during a turn, in plain words, collapsed behind a "Details" row. Tool names appear only inside it.
import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { c } from "../tokens";
import { Press } from "../ui/kit";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { cleanText } from "../lib/sanitize";
import { plainReason } from "../lib/plain";
import { traceLines, type WalletEvent } from "../lib/events";

const STEP: Record<string, string> = {
  get_pocket: "Checked the pocket", search_sellers: "Looked for sellers", draft_intent: "Wrote the task for your OK", get_quote: "Asked for a price",
  ask_owner: "Asked you", pay: "Paid", ask_user: "Asked you a question",
};

export function TraceBlock({ events }: { events: WalletEvent[] }) {
  const lines = useMemo(() => traceLines(events), [events]);
  const [open, setOpen] = useState(false);
  if (!lines.length) return null;
  const steps = lines.filter((l) => l.kind === "tool").length;
  return (
    <View>
      <Press haptics="select" scale={0.99} onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityLabel="Details" accessibilityState={{ expanded: open }} style={{ flexDirection: "row", alignItems: "center", gap: 4, minHeight: 36, alignSelf: "flex-start" }}>
        <T v="sub" w="semi" color="muted">Details · {steps} step{steps === 1 ? "" : "s"}</T>
        <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}><Icon name="chevronDown" size={16} color={c.muted} /></View>
      </Press>
      {open ? (
        <View style={{ gap: 10, paddingTop: 4 }}>
          {lines.map((l) => (
            <View key={l.key} style={{ gap: 2 }}>
              <T v="sub" color="ink2">{l.kind === "tool" ? `${STEP[l.tool ?? ""] ?? "Took a step"} (${l.tool})` : cleanText(l.text, 160)}</T>
              {l.reasons.length ? <T v="cap" color="muted">{l.reasons.map((r) => `${plainReason(r)} (${r})`).join(", ")}</T> : l.summary ? <T v="cap" color="muted">{cleanText(l.summary, 120)}</T> : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
