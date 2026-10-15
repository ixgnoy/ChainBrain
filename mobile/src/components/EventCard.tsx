// One card grammar for every event in the agent chat (Paid, Refused, Blocked, Injection, Stopped, Dead end, Waiting): a white
// level-1 card, radius 20, a 40 px squircle whose icon and tint carry the variant (green paid, vermillion refused, blue waiting),
// bold title, body 14/20 muted, an optional trailing amount chip, optional actions below, and a quiet "Why" / "Details" disclosure at the foot where reason codes, quoted
// seller text and hashes live. `alert` ids shake once with an Error haptic the first time the card shows (never replayed).
import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { c, hairline, level1 } from "../tokens";
import { Details, Press } from "../ui/kit";
import { T } from "../ui/Text";
import { Icon, type IconName } from "../ui/Icon";
import { Rise, firstTime } from "../ui/Rise";
import { shake, useReduceMotion } from "../ui/motion";
import { haptic } from "../haptics";

export type EventTone = "paid" | "refused" | "blocked" | "stopped" | "waiting";
const TONES: Record<EventTone, { bg: string; fg: string; icon: IconName }> = {
  paid: { bg: c.greenSoft, fg: c.greenInk, icon: "check" },
  refused: { bg: c.vermillionSoft, fg: c.vermillionInk, icon: "ban" }, // Neo-Kinetic: refusals and alerts are vermillion
  blocked: { bg: c.vermillionSoft, fg: c.vermillionInk, icon: "shield" },
  stopped: { bg: c.fill, fg: c.ink, icon: "lock" },
  waiting: { bg: c.blueSoft, fg: c.blueInk, icon: "clock" },
};

export type EventWhy = { title?: string; rows?: [string, string][]; codes?: string[]; children?: React.ReactNode };

export function EventCard({ tone, title, body, amount, onPress, a11y, mark, children, why, alert, instant, onEnter }: {
  tone: EventTone; title: string; body?: React.ReactNode; amount?: string; onPress?: () => void; a11y?: string;
  /** replaces the icon disc (the Paid card's drawn check) */ mark?: React.ReactNode;
  children?: React.ReactNode; why?: EventWhy;
  /** id for the once-only shake + Error haptic (refusals, blocks) */ alert?: string;
  instant?: boolean; onEnter?: () => void;
}) {
  const reduce = useReduceMotion();
  const dx = useSharedValue(0);
  useEffect(() => {
    if (!alert || !firstTime(`alert:${alert}`)) return;
    const t = setTimeout(() => { haptic.error(); shake(dx, reduce); }, 140);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const move = useAnimatedStyle(() => ({ transform: [{ translateX: dx.value }] }));
  const t = TONES[tone];
  const head = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      {mark ?? <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: t.bg, alignItems: "center", justifyContent: "center" }}><Icon name={t.icon} size={20} color={t.fg} stroke={2.2} /></View>}
      <View style={{ flex: 1, gap: 2 }}>
        <T v="row" w="bold" numberOfLines={2} style={{ fontSize: 16, lineHeight: 22 }}>{title}</T>
        {typeof body === "string" ? <T v="sub" color="muted">{body}</T> : body}
      </View>
      {amount ? <View style={{ paddingHorizontal: 8, height: 26, borderRadius: 8, backgroundColor: c.fill, justifyContent: "center" }}><T v="row" w="bold" style={{ fontSize: 14 }}>{amount}</T></View> : null}
    </View>
  );
  return (
    <Rise dy={8} spring="snappy" layout instant={instant} onEnter={onEnter}>
      <Animated.View style={[{ borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: hairline, paddingHorizontal: 16, paddingTop: 16, paddingBottom: why || children ? 8 : 16, ...level1 }, move]}>
        {onPress ? <Press kind="row" haptics="select" onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y ?? title}>{head}</Press> : head}
        {children ? <View style={{ gap: 10, marginTop: 12 }}>{children}</View> : null}
        {why ? <View style={{ marginTop: children ? 2 : 6 }}><Details compact title={why.title ?? "Why"} rows={why.rows} codes={why.codes}>{why.children}</Details></View> : null}
      </Animated.View>
    </Rise>
  );
}
