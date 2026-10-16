// New pocket app, while the owner types: what ChainBrain has understood so far, as chips that pop in the moment a word is
// read (shared/sim/understand.ts, the same rules Compose reads with): each seller with its official mark, the agent with
// its mark, the schedule, the money, the price limit, when it asks, and the kind of app as a tiny card in that job's face.
// One selection tick per new chip. Nothing here decides anything: Compose still reads the whole sentence and the owner signs.
import React, { useDeferredValue, useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition, ZoomIn } from "react-native-reanimated";
import { c, deck } from "../../tokens";
import { haptic } from "../../haptics";
import { T } from "../../ui/Text";
import { Icon, type IconName } from "../../ui/Icon";
import { SellerMark, hasSellerMark } from "../../ui/SellerMark";
import { AgentAvatar } from "../../ui/AgentAvatar";
import { useReduceMotion } from "../../ui/motion";
import { understand, type Span } from "../../../../shared/sim/understand";
import { FACE } from "./theme";

const ICON: Record<Span["kind"], IconName> = { seller: "globe", money: "receipt", period: "gauge", schedule: "clock", agent: "bot", limit: "target", ask: "bell", app: "layers" };

export function Understood({ text, sellers }: { text: string; sellers: { id: string; name: string }[] }) {
  const reduce = useReduceMotion();
  const t = useDeferredValue(text);
  const u = useMemo(() => understand(t, sellers), [t, sellers]);
  const key = (x: Span) => `${x.kind}:${x.sellerId ?? x.agentId ?? x.label}`;
  // a tick for each chip that wasn't there a moment ago (not for chips that only moved)
  const seen = useRef(new Set<string>());
  useEffect(() => {
    const now = new Set(u.chips.map(key));
    if ([...now].some((k) => !seen.current.has(k))) haptic.select();
    seen.current = now;
  }, [u]);
  if (!u.chips.length) return null;
  const said = u.chips.map((x) => x.label).join(", ");
  return (
    <View accessible accessibilityLabel={`Understood so far: ${said}`} accessibilityLiveRegion="polite" style={{ gap: 8 }}>
      <T v="cap" color="muted">Understood so far</T>
      <Animated.View layout={reduce ? undefined : LinearTransition.springify().damping(20)} style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {u.chips.map((x) => (
          <Animated.View key={key(x)} entering={reduce ? FadeIn.duration(1) : ZoomIn.springify().damping(18).stiffness(280)} exiting={reduce ? undefined : FadeOut.duration(120)}
            layout={reduce ? undefined : LinearTransition.springify().damping(20)}
            style={{ minHeight: 32, flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 5, paddingRight: 11, borderRadius: 16, backgroundColor: x.kind === "app" ? c.ink : c.card, borderWidth: 1, borderColor: c.tileStroke }}>
            <Lead x={x} />
            <T v="cap" w="semi" style={{ color: x.kind === "app" ? c.white : c.ink }} numberOfLines={1}>{x.label}</T>
          </Animated.View>
        ))}
      </Animated.View>
    </View>
  );
}

/** The chip's mark: the seller's or agent's own, a tiny card in the job's face for the kind of app, else an icon. */
function Lead({ x }: { x: Span }) {
  if (x.kind === "seller" && x.sellerId && hasSellerMark(x.sellerId)) return <SellerMark id={x.sellerId} size={22} radius={6} />;
  if (x.kind === "agent" && x.agentId) return <AgentAvatar kind={x.agentId} size={22} />;
  if (x.kind === "app") {
    const f = deck[FACE[x.layout ?? "research"]];
    return <View style={{ width: 26, height: 17, borderRadius: 4, backgroundColor: f.face, borderWidth: 1, borderColor: "rgba(255,255,255,0.35)", overflow: "hidden" }}><View style={{ marginTop: 5, height: 4, backgroundColor: f.band }} /></View>;
  }
  return <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c.fill, alignItems: "center", justifyContent: "center" }}><Icon name={ICON[x.kind]} size={12} color={c.ink2} stroke={2.2} /></View>;
}
