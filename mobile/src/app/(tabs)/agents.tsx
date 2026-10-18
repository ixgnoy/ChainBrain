// Agents tab (Stitch chainbrain_agents): every agent that holds one of your pockets, what it holds and does, and the way to
// connect another. Each pocket names exactly one agent; one agent can hold several pockets, each granted separately.
// On a real server only the built-in agent exists until ChainBrain's MCP server ships, so Connect is not offered there.
import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../store";
import { c, radius } from "../../tokens";
import { Screen, PageTitle } from "../../ui/Screen";
import { Button, Card, Press, Tile } from "../../ui/kit";
import { T } from "../../ui/Text";
import { Icon } from "../../ui/Icon";
import { Money } from "../../ui/Money";
import { Hatch } from "../../ui/Hatch";
import { Reveal } from "../../ui/Reveal";
import { AgentCard } from "../../components/AgentCard";
import { HomeHeader } from "./index";
import { hkd } from "../../lib/util";
import { GLASS_TAB_SPACE as TAB_SPACE } from "../../ui/glass/GlassTabBar";

export default function Agents() {
  const { agents, pending, chatBusy } = useApp();
  const insets = useSafeAreaInsets();
  const outside = agents.length > 1;
  const live = agents.filter((a) => a.status === "connected");
  const inPockets = agents.reduce((n, a) => n + a.balance, 0n);
  const today = agents.reduce((n, a) => n + a.requestsToday, 0);
  const asks = pending.filter((a) => a.kind !== "question").length;
  return (
    <Screen contentContainerStyle={{ paddingBottom: TAB_SPACE + insets.bottom + 32 }}>
      <HomeHeader ask={false} />
      <PageTitle title="Connected agents"
        right={<View style={{ minHeight: 28, paddingHorizontal: 11, borderRadius: 14, backgroundColor: c.card, flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.vermillion }} />
          <T v="cap" w="bold">{`${live.length} active`}</T>
        </View>} />

      {outside ? (
        <Reveal index={1}>
          <Button label="Connect an agent" kind="vermillion" icon="plus" onPress={() => router.push("/connect")} style={{ marginHorizontal: 16, marginTop: 8 }} />
        </Reveal>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginTop: 24, marginBottom: 10 }}>
        <T v="head">{`${agents.length} ${agents.length === 1 ? "agent" : "agents"}`}</T>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <T v="cap" color="mutedOnCanvas">In agent cards</T>
          <Money v="row" value={hkd(inPockets)} decorative />
        </View>
      </View>

      <View style={{ gap: 30, marginTop: 6 }}>
        {agents.map((a, i) => <Reveal key={a.id} index={i + 2}><AgentCard a={a} busy={a.kind === "builtin" && chatBusy} /></Reveal>)}
      </View>

      {!outside ? (
        <Card style={{ marginHorizontal: 16, marginTop: 12 }}>
          <T v="sub" color="ink2">This server runs ChainBrain's own agent. Claude and ChatGPT can connect once ChainBrain's MCP server is available.</T>
        </Card>
      ) : null}

    </Screen>
  );
}
