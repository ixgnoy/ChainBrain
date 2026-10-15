// Agent detail (Stitch chainbrain_agent_detail_claude): who the agent is and since when it is connected, the pockets it holds
// (blue hatch cards: balance, cap, ask-me limit, state), what it spent today, its own step-by-step ledger, and the controls:
// give it another pocket, chat (built-in agent) or Disconnect (an outside agent: it stops, the money stays in the pocket).
import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../store";
import { c, radius } from "../../tokens";
import { Screen } from "../../ui/Screen";
import { BackHeader, BACK_HEADER_H } from "../../ui/BackHeader";
import { Button, Card, Press, StatusPill } from "../../ui/kit";
import { T, Eyebrow } from "../../ui/Text";
import { Icon } from "../../ui/Icon";
import { Money } from "../../ui/Money";
import { Hatch, HatchBar } from "../../ui/Hatch";
import { Reveal } from "../../ui/Reveal";
import { AgentAvatar } from "../../ui/AgentAvatar";
import { HoldToRevoke } from "../../ui/HoldToRevoke";
import { agentSteps, ago, activityLine, type AgentId, type AgentStep } from "../../lib/agents";
import { plainReason } from "../../lib/plain";
import { money, usd } from "../../lib/util";
import { cleanText } from "../../lib/sanitize";
import { NEVER } from "../../lib/shared";
import type { Pocket } from "../../store";

const ICON: Record<AgentStep["kind"], "search" | "file" | "hourglass" | "checks" | "circleCheck" | "ban" | "link" | "unlink"> = {
  search: "search", quote: "file", ask: "hourglass", task: "checks", paid: "circleCheck", refused: "ban", connected: "link", disconnected: "unlink",
};

export default function AgentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { agents, findPocket, events, sellerName, disconnectAgent, connectAgent, openApproval, setExplorerTx, chatBusy } = useApp();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const a = agents.find((x) => x.id === id);
  const [more, setMore] = useState(false);
  const steps = useMemo(() => (a ? agentSteps(events, a.pockets, (s) => cleanText(sellerName(s), 28), (code) => plainReason(code ?? "")) : []), [a, events, sellerName]);
  if (!a) return <View style={{ flex: 1, backgroundColor: c.canvas }}><BackHeader title="Agent" /></View>;
  const off = a.status === "disconnected";
  const held = a.pockets.map((p) => findPocket(p)).filter((p): p is Pocket => !!p);
  const live = held.filter((p) => !p.revoked);
  const startOfDayBalance = a.balance + a.spentToday;
  const line = activityLine(a, Date.now(), a.kind === "builtin" && chatBusy);
  const shown = more ? steps : steps.slice(0, 8);
  const title = a.kind === "builtin" ? "ChainBrain Agent" : a.name;
  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <BackHeader title={title} scrollY={scrollY} revealAt={90} />
      <Screen tabs={false} top={false} scrollY={scrollY} contentContainerStyle={{ paddingTop: insets.top + BACK_HEADER_H + 4, paddingBottom: insets.bottom + 40 }}>
        <Reveal index={0}>
          <Card pad={16} style={{ marginHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
            <AgentAvatar kind={a.id} size={60} />
            <View style={{ flex: 1, gap: 3 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <T v="section" numberOfLines={1} style={{ flexShrink: 1 }} accessibilityRole="header">{title}</T>
                {!off ? <Icon name="circleCheck" size={17} color={c.vermillion} stroke={2.2} /> : null}
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: off ? c.faint : c.green }} />
                <T v="sub" color="muted" numberOfLines={1}>{a.kind === "builtin" ? `Built in · ${line.text}` : off ? `Disconnected${a.disconnectedAt ? ` ${ago(a.disconnectedAt)}` : ""}` : `${a.maker} · connected ${a.connectedAt ? ago(a.connectedAt) : ""}`}</T>
              </View>
            </View>
          </Card>
        </Reveal>

        <Reveal index={1}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginTop: 22, marginBottom: 10 }}>
            <Eyebrow color="mutedOnCanvas">{held.length === 1 ? "Assigned pocket" : `${held.length} pockets`}</Eyebrow>
            {held.length ? <T v="cap" color="mutedOnCanvas">{`US$${usd(a.balance)} left in total`}</T> : null}
          </View>
          <View style={{ gap: 12 }}>
            {held.map((p) => <HeldPocket key={p.address} p={p} />)}
            {!held.length ? <Card style={{ marginHorizontal: 16 }}><T v="sub" color="ink2">{`${a.name} holds no pocket. Give it one to let it pay inside limits you set.`}</T></Card> : null}
          </View>
        </Reveal>

        {live.length ? (
          <Reveal index={2}>
            <Card pad={18} style={{ marginHorizontal: 16, marginTop: 14, gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
                <T v="head">Spent today</T>
                <T v="head" style={{ color: c.vermillionInk }} accessibilityLabel="share of its money spent today">{`${startOfDayBalance > 0n ? Math.round((Number(a.spentToday) / Number(startOfDayBalance)) * 100) : 0}%`}</T>
              </View>
              <T v="sub" color="muted">{`US$${usd(a.spentToday)} spent today · US$${usd(a.balance)} left in its ${held.length === 1 ? "pocket" : "pockets"}`}</T>
              <HatchBar value={startOfDayBalance > 0n ? Number(a.spentToday) / Number(startOfDayBalance) : 0} tone={c.vermillion} height={16} label="Spent today" />
            </Card>
          </Reveal>
        ) : null}

        <Reveal index={3}>
          <Card pad={0} style={{ marginHorizontal: 16, marginTop: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18, paddingBottom: 6 }}>
              <T v="section">Activity ledger</T>
              <T v="cap" color="muted">{`${a.requestsToday} requests today`}</T>
            </View>
            {shown.length ? shown.map((s, i) => (
              <StepRow key={s.key} s={s} last={i === shown.length - 1 && steps.length <= shown.length}
                onPress={s.approvalId && s.status.label === "Waiting for you" ? () => openApproval(s.approvalId!) : s.tx ? () => setExplorerTx(s.tx!) : undefined} />
            )) : <T v="sub" color="muted" style={{ padding: 18 }}>Nothing yet.</T>}
            {steps.length > shown.length ? (
              <Press kind="row" haptics="select" onPress={() => setMore(true)} accessibilityRole="button" accessibilityLabel="Show all activity" style={{ padding: 16, alignItems: "center" }}>
                <T v="label">{`Show all ${steps.length}`}</T>
              </Press>
            ) : null}
          </Card>
        </Reveal>

        <View style={{ marginHorizontal: 16, marginTop: 18, gap: 12 }}>
          {a.kind === "builtin" ? (
            <>
              <Button label="Chat with ChainBrain" icon="chat" onPress={() => router.navigate("/agent")} />
              <Button label="Give it another pocket" kind="secondary" icon="plus" onPress={() => router.push("/create")} />
              <T v="cap" color="mutedOnCanvas" style={{ textAlign: "center" }}>The built-in agent stops when you revoke its pocket.</T>
            </>
          ) : off ? (
            <Button label={`Reconnect ${a.name}`} icon="link" onPress={() => connectAgent(a.id as AgentId)} />
          ) : (
            <>
              <Button label="Give another pocket" icon="plus" onPress={() => router.push({ pathname: "/connect", params: { agent: a.id } })} />
              <Card pad={14} style={{ gap: 10 }}>
                <HoldToRevoke label={`Hold to disconnect ${a.name}`} onComplete={async () => { disconnectAgent(a.id as AgentId); }} />
                <T v="cap" color="muted" style={{ textAlign: "center" }}>Stops the agent. Money stays safe in the pocket.</T>
              </Card>
            </>
          )}
        </View>
      </Screen>
    </View>
  );
}

/** A pocket the agent holds, as a blue hatch card (white hatch once it is revoked). Opens the pocket page. */
function HeldPocket({ p }: { p: Pocket }) {
  const ask = p.askAbove === NEVER || p.askAbove > p.cap ? "Never" : money(p.askAbove);
  const state = p.revoked ? "Revoked" : p.frozen ? "Frozen" : "Active";
  return (
    <Press kind="row" haptics="light" onPress={() => router.push({ pathname: "/pocket/[id]", params: { id: p.address } })}
      accessibilityRole="button" accessibilityLabel={`${cleanText(p.name, 28)}, ${state}, balance ${money(p.balance)}`}
      style={{ marginHorizontal: 16, borderRadius: radius.card, overflow: "hidden", backgroundColor: p.revoked ? c.card : c.blue, padding: 18, gap: 14 }}>
      <Hatch color={p.revoked ? c.line : c.ink} pitch={8} stroke={1.3} opacity={p.revoked ? 0.8 : 0.1} />
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
        <View style={{ gap: 2, flexShrink: 1 }}>
          <T v="cap" color={p.revoked ? "muted" : "blueInk"}>Pocket</T>
          <T v="section" numberOfLines={1} color={p.revoked ? "muted" : "ink"}>{cleanText(p.name, 24)}</T>
        </View>
        <View style={{ height: 24, paddingHorizontal: 10, borderRadius: 6, backgroundColor: p.revoked ? c.vermillionSoft : c.ink, justifyContent: "center" }}>
          <T v="tab" w="bold" style={{ color: p.revoked ? c.vermillionInk : c.white, letterSpacing: 0.9, textTransform: "uppercase" }}>{state}</T>
        </View>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {[["Balance", money(p.balance)], ["Cap", money(p.cap)], ["Ask above", ask]].map(([k, v]) => (
          <View key={k} style={{ gap: 1 }}>
            <T v="cap" color={p.revoked ? "muted" : "blueInk"}>{k}</T>
            <T v="head" color={p.revoked ? "muted" : "ink"}>{v}</T>
          </View>
        ))}
      </View>
      <T v="mono" color={p.revoked ? "muted" : "ink"} style={{ fontSize: 12 }}>{`••••  ${p.address.slice(-4).toUpperCase()}`}</T>
    </Press>
  );
}

function StepRow({ s, last, onPress }: { s: AgentStep; last: boolean; onPress?: () => void }) {
  const tone = s.status.tone === "vermillion" ? { bg: c.vermillionSoft, fg: c.vermillionInk } : s.status.tone === "green" ? { bg: c.greenSoft, fg: c.greenInk } : s.status.tone === "blue" ? { bg: c.blueSoft, fg: c.blueInk } : { bg: c.fill, fg: c.ink };
  const time = new Date(s.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const body = (
    <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.fill }}>
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: tone.bg, alignItems: "center", justifyContent: "center" }}><Icon name={ICON[s.kind]} size={18} color={tone.fg} stroke={2} /></View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <T v="row" w="bold" style={{ flexShrink: 1 }}>{s.title}</T>
          {s.amount != null ? <T v="row" w="bold" color={s.kind === "refused" ? "muted" : "ink"}>{`${s.kind === "paid" ? "−" : ""}US$${usd(s.amount)}`}</T> : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ alignSelf: "flex-start" }}><StatusPill label={s.status.label} tone={s.status.tone === "ink" ? "ink" : s.status.tone} /></View>
          <T v="cap" color="muted">{time}</T>
        </View>
        {s.detail ? <T v="sub" color={s.kind === "refused" ? "vermillionInk" : "muted"} numberOfLines={2}>{cleanText(s.detail, 120)}</T> : null}
        {s.tx ? <T v="cap" w="bold" style={{ color: c.vermillionInk, textDecorationLine: "underline" }}>View proof</T> : null}
      </View>
    </View>
  );
  return onPress ? <Press kind="row" haptics="light" onPress={onPress} accessibilityRole="button" accessibilityLabel={`${s.title}, ${s.status.label}`}>{body}</Press> : body;
}
