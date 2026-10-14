// What the agent did during a turn, in plain words, collapsed behind a "Details" row. Tool names appear only inside it.
import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { c } from "../tokens";
import { CodePill, Press } from "../ui/kit";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { cleanText } from "../lib/sanitize";
import { plainReason } from "../lib/plain";
import { traceLines, type WalletEvent } from "../lib/events";

const cap1 = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
export const STEP: Record<string, string> = {
  get_pocket: "Checked the pocket", search_sellers: "Looked for sellers", draft_intent: "Wrote the task for your OK", get_quote: "Asked for a price",
  ask_owner: "Asked you", pay: "Paid", ask_user: "Asked you a question",
};

/** `defaultOpen`: expanded until the owner toggles it (the latest agent turn starts expanded: judges watch the decision being made). */
export function TraceBlock({ events, defaultOpen = false }: { events: WalletEvent[]; defaultOpen?: boolean }) {
  const lines = useMemo(() => traceLines(events), [events]);
  const [manual, setManual] = useState<boolean | null>(null);
  const open = manual ?? defaultOpen;
  if (!lines.length) return null;
  const steps = lines.filter((l) => l.kind === "tool").length;
  return (
    <View>
      <Press haptics="select" scale={0.99} onPress={() => setManual(!open)} accessibilityRole="button" accessibilityLabel="Details" accessibilityState={{ expanded: open }} style={{ flexDirection: "row", alignItems: "center", gap: 4, minHeight: 36, alignSelf: "flex-start" }}>
        <T v="sub" w="semi" color="muted">Details · {steps} step{steps === 1 ? "" : "s"}</T>
        <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}><Icon name="chevronDown" size={16} color={c.muted} /></View>
      </Press>
      {open ? (
        <View style={{ gap: 10, paddingTop: 4 }}>
          {lines.map((l) => (
            <View key={l.key} style={{ gap: 2 }}>
              <T v="sub" color="ink2">{l.kind === "tool" ? `${STEP[l.tool ?? ""] ?? "Took a step"} (${l.tool})` : cleanText(l.text, 160)}</T>
              {l.reasons.length ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                  <T v="cap" color="muted" style={{ flexShrink: 1 }}>{l.reasons.map((r) => cap1(plainReason(r))).join(", ")}</T>
                  {l.reasons.map((r) => <CodePill key={r} code={r} tone={l.state === "ask" ? "warning" : "negative"} />)}
                </View>
              ) : l.summary ? <T v="cap" color="muted">{cleanText(l.summary, 120)}</T> : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
