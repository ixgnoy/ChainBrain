// One connected agent (Stitch chainbrain_agents): its mark and name, who makes it and since when it is connected, every pocket
// it holds with its balance, how much of its money it has spent (hatch bar), what it is doing now, and the way in: Chat for the
// built-in agent, Manage for an outside one. A disconnected agent goes quiet under hatch with "Reconnect".
import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { c, radius } from "../tokens";
import { Button, Card, Press } from "../ui/kit";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { Money } from "../ui/Money";
import { Hatch, HatchBar } from "../ui/Hatch";
import { AgentAvatar } from "../ui/AgentAvatar";
import { activityLine, ago, type AgentView } from "../lib/agents";
import { usd } from "../lib/util";
import { cleanText } from "../lib/sanitize";
import { useApp } from "../store";

const DOT = { live: c.green, idle: c.faint, off: c.faint, wait: c.blue } as const;

export function AgentCard({ a, busy }: { a: AgentView; busy?: boolean }) {
  const { findPocket, connectAgent } = useApp();
  const off = a.status === "disconnected";
  const line = activityLine(a, Date.now(), busy);
  const held = a.pockets.map((p) => findPocket(p)).filter((p): p is NonNullable<typeof p> => !!p);
  const total = a.spent + a.balance;
  const since = a.kind === "builtin" ? "Built into ChainBrain" : off ? `Disconnected ${a.disconnectedAt ? ago(a.disconnectedAt) : ""}`.trim() : a.connectedAt ? `Connected ${ago(a.connectedAt)}` : "Connected";
  const open = () => router.push({ pathname: "/agents/[id]", params: { id: a.id } });
  return (
    <Card pad={0} style={{ marginHorizontal: 16, overflow: "hidden" }}>
      {off ? <Hatch color={c.line} pitch={8} stroke={1.2} opacity={0.6} /> : null}
      <Press kind="row" haptics="light" onPress={open} accessibilityRole="button" accessibilityLabel={`${a.name}, ${since}, ${line.text}`} style={{ padding: 16, paddingBottom: 12, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <AgentAvatar kind={a.id} size={48} badge={off ? undefined : a.kind === "builtin" ? c.vermillion : undefined} />
          <View style={{ flex: 1, gap: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <T v="head" numberOfLines={1} style={{ flexShrink: 1 }}>{a.kind === "builtin" ? "ChainBrain Agent" : a.name}</T>
              {!off ? <Icon name="circleCheck" size={15} color={c.vermillion} stroke={2.2} /> : null}
            </View>
            <T v="sub" color="muted" numberOfLines={1}>{since}</T>
          </View>
          <View style={{ height: 24, paddingHorizontal: 10, borderRadius: 12, backgroundColor: a.kind === "builtin" ? c.fill : c.blueSoft, justifyContent: "center" }}>
            <T v="tab" w="bold" style={{ color: a.kind === "builtin" ? c.ink : c.blueInk, letterSpacing: 0.4 }}>{a.kind === "builtin" ? "Built in" : a.maker}</T>
          </View>
        </View>

        {held.length ? (
          <View style={{ borderRadius: radius.tile, backgroundColor: c.fill, padding: 12, gap: 10 }}>
            {held.map((p, i) => (
              <View key={p.address} style={{ flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.tileStroke, paddingTop: i ? 10 : 0 }}>
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }}><Icon name={p.revoked ? "lock" : "card"} size={16} stroke={2} color={p.revoked ? c.muted : c.ink} /></View>
                <View style={{ flex: 1 }}>
                  <T v="tab" color="muted" style={{ textTransform: "uppercase", letterSpacing: 0.8 }}>{p.revoked ? "Revoked pocket" : "Holds pocket"}</T>
                  <T v="row" w="bold" numberOfLines={1} color={p.revoked ? "muted" : "ink"}>{cleanText(p.name, 28)}</T>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <T v="cap" color="muted">Balance</T>
                  <Money v="row" value={usd(p.balance)} color={p.revoked ? "muted" : "ink"} decorative />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ borderRadius: radius.tile, borderWidth: 1, borderStyle: "dashed", borderColor: c.line, padding: 14 }}>
            <T v="sub" color="muted">{off ? "No pocket. Reconnect and give it one to start again." : "Holds no pocket yet. Give it one to let it pay."}</T>
          </View>
        )}

        {total > 0n ? (
          <View style={{ gap: 6 }}>
            <HatchBar value={Number(a.spent) / Number(total)} tone={c.ink} height={10} label={`${a.name} has spent ${usd(a.spent)} of ${usd(total)}`} />
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <T v="cap" color="muted">{`US$${usd(a.spent)} spent · ${a.payments} paid${a.refusals ? ` · ${a.refusals} refused` : ""}`}</T>
              <T v="cap" w="bold">{`${Math.round((Number(a.spent) / Number(total)) * 100)}% used`}</T>
            </View>
          </View>
        ) : null}
      </Press>
      {/* the footer sits outside the card's press (no button inside a button) */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingHorizontal: 16, paddingBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: DOT[line.tone] }} />
            <T v="sub" w="semi" numberOfLines={1} style={{ flexShrink: 1 }}>{line.text}</T>
          </View>
          {off ? <Button label="Reconnect" small kind="secondary" icon="link" onPress={() => connectAgent(a.id)} />
            : a.kind === "builtin" ? <Button label="Chat" small iconRight="arrowUpRight" onPress={() => router.navigate("/agent")} />
            : <Button label="Manage" small kind="secondary" iconRight="settings" onPress={open} />}
        </View>
    </Card>
  );
}
