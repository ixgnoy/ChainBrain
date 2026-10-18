// Connect an agent (Stitch chainbrain_connect_agent, step 1): pick Claude or ChatGPT, then copy the pairing link or show the
// QR code to the agent's app. When the agent opens the link it asks for consent (ConsentSheet): the owner gives it a new
// pocket or denies. Built-in network only: on a real server outside agents can't connect until ChainBrain's MCP server ships.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import Svg, { Rect } from "react-native-svg";
import { toQR } from "toqr";
import type { Address } from "viem";
import { useApp } from "../store";
import { c, motion, radius } from "../tokens";
import { haptic } from "../haptics";
import { Screen } from "../ui/Screen";
import { BackHeader, BACK_HEADER_H } from "../ui/BackHeader";
import { Button, Card, Press } from "../ui/kit";
import { T, Eyebrow } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { Reveal } from "../ui/Reveal";
import { WorkingDots } from "../ui/WorkingLine";
import { AgentAvatar } from "../ui/AgentAvatar";
import { ConsentSheet } from "../components/ConsentSheet";
import { useAutoplayTarget } from "../lib/autoplayTargets";
import { startGrantedAgent } from "../lib/builtin";
import { agentInfo, type AgentId } from "../../../shared/sim/agents";

const HOW: Record<string, string> = {
  claude: "In Claude: Settings › Connectors › Add custom connector, then paste the link.",
  chatgpt: "In ChatGPT: Settings › Connectors › Create, then paste the link.",
};

function Qr({ text, size }: { text: string; size: number }) {
  const m = useMemo(() => toQR(text), [text]);
  const n = Math.round(Math.sqrt(m.length));
  const q = 2; // quiet zone in modules
  const cell = size / (n + q * 2);
  const cells: React.ReactNode[] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y * n + x]) cells.push(<Rect key={`${x}.${y}`} x={(x + q) * cell} y={(y + q) * cell} width={cell + 0.3} height={cell + 0.3} fill={c.ink} />);
  return <Svg width={size} height={size}><Rect x={0} y={0} width={size} height={size} fill={c.white} />{cells}</Svg>;
}

export default function Connect() {
  const params = useLocalSearchParams<{ agent?: string }>();
  const { agents } = useApp();
  const insets = useSafeAreaInsets();
  const outside = agents.filter((a) => a.kind === "outside");
  const [agent, setAgent] = useState<AgentId>((params.agent as AgentId) ?? "claude");
  const code = useRef(Math.random().toString(36).slice(2, 6).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase()).current;
  const link = `chainbrain://pair?agent=${agent}&code=${code}`;
  const [copied, setCopied] = useState(false);
  const [opening, setOpening] = useState(false);
  const [consent, setConsent] = useState(false);
  const info = agentInfo(agent)!;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { setCopied(false); setOpening(false); if (timer.current) clearTimeout(timer.current); }, [agent]);

  // the agent opens the pairing link a moment after the owner hands it over (copied, or the QR scanned), then asks for consent
  const handOver = () => {
    if (opening) return;
    setOpening(true);
    timer.current = setTimeout(() => { haptic.soft(); setConsent(true); }, 2200);
  };
  const copy = async () => {
    void Clipboard.setStringAsync(link).catch(() => {}); // never wait on the clipboard (web can leave it pending without permission)
    setCopied(true); haptic.success();
    handOver();
  };
  useAutoplayTarget("connect.agent", (arg?: AgentId) => { if (arg) setAgent(arg); return true; });
  useAutoplayTarget("connect.copy", () => { void copy(); return true; }, !opening);

  const allowed = (pocket: Address) => {
    setConsent(false);
    void startGrantedAgent(agent, pocket as `0x${string}`).catch(() => {});
    router.replace({ pathname: "/agents/[id]", params: { id: agent } });
  };

  if (!outside.length) {
    return (
      <View style={{ flex: 1, backgroundColor: c.canvas }}>
        <BackHeader title="Connect an agent" />
        <Card style={{ margin: 16 }}><T v="body" color="ink2">This server runs ChainBrain's own agent. Claude and ChatGPT can connect once ChainBrain's MCP server is available.</T></Card>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <BackHeader title="Connect an agent" />
      <Screen tabs={false} top={false} contentContainerStyle={{ paddingTop: 4, paddingBottom: insets.bottom + 32 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 10 }}>
          <View style={{ minHeight: 28, paddingHorizontal: 11, borderRadius: 14, backgroundColor: c.card, flexDirection: "row", alignItems: "center", gap: 7 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.vermillion }} />
            <T v="tab" w="bold" style={{ letterSpacing: 0.9, textTransform: "uppercase" }}>Pairing</T>
          </View>
          <View style={{ flexDirection: "row", gap: 5 }}>{[0, 1, 2].map((i) => <View key={i} style={{ width: 26, height: 5, borderRadius: 3, backgroundColor: i <= (consent ? 1 : 0) ? c.ink : c.line }} />)}</View>
        </View>

        <Reveal index={0}>
          <Card pad={18} style={{ marginHorizontal: 16, gap: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c.ink, alignItems: "center", justifyContent: "center" }}><T v="label" style={{ color: c.white, fontSize: 13 }}>1</T></View>
              <T v="section" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={{ flex: 1 }} accessibilityRole="header">Add ChainBrain to your AI</T>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {outside.map((a) => {
                const on = a.id === agent;
                return (
                  <Press key={a.id} kind="row" haptics="select" onPress={() => setAgent(a.id)} accessibilityRole="button" accessibilityLabel={`Connect ${a.name}`} accessibilityState={{ selected: on }}
                    style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: radius.tile, borderWidth: on ? 2 : 1, borderColor: on ? c.ink : c.tileStroke, backgroundColor: c.card }}>
                    <AgentAvatar kind={a.id} size={36} />
                    <View style={{ flex: 1 }}>
                      <T v="row" w="bold">{a.name}</T>
                      <T v="cap" color="muted">{a.maker}</T>
                    </View>
                  </Press>
                );
              })}
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 6, paddingLeft: 12, borderRadius: radius.tile, backgroundColor: c.fill }}>
              <Icon name="bolt" size={16} color={c.ink2} />
              <T v="mono" numberOfLines={1} style={{ flex: 1, textTransform: "none", letterSpacing: 0.3, fontSize: 12 }}>{link}</T>
              <Button label={copied ? "Copied" : "Copy link"} icon={copied ? "check" : "copy"} small onPress={() => void copy()} />
            </View>

            <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
              <Press kind="row" haptics="light" onPress={handOver} accessibilityRole="button" accessibilityLabel={`Pairing code for ${info.name}`}
                style={{ padding: 6, borderRadius: 14, borderWidth: 3, borderColor: c.ink, backgroundColor: c.white }}>
                <Qr text={link} size={112} />
              </Press>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Icon name="qr" size={16} color={c.vermillion} stroke={2} /><T v="row" w="bold">Scan to pair</T></View>
                <T v="sub" color="muted">{`Show this code to ${info.name}'s app, or paste the link.`}</T>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 10, padding: 12, borderRadius: radius.tile, backgroundColor: c.fill }}>
              <AgentAvatar kind={agent} size={24} />
              <T v="cap" color="ink2" style={{ flex: 1 }}>{HOW[agent]}</T>
            </View>
          </Card>
        </Reveal>

        <Reveal index={1}>
          <Card pad={18} style={{ marginHorizontal: 16, marginTop: 12, gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: opening ? c.ink : c.line, alignItems: "center", justifyContent: "center" }}><T v="label" style={{ color: c.white, fontSize: 13 }}>2</T></View>
              <T v="section" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={{ flex: 1 }}>{`${info.name} asks for a card`}</T>
            </View>
            {opening && !consent ? (
              <Animated.View entering={FadeIn.duration(motion.base)} exiting={FadeOut.duration(motion.exit)} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <WorkingDots />
                <T v="sub" color="ink2">{`Waiting for ${info.name} to open the link…`}</T>
              </Animated.View>
            ) : (
              <T v="sub" color="muted">{`You choose the budget and the sellers. ${info.name} never sees your main wallet or your other cards.`}</T>
            )}
          </Card>
        </Reveal>
        <Eyebrow color="mutedOnCanvas" accessibilityLabel="One card per agent grant, disconnect any time" style={{ textAlign: "center", marginTop: 18, paddingHorizontal: 24, lineHeight: 18 }}>{"One card per agent grant\nDisconnect any time"}</Eyebrow>
      </Screen>
      <ConsentSheet agent={agent} visible={consent} onClose={() => { setConsent(false); setOpening(false); }} onAllowed={allowed} />
    </View>
  );
}
