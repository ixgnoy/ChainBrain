// What the agent did during a turn, in plain words. While the turn runs the steps are open: each enters fade + 6 pt rise (60 ms
// apart when batched) with a status mark (dot -> turning ring -> drawn check / X). When the turn finishes the list folds into one
// "Details · N steps" line (height animates, smooth) and opens again on tap, chevron rotating. Tool names appear only in the rows.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { c, motion } from "../tokens";
import { CodePill, Press } from "../ui/kit";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { StepMark, type StepState } from "../ui/StepMark";
import { Rise, useStagger } from "../ui/Rise";
import { EASE_OUT, settle, useReduceMotion } from "../ui/motion";
import { cleanText } from "../lib/sanitize";
import { plainReason } from "../lib/plain";
import { traceLines, type TraceLine, type WalletEvent } from "../lib/events";

const cap1 = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
export const STEP: Record<string, string> = {
  get_pocket: "Checked the pocket", search_sellers: "Looked for sellers", draft_intent: "Wrote the task for your OK", get_quote: "Asked for a price",
  ask_owner: "Asked you", pay: "Paid", ask_user: "Asked you a question",
};

/** One step: mark + words. The label dims a little once the step is finished (a refused step stays full strength). */
function StepRow({ l, delay }: { l: TraceLine; delay: number }) {
  const dim = useSharedValue(l.state === "run" ? 1 : l.state === "ok" ? 0.78 : 1);
  useEffect(() => { dim.value = withTiming(l.state === "ok" || l.state === "ask" ? 0.78 : 1, { duration: 220, easing: EASE_OUT }); }, [l.state]); // eslint-disable-line react-hooks/exhaustive-deps
  const a = useAnimatedStyle(() => ({ opacity: dim.value }));
  const mark: StepState = l.kind === "think" ? "idle" : l.state;
  return (
    <Rise delay={Math.max(delay, 0)} instant={delay < 0} dy={6} layout style={{ flexDirection: "row", gap: 10 }}>
      <View style={{ paddingTop: 1 }}><StepMark state={mark} /></View>
      <Animated.View style={[{ flex: 1, gap: 2 }, a]}>
        <T v="sub" color="ink2">{l.kind === "tool" ? `${STEP[l.tool ?? ""] ?? "Took a step"} (${l.tool})` : cleanText(l.text, 160)}</T>
        {l.reasons.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
            <T v="cap" color="muted" style={{ flexShrink: 1 }}>{l.reasons.map((r) => cap1(plainReason(r))).join(", ")}</T>
            {l.reasons.map((r) => <CodePill key={r} code={r} tone={l.state === "ask" ? "warning" : "negative"} />)}
          </View>
        ) : l.summary ? <T v="cap" color="muted">{cleanText(l.summary, 120)}</T> : null}
      </Animated.View>
    </Rise>
  );
}

/** `live`: the turn is still running (steps open). Once it ends the block folds, unless the owner toggled it by hand. */
export function TraceBlock({ events, live = false }: { events: WalletEvent[]; live?: boolean }) {
  const reduce = useReduceMotion();
  const lines = useMemo(() => traceLines(events), [events]);
  const [manual, setManual] = useState<boolean | null>(null);
  const open = manual ?? live;
  const delays = useStagger(lines.map((l) => l.key), 60, 8);

  // height animation: the list is measured inside an absolutely placed box, the clip follows it
  const h = useSharedValue(0);
  const full = useRef(0);
  const measured = useRef(false);
  const openRef = useRef(open);
  openRef.current = open;
  const turn = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    settle(turn, open ? 1 : 0, reduce, motion.spring.smooth);
    if (measured.current) settle(h, open ? full.current : 0, reduce, motion.spring.smooth);
  }, [open, reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  const clip = useAnimatedStyle(() => ({ height: h.value, opacity: Math.min(1, h.value / 24) }));
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 180}deg` }] }));

  if (!lines.length) return null;
  const steps = lines.filter((l) => l.kind === "tool").length;
  return (
    <View>
      <Press haptics="select" scale={0.99} onPress={() => setManual(!open)} accessibilityRole="button" accessibilityLabel="Details" accessibilityState={{ expanded: open }} style={{ flexDirection: "row", alignItems: "center", gap: 4, minHeight: 36, alignSelf: "flex-start" }}>
        <T v="sub" w="semi" color="muted">Details · {steps} step{steps === 1 ? "" : "s"}</T>
        <Animated.View style={chevron}><Icon name="chevronDown" size={16} color={c.muted} /></Animated.View>
      </Press>
      <Animated.View aria-hidden={!open} pointerEvents={open ? "auto" : "none"} style={[{ overflow: "hidden" }, clip]}>
        <View
          onLayout={(e) => {
            const next = e.nativeEvent.layout.height;
            full.current = next;
            if (!measured.current) { measured.current = true; h.value = openRef.current ? next : 0; }
            else if (openRef.current) settle(h, next, reduce, motion.spring.smooth);
          }}
          style={{ position: "absolute", left: 0, right: 0, top: 0, gap: 10, paddingTop: 4, paddingBottom: 2 }}
        >
          {lines.map((l) => <StepRow key={l.key} l={l} delay={delays[l.key] ?? 0} />)}
        </View>
      </Animated.View>
    </View>
  );
}
