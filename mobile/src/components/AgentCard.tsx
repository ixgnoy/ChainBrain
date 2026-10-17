// One connected agent (Stitch chainbrain_agents): its mark and name, who makes it and since when it is connected, every pocket
// it holds as a hand of the same 2.5D cards Home shows (each overlapping the next on its right, so every name stays in view;
// tap one to open it), how much of its money it has spent (hatch bar), what it is doing now, and the way in: Chat for the
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
import { useApp, type Pocket } from "../store";
import { PocketFace, toneFor } from "./PocketFace";
import { stackOrder, stripFor } from "./PocketWallet";
import { startFlight } from "../ui/cardFlight";

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
          <View style={{ minHeight: 24, paddingHorizontal: 10, borderRadius: 12, backgroundColor: a.kind === "builtin" ? c.fill : c.blueSoft, justifyContent: "center" }}>
            <T v="tab" w="bold" style={{ color: a.kind === "builtin" ? c.ink : c.blueInk, letterSpacing: 0.4 }}>{a.kind === "builtin" ? "Built in" : a.maker}</T>
          </View>
        </View>

        {held.length ? null : (
          <View style={{ borderRadius: radius.tile, borderWidth: 1, borderStyle: "dashed", borderColor: c.line, padding: 14 }}>
            <T v="sub" color="muted">{off ? "No pocket. Reconnect and give it one to start again." : "Holds no pocket yet. Give it one to let it pay."}</T>
          </View>
        )}

      </Press>
      {/* the pockets and the footer sit outside the card's press (no button inside a button) */}
      {held.length ? <View style={{ paddingHorizontal: 16, marginTop: -2, marginBottom: 14 }}><Hand pockets={held} /></View> : null}
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: DOT[line.tone] }} />
            <T v="sub" w="semi" numberOfLines={1} style={{ flexShrink: 1 }}>{total > 0n && (line.tone === "idle" || line.tone === "off") ? `${a.payments} paid · US$${usd(a.spent)} · ${line.text.replace(/^Last active /, "")}` : line.text}</T>
          </View>
          {off ? <Button label="Reconnect" small kind="secondary" icon="link" onPress={() => connectAgent(a.id)} />
            : (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button label={`Give ${a.kind === "builtin" ? "ChainBrain" : a.name} a pocket`} small kind="vermillion" icon="plus" style={{ flex: 1 }} onPress={() => router.push({ pathname: "/compose", params: { agent: a.id } })} />
                {a.kind === "builtin" ? <Button label="Chat" small kind="secondary" iconRight="arrowUpRight" onPress={() => router.navigate("/agent")} />
                  : (
                    <Press kind="round" haptics="select" onPress={open} accessibilityRole="button" accessibilityLabel={`Manage ${a.name}`}
                      style={{ width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: c.tileStroke, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }}>
                      <Icon name="settings" size={18} color={c.ink} stroke={2} />
                    </Press>
                  )}
              </View>
            )}
        </View>
    </Card>
  );
}

/** The agent's pockets as a small wallet: each card's top strip (its name and balance, the same faces as Home's stack),
 *  one under the other. Tap a strip to open its pocket. */
function Hand({ pockets }: { pockets: Pocket[] }) {
  const { pockets: all } = useApp();
  const [w, setW] = React.useState(0);
  const strip = stripFor(w);
  // the stack's order: neighbours differ in face, revoked ones first
  const byAddr = new Map(pockets.map((p) => [p.address.toLowerCase(), p]));
  const order = stackOrder(pockets).map((a) => byAddr.get(a)!).filter(Boolean);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: w ? pockets.length * strip : 0, borderRadius: 18, overflow: "hidden" }}>
      {w ? order.map((p, i) => <HandCard key={p.address} p={p} i={i} w={w} top={i * strip} tone={toneFor(all, p.address)} />) : null}
    </View>
  );
}
function HandCard({ p, i, w, top, tone }: { p: Pocket; i: number; w: number; top: number; tone: number }) {
  const ref = React.useRef<View>(null);
  const open = () => {
    const push = () => router.push({ pathname: "/pocket/[id]", params: { id: p.address } });
    if (!ref.current) return push();
    ref.current.measureInWindow((x, y, ww, hh) => { startFlight(p.address, { x, y, w: ww, h: hh }, tone, 0); push(); });
  };
  return (
    <View ref={ref} collapsable={false} style={{ position: "absolute", left: 0, top, zIndex: i + 1 }}>
      <Press kind="row" haptics="light" onPress={open} accessibilityRole="button" accessibilityLabel={`${cleanText(p.name, 30)} pocket, ${usd(p.balance)} USDC${p.revoked ? ", revoked" : ""}. Opens the pocket`}>
        <PocketFace pocket={p} width={w} tone={tone} still peek />
      </Press>
    </View>
  );
}
