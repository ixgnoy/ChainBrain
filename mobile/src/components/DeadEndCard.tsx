// Scene 8: nobody could be paid. Lists each seller tried and why in plain words, with a one-tap fix; the codes sit under "Why".
// Same card grammar as every event, one warning haptic the first time it appears.
import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useApp } from "../store";
import { Button } from "../ui/kit";
import { T } from "../ui/Text";
import { firstTime } from "../ui/Rise";
import { haptic } from "../haptics";
import { cleanText } from "../lib/sanitize";
import { deadEndOf, retryText, whyText } from "../lib/deadend";
import { hkd } from "../lib/util";
import type { WalletEvent } from "../lib/events";
import { EventCard } from "./EventCard";
import { curSign } from "../lib/runtime";

export function DeadEndCard({ id, evs, pocket, sellerName, onRetry, resolved, task }: { id: string; evs: WalletEvent[]; /** the owner's sentence that ran into the dead end */ task: string; pocket: { address: string; cap: bigint; balance: bigint; owned: boolean; revoked: boolean }; sellerName: (id?: string) => string; /** after the fix: ask the agent again with a price limit that now fits */ onRetry?: (text: string) => void;
  /** a later turn bought it: the card stays as history, without a fix to apply */ resolved?: boolean }) {
  const { setRules } = useApp();
  const d = deadEndOf(evs, pocket);
  if (!d) return null;
  const fixed = !!d.fix && d.fix.cap === pocket.cap && d.fix.topUp === 0n;
  const label = d.fix ? `Raise cap${d.fix.topUp > 0n ? " and budget" : ""} to ${curSign()}${hkd(d.fix.cap)}` : "Open card to allow a seller";
  const again = d.minPrice != null ? `Then ask again with a price limit of at least ${curSign()}${hkd(d.minPrice)}.` : "Then ask your agent again.";
  const codes = [...new Set(d.tried.flatMap((t) => t.reasons))];
  return (
    <EventCard
      tone="blocked" title="Nothing was bought" body="The agent stopped because no seller fit your rules."
      onEnter={() => { if (firstTime(`deadend:${id}`)) haptic.warning(); }} a11y="No seller could be paid"
      why={{ codes }}
    >
      {d.tried.map((t) => (
        <View key={`${t.sellerId}${t.sku}`} style={{ gap: 2 }}>
          <T v="sub" w="semi">{cleanText(sellerName(t.sellerId), 40)}{t.price != null ? ` · ${curSign()}${hkd(t.price)}` : ""}</T>
          <T v="sub" color="muted">{whyText(t).replace(/^./, (x) => x.toUpperCase())}</T>
        </View>
      ))}
      {resolved ? <T v="sub" color="positive">Fixed: you raised the limit and the next try was bought.</T> : pocket.owned && !pocket.revoked ? (
        fixed ? (
          <View style={{ gap: 10 }}>
            <T v="sub" color="positive">Your rules now allow this.</T>
            {onRetry && d.minPrice != null ? <Button label={`Ask again, max ${curSign()}${hkd(d.minPrice)}`} small auto="deadend.askAgain" onPress={() => onRetry(retryText(task, hkd(d.minPrice!)))} /> : <T v="sub" color="ink2">{again}</T>}
          </View>
        )
        : !d.fix && !d.needsSeller ? <T v="sub" color="ink2">{again}</T>
        : <><Button label={label} small auto="deadend.fix" onPress={() => (d.fix ? setRules({ pocket: pocket.address, field: "cap", amount: hkd(d.fix.cap), topUp: d.fix.topUp }) : router.push({ pathname: "/pocket/[id]", params: { id: pocket.address } }))} /><T v="cap" color="ink2">{again}</T></>
      ) : null}
    </EventCard>
  );
}
