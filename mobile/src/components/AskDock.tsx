// The ask dock: when an outside agent (Claude, ChatGPT) asks for a co-signature or to start a task, a black bar docks above
// the tab bar: the agent's mark, what it wants, a countdown ring for the 10-minute window, "+2" when more are waiting. After
// a few seconds it folds into a compact pill on the right (mark, amount, ring), so it never sits on the deck for long. On
// every other screen (chat, a pocket, an agent, Connect, Radar) the compact pill floats at the bottom right, above the chat's
// composer; the wizard and the Approvals inbox (which lists every request) hide it. Screens add room while it shows. Tap:
// the request opens as the cheque in the approval sheet. ChainBrain's own asks open the sheet directly.
import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { View } from "react-native";
import Animated, { FadeOutDown, LinearTransition, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { useApp } from "../store";
import { c, motion } from "../tokens";
import { haptic } from "../haptics";
import { Press } from "../ui/kit";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { AgentAvatar } from "../ui/AgentAvatar";
import { useReduceMotion } from "../ui/motion";
import { GLASS_TAB_SPACE } from "../ui/glass/GlassTabBar";
import { cleanText } from "../lib/sanitize";
import { authOf, type Approval } from "../lib/events";
import { useAutoplayTarget } from "../lib/autoplayTargets";
import { agentInfo } from "../../../shared/sim/agents";

/** Height of the dock plus its gap: what a screen adds to its bottom padding while the dock shows. */
export const DOCK_SPACE = 72;
const H = 60;
/** How long a new request shows as the full bar on a tab before it folds into the compact pill. */
const FULL_MS = 8000;
// requests that already had their full-bar moment (folding survives tab switches and re-renders)
const folded = new Set<string>();

// whether the dock is up, for Screen's bottom padding
let shown = false;
const watchers = new Set<() => void>();
const setShown = (on: boolean) => { if (on !== shown) { shown = on; watchers.forEach((f) => f()); } };
export const useDockShown = () => useSyncExternalStore((f) => { watchers.add(f); return () => { watchers.delete(f); }; }, () => shown, () => false);

/** Outside agents' requests that need the owner, oldest first. */
export const outsideAsks = (pending: Approval[]) =>
  pending.filter((a) => (a.agent ?? "chainbrain") !== "chainbrain" && a.kind !== "question").sort((x, y) => (x.createdAt ?? 0) - (y.createdAt ?? 0));

export function AskDock() {
  const { pending, approvalOpen, openApproval, sellerName } = useApp();
  const insets = useSafeAreaInsets();
  const segments = useSegments() as string[];
  const where = segments[0] === "(tabs)" ? "tabs" : segments[0] === "create" || segments[0] === "approvals" ? "hidden" : segments[0] === "agent" ? "chat" : "pushed";
  const asks = outsideAsks(pending);
  const first = asks[0];
  const visible = !!first && !approvalOpen && where !== "hidden";
  useEffect(() => { setShown(visible); }, [visible]);
  // auto-play opens a precise request (the newest of this agent and kind), so an older ask can't be answered in its place
  useAutoplayTarget("dock.open", (arg?: { agent?: string; kind?: string }) => {
    const pick = [...asks].reverse().find((a) => (!arg?.agent || a.agent === arg.agent) && (!arg?.kind || a.kind === arg.kind));
    if (!pick || approvalOpen) return false;
    haptic.medium();
    openApproval(pick.id);
  });
  useEffect(() => () => setShown(false), []);
  // the full bar for a new request, then the compact pill
  const [, rerender] = useState(0);
  useEffect(() => {
    if (!first || folded.has(first.id)) return;
    const t = setTimeout(() => { folded.add(first.id); rerender((n) => n + 1); }, FULL_MS);
    return () => clearTimeout(t);
  }, [first?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!visible) return null;
  const compact = where !== "tabs" || folded.has(first.id);
  const agent = agentInfo(first.agent ?? "");
  const who = agent?.name ?? "An agent";
  const amount = first.data?.amount ? `US$${cleanText(String(first.data.amount), 10)}` : null;
  const title = first.kind === "payment" ? `${who} asks ${amount ?? "to pay"}` : `${who} has a task for you`;
  const sub = first.kind === "payment" ? `To ${cleanText(sellerName(first.data?.sellerId), 24)} · needs your co-sign` : cleanText(first.text ?? "Confirm it before it starts", 48);
  // tabs: just above the expanded tab bar (GlassTabBar: bar height + its bottom margin); chat: above the composer
  const bottom = where === "tabs" ? Math.max(insets.bottom - 12, 12) + GLASS_TAB_SPACE - 24 + 10 : where === "chat" ? insets.bottom + 84 : insets.bottom + 12;
  const open = () => { haptic.medium(); openApproval(first.id); };
  return (
    <Animated.View key={first.id} exiting={FadeOutDown.duration(motion.exit)} pointerEvents="box-none" style={{ position: "absolute", left: 16, right: 16, bottom, alignItems: compact ? "flex-end" : "center" }}>
      {compact
        ? <DockPill a={first} who={who} amount={amount} more={asks.length - 1} agentId={agent?.id ?? "chainbrain"} title={title} sub={sub} onOpen={open} />
        : <DockBar id={first.id} a={first} title={title} sub={sub} more={asks.length - 1} agentId={agent?.id ?? "chainbrain"} onOpen={open} />}
    </Animated.View>
  );
}

/** The folded dock: the agent's mark, the amount (or "Task") and the ring, right-aligned; same tap. */
function DockPill({ a, who, amount, more, agentId, title, sub, onOpen }: { a: Approval; who: string; amount: string | null; more: number; agentId: string; title: string; sub: string; onOpen: () => void }) {
  return (
    <Animated.View layout={LinearTransition.springify().duration(motion.spring.smooth.duration)}>
      <Press kind="round" haptics="none" onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${title}. ${sub}. Opens the request`}
        style={{ height: 52, borderRadius: 26, backgroundColor: c.ink, flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 6, paddingRight: 8, shadowColor: c.ink, shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 10 }}>
        <AgentAvatar kind={agentId} size={40} badge={c.vermillion} />
        <View>
          <T v="head" numberOfLines={1} style={{ color: c.white, fontSize: 15, lineHeight: 19 }}>{amount ?? "Task"}</T>
          <T v="cap" numberOfLines={1} style={{ color: "rgba(255,255,255,0.64)", fontSize: 11, lineHeight: 14 }}>{more > 0 ? `${who} · +${more} more` : who}</T>
        </View>
        {a.kind === "payment" ? <Countdown a={a} size={34} /> : <Icon name="chevronUp" size={18} color={c.white} stroke={2} />}
      </Press>
    </Animated.View>
  );
}

function DockBar({ id, a, title, sub, more, agentId, onOpen }: { id: string; a: Approval; title: string; sub: string; more: number; agentId: string; onOpen: () => void }) {
  const reduce = useReduceMotion();
  const y = useSharedValue(reduce ? 0 : 90);
  const glow = useSharedValue(0);
  const seen = useRef<string | null>(null);
  useEffect(() => {
    if (seen.current === id) return;
    seen.current = id;
    haptic.warning(); // something needs you
    y.value = reduce ? 0 : withSpring(0, motion.spring.snappy);
    if (!reduce) glow.value = withSequence(withTiming(1, { duration: 260 }), withTiming(0, { duration: 900 }));
  }, [id, reduce, y, glow]);
  const rise = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const ring = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: 1 + glow.value * 0.25 }] }));
  return (
    <Animated.View style={[{ width: "100%", maxWidth: 448 }, rise]}>
      <Press kind="row" haptics="none" onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${title}. ${sub}. Opens the request`}
        style={{ height: H, borderRadius: 18, borderCurve: "continuous", backgroundColor: c.ink, flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 10, paddingRight: 12, shadowColor: c.ink, shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 10 } as object}>
        <View>
          <Animated.View pointerEvents="none" style={[{ position: "absolute", left: -4, top: -4, right: -4, bottom: -4, borderRadius: 16, borderWidth: 2, borderColor: c.vermillion }, ring]} />
          <AgentAvatar kind={agentId} size={40} badge={c.vermillion} />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <T v="head" numberOfLines={1} style={{ color: c.white, fontSize: 16, lineHeight: 20 }}>{title}</T>
          <T v="cap" numberOfLines={1} style={{ color: "rgba(255,255,255,0.64)" }}>{sub}</T>
        </View>
        {more > 0 ? (
          <View style={{ height: 24, minWidth: 30, paddingHorizontal: 7, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}>
            <T v="cap" w="bold" style={{ color: c.white }}>{`+${more}`}</T>
          </View>
        ) : null}
        {a.kind === "payment" ? <Countdown a={a} /> : <Icon name="chevronUp" size={18} color={c.white} stroke={2} />}
      </Press>
    </Animated.View>
  );
}

/** The 10-minute co-sign window as a vermillion ring that empties, minutes in the middle. */
export function Countdown({ a, size = 36, onLight }: { a: Approval; size?: number; onLight?: boolean }) {
  const auth = authOf(a);
  const end = auth ? Number(auth.validBefore) : 0;
  const start = end - 600;
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => { const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000); return () => clearInterval(t); }, []);
  if (!auth) return null;
  const left = Math.max(0, end - now);
  const share = Math.max(0, Math.min(1, left / (end - start)));
  const r = size / 2 - 2.5;
  const len = 2 * Math.PI * r;
  const label = left >= 60 ? `${Math.ceil(left / 60)}m` : `${left}s`;
  return (
    <View accessible accessibilityLabel={`${Math.floor(left / 60)} minutes ${left % 60} seconds left to answer`} style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={onLight ? c.line : "rgba(255,255,255,0.18)"} strokeWidth={3} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.vermillion} strokeWidth={3} fill="none" strokeLinecap="round"
          strokeDasharray={`${len} ${len}`} strokeDashoffset={len * (1 - share)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      <T v="tab" w="bold" style={{ color: onLight ? c.ink : c.white, fontSize: size > 40 ? 12 : 10 }}>{label}</T>
    </View>
  );
}
