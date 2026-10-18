// One connected agent, without a box round it (a card in a card was clutter): its mark and name, who makes it and since
// when, what it has done, then every pocket it holds as a row of full cards you swipe left and right, the same faces as
// Home's stack, and a dashed slot at the end to give it its own card (a pocket only it can spend from), the way a bank app
// adds a card. Tap a card to open its pocket. Chat for the built-in agent, Manage for an outside one; a disconnected agent
// goes quiet with "Reconnect".
import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { router } from "expo-router";
import { c } from "../tokens";
import { Button, Press } from "../ui/kit";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { AgentAvatar } from "../ui/AgentAvatar";
import { activityLine, ago, type AgentView } from "../lib/agents";
import { usd } from "../lib/util";
import { cleanText } from "../lib/sanitize";
import { useApp, type Pocket } from "../store";
import { PocketFace, cardHeight, toneFor } from "./PocketFace";
import { byUsage, jobLine } from "./WalletHome";
import { startFlight } from "../ui/cardFlight";
import * as api from "../lib/api";

const DOT = { live: c.green, idle: c.faint, off: c.faint, wait: c.blue } as const;
const GAP = 12;

export function AgentCard({ a, busy }: { a: AgentView; busy?: boolean }) {
  const { findPocket, connectAgent } = useApp();
  const off = a.status === "disconnected";
  const line = activityLine(a, Date.now(), busy);
  const held = byUsage(a.pockets.map((p) => findPocket(p)).filter((p): p is NonNullable<typeof p> => !!p));
  const total = a.spent + a.balance;
  const name = a.kind === "builtin" ? "ChainBrain" : a.name;
  const since = a.kind === "builtin" ? "Built into ChainBrain" : off ? `Disconnected ${a.disconnectedAt ? ago(a.disconnectedAt) : ""}`.trim() : a.connectedAt ? `Connected ${ago(a.connectedAt)}` : "Connected";
  const status = total > 0n && (line.tone === "idle" || line.tone === "off") ? `${a.payments} paid · US$${usd(a.spent)} · ${line.text.replace(/^Last active /, "")}` : line.text;
  const open = () => router.push({ pathname: "/agents/[id]", params: { id: a.id } });
  return (
    <View style={{ opacity: off ? 0.6 : 1 }}>
      {/* the agent: a plain header on the page */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 }}>
        <Press kind="row" haptics="light" onPress={open} accessibilityRole="button" accessibilityLabel={`${a.name}, ${since}, ${line.text}`} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52 }}>
          <AgentAvatar kind={a.id} size={44} badge={off ? undefined : a.kind === "builtin" ? c.vermillion : undefined} />
          <View style={{ flex: 1, gap: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <T v="head" numberOfLines={1} style={{ flexShrink: 1 }}>{a.kind === "builtin" ? "ChainBrain Agent" : a.name}</T>
              {!off ? <Icon name="circleCheck" size={15} color={c.vermillion} stroke={2.2} /> : null}
              <View style={{ minHeight: 20, paddingHorizontal: 8, borderRadius: 10, backgroundColor: a.kind === "builtin" ? c.card : c.blueSoft, justifyContent: "center" }}>
                <T v="tab" w="bold" style={{ color: a.kind === "builtin" ? c.ink : c.blueInk, letterSpacing: 0.4 }}>{a.kind === "builtin" ? "Built in" : a.maker}</T>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: DOT[line.tone] }} />
              <T v="cap" color="muted" numberOfLines={1} style={{ flexShrink: 1 }}>{`${since} · ${status}`}</T>
            </View>
          </View>
        </Press>
        {off ? null : a.kind === "builtin" ? (
          <Press kind="round" haptics="select" onPress={() => router.navigate("/agent")} accessibilityRole="button" accessibilityLabel="Chat"
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }}>
            <Icon name="chat" size={18} color={c.ink} stroke={2} />
          </Press>
        ) : (
          <Press kind="round" haptics="select" onPress={open} accessibilityRole="button" accessibilityLabel={`Manage ${a.name}`}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }}>
            <Icon name="settings" size={18} color={c.ink} stroke={2} />
          </Press>
        )}
      </View>
      {/* its cards, swiped left and right, and the slot that adds one */}
      <Cards pockets={held} agent={a.id} name={name} off={off} onReconnect={() => connectAgent(a.id)} />
    </View>
  );
}

function Cards({ pockets, agent, name, off, onReconnect }: { pockets: Pocket[]; agent: string; name: string; off: boolean; onReconnect(): void }) {
  const { pockets: all, sellerName, cfg } = useApp();
  const { width } = useWindowDimensions();
  const cw = Math.min(Math.round((width - 32) * 0.84), 360);
  const h = cardHeight(cw);
  const n = pockets.length + 1;
  const [at, setAt] = useState(0);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / (cw + GAP));
    setAt((x) => (x === i ? x : i));
  }, [cw]);
  const jobs = useMemo(() => {
    const neg = (id: string) => !!cfg?.sellers.find((x) => x.id === id)?.items.some((i) => (i as { negotiable?: boolean }).negotiable);
    const item = (sid: string, sku: string) => { const it = cfg?.sellers.find((s) => s.id === sid)?.items.find((i) => i.sku === sku); return it?.short ?? it?.description ?? sku; };
    return new Map(pockets.map((p) => [p.address, jobLine(p, api.routineOf(p.address), (id) => cleanText(sellerName(id), 24), item, neg)]));
  }, [pockets, cfg, sellerName]);
  return (
    <View style={{ marginTop: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={cw + GAP} decelerationRate="fast" disableIntervalMomentum
        onScroll={onScroll} scrollEventThrottle={32} contentContainerStyle={{ paddingHorizontal: 16, gap: GAP }} accessibilityLabel={`${name}'s cards`}>
        {pockets.map((p) => <AgentPocket key={p.address} p={p} w={cw} tone={toneFor(all, p.address)} job={jobs.get(p.address)} />)}
        {off ? (
          <View style={{ width: cw, height: h, borderRadius: 18, borderWidth: 1.5, borderStyle: "dashed", borderColor: c.line, alignItems: "center", justifyContent: "center", gap: 10, padding: 20 }}>
            <T v="sub" color="muted" style={{ textAlign: "center" }}>{`${name} is disconnected. Its cards stay yours.`}</T>
            <Button label="Reconnect" small kind="secondary" icon="link" onPress={onReconnect} />
          </View>
        ) : (
          <Press haptics="medium" scale={0.97} onPress={() => router.push({ pathname: "/compose", params: { agent } })} accessibilityRole="button"
            accessibilityLabel={`Give ${name} its own card: a pocket only ${name} can spend from`}
            style={{ width: cw, height: h, borderRadius: 18, borderWidth: 1.5, borderStyle: "dashed", borderColor: c.ink2, alignItems: "center", justifyContent: "center", gap: 10, padding: 20 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: c.vermillion, alignItems: "center", justifyContent: "center" }}>
              <Icon name="plus" size={24} color={c.white} stroke={2.6} />
            </View>
            <T v="row" w="bold" style={{ textAlign: "center" }}>{`Give ${name} its own card`}</T>
            <T v="cap" color="muted" style={{ textAlign: "center" }}>{`A pocket only ${name} can spend from`}</T>
          </Press>
        )}
      </ScrollView>
      {n > 1 ? (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 10 }}>
          {Array.from({ length: n }, (_, i) => <View key={i} style={{ width: i === at ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === at ? c.ink : c.line }} />)}
        </View>
      ) : null}
    </View>
  );
}

function AgentPocket({ p, w, tone, job }: { p: Pocket; w: number; tone: number; job?: string }) {
  const ref = React.useRef<View>(null);
  const open = () => {
    const push = () => router.push({ pathname: "/pocket/[id]", params: { id: p.address } });
    if (!ref.current) return push();
    ref.current.measureInWindow((x, y, ww, hh) => { startFlight(p.address, { x, y, w: ww, h: hh }, tone, 0); push(); });
  };
  return (
    <View ref={ref} collapsable={false}>
      <Press kind="row" haptics="light" scale={0.98} onPress={open} accessibilityRole="button" accessibilityLabel={`${cleanText(p.name, 30)}, ${usd(p.balance)} USDC${p.revoked ? ", revoked" : ""}${job ? `. ${job}` : ""}. Opens the pocket`}>
        <PocketFace pocket={p} width={w} tone={tone} job={job} still />
      </Press>
    </View>
  );
}
