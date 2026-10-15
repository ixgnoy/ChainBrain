import React, { useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { router } from "expo-router";
import { StatusDot } from "../../ui/StatusDot";
import { useApp } from "../../store";
import { c, motion } from "../../tokens";
import { haptic } from "../../haptics";
import { Screen } from "../../ui/Screen";
import { Avatar, Button, Card, Press, SectionHeader } from "../../ui/kit";
import { RoundButton } from "../../ui/RollAction";
import { Money } from "../../ui/Money";
import { Reveal as Rise, PopIn } from "../../ui/Reveal";
import { AnimatedList } from "../../ui/AnimatedList";
import { useReduceMotion } from "../../ui/motion";
import { T } from "../../ui/Text";
import { Icon } from "../../ui/Icon";
import { PocketRow } from "../../components/PocketCard";
import { ActivityRow } from "../../components/ActivityRow";
import { cleanText } from "../../lib/sanitize";
import { visibleRows } from "../../lib/plain";
import { usd, money } from "../../lib/util";
import { Rise as RiseIn } from "../../ui/Rise";

/** Header: owner avatar, the "Testnet" chip, bell. (Ask agent lives in the round actions and the Agent tab, once.) */
function Header() {
  const { pending, setApprovalOpen, setQuestionOpen } = useApp();
  const needs = pending.length > 0;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Press onPress={() => router.navigate("/settings")} accessibilityRole="button" accessibilityLabel="Settings and wallet" kind="round" haptics="light" hitSlop={4}><Avatar icon="user" tone="solid" size={40} /></Press>
        <View accessibilityLabel="Test network, no real money" style={{ height: 24, paddingHorizontal: 10, borderRadius: 12, backgroundColor: c.fill, justifyContent: "center" }}>
          <T v="cap" w="medium" color="muted" style={{ fontSize: 12, lineHeight: 16 }}>Testnet</T>
        </View>
      </View>
      <Press
        onPress={() => { const q = pending.find((a) => a.kind === "question"); if (pending.some((a) => a.kind !== "question")) setApprovalOpen(true); else if (q) setQuestionOpen(true); else router.navigate("/activity"); }}
        kind="round" accessibilityRole="button" accessibilityLabel={needs ? "Notifications, something needs you" : "Notifications"} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }}>
        <Icon name="bell" size={22} />
        {needs ? <Animated.View entering={FadeIn.duration(motion.base)} exiting={FadeOut.duration(motion.exit)} style={{ position: "absolute", top: 10, right: 11, width: 10, height: 10, borderRadius: 5, backgroundColor: c.negative, borderWidth: 2, borderColor: c.card }} /> : null}
      </Press>
    </View>
  );
}

/** Played once per app launch: revisiting the tab never re-runs the stagger. */
let introPlayed = false;

/** No pockets yet: a calm, intentional empty state. */
function EmptyPockets() {
  return (
    <Card pad={24} style={{ marginHorizontal: 20, alignItems: "center", gap: 16 }}>
      <PopIn from={0.92}><Avatar icon="layers" size={72} tone="soft" /></PopIn>
      <View style={{ gap: 6, alignItems: "center" }}>
        <T v="section" style={{ textAlign: "center" }}>Give your agent a budget</T>
        <T v="body" color="ink2" style={{ textAlign: "center" }}>A pocket holds a little money, with rules you choose. Your agent can only spend from it.</T>
      </View>
      <Button label="Create your first pocket" onPress={() => router.push("/create")} style={{ alignSelf: "stretch" }} />
    </Card>
  );
}

/** The needs-you banner, pinned above Pockets: when a payment, task or question waits for the owner it is a 56 px warning row that
 *  opens the sheet (the primary agentic moment); while the agent just works it is a quiet teal row that opens the chat. */
function LiveStrip() {
  const { agentState, pending, setApprovalOpen, setQuestionOpen, sellerName } = useApp();
  const waiting = pending.length > 0;
  const on = agentState === "working" || waiting;
  const first = pending[0];
  const text = !waiting ? "Your agent is working"
    : first.kind === "question" ? "Your agent has a question"
    : first.kind === "intent" ? "Confirm your agent's task"
    : `${cleanText(sellerName(first.data?.sellerId), 24)} needs your OK${first.data?.amount ? ` · US$${cleanText(first.data.amount, 10)}` : ""}`;
  const open = () => {
    if (!waiting) return router.navigate("/agent");
    if (first.kind === "question") { setQuestionOpen(true); return; }
    setApprovalOpen(true);
  };
  if (!on) return null;
  return (
    <RiseIn dy={-6} spring="snappy" exit layout style={{ marginHorizontal: 20, marginTop: 20 }}>
      <Press kind="row" haptics="select" onPress={open} accessibilityRole="button" accessibilityLabel={text}
        style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingHorizontal: 16, borderRadius: 20, backgroundColor: waiting ? c.warningSoft : c.accentSoft }}>
        <StatusDot state={waiting ? "waiting" : "working"} />
        <T v="row" w="semi" color={waiting ? "warning" : "accent"} style={{ flex: 1, fontSize: 15, lineHeight: 22 }} numberOfLines={1}>{text}</T>
        <Icon name="chevronRight" size={16} color={waiting ? c.warning : c.accent} />
      </Press>
    </RiseIn>
  );
}

export default function Home() {
  const { pockets, pocketsLoaded, conn, balances, ledger, setReceipt, setAction, refreshPockets } = useApp();
  const reduce = useReduceMotion();
  const play = useRef(!introPlayed).current;
  useEffect(() => { introPlayed = true; }, []);
  const sumAll = pockets.reduce((n, p) => n + (p.revoked ? 0n : p.balance), 0n);
  const recent = useMemo(() => visibleRows([...ledger].reverse()).slice(0, 3), [ledger]);
  const loading = !pocketsLoaded && conn !== "offline";

  // 1 -> 1.015 -> 1 on the balance card whenever the total changes while visible (the digits roll inside it)
  const pulse = useSharedValue(1);
  const lastSum = useRef(sumAll);
  useEffect(() => {
    if (lastSum.current === sumAll) return;
    lastSum.current = sumAll;
    if (!reduce) pulse.value = withSequence(withTiming(1.015, { duration: 140 }), withSpring(1, motion.spring.press));
  }, [sumAll, reduce, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    haptic.medium();
    setRefreshing(true);
    try { await Promise.all([refreshPockets(), new Promise((r) => setTimeout(r, 700))]); } finally { setRefreshing(false); }
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={c.accent} colors={[c.accent]} />}>
      <Header />
      <Rise play={play} index={0}>
        <Animated.View style={pulseStyle}>
          {/* one surface: label, balance, one quiet line, three actions */}
          <Card pad={24} style={{ marginHorizontal: 20, alignItems: "center" }}>
            <T v="sub" color="muted">Agent pockets</T>
            <View style={{ marginTop: 4 }}><Money v="balance" value={usd(sumAll)} countIn={play} label={`Agent pockets total ${money(sumAll)}`} /></View>
            <View accessible accessibilityLabel={balances ? `Main wallet ${money(balances.usdc)}` : "Main wallet"} style={{ marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
              {balances ? (
                <>
                  <T v="sub" color="muted">{"Main wallet "}</T>
                  <Money v="sub" value={usd(balances.usdc)} color="ink2" />
                </>
              ) : <T v="sub" color="muted">{loading ? "Main wallet, loading…" : "Main wallet"}</T>}
            </View>
            <Rise play={play} index={1} style={{ alignSelf: "stretch" }}>
              <View style={{ flexDirection: "row", marginTop: 24, alignSelf: "stretch" }}>
                <RoundButton icon="plus" label="Add money" onPress={() => setAction({ mode: "fund" })} />
                <RoundButton icon="squarePlus" label="New pocket" onPress={() => router.push("/create")} />
                <RoundButton icon="chat" label="Ask agent" onPress={() => router.navigate("/agent")} />
              </View>
            </Rise>
          </Card>
        </Animated.View>
      </Rise>

      <LiveStrip />

      <Rise play={play} index={2}>
        <SectionHeader title="Pockets" right={pockets.length ? money(sumAll) : undefined} />
        {loading ? (
          <Card style={{ marginHorizontal: 20 }}><T v="body" color="muted">Loading your pockets…</T></Card>
        ) : pockets.length === 0 ? (
          <EmptyPockets />
        ) : (
          <AnimatedList>
            {pockets.map((p) => <PocketRow key={p.address} pocket={p} onPress={() => router.push({ pathname: "/pocket/[id]", params: { id: p.address } })} />)}
          </AnimatedList>
        )}
      </Rise>

      <Rise play={play} index={3}>
        <SectionHeader title="Recent activity" action={ledger.length ? "View all" : undefined} onAction={() => router.navigate("/activity")} />
        {recent.length === 0 ? (
          <Card style={{ marginHorizontal: 20 }}><T v="sub" color="ink2">Nothing yet. Ask your agent to buy something and it shows up here.</T></Card>
        ) : (
          <AnimatedList>{recent.map((r) => <ActivityRow key={r.key} row={r} showPocket onPress={() => setReceipt(r)} />)}</AnimatedList>
        )}
      </Rise>
    </Screen>
  );
}
