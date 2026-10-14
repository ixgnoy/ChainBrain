// Pocket card: a paper card (dark: e1) with a hairline, a large tabular balance and a small verdict chip. No gradient, no glow.
import React from "react";
import { View } from "react-native";
import { Press } from "../ui/primitives";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { Badge } from "./ui/badge";
import { Text as UIText } from "./ui/text";
import { useTheme } from "../theme";
import { radius } from "../tokens";
import { useCountUp } from "../lib/useCountUp";
import { usd, usdFrame, num, askText, dateLabel } from "../lib/util";
import { NEVER } from "../lib/shared";
import type { Pocket } from "../store";

export const CARD_W = 300;
export const CARD_H = 196;

export const isExpired = (p: { revoked: boolean; expiresAt: bigint | number }) => !p.revoked && Number(p.expiresAt) * 1000 < Date.now();

/** Authority meter: auto zone (0..ask-above) in jade, asks-you zone (ask-above..cap) in amber, beyond cap blocked. Amounts in atomic USDC. */
export function AuthorityMeter({ cap, askAbove, dim }: { cap: bigint; askAbove: bigint; dim?: boolean }) {
  const { c } = useTheme();
  const capM = Math.max(num(cap), 1), askM = askAbove === NEVER ? capM : Math.min(num(askAbove), capM);
  const total = capM * 1.25;
  const auto = askM / total, ask = (capM - askM) / total, blocked = 1 - auto - ask;
  const seg = (flex: number, bg: string, extra?: object) => <View style={[{ flex: Math.max(flex, 0.0001), height: 6, backgroundColor: bg }, extra]} />;
  return (
    <View style={{ flexDirection: "row", gap: 2, opacity: dim ? 0.5 : 1 }}>
      {seg(auto, c.accent, { borderTopLeftRadius: 3, borderBottomLeftRadius: 3 })}
      {ask > 0.001 && seg(ask, c.stepup)}
      {seg(blocked, c.bgElev3, { borderTopRightRadius: 3, borderBottomRightRadius: 3 })}
    </View>
  );
}

export type CardData = { name: string; style: string; balance: bigint; cap: bigint; askAbove: bigint; expiresAt: bigint | number; revoked: boolean; owned: boolean; sellers: number };
export const cardOf = (p: Pocket): CardData => ({ name: p.name, style: p.style, balance: p.balance, cap: p.cap, askAbove: p.askAbove, expiresAt: p.expiresAt, revoked: p.revoked, owned: p.owned, sellers: p.allowed.length });

export function PocketCard({ pocket, onPress, width = CARD_W, hero }: { pocket: CardData; onPress?: () => void; width?: number | "100%"; hero?: boolean }) {
  const { c } = useTheme();
  const revoked = pocket.revoked;
  const expired = isExpired(pocket);
  const status = revoked ? { label: "Revoked", variant: "revoked" as const, icon: "lock" as const, fill: c.revoked }
    : expired ? { label: "Expired", variant: "info" as const, icon: "clock" as const, fill: c.info }
    : { label: "Active", variant: "ok" as const, icon: "check" as const, fill: c.ok };
  const shown = useCountUp(num(pocket.balance), 600);
  const muted = revoked ? { opacity: 0.6 } : null;
  return (
    <Press onPress={onPress} scale={0.99} accessibilityLabel={`${pocket.name} pocket, ${usd(pocket.balance)} USDC`} style={{ width, height: hero ? undefined : CARD_H }}>
      <View style={{ flex: 1, minHeight: hero ? CARD_H : undefined, borderRadius: radius.lg, backgroundColor: c.bgElev1, borderWidth: 1, borderColor: c.hairline, padding: 16, justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <T v="title" numberOfLines={1}>{pocket.name}</T>
            <T v="caption" color="text3">{pocket.sellers} seller{pocket.sellers === 1 ? "" : "s"} allowed</T>
          </View>
          <Badge variant={status.variant} className="h-6">
            <Icon name={status.icon} size={12} color={status.fill} stroke={2.4} />
            <UIText>{status.label}</UIText>
          </Badge>
        </View>
        <View style={[{ flexDirection: "row", alignItems: "baseline", gap: 6 }, muted]}>
          <T v="displayXl" num>{usdFrame(shown, num(pocket.balance))}</T>
          <T v="bodySm" weight="semi" color="text3">USDC</T>
        </View>
        <View style={{ gap: 8 }}>
          <AuthorityMeter cap={pocket.cap} askAbove={pocket.askAbove} dim={revoked} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <T v="caption" color="text3">Cap <T v="caption" color="text" weight="semi">{usd(pocket.cap)}</T></T>
            <T v="caption" color="text3">Ask <T v="caption" color="text" weight="semi">{askText(pocket.askAbove, pocket.cap).replace("Above ", ">")}</T></T>
            <T v="caption" color="text3">{dateLabel(Number(pocket.expiresAt))}</T>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Icon name={pocket.owned ? "key" : "globe"} size={12} color={c.text3} />
            <T v="caption" color="text3">{pocket.owned ? "This phone's key" : "Another owner key"}</T>
          </View>
        </View>
      </View>
    </Press>
  );
}
