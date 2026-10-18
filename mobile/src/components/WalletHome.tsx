// Home's money, as it actually flows: the main wallet is the hero card (the one no agent holds; only the owner's key moves
// it), and the pockets hang under it on a rail, each a row that says what it is at a glance: a mini card in its job's face
// with the job's icon and the agent's mark on its corner, the pocket's name, one line of what it does, a bar of what it has
// spent, its balance and its live sign. Four, then "See all". Tap a row and its mini card flies up into the pocket's page.
// Every figure is from the store; the job line is from the pocket's own spec and rules.
import React, { useRef, useState } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import Animated, { FadeInDown, useAnimatedStyle } from "react-native-reanimated";
import { router } from "expo-router";
import { c, deck, level3 } from "../tokens";
import { T } from "../ui/Text";
import { Icon, type IconName } from "../ui/Icon";
import { Press } from "../ui/kit";
import { Money } from "../ui/Money";
import { Hatch } from "../ui/Hatch";
import { BrandMark } from "../ui/BrandMark";
import { AgentAvatar } from "../ui/AgentAvatar";
import { useTilt } from "../ui/tilt";
import { useReduceMotion } from "../ui/motion";
import { startFlight } from "../ui/cardFlight";
import { cleanText } from "../lib/sanitize";
import { money, hkd } from "../lib/util";
import { faceOf, toneFor } from "./PocketFace";
import type { Pocket } from "../store";
import { agentInfo } from "../../../shared/sim/agents";
import { USAGE_LABEL, USAGE_ORDER, usageOf, type Routine, type Usage } from "../../../shared/sim/pocketApp";
import { USAGE_FACE } from "./app/theme";
import type { Glyph } from "../../../shared/sim/pocketAppData";
import { curSign, tokenSymbol } from "../lib/runtime";

export const JOB_ICON: Record<string, IconName> = { research: "file", deal: "target", subscriptions: "refresh", haggle: "arrowDown" };

/** One line of what a pocket does, from its own spec and rules (never invented). */
export function jobLine(p: Pocket, rt: Routine | null | undefined, sellerName: (id: string) => string, itemName: (s: string, k: string) => string, negotiable: (sellerId: string) => boolean = () => false): string {
  // how often it spends is the chip beside this line (shared/sim/pocketApp.ts usageChip); this says what it does
  const app = p.app;
  const names = p.allowed.map(sellerName).slice(0, 2).join(" & ");
  if (p.revoked) return "Revoked · the agent is locked out";
  if (!app) return names || "Any seller on its list";
  const r = rt ?? app.routine;
  if (app.layout === "deal" && r?.items[0]) return `Buys ${itemName(r.items[0].sellerId, r.items[0].sku)} at ≤ ${curSign()}${r.limitPrice}`;
  if (app.layout === "haggle") return p.allowed.some(negotiable) ? `Haggles ${p.allowed.filter(negotiable).map(sellerName)[0]} down first` : `Buys once from ${names}`;
  if (r && app.layout === "subscriptions") return `Renews ${r.items.length} feeds`;
  return names || "Any seller on its list";
}

/** Live pockets by usage, scheduled first (they move money without being asked); revoked ones lead, as the stack's quiet top. */
export function byUsage<P extends Pocket>(pockets: P[]): P[] {
  const rank = (p: P) => (p.revoked ? -1 : USAGE_ORDER.indexOf(usageOf(p.app)));
  return pockets.map((p, i) => ({ p, i })).sort((a, b) => rank(a.p) - rank(b.p) || a.i - b.i).map((x) => x.p);
}

/** Which cards Home shows: at most three unless opened out. Under "All", one of each usage, the kinds used most recently
 *  first; under one usage, its three used most recently. Opened out, everything in the tab (revoked ones too under All). */
export function homeCards(pockets: Pocket[], lastAt: (address: string) => number, tab: Usage | "all", open: boolean, max = 3): { shown: Pocket[]; total: number } {
  const recent = (a: Pocket, b: Pocket) => lastAt(b.address) - lastAt(a.address);
  const pool = tab === "all" ? pockets : pockets.filter((p) => !p.revoked && usageOf(p.app) === tab);
  if (open || pool.length <= max) return { shown: pool, total: pool.length };
  const live = pool.filter((p) => !p.revoked).sort(recent);
  const pick: Pocket[] = [];
  if (tab === "all") for (const p of live) if (pick.length < max && !pick.some((x) => usageOf(x.app) === usageOf(p.app))) pick.push(p);
  for (const p of live) if (pick.length < max && !pick.includes(p)) pick.push(p);
  return { shown: pick, total: pool.length };
}

/** The stack's tabs, one per usage in its card's own colour, with how many pockets spend that way. They filter the stack. */
export function UsageTabs({ pockets, value, onChange }: { pockets: Pocket[]; value: Usage | "all"; onChange(v: Usage | "all"): void }) {
  const n = new Map<Usage, number>();
  for (const p of pockets) if (!p.revoked) n.set(usageOf(p.app), (n.get(usageOf(p.app)) ?? 0) + 1);
  const kinds = USAGE_ORDER.filter((u) => n.get(u));
  if (kinds.length < 2) return null;
  const live = pockets.filter((p) => !p.revoked).length;
  const tab = (key: Usage | "all", label: string, count: number) => {
    const on = value === key;
    const f = key === "all" ? null : deck[USAGE_FACE[key]];
    return (
      <Press key={key} haptics="select" scale={0.96} onPress={() => onChange(key)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={`${label}, ${count} ${count === 1 ? "card" : "cards"}`}
        style={{ flexDirection: "row", alignItems: "center", gap: 5, height: 32, paddingLeft: f ? 7 : 12, paddingRight: 11, borderRadius: 16, backgroundColor: on ? c.ink : c.card }}>
        {f ? <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: f.face, borderWidth: 1, borderColor: on ? "rgba(255,255,255,0.5)" : f.edge }} /> : null}
        <T v="cap" w="semi" style={{ color: on ? c.white : c.ink }}>{label}</T>
        <T v="cap" w="bold" style={{ color: on ? c.white : f ? f.usage : c.ink2, fontVariant: ["tabular-nums"] }}>{String(count)}</T>
      </Press>
    );
  };
  // one line whatever the text size: it scrolls sideways rather than wrapping
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" style={{ marginBottom: 10, flexGrow: 0 }} contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}>
      {tab("all", "All", live)}
      {kinds.map((u) => tab(u, USAGE_LABEL[u], n.get(u)!))}
    </ScrollView>
  );
}

export function WalletHero({ main, out, pockets, all }: { /** the main wallet's balance (eHKD units) */ main?: bigint; out: bigint; pockets: Pocket[]; all: Pocket[] }) {
  const reduce = useReduceMotion();
  const t = useTilt();
  const lean = useAnimatedStyle(() => ({ transform: [{ perspective: 900 }, { rotateX: `${reduce ? 0 : -t.y.value * 5}deg` }, { rotateY: `${reduce ? 0 : t.x.value * 5}deg` }] }));
  const live = pockets.filter((p) => p.balance > 0n).sort((a, b) => (b.balance > a.balance ? 1 : -1));
  return (
    <View style={{ marginHorizontal: 16 }}>
      <Animated.View style={lean}>
        <View accessible accessibilityLabel={`Main wallet ${main != null ? money(main) : ""}. ${money(out)} out in ${pockets.length} cards.`}
          style={{ borderRadius: 22, backgroundColor: c.card, overflow: "hidden", borderCurve: "continuous", ...level3, shadowOpacity: 0.12 } as object}>
          <View style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 64, overflow: "hidden" }}><Hatch color={c.ink} pitch={7} stroke={2} opacity={0.9} /></View>
          <View style={{ padding: 20, paddingRight: 84, gap: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <BrandMark size={26} />
              <T v="head">Main wallet</T>
            </View>
            {main != null ? <Money v="balance" value={hkd(main)} label={`Main wallet ${money(main)}`} /> : <T v="balance" color="muted">—</T>}
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Icon name="arrowDown" size={13} color={c.ink2} stroke={2.2} />
                <T v="cap" w="semi" color="ink2" style={{ fontVariant: ["tabular-nums"] }}>{`${money(out)} out in ${pockets.length} ${pockets.length === 1 ? "card" : "cards"}`}</T>
              </View>
              {live.length > 1 ? (
                <View style={{ flexDirection: "row", height: 6, gap: 2, borderRadius: 3, overflow: "hidden" }}>
                  {live.map((p) => { const f = faceOf(toneFor(all, p.address)); return <View key={p.address} style={{ flexGrow: Number(p.balance), flexBasis: 0, minWidth: 3, backgroundColor: f.face === "#FFFFFF" ? f.edge : f.face }} />; })}
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

export function PocketRows({ pockets, all, routines, glyphs, spent, sellerName, itemName, negotiable }: {
  pockets: Pocket[]; all: Pocket[]; routines: Map<string, Routine | null>; glyphs: Record<string, Glyph | null>;
  /** what each pocket has spent of what it was given, 0..1 */ spent: Record<string, number>;
  sellerName(id: string): string; itemName(s: string, k: string): string; negotiable(sellerId: string): boolean;
}) {
  const [allOpen, setAllOpen] = useState(false);
  const reduce = useReduceMotion();
  const shown = allOpen ? pockets : pockets.slice(0, 4);
  return (
    <View style={{ marginHorizontal: 16 }}>
      {/* the rail: money runs down from the wallet into each pocket */}
      <View pointerEvents="none" style={{ position: "absolute", left: 27, top: -14, bottom: pockets.length > 4 ? 64 : 34, width: 2, backgroundColor: c.line }} />
      {shown.map((p, i) => (
        <Animated.View key={p.address} entering={reduce || i < 4 ? undefined : FadeInDown.duration(220)}>
          <Row p={p} tone={toneFor(all, p.address)} glyph={glyphs[p.address.toLowerCase()] ?? null} spent={spent[p.address.toLowerCase()] ?? 0}
            job={jobLine(p, routines.get(p.address.toLowerCase()), sellerName, itemName, negotiable)} />
        </Animated.View>
      ))}
      {pockets.length > 4 ? (
        <Press haptics="select" onPress={() => setAllOpen((o) => !o)} accessibilityRole="button" accessibilityLabel={allOpen ? "Show fewer cards" : `See all ${pockets.length} cards`}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, paddingLeft: 4 }}>
          <View style={{ width: 48, alignItems: "center" }}><View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }}><Icon name={allOpen ? "chevronUp" : "chevronDown"} size={15} color={c.ink} stroke={2.2} /></View></View>
          <T v="sub" w="semi">{allOpen ? "Show fewer" : `See all ${pockets.length}`}</T>
        </Press>
      ) : null}
    </View>
  );
}

function Row({ p, tone, glyph, spent, job }: { p: Pocket; tone: number; glyph: Glyph | null; spent: number; job: string }) {
  const ref = useRef<View>(null);
  const { width } = useWindowDimensions();
  const f = faceOf(tone);
  const hatched = "hatch" in f && f.hatch;
  const name = cleanText(p.name, 30);
  const open = () => {
    const push = () => router.push({ pathname: "/pocket/[id]", params: { id: p.address } });
    if (!ref.current) return push();
    ref.current.measureInWindow((x, y, w, h) => { startFlight(p.address, { x, y, w, h }, tone, 0); push(); });
  };
  const sign = glyph?.kind === "next" ? new Date(glyph.at).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" })
    : glyph?.kind === "price" ? `${money(glyph.price)}${glyph.below ? " ✓" : ""}` : glyph?.kind === "paused" ? "Paused" : glyph?.kind === "running" ? "Running" : glyph?.kind === "saved" ? `Saved ${money(glyph.saved)}` : null;
  return (
    <Press kind="row" haptics="light" onPress={open} accessibilityRole="button"
      accessibilityLabel={`${name} card, ${hkd(p.balance)} ${tokenSymbol()}${p.revoked ? ", revoked" : ""}. ${agentInfo(p.agentId ?? "")?.name ?? "Your"} card: ${job}`} accessibilityHint="Opens the card"
      style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, minHeight: 72, opacity: p.revoked ? 0.55 : 1 }}>
      {/* the mini card, its job's icon on it and the agent's mark on its corner */}
      <View>
        <View ref={ref} collapsable={false} style={{ width: 56, height: 36, marginLeft: 0, borderRadius: 7, backgroundColor: f.face, overflow: "hidden", borderWidth: hatched ? 1 : 0, borderColor: c.tileStroke, justifyContent: "center", paddingLeft: 7, ...level3, shadowOpacity: 0.1, shadowRadius: 6 } as object}>
          {hatched ? <Hatch color={c.line} pitch={5} stroke={1} /> : null}
          <View style={{ position: "absolute", left: 0, right: 0, top: 9, height: 5, backgroundColor: f.band }} />
          <View style={{ marginTop: 8 }}><Icon name={JOB_ICON[p.app?.layout ?? "research"]} size={13} color={f.ink} stroke={2.4} /></View>
        </View>
        {p.agentId ? <View style={{ position: "absolute", right: -6, bottom: -6, borderRadius: 9, borderWidth: 2, borderColor: c.canvas }}><AgentAvatar kind={p.agentId} size={20} /></View> : null}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <T v="row" w="bold" numberOfLines={1}>{name}</T>
        <T v="cap" color="mutedOnCanvas" numberOfLines={1}>{job}</T>
        <View style={{ height: 4, borderRadius: 2, backgroundColor: c.fill, overflow: "hidden", marginTop: 2, maxWidth: width * 0.4 }}>
          <View style={{ width: `${Math.round(Math.min(1, spent) * 100)}%`, height: 4, backgroundColor: c.ink }} />
        </View>
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <Money v="row" value={hkd(p.balance)} decorative />
        {sign ? <T v="cap" color="mutedOnCanvas" numberOfLines={1} style={{ fontVariant: ["tabular-nums"] }}>{sign}</T> : null}
      </View>
    </Press>
  );
}

