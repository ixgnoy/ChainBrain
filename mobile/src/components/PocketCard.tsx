// Glossy gradient pocket card (Revolut-style account card, reimagined as authority: balance, cap, ask-above).
import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, Line, Pattern, Rect } from "react-native-svg";
import { Press } from "../ui/primitives";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { pocketGradients, radius } from "../tokens";
import { F } from "../theme";
import { usd, num, askText, dateLabel } from "../lib/util";
import { NEVER } from "../lib/shared";
import type { Pocket } from "../store";

export const CARD_W = 300;
export const CARD_H = 204;

export const gradientFor = (style: string): [string, string] => pocketGradients[style] ?? pocketGradients.custom;
export const isExpired = (p: { revoked: boolean; expiresAt: bigint | number }) => !p.revoked && Number(p.expiresAt) * 1000 < Date.now();

function Hatch() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <Pattern id="hatch" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
          <Line x1="0" y1="0" x2="0" y2="10" stroke="rgba(255,255,255,0.14)" strokeWidth="3" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#hatch)" />
    </Svg>
  );
}

/** Authority meter: auto zone (0..ask-above), asks-you zone (ask-above..cap), beyond cap blocked. Amounts in atomic USDC. */
export function AuthorityMeter({ cap, askAbove, dim }: { cap: bigint; askAbove: bigint; dim?: boolean }) {
  const capM = Math.max(num(cap), 1), askM = askAbove === NEVER ? capM : Math.min(num(askAbove), capM);
  const total = capM * 1.25;
  const auto = askM / total, ask = (capM - askM) / total, blocked = 1 - auto - ask;
  const seg = (flex: number, bg: string, extra?: object) => <View style={[{ flex: Math.max(flex, 0.0001), height: 6, backgroundColor: bg }, extra]} />;
  return (
    <View style={{ flexDirection: "row", gap: 3, opacity: dim ? 0.5 : 1 }}>
      {seg(auto, "rgba(255,255,255,0.95)", { borderTopLeftRadius: 3, borderBottomLeftRadius: 3 })}
      {ask > 0.001 && seg(ask, "#FFB020")}
      {seg(blocked, "rgba(255,255,255,0.22)", { borderTopRightRadius: 3, borderBottomRightRadius: 3 })}
    </View>
  );
}

export type CardData = { name: string; style: string; balance: bigint; cap: bigint; askAbove: bigint; expiresAt: bigint | number; revoked: boolean; owned: boolean; sellers: number };
export const cardOf = (p: Pocket): CardData => ({ name: p.name, style: p.style, balance: p.balance, cap: p.cap, askAbove: p.askAbove, expiresAt: p.expiresAt, revoked: p.revoked, owned: p.owned, sellers: p.allowed.length });

export function PocketCard({ pocket, onPress, width = CARD_W, hero }: { pocket: CardData; onPress?: () => void; width?: number | "100%"; hero?: boolean }) {
  const revoked = pocket.revoked;
  const expired = isExpired(pocket);
  const colors: [string, string] = revoked ? ["#2A2B30", "#4A4C55"] : gradientFor(pocket.style);
  const status = revoked ? { label: "Revoked", bg: "rgba(196,92,255,0.30)", border: "rgba(196,92,255,0.7)", fg: "#F0C8FF", icon: "lock" as const }
    : expired ? { label: "Expired", bg: "rgba(255,255,255,0.14)", border: "rgba(255,255,255,0.25)", fg: "#fff", icon: "clock" as const }
    : { label: "Active", bg: "rgba(255,255,255,0.16)", border: "rgba(255,255,255,0.28)", fg: "#fff", icon: "check" as const };
  return (
    <Press onPress={onPress} scale={0.98} accessibilityLabel={`${pocket.name} pocket, ${usd(pocket.balance)} USDC`} style={{ width, height: hero ? undefined : CARD_H }}>
      <View style={{ borderRadius: radius.xl, overflow: "hidden", borderCurve: "continuous", minHeight: hero ? CARD_H : undefined, flex: 1, borderWidth: 1, borderColor: "rgba(255,255,255,0.20)" } as any}>
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        {/* gloss: soft diagonal sheen + top rim light */}
        <LinearGradient colors={["rgba(255,255,255,0.26)", "rgba(255,255,255,0)"]} start={{ x: 0, y: 0 }} end={{ x: 0.7, y: 0.55 }} style={StyleSheet.absoluteFill} />
        <View style={{ position: "absolute", right: -60, bottom: -80, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(255,255,255,0.07)" }} />
        {revoked && <Hatch />}
        <View style={{ flex: 1, padding: 18, justifyContent: "space-between", position: "relative", zIndex: 1 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <T v="title" numberOfLines={1} style={{ color: "#fff" }}>{pocket.name}</T>
              <T v="caption" style={{ color: "rgba(255,255,255,0.7)" }}>{pocket.sellers} seller{pocket.sellers === 1 ? "" : "s"} allowed</T>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: status.bg, borderWidth: 1, borderColor: status.border }}>
              <Icon name={status.icon} size={12} color={status.fg} stroke={2.4} />
              <T v="caption" style={{ color: status.fg }}>{status.label}</T>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
            <T v="displayLg" num style={{ color: "#fff", fontSize: 40, lineHeight: 44, opacity: revoked ? 0.6 : 1 }}>{usd(pocket.balance)}</T>
            <T v="bodySm" weight="semi" style={{ color: "rgba(255,255,255,0.7)" }}>USDC</T>
          </View>
          <View style={{ gap: 8 }}>
            <AuthorityMeter cap={pocket.cap} askAbove={pocket.askAbove} dim={revoked} />
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <T v="caption" style={{ color: "rgba(255,255,255,0.78)" }}>Cap <T v="caption" style={{ color: "#fff", fontFamily: F.bodySemi }}>{usd(pocket.cap)}</T></T>
              <T v="caption" style={{ color: "rgba(255,255,255,0.78)" }}>Ask <T v="caption" style={{ color: "#fff", fontFamily: F.bodySemi }}>{askText(pocket.askAbove, pocket.cap).replace("Above ", ">")}</T></T>
              <T v="caption" style={{ color: "rgba(255,255,255,0.78)" }}>{dateLabel(Number(pocket.expiresAt))}</T>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Icon name={pocket.owned ? "key" : "globe"} size={12} color="rgba(255,255,255,0.75)" />
              <T v="caption" style={{ color: "rgba(255,255,255,0.75)" }}>{pocket.owned ? "This phone's key" : "Another owner key"}</T>
            </View>
          </View>
        </View>
      </View>
    </Press>
  );
}
