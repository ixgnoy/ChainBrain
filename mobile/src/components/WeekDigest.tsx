// Home's digest: what the agents got for you in the last 7 days, as the things themselves (each seller's mark over a hatch
// cover, the item, how many), then three counts: bought, co-signed by you, stopped. The weekly chart below says when the
// money went; this says what it bought. From the events only (weekDigest in shared/sim/pocketAppData.ts).
import React from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { c, radius } from "../tokens";
import { Card, Press } from "../ui/kit";
import { T } from "../ui/Text";
import { Icon, type IconName } from "../ui/Icon";
import { Hatch } from "../ui/Hatch";
import { SellerMark, hasSellerMark } from "../ui/SellerMark";
import { useLargeText } from "../ui/fontScale";
import { cleanText } from "../lib/sanitize";
import { money, usd } from "../lib/util";
import type { Digest } from "../../../shared/sim/pocketAppData";


export const WeekDigest = React.memo(function WeekDigest({ d, itemName, sellerName }: { d: Digest; itemName(sellerId: string, sku: string): string; sellerName(id: string): string }) {
  const big = useLargeText();
  if (!d.bought && !d.stopped) return null;
  const shown = d.items.slice(0, 6);
  return (
    <Card pad={0} style={{ marginHorizontal: 16, overflow: "hidden" }}>
      <Press kind="row" haptics="select" onPress={() => router.navigate("/activity")} accessibilityRole="button"
        accessibilityLabel={`In the last 7 days your agents bought ${d.bought} things for ${money(d.spent)}. ${d.cosigned} co-signed by you. ${d.stopped} stopped. Opens Activity`}
        style={{ paddingTop: 18, paddingBottom: 18, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 18, gap: 8 }}>
          <T v="head" accessibilityRole="header">Your agents got you</T>
          <T v="cap" color="muted">Last 7 days</T>
        </View>
        {shown.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} directionalLockEnabled contentContainerStyle={{ paddingHorizontal: 18, gap: 8 }}>
            {shown.map((x, i) => (
              <View key={`${x.sellerId}/${x.sku}`} style={{ width: 112, borderRadius: radius.tile, backgroundColor: i === 0 ? c.ink : c.tile, overflow: "hidden" }}>
                <View style={{ height: 52, padding: 10, justifyContent: "flex-end", overflow: "hidden" }}>
                  <Hatch color={i === 0 ? "#FFFFFF" : c.line} pitch={7} stroke={1.3} opacity={i === 0 ? 0.16 : 0.9} />
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    {hasSellerMark(x.sellerId) ? <View style={{ borderRadius: 9, borderWidth: 2, borderColor: i === 0 ? c.ink : c.tile }}><SellerMark id={x.sellerId} size={28} radius={7} /></View>
                      : <View style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: c.fill, alignItems: "center", justifyContent: "center" }}><T v="cap" w="bold">{cleanText(sellerName(x.sellerId), 1)}</T></View>}
                    {x.count > 1 ? <View style={{ minWidth: 28, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: i === 0 ? c.vermillion : c.ink, alignItems: "center", justifyContent: "center" }}><T v="cap" w="bold" style={{ color: c.white }}>{`×${x.count}`}</T></View> : null}
                  </View>
                </View>
                <View style={{ padding: 10, paddingTop: 6, gap: 2 }}>
                  <T v="cap" w="semi" numberOfLines={2} style={{ color: i === 0 ? c.white : c.ink, minHeight: 32 }}>{cleanText(itemName(x.sellerId, x.sku), 40)}</T>
                  <T v="cap" style={{ color: i === 0 ? "rgba(255,255,255,0.64)" : c.muted, fontVariant: ["tabular-nums"] }}>{money(x.amount)}</T>
                </View>
              </View>
            ))}
            {d.items.length > shown.length ? (
              <View style={{ width: 72, borderRadius: radius.tile, backgroundColor: c.fill, alignItems: "center", justifyContent: "center" }}>
                <T v="head">{`+${d.items.length - shown.length}`}</T>
              </View>
            ) : null}
          </ScrollView>
        ) : null}
        <View style={{ flexDirection: "row", flexWrap: big ? "wrap" : "nowrap", gap: 8, paddingHorizontal: 18 }}>
          <Count big={big} icon="receipt" n={d.bought} label="bought" sub={`US$${usd(d.spent)}`} tone="ink" />
          <Count big={big} icon="faceId" n={d.cosigned} label="co-signed by you" tone="blue" />
          <Count big={big} icon="shieldCheck" n={d.stopped} label="stopped" tone="vermillion" />
        </View>
      </Press>
    </Card>
  );
});

function Count({ icon, n, label, sub, tone, big }: { icon: IconName; n: number; label: string; sub?: string; tone: "ink" | "blue" | "vermillion"; /** largest text sizes: full width, one under the other */ big?: boolean }) {
  const bg = { ink: c.fill, blue: c.blueSoft, vermillion: c.vermillionSoft }[tone];
  const fg = { ink: c.ink, blue: c.blueInk, vermillion: c.vermillionInk }[tone];
  return (
    <View style={{ flexGrow: 1, flexBasis: big ? "100%" : 0, minWidth: 96, padding: 12, borderRadius: radius.tile, backgroundColor: bg, gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <T v="section" style={{ color: fg, fontVariant: ["tabular-nums"] }}>{String(n)}</T>
        <Icon name={icon} size={16} color={fg} stroke={2} />
      </View>
      <T v="cap" style={{ color: fg }} numberOfLines={big ? 3 : 2}>{sub ? `${label} · ${sub}` : label}</T>
    </View>
  );
}
