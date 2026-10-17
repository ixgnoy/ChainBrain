// New pocket app, after the slide: the pocket builds itself in front of the owner, on a black stage. The draft card sits in
// the middle as a blueprint (dashed, faded); each step below runs the real thing and shows what it produced: the contract
// is deployed (the card turns solid and takes its real address), the rules written in that same transaction land as chips,
// the agent gets its key (its mark on the card), the money moves from the main wallet (the balance rolls up), the app's
// blocks fly into place, and the card is live. Each step lasts at least its minimum time so a room can follow it; the
// work itself is never faked: a step is done only when its transaction or call has returned.
import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { c, motion } from "../../tokens";
import { T } from "../../ui/Text";
import { Icon, type IconName } from "../../ui/Icon";
import { Button } from "../../ui/kit";
import { useReduceMotion } from "../../ui/motion";
import { PocketFace, cardHeight, type Tone } from "../PocketFace";
import { useCoverDock } from "../AskDock";
import type { Pocket } from "../../store";

export type StepKey = "check" | "deploy" | "rules" | "key" | "fund" | "arrange" | "live";
export type StepState = { key: StepKey; title: string; icon: IconName; status: "wait" | "run" | "done"; detail?: string };
export const BLOCK_NAME: Record<string, string> = {
  shelf: "Library", "price-chart": "Price chart", "month-spend": "This month", ladder: "Offers", budget: "This week", "next-run": "Next run",
  runs: "Runs", library: "Bought", sources: "Sources", renewals: "Renewals", "price-changes": "Price changes", savings: "Saved", guard: "Will never",
};

export function BuildStage({ steps, pocket, tone, width, blocks, chips, sellers, agentId, solid, onOpen, title }: {
  steps: StepState[]; pocket: Pocket; tone: Tone; width: number; blocks: string[]; /** the rules as written */ chips: string[];
  sellers: string[]; agentId: string; /** the contract exists: the card turns solid */ solid: boolean; onOpen?: () => void; title: string;
}) {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  useCoverDock(true); // the ask dock would sit on the stage
  const cw = Math.min(width - 64, 300);
  const at = (k: StepKey) => steps.find((s) => s.key === k)?.status;
  // the blueprint turns into the card when the contract is deployed
  const real = useSharedValue(solid ? 1 : 0);
  useEffect(() => { real.value = reduce ? (solid ? 1 : 0) : withSpring(solid ? 1 : 0, motion.spring.deck); }, [solid, reduce, real]);
  const card = useAnimatedStyle(() => ({ opacity: 0.35 + 0.65 * real.value, transform: [{ scale: 0.94 + 0.06 * real.value }] }));
  const blueprint = useAnimatedStyle(() => ({ opacity: 1 - real.value }));
  const done = at("live") === "done";
  return (
    <Animated.View entering={FadeIn.duration(motion.base)} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 30, backgroundColor: c.ink, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }}
      accessibilityViewIsModal accessibilityLiveRegion="polite">
      <T v="cap" w="semi" style={{ color: "rgba(255,255,255,0.6)", textAlign: "center" }}>{done ? "Live on the test network" : "Building on the test network"}</T>
      <T v="section" style={{ color: c.white, textAlign: "center", marginTop: 4 }} numberOfLines={1}>{title}</T>

      {/* the card: blueprint first, then the real thing */}
      <View style={{ alignItems: "center", marginTop: 18, height: cardHeight(cw) + 76 }}>
        <Animated.View style={card}>
          <PocketFace pocket={pocket} width={cw} tone={tone} still draft={!solid} />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, width: cw, height: cardHeight(cw), borderRadius: 18, borderWidth: 2, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.7)" }, blueprint]} />
        {/* the rules, landing on the card as they are written */}
        {at("rules") === "done" || at("rules") === "run" ? (
          <View style={{ position: "absolute", top: cardHeight(cw) + 14, flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "center", width: cw + 40 }}>
            {chips.map((t, i) => (
              <Animated.View key={t} entering={reduce ? undefined : FadeInDown.delay(i * 140).duration(260)} style={{ height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: c.white, justifyContent: "center" }}>
                <T v="cap" w="semi">{t}</T>
              </Animated.View>
            ))}
          </View>
        ) : null}
      </View>

      {/* the steps */}
      <View style={{ flex: 1, marginTop: 18, paddingHorizontal: 28, gap: 12 }}>
        {steps.map((st) => (
          <React.Fragment key={st.key}>
            <StepRow s={st} />
            {st.key === "arrange" && st.status !== "wait" ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, paddingLeft: 40, marginTop: -4 }}>
                {blocks.map((b, i) => (
                  <Animated.View key={b} entering={reduce ? undefined : FadeInDown.delay(i * 160).duration(260)} style={{ height: 24, paddingHorizontal: 8, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.12)", justifyContent: "center" }}>
                    <T v="cap" w="semi" style={{ color: c.white, fontSize: 11 }}>{BLOCK_NAME[b] ?? b}</T>
                  </Animated.View>
                ))}
              </View>
            ) : null}
          </React.Fragment>
        ))}
      </View>

      {done && onOpen ? (
        <Animated.View entering={reduce ? undefined : FadeInDown.duration(motion.base)} style={{ paddingHorizontal: 20 }}>
          <Button label="Open the pocket app" icon="arrowUpRight" kind="vermillion" auto="compose.open" onPress={onOpen} />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

function StepRow({ s }: { s: StepState }) {
  const reduce = useReduceMotion();
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (s.status === "run" && !reduce) pulse.value = withRepeat(withSequence(withTiming(0.4, { duration: 500 }), withTiming(1, { duration: 500 })), -1);
    else pulse.value = withTiming(1, { duration: 120 });
  }, [s.status, reduce, pulse]);
  const ring = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const on = s.status !== "wait";
  return (
    <View accessible accessibilityLabel={`${s.title}${s.status === "done" ? ", done" : s.status === "run" ? ", in progress" : ""}${s.detail ? `. ${s.detail}` : ""}`}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, opacity: on ? 1 : 0.35 }}>
      <Animated.View style={[{ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: s.status === "done" ? c.vermillion : "rgba(255,255,255,0.14)" }, ring]}>
        <Icon name={s.status === "done" ? "check" : s.icon} size={14} color={c.white} stroke={2.4} />
      </Animated.View>
      <View style={{ flex: 1 }}>
        <T v="row" w="semi" style={{ color: c.white }} numberOfLines={1}>{s.title}</T>
        {s.detail ? <T v="cap" style={{ color: "rgba(255,255,255,0.6)", fontVariant: ["tabular-nums"] }} numberOfLines={1}>{s.detail}</T> : null}
      </View>
    </View>
  );
}
