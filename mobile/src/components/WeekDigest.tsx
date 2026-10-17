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


/** Inside Home's "This week" card, under the curve: the covers, then three counts as icons and numbers. */
export const WeekBought = React.memo(function WeekBought({ d, itemName, sellerName }: { d: Digest; itemName(sellerId: string, sku: string): string; sellerName(id: string): string }) {
  if (!d.bought && !d.stopped) return null;
  const shown = d.items.slice(0, 6);
  return (
    <View style={{ gap: 14, marginTop: 14 }} accessible accessibilityLabel={`This week your agents bought ${d.bought} things. ${d.cosigned} co-signed by you. ${d.stopped} stopped`}>
      {shown.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} directionalLockEnabled style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
          {shown.map((x, i) => <Cover key={`${x.sellerId}/${x.sku}`} x={x} first={i === 0} itemName={itemName} sellerName={sellerName} />)}
        </ScrollView>
      ) : null}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Stat icon="receipt" n={d.bought} label="bought" tone="ink" />
        <Stat icon="faceId" n={d.cosigned} label="co-signed" tone="blue" />
        <Stat icon="shieldCheck" n={d.stopped} label="stopped" tone="vermillion" />
      </View>
    </View>
  );
});
function Cover({ x, first, itemName, sellerName }: { x: Digest["items"][number]; first: boolean; itemName(sellerId: string, sku: string): string; sellerName(id: string): string }) {
  return (
    <View style={{ width: 104, borderRadius: radius.tile, backgroundColor: first ? c.ink : c.tile, overflow: "hidden" }}>
      <View style={{ height: 48, padding: 9, justifyContent: "flex-end", overflow: "hidden" }}>
        <Hatch color={first ? "#FFFFFF" : c.line} pitch={7} stroke={1.3} opacity={first ? 0.16 : 0.9} />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          {hasSellerMark(x.sellerId) ? <SellerMark id={x.sellerId} size={26} radius={7} /> : <View style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: c.fill, alignItems: "center", justifyContent: "center" }}><T v="cap" w="bold">{cleanText(sellerName(x.sellerId), 1)}</T></View>}
          {x.count > 1 ? <View style={{ minWidth: 26, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: first ? c.vermillion : c.ink, alignItems: "center", justifyContent: "center" }}><T v="cap" w="bold" style={{ color: c.white, fontSize: 11 }}>{`×${x.count}`}</T></View> : null}
        </View>
      </View>
      <T v="cap" w="semi" numberOfLines={2} style={{ color: first ? c.white : c.ink, paddingHorizontal: 9, paddingTop: 6, paddingBottom: 9, minHeight: 44 }}>{cleanText(itemName(x.sellerId, x.sku), 40)}</T>
    </View>
  );
}
/** A count as a number and an icon, its word small under it. */
function Stat({ icon, n, label, tone }: { icon: IconName; n: number; label: string; tone: "ink" | "blue" | "vermillion" }) {
  const bg = { ink: c.fill, blue: c.blueSoft, vermillion: c.vermillionSoft }[tone];
  const fg = { ink: c.ink, blue: c.blueInk, vermillion: c.vermillionInk }[tone];
  return (
    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.tile, backgroundColor: bg }}>
      <Icon name={icon} size={16} color={fg} stroke={2} />
      <View style={{ flexShrink: 1 }}>
        <T v="head" style={{ color: fg, fontVariant: ["tabular-nums"], lineHeight: 20 }}>{String(n)}</T>
        <T v="tab" numberOfLines={1} style={{ color: fg }}>{label}</T>
      </View>
    </View>
  );
}

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
