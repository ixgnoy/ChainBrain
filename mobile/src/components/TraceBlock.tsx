// What the agent did during a turn, as an assistant-ui style tool timeline (adapted from assistant-ui's react-native
// `tool-timeline.tsx` + `reasoning.tsx`, MIT, (c) assistant-ui; see mobile/THIRD_PARTY.md): a one-line trigger and, when opened, a
// vertical timeline (2 px line, 8 px dots, 14/20 steps, the tool name as a small chip). While the turn runs the trigger is ONE live
// line ("Asking for a price..." with the turning ring); when it ends it folds to "7 steps" 13/18 600 muted with a chevron. The list
// stays mounted inside a clipped box so its height animates (smooth spring) and its text is always readable by assistive tech.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { c, motion } from "../tokens";
import { CodePill, Press } from "../ui/kit";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { RunRing } from "../ui/StepMark";
import { Rise, useStagger } from "../ui/Rise";
import { WorkingDots } from "../ui/WorkingLine";
import { settle, useReduceMotion } from "../ui/motion";
import { cleanText } from "../lib/sanitize";
import { plainReason } from "../lib/plain";
import { traceLines, type TraceLine, type WalletEvent } from "../lib/events";

const cap1 = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
export const STEP: Record<string, string> = {
  get_pocket: "Checked the pocket", search_sellers: "Looked for sellers", draft_intent: "Wrote the task for your OK", get_quote: "Asked for a price",
  ask_owner: "Asked you", pay: "Paid", ask_user: "Asked you a question",
};
const ACTIVE: Record<string, string> = {
  get_pocket: "Checking the pocket…", search_sellers: "Looking for sellers…", draft_intent: "Writing the task for your OK…", get_quote: "Asking for a price…",
  ask_owner: "Waiting for you…", pay: "Paying…", ask_user: "Asking you a question…",
};

const DOT = { ok: c.accent, idle: c.faint, refused: c.ink2, ask: c.warning } as const;
/** 8 px dot (the turning ring while the step runs); the timeline line passes behind it. */
function Dot({ state }: { state: TraceLine["state"] | "idle" }) {
  if (state === "run") return <RunRing size={14} />;
  return <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: DOT[state] }} />;
}

/** One timeline step: dot, the plain sentence, the tool name as a quiet chip, then why (plain words + codes) or the summary. */
function StepRow({ l, delay, last }: { l: TraceLine; delay: number; last: boolean }) {
  const mark = l.kind === "think" ? "idle" : l.state;
  return (
    <Rise delay={Math.max(delay, 0)} instant={delay < 0} dy={6} layout style={{ flexDirection: "row", gap: 12 }}>
      <View style={{ width: 14, alignItems: "center", paddingTop: 5 }}>
        <View style={{ height: 14, alignItems: "center", justifyContent: "center" }}><Dot state={mark} /></View>
        {last ? null : <View style={{ position: "absolute", top: 19, bottom: -12, width: 2, borderRadius: 1, backgroundColor: c.line }} />}
      </View>
      <View style={{ flex: 1, gap: 4, paddingBottom: 2 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <T v="sub" color="ink2" style={{ flexShrink: 1 }}>{l.kind === "tool" ? STEP[l.tool ?? ""] ?? "Took a step" : cleanText(l.text, 160)}</T>
          {l.kind === "tool" && l.tool ? <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: c.fill }}><T v="cap" color="ink2" style={{ fontSize: 11, lineHeight: 14 }}>{l.tool}</T></View> : null}
        </View>
        {l.reasons.length ? (
          <View style={{ gap: 4 }}>
            <T v="cap" color="muted">{l.reasons.map((r) => cap1(plainReason(r))).join(", ")}</T>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{l.reasons.map((r) => <CodePill key={r} code={r} />)}</View>
          </View>
        ) : l.summary ? <T v="cap" color="muted">{cleanText(l.summary, 120)}</T> : null}
      </View>
    </Rise>
  );
}

/** `live`: the turn is still running (one live line). Once it ends the block folds, unless the owner toggled it by hand. */
export function TraceBlock({ events, live = false }: { events: WalletEvent[]; live?: boolean }) {
  const reduce = useReduceMotion();
  const lines = useMemo(() => traceLines(events), [events]);
  const [manual, setManual] = useState<boolean | null>(null);
  const open = manual ?? false;
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
  const steps = lines.filter((l) => l.kind === "tool").length || lines.length;
  const tail = lines.at(-1);
  const now = tail?.kind === "tool" && tail.state === "run" ? ACTIVE[tail.tool ?? ""] ?? "Working on it…" : "Working on it…";
  return (
    <View>
      <Press haptics="select" scale={0.99} onPress={() => setManual(!open)} accessibilityRole="button" accessibilityLabel={live ? `${now} Steps` : "Steps"} accessibilityState={{ expanded: open }} style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 36, alignSelf: "flex-start" }}>
        {live ? <><RunRing size={16} /><T v="sub" color="muted">{now}</T><WorkingDots /></> : <T v="cap" w="semi" color="muted">{steps} step{steps === 1 ? "" : "s"}</T>}
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
          style={{ position: "absolute", left: 0, right: 0, top: 0, gap: 12, paddingTop: 6, paddingBottom: 4, paddingLeft: 2 }}
        >
          {lines.map((l, i) => <StepRow key={l.key} l={l} delay={delays[l.key] ?? 0} last={i === lines.length - 1} />)}
        </View>
      </Animated.View>
    </View>
  );
}
