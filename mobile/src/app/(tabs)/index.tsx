// Home (Stitch chainbrain_home, polish from home_vaultbank_style): the agent-pockets pool and the main wallet, three quick
// actions, the fanned pocket deck, real agent spending as a hatch curve, and recent activity with the agent that acted.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { router } from "expo-router";
import { StatusDot } from "../../ui/StatusDot";
import { useApp } from "../../store";
import { c, motion } from "../../tokens";
import { haptic } from "../../haptics";
import { Screen } from "../../ui/Screen";
import { Avatar, Button, Card, ListCard, Press, SectionHeader, Tile } from "../../ui/kit";
import { Money } from "../../ui/Money";
import { Reveal as Rise, PopIn } from "../../ui/Reveal";
import { useReduceMotion } from "../../ui/motion";
import { T } from "../../ui/Text";
import { Icon } from "../../ui/Icon";
import { PocketStack } from "../../components/PocketStack";
import { SpendChart } from "../../components/SpendChart";
import { useIntroDone } from "../../ui/intro";
import { ActivityRow } from "../../components/ActivityRow";
import { cleanText } from "../../lib/sanitize";
import { visibleRows } from "../../lib/plain";
import { usd, money } from "../../lib/util";
import { Rise as RiseIn } from "../../ui/Rise";
import { GLASS_TAB_SPACE as TAB_SPACE } from "../../ui/glass/GlassTabBar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Network chip: a quiet grey pill with a vermillion dot (DESIGN.md chips). */
export function NetworkChip({ label = "Test network" }: { label?: string }) {
  return (
    <View accessibilityLabel="Test network, no real money" style={{ minHeight: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: c.card, flexDirection: "row", alignItems: "center", gap: 7 }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.vermillion }} />
      <T v="tab" w="bold" style={{ letterSpacing: 0.9, textTransform: "uppercase" }}>{label}</T>
    </View>
  );
}

/** Header: owner (opens Settings), the network chip, the bell with how many requests wait (opens the Approvals inbox). */
export function HomeHeader() {
  const { pending, setQuestionOpen } = useApp();
  const asks = pending.filter((a) => a.kind !== "question").length;
  const question = pending.some((a) => a.kind === "question");
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14 }}>
      <Press onPress={() => router.navigate("/settings")} accessibilityRole="button" accessibilityLabel="Settings and wallet" kind="round" haptics="light" hitSlop={4}><Avatar icon="user" tone="solid" size={44} /></Press>
      <NetworkChip />
      <Press
        onPress={() => { if (asks) router.push("/approvals"); else if (question) setQuestionOpen(true); else router.push("/approvals"); }}
        kind="round" auto="inbox.open" accessibilityRole="button" accessibilityLabel={asks ? `Approvals, ${asks} waiting` : question ? "Notifications, your agent has a question" : "Approvals"}
        style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }}>
        <Icon name="bell" size={21} stroke={2} />
        {asks || question ? (
          <Animated.View entering={FadeIn.duration(motion.base)} exiting={FadeOut.duration(motion.exit)} style={{ position: "absolute", top: -4, right: -4, minWidth: 20, minHeight: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: c.vermillion, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: c.canvas }}>
            <T v="tab" w="bold" style={{ color: c.white, fontSize: 10, lineHeight: 12 }}>{String(asks || 1)}</T>
          </Animated.View>
        ) : null}
      </Press>
    </View>
  );
}

/** Played once per app launch: revisiting the tab never re-runs the stagger. */
let introPlayed = false;
/** The intro covers Home on every launch: Home mounts again as it lets go, so its entrance is seen. */
export default function HomeGate() { const done = useIntroDone(); return <Home key={done ? "live" : "wait"} ready={done} />; }

/** While the pockets are read: the deck's shape in quiet grey, so Home doesn't jump (and never says "no pockets" by mistake). */
function LoadingDeck() {
  const { width } = useWindowDimensions();
  const cw = Math.min(width, 448) - 48;
  const h = Math.round(cw / 1.586);
  return (
    <View accessible accessibilityLabel="Loading your pockets" style={{ height: h + 60, alignItems: "center" }}>
      {[2, 1, 0].map((d) => (
        <View key={d} style={{ position: "absolute", top: 6 + (2 - d) * 28, width: cw * (1 - d * 0.03), height: h, borderRadius: 18, backgroundColor: d === 0 ? c.tile : c.fill, borderWidth: 1, borderColor: c.tileStroke, transform: [{ rotate: `${[-2, 3, -4][d]}deg` }] }} />
      ))}
    </View>
  );
}

/** No pockets yet: a calm, intentional empty state. */
function EmptyPockets() {
  return (
    <Card pad={24} style={{ marginHorizontal: 16, alignItems: "center", gap: 16 }}>
      <PopIn from={0.92}><Avatar icon="card" size={72} tone="blue" /></PopIn>
      <View style={{ gap: 6, alignItems: "center" }}>
        <T v="section" style={{ textAlign: "center" }}>Give your agent a pocket</T>
        <T v="body" color="ink2" style={{ textAlign: "center" }}>A pocket holds a little money, with rules you choose. Your agent can only spend from it.</T>
      </View>
      <Button label="Create your first pocket" kind="vermillion" onPress={() => router.push("/create")} style={{ alignSelf: "stretch" }} />
    </Card>
  );
}

/** The needs-you banner above the deck: the built-in agent's question or approval (blue), or "working" (white) while it shops.
 *  Outside agents' asks (Claude, ChatGPT) are in the ask dock above the tab bar instead. */
function LiveStrip() {
  const { agentState, pending, setQuestionOpen, sellerName, openApproval } = useApp();
  const mine = pending.filter((a) => (a.agent ?? "chainbrain") === "chainbrain");
  const waiting = mine.length > 0;
  const on = waiting || agentState === "working"; // "waiting" alone may be an outside agent's ask (the dock has it)
  const first = mine[0];
  const who = "ChainBrain";
  const text = !waiting ? "ChainBrain is working"
    : first.kind === "question" ? `${who} has a question`
    : first.kind === "intent" ? `Confirm ${who}'s task`
    : `${who} asks to pay ${cleanText(sellerName(first.data?.sellerId), 24)}${first.data?.amount ? ` · US$${cleanText(first.data.amount, 10)}` : ""}`;
  const open = () => {
    if (!waiting) return router.navigate("/agent");
    if (first.kind === "question") { setQuestionOpen(true); return; }
    openApproval(first.id);
  };
  if (!on) return null;
  return (
    <RiseIn dy={-6} spring="snappy" exit layout style={{ marginHorizontal: 16, marginTop: 16 }}>
      <Press kind="row" haptics="select" onPress={open} accessibilityRole="button" accessibilityLabel={text}
        style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingHorizontal: 16, borderRadius: 18, backgroundColor: waiting ? c.blue : c.card }}>
        <StatusDot state={waiting ? "waiting" : "working"} />
        <T v="row" w="bold" style={{ flex: 1, fontSize: 15, lineHeight: 22 }} numberOfLines={1}>{text}</T>
        <Icon name="chevronRight" size={16} color={c.ink} stroke={2.2} />
      </Press>
    </RiseIn>
  );
}

function Home({ ready }: { ready: boolean }) {
  const { pockets, pocketsLoaded, conn, balances, ledger, setReceipt, setAction, refreshPockets, agentOf, agents, cfg } = useApp();
  const reduce = useReduceMotion();
  const insets = useSafeAreaInsets();
  const play = useRef(ready && !introPlayed).current;
  useEffect(() => { if (ready) introPlayed = true; }, [ready]);
  const live = pockets.filter((p) => !p.revoked);
  const sumAll = live.reduce((n, p) => n + p.balance, 0n);
  const recent = useMemo(() => visibleRows([...ledger].reverse()).slice(0, 4), [ledger]);
  const loading = !pocketsLoaded && conn !== "offline";
  const spendAgent = useCallback((p: string) => agentOf(p) ?? (cfg ? "chainbrain" as const : undefined), [agentOf, cfg]);
  const canConnect = agents.length > 1; // outside agents exist only on the built-in network until the MCP server ships

  // 1 -> 1.015 -> 1 on the pool card whenever the total changes while visible (the digits roll inside it)
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
    <Screen contentContainerStyle={{ paddingBottom: TAB_SPACE + insets.bottom + 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={c.ink} colors={[c.ink]} />}>
      <HomeHeader />
      <Rise play={play} index={0}>
        <Animated.View style={pulseStyle}>
          <Card pad={20} style={{ marginHorizontal: 16 }}>
            <T v="tab" color="muted" style={{ textTransform: "uppercase", letterSpacing: 1 }}>In agent pockets</T>
            <View style={{ marginTop: 6 }}><Money v="balance" value={usd(sumAll)} countIn={play} label={`Agent pockets total ${money(sumAll)}`} /></View>
            <View style={{ height: 1, backgroundColor: c.fill, marginVertical: 16 }} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.fill, alignItems: "center", justifyContent: "center" }}><Icon name="vault" size={19} stroke={2} /></View>
              <View accessible accessibilityLabel={balances ? `Main wallet ${money(balances.usdc)}` : "Main wallet"} style={{ flex: 1 }}>
                <T v="cap" color="muted">Main wallet</T>
                {balances ? <Money v="row" value={usd(balances.usdc)} /> : <T v="row" color="muted">{loading ? "Loading…" : "—"}</T>}
              </View>
            </View>
          </Card>
        </Animated.View>
      </Rise>

      <Rise play={play} index={1}>
        <View style={{ flexDirection: "row", gap: 10, marginHorizontal: 16, marginTop: 12 }}>
          <Tile icon="arrowIn" label="Move money" a11y="Move money from your main wallet to a pocket" onPress={() => setAction({ mode: "fund" })} />
          <Tile icon="squarePlus" label="New pocket" auto="home.newPocket" onPress={() => router.push("/compose")} />
          {canConnect
            ? <Tile icon="link" label="Connect" tone="blue" a11y="Connect an agent" auto="home.connect" onPress={() => router.push("/connect")} />
            : <Tile icon="chat" label="Ask agent" tone="blue" onPress={() => router.navigate("/agent")} />}
        </View>
      </Rise>

      <LiveStrip />

      <Rise play={play} index={2}>
        <SectionHeader title="Active pockets" count={pockets.length || undefined} action={pockets.length && canConnect ? "Agents" : undefined} onAction={() => router.navigate("/agents")} />
        {loading ? (
          <LoadingDeck />
        ) : pockets.length === 0 ? (
          <EmptyPockets />
        ) : (
          <PocketStack pockets={pockets} play={play} />
        )}
      </Rise>

      <Rise play={play} index={3} style={{ marginTop: 20 }}>
        <SpendChart ledger={ledger} agentOf={spendAgent} play={ready} />
      </Rise>

      <Rise play={play} index={4}>
        <SectionHeader title="Recent activity" action={ledger.length ? "View all" : undefined} onAction={() => router.navigate("/activity")} />
        {recent.length === 0 ? (
          <Card style={{ marginHorizontal: 16 }}><T v="sub" color="ink2">Nothing yet. Ask your agent to buy something and it shows up here.</T></Card>
        ) : (
          <ListCard>{recent.map((r) => <ActivityRow key={r.key} row={r} showPocket onPress={() => setReceipt(r)} />)}</ListCard>
        )}
      </Rise>
    </Screen>
  );
}
