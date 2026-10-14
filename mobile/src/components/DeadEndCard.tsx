// Scene 8: nobody could be paid. Lists each seller tried and why, with a one-tap fix. Enters quietly (fade + 8 pt rise, 260 ms, no
// bounce) with one warning haptic, the first time it appears.
import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useApp } from "../store";
import { c } from "../tokens";
import { Button, CodePill } from "../ui/kit";
import { T } from "../ui/Text";
import { Rise, firstTime } from "../ui/Rise";
import { haptic } from "../haptics";
import { cleanText } from "../lib/sanitize";
import { deadEndOf, whyText } from "../lib/deadend";
import { usd } from "../lib/util";
import type { WalletEvent } from "../lib/events";

export function DeadEndCard({ id, evs, pocket, sellerName, onRetry }: { id: string; evs: WalletEvent[]; pocket: { address: string; cap: bigint; balance: bigint; owned: boolean; revoked: boolean }; sellerName: (id?: string) => string; /** after the fix: ask the agent again with a price limit that now fits */ onRetry?: (text: string) => void }) {
  const { setRules } = useApp();
  const d = deadEndOf(evs, pocket);
  if (!d) return null;
  const fixed = !!d.fix && d.fix.cap === pocket.cap && d.fix.topUp === 0n;
  const label = d.fix ? `Raise cap${d.fix.topUp > 0n ? " and budget" : ""} to US$${usd(d.fix.cap)}` : "Open pocket to allow a seller";
  const again = d.minPrice != null ? `Then ask again with a price limit of at least US$${usd(d.minPrice)}.` : "Then ask your agent again.";
  return (
    <Rise dy={8} duration={260} layout onEnter={() => { if (firstTime(`deadend:${id}`)) haptic.warning(); }}>
      <View accessibilityLabel="No seller could be paid" style={{ padding: 16, borderRadius: 20, backgroundColor: c.warningSoft, gap: 12 }}>
        <View style={{ gap: 2 }}>
          <T v="row" w="semi" color="warning">Nothing was bought</T>
          <T v="sub" color="ink2">The agent stopped because no seller fit your rules.</T>
        </View>
        {d.tried.map((t) => (
          <View key={`${t.sellerId}${t.sku}`} style={{ gap: 4 }}>
            <T v="sub" w="semi">{cleanText(sellerName(t.sellerId), 40)}{t.price != null ? ` · US$${usd(t.price)}` : ""}</T>
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
              <T v="cap" color="ink2" style={{ flexShrink: 1 }}>{whyText(t).replace(/^./, (x) => x.toUpperCase())}</T>
              {t.reasons.map((r) => <CodePill key={r} code={r} />)}
            </View>
          </View>
        ))}
        {pocket.owned && !pocket.revoked ? (
          fixed ? (
            <View style={{ gap: 10 }}>
              <T v="sub" color="positive">Your rules now allow this.</T>
              {onRetry && d.minPrice != null ? <Button label={`Ask again, max US$${usd(d.minPrice)}`} small onPress={() => onRetry(`Buy the DataLite durian report. Max US$${usd(d.minPrice!)}, by tonight.`)} /> : <T v="sub" color="ink2">{again}</T>}
            </View>
          )
          : !d.fix && !d.needsSeller ? <T v="sub" color="ink2">{again}</T>
          : <><Button label={label} small onPress={() => (d.fix ? setRules({ pocket: pocket.address, field: "cap", amount: usd(d.fix.cap), topUp: d.fix.topUp }) : router.push({ pathname: "/pocket/[id]", params: { id: pocket.address } }))} /><T v="cap" color="ink2">{again}</T></>
        ) : null}
      </View>
    </Rise>
  );
}
