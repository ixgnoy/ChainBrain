import React, { useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { router } from "expo-router";
import { isAddress, type Address } from "viem";
import { useApp } from "../../store";
import { c, F, motion } from "../../tokens";
import { haptic } from "../../haptics";
import { Screen } from "../../ui/Screen";
import { Avatar, Button, Card, Field, ListCard, ListRow, Press, SectionHeader } from "../../ui/kit";
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

/** Header: owner avatar, "Ask agent" pill, bell. */
function Header() {
  const { pending, setApprovalOpen, setQuestionOpen } = useApp();
  const needs = pending.length > 0;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Press onPress={() => router.navigate("/settings")} accessibilityRole="button" accessibilityLabel="Settings and wallet" kind="round" haptics="light" hitSlop={4}><Avatar icon="user" tone="solid" size={48} /></Press>
        <View accessibilityLabel="Test network, no real money" style={{ height: 24, paddingHorizontal: 10, borderRadius: 12, backgroundColor: c.fill, flexDirection: "row", alignItems: "center", gap: 5 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.muted }} />
          <T v="cap" w="medium" color="muted" style={{ fontSize: 12, lineHeight: 16 }}>Testnet</T>
        </View>
      </View>
      <Press onPress={() => router.navigate("/agent")} accessibilityRole="button" accessibilityLabel="Ask agent" kind="button" haptics="light" style={{ height: 48, paddingHorizontal: 18, borderRadius: 24, backgroundColor: c.card, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon name="chat" size={18} color={c.accent} />
        <T v="row" w="semi" color="accent">Ask agent</T>
      </Press>
      <Press
        onPress={() => { const q = pending.find((a) => a.kind === "question"); if (pending.some((a) => a.kind !== "question")) setApprovalOpen(true); else if (q) setQuestionOpen(true); else router.navigate("/activity"); }}
        kind="round" accessibilityRole="button" accessibilityLabel={needs ? "Notifications, something needs you" : "Notifications"} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }}>
        <Icon name="bell" size={22} />
        {needs ? <Animated.View entering={FadeIn.duration(motion.base)} exiting={FadeOut.duration(motion.exit)} style={{ position: "absolute", top: 11, right: 12, width: 10, height: 10, borderRadius: 5, backgroundColor: c.negative, borderWidth: 2, borderColor: c.card }} /> : null}
      </Press>
    </View>
  );
}

/** Pending approvals and the agent's question, as one quiet row each. */
function Needs() {
  const { pending, setApprovalOpen, setQuestionOpen, sellerName } = useApp();
  const ask = pending.find((a) => a.kind !== "question");
  const q = pending.find((a) => a.kind === "question");
  if (!ask && !q) return null;
  return (
    <Animated.View entering={FadeInDown.springify(motion.spring.smooth.duration).dampingRatio(1).withInitialValues({ opacity: 0, transform: [{ translateY: 10 }] })} exiting={FadeOut.duration(motion.exit)}>
    <ListCard style={{ marginBottom: 12 }}>
      {ask ? (
        <ListRow key="ask" a11y={ask.kind === "payment" ? "Approve a payment" : "Confirm a task"} onPress={() => setApprovalOpen(true)} avatar={<Avatar icon="clock" tone="warning" />}
          title={ask.kind === "payment" ? "Waiting for your OK" : "Confirm a task"} sub={ask.kind === "payment" ? `${cleanText(sellerName(ask.data?.sellerId), 30)} · US$${cleanText(ask.data?.amount, 10)}` : cleanText(ask.text.split("\n")[0], 60)}>
          <Icon name="chevronRight" size={18} color={c.muted} />
        </ListRow>
      ) : null}
      {q ? (
        <ListRow key="q" a11y="Your agent asks" onPress={() => setQuestionOpen(true)} avatar={<Avatar icon="chat" tone="soft" />} title="Your agent has a question" sub={cleanText(q.text, 60)}>
          <Icon name="chevronRight" size={18} color={c.muted} />
        </ListRow>
      ) : null}
    </ListCard>
    </Animated.View>
  );
}

function AddPocket() {
  const { addPocket } = useApp();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState("");
  return (
    <View style={{ marginHorizontal: 20, marginTop: 12 }}>
      {!open ? (
        <Press haptics="select" onPress={() => setOpen(true)} style={{ alignSelf: "center", minHeight: 44, justifyContent: "center" }} accessibilityRole="button" accessibilityLabel="Add an existing pocket"><T v="sub" w="semi" color="accent">Add an existing pocket</T></Press>
      ) : (
        <Card style={{ gap: 12 }}>
          <Field value={v} onChangeText={setV} placeholder="Pocket address (0x…)" autoCapitalize="none" autoCorrect={false} accessibilityLabel="Pocket address" />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button label="Cancel" kind="secondary" small style={{ flex: 1 }} onPress={() => { setOpen(false); setV(""); }} />
            <Button label="Add pocket" small style={{ flex: 1 }} disabled={!isAddress(v.trim())} onPress={async () => { await addPocket(v.trim() as Address); setV(""); setOpen(false); }} />
          </View>
        </Card>
      )}
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
      <Needs />
      <Rise play={play} index={0}>
        <Animated.View style={pulseStyle}>
          <Card pad={20} style={{ marginHorizontal: 20, alignItems: "center" }}>
            <T v="row" w="regular" color="ink2" style={{ marginTop: 4 }}>Agent pockets</T>
            <View style={{ marginTop: 10 }}><Money v="balance" value={usd(sumAll)} countIn={play} label={`Agent pockets total ${money(sumAll)}`} /></View>
            <View accessible accessibilityLabel={balances ? `Main wallet ${money(balances.usdc)}` : "Main wallet"} style={{ marginTop: 14, alignSelf: "stretch", backgroundColor: c.canvas, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <Icon name="wallet" size={20} color={c.accent} />
              {balances ? (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <T v="section" w="regular" color="ink2">{"Main wallet "}</T>
                  <Money v="section" value={usd(balances.usdc)} style={{ fontFamily: F.bold }} />
                </View>
              ) : <T v="section" w="regular" color="ink2">{loading ? "Main wallet, loading…" : "Main wallet"}</T>}
            </View>
            <Rise play={play} index={1} style={{ alignSelf: "stretch" }}>
              <View style={{ flexDirection: "row", marginTop: 26, alignSelf: "stretch" }}>
                <RoundButton icon="plus" label="Add money" onPress={() => setAction({ mode: "fund" })} />
                <RoundButton icon="layers" label="Pocket" a11y="New pocket" onPress={() => router.push("/create")} />
                <RoundButton icon="chat" label="Ask agent" onPress={() => router.navigate("/agent")} />
                <RoundButton icon="more" label="More" a11y="More" onPress={() => router.navigate("/settings")} />
              </View>
            </Rise>
          </Card>
        </Animated.View>
      </Rise>

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
        {pockets.length > 0 ? <ListCard style={{ marginTop: 12 }}>
          <ListRow a11y="New pocket" onPress={() => router.push("/create")} avatar={<Avatar icon="plus" tone="fill" />} title="New pocket" />
        </ListCard> : null}
        <AddPocket />
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
