// Home (Stitch chainbrain_home, polish from home_vaultbank_style): the agent-pockets pool and the main wallet in one line,
// then every pocket at first glance as a wallet stack (components/PocketWallet.tsx: each card's name and its live sign, the
// front card whole), three quick actions, the routines' next runs, real agent spending as a hatch curve, and recent activity
// with the agent that acted.
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
import { useLargeText } from "../../ui/fontScale";
import { T } from "../../ui/Text";
import { Icon, type IconName } from "../../ui/Icon";
import type { TargetName } from "../../lib/autoplayTargets";
import { PocketWallet, stripFor } from "../../components/PocketWallet";
import { NextUp, nextRuns } from "../../components/NextUp";
import { pageCardWidth, PAGE_MARGIN } from "../../components/CardFlight";
import { cardHeight, faceOf, toneFor } from "../../components/PocketFace";
import type { Pocket } from "../../store";
import * as api from "../../lib/api";
import { glyphKey, glyphOf, weekDigest, type Glyph } from "../../../../shared/sim/pocketAppData";
import { WeekBought } from "../../components/WeekDigest";
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

/** While the pockets are read: the stack's shape in quiet grey, so Home doesn't jump (and never says "no pockets" by mistake). */
function LoadingDeck() {
  const { width } = useWindowDimensions();
  const cw = pageCardWidth(width);
  const h = cardHeight(cw);
  const strip = stripFor(cw);
  return (
    <View accessible accessibilityLabel="Loading your pockets" style={{ height: 2 * strip + h + 16 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ position: "absolute", left: PAGE_MARGIN, top: i * strip, width: cw, height: h, borderRadius: 18, backgroundColor: i === 2 ? c.tile : c.fill, borderWidth: 1, borderColor: c.tileStroke }} />
      ))}
    </View>
  );
}

/** The total split into its pockets, each in its card's face, largest first: the stack below, as one line. */
const Allocation = React.memo(function Allocation({ pockets, all, total }: { pockets: Pocket[]; all: Pocket[]; total: bigint }) {
  if (total <= 0n || pockets.length < 2) return null;
  const parts = [...pockets].filter((p) => p.balance > 0n).sort((a, b) => (b.balance > a.balance ? 1 : -1));
  const label = parts.map((p) => `${cleanText(p.name, 24)} ${Math.round((Number(p.balance) / Number(total)) * 100)}%`).join(", ");
  return (
    <View accessible accessibilityLabel={`Split by pocket: ${label}`} style={{ flexDirection: "row", height: 8, gap: 2, marginTop: 10, borderRadius: 4, overflow: "hidden" }}>
      {parts.map((p) => {
        const f = faceOf(toneFor(all, p.address));
        const white = f.face === "#FFFFFF";
        return <View key={p.address} style={{ flexGrow: Number(p.balance), flexBasis: 0, minWidth: 3, backgroundColor: white ? f.edge : f.face }} />;
      })}
    </View>
  );
});

/** One quick action: a round button with a short word under it (the row replaces three big tiles). */
function QuickAction({ icon, label, onPress, tone = "white", a11y, auto }: { icon: IconName; label: string; onPress: () => void; tone?: "white" | "ink" | "blue"; a11y?: string; auto?: TargetName }) {
  const bg = { white: c.card, ink: c.ink, blue: c.blue }[tone];
  return (
    <Press kind="round" haptics="medium" auto={auto} onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y ?? label} style={{ alignItems: "center", gap: 6, minWidth: 84, paddingVertical: 4 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: bg, alignItems: "center", justifyContent: "center", borderWidth: tone === "white" ? 1 : 0, borderColor: c.tileStroke }}>
        <Icon name={icon} size={22} color={tone === "ink" ? c.white : c.ink} stroke={2} />
      </View>
      <T v="cap" w="semi" numberOfLines={1}>{label}</T>
    </Press>
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
  const { pockets, pocketsLoaded, conn, balances, ledger, events, setReceipt, setAction, refreshPockets, agentOf, agents, cfg } = useApp();
  const scrollY = useSharedValue(0);
  // the clock the run times count down from: a minute is fine-grained enough for "in 3 h"
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  // each pocket's routine (built-in network) and live sign, read again when events arrive
  const routines = useMemo(() => new Map(pockets.map((p) => [p.address.toLowerCase(), api.routineOf(p.address)])), [pockets, events.length]); // eslint-disable-line react-hooks/exhaustive-deps
  // the same object until a sign actually changes: each poll brings a new events array, and a new object would redraw
  // all seven cards of the stack for nothing
  const lastGlyphs = useRef<{ key: string; g: Record<string, Glyph | null> } | null>(null);
  const glyphs = useMemo(() => {
    const g: Record<string, Glyph | null> = {};
    for (const p of pockets) { const a = p.address.toLowerCase(); g[a] = p.revoked ? null : glyphOf(events, p.address, { layout: p.app?.layout, routine: routines.get(a), now }); }
    const key = Object.entries(g).map(([a, x]) => `${a}=${glyphKey(x)}`).join();
    if (lastGlyphs.current?.key !== key) lastGlyphs.current = { key, g };
    return lastGlyphs.current.g;
  }, [pockets, events, routines, now]);
  // this week's digest, recomputed only when a payment, refusal or routine event arrives (not on every poll)
  const moneyN = useMemo(() => events.filter((e) => e.type === "payment" || e.type === "refusal" || e.type === "routine" || e.type === "sentinel" || e.type === "forced").length, [events]);
  const digest = useMemo(() => weekDigest(events, Date.now()), [moneyN]); // eslint-disable-line react-hooks/exhaustive-deps
  const itemName = useCallback((sid: string, sku: string) => { const it = cfg?.sellers.find((s) => s.id === sid)?.items.find((i) => i.sku === sku); return it?.short ?? it?.description ?? sku; }, [cfg]);
  const sellerLabel = useCallback((id: string) => cleanText(cfg?.sellers.find((s) => s.id === id)?.name ?? id, 24), [cfg]);
  // every live pocket's routine, for Pause all / Resume all (pausing only lowers risk: no signature)
  const liveRoutines = useMemo(() => pockets.filter((p) => !p.revoked).map((p) => routines.get(p.address.toLowerCase())).filter((r): r is NonNullable<typeof r> => !!r), [pockets, routines]);
  const anyActive = liveRoutines.some((r) => r.status === "active");
  const pauseAll = (pause: boolean) => { haptic.medium(); for (const r of liveRoutines) if ((r.status === "active") === pause) api.pauseRoutine(r.pocket, pause); };
  const upcoming = useMemo(() => nextRuns(pockets, (a) => routines.get(a.toLowerCase()) ?? null, events, cfg?.sellers ?? [], now), [pockets, routines, events, cfg, now]);
  const reduce = useReduceMotion();
  const big = useLargeText();
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
    <Screen scrollY={scrollY} contentContainerStyle={{ paddingBottom: TAB_SPACE + insets.bottom + 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={c.ink} colors={[c.ink]} />}>
      <HomeHeader />
      <Rise play={play} index={0}>
        <Animated.View style={pulseStyle}>
          {/* one line; at the largest text sizes the main wallet moves under the total, or the two run into each other */}
          <Card pad={18} style={{ marginHorizontal: 16, flexDirection: big ? "column" : "row", alignItems: big ? "flex-start" : "flex-end", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <T v="cap" w="semi" color="muted">In agent pockets</T>
              <View style={{ marginTop: 4 }}><Money v="balance" value={usd(sumAll)} countIn={play} label={`Agent pockets total ${money(sumAll)}`} /></View>
              <Allocation pockets={live} all={pockets} total={sumAll} />
            </View>
            <View accessible accessibilityLabel={balances ? `Main wallet ${money(balances.usdc)}` : "Main wallet"} style={{ alignItems: big ? "flex-start" : "flex-end", paddingBottom: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Icon name="vault" size={13} color={c.muted} stroke={2} />
                <T v="cap" color="muted">Main wallet</T>
              </View>
              {balances ? <Money v="row" value={usd(balances.usdc)} /> : <T v="row" color="muted">{loading ? "Loading…" : "—"}</T>}
            </View>
          </Card>
        </Animated.View>
      </Rise>


      <LiveStrip />

      <View style={{ marginTop: 16 }}>
        {loading ? (
          <LoadingDeck />
        ) : pockets.length === 0 ? (
          <EmptyPockets />
        ) : (
          <PocketWallet pockets={pockets} play={play} scrollY={scrollY} glyphs={glyphs} />
        )}
      </View>

      {/* below the stack waits for the pockets: drawn under the loading placeholder, it would jump when the real stack
          (taller than the placeholder) arrives */}
      {loading ? null : <>
      <Rise play={play} index={1}>
        <View style={{ flexDirection: "row", justifyContent: "space-around", marginHorizontal: 16, marginTop: 4 }}>
          <QuickAction icon="arrowIn" label="Move money" a11y="Move money from your main wallet to a pocket" onPress={() => setAction({ mode: "fund" })} />
          <QuickAction icon="plus" label="New pocket" auto="home.newPocket" tone="ink" onPress={() => router.push("/compose")} />
          {canConnect
            ? <QuickAction icon="link" label="Connect" tone="blue" a11y="Connect an agent" auto="home.connect" onPress={() => router.push("/connect")} />
            : <QuickAction icon="chat" label="Ask agent" tone="blue" onPress={() => router.navigate("/agent")} />}
        </View>
      </Rise>

      {liveRoutines.length ? (
        <Rise play={play} index={2}>
          <SectionHeader title="Next up" count={upcoming.length || undefined} action={anyActive ? "Pause all" : "Resume all"} onAction={() => pauseAll(anyActive)} />
          {upcoming.length ? <NextUp runs={upcoming} now={now} /> : (
            <Card style={{ marginHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.fill, alignItems: "center", justifyContent: "center" }}><Icon name="pause" size={18} color={c.ink2} stroke={2} /></View>
              <T v="sub" color="ink2" style={{ flex: 1 }}>{`${liveRoutines.length === 1 ? "Your routine is" : `All ${liveRoutines.length} routines are`} paused. Nothing runs or pays until you resume.`}</T>
            </Card>
          )}
        </Rise>
      ) : null}

      <Rise play={play} index={3} style={{ marginTop: 24 }}>
        {/* one "This week": the curve says when, the covers say what, three icons say how it went */}
        <SpendChart ledger={ledger} agentOf={spendAgent} play={ready} title="This week" fixed
          footer={<WeekBought d={digest} itemName={itemName} sellerName={sellerLabel} />} />
      </Rise>
      </>}
    </Screen>
  );
}
