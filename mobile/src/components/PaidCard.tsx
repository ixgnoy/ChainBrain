// A settled payment inside the agent chat: the seller, what was bought, the amount and whether the owner co-signed. The
// card rises in, the small check pops (bouncy) with a Success haptic once per payment, and a tap opens the receipt.
import React from "react";
import { View } from "react-native";
import { useApp } from "../store";
import { c } from "../tokens";
import { Avatar, Press } from "../ui/kit";
import { T } from "../ui/Text";
import { Rise, firstTime } from "../ui/Rise";
import { SuccessMark } from "../ui/SuccessMark";
import { cleanText } from "../lib/sanitize";
import { money, shortHex } from "../lib/util";
import type { WalletEvent } from "../lib/events";

export function PaidCard({ e }: { e: WalletEvent }) {
  const { sellerName, cfg, ledger, setReceipt } = useApp();
  const seller = sellerName(e.sellerId);
  const item = cfg?.sellers.find((s) => s.id === e.sellerId)?.items.find((i) => i.sku === e.sku)?.description ?? e.sku;
  const row = ledger.find((r) => r.kind === "payment" && r.tx === e.tx);
  const fresh = React.useRef(firstTime(`paid:${e.tx}`)).current; // read once: re-renders must not replay the moment
  let amount = 0n;
  try { amount = BigInt(e.amount ?? 0); } catch { /* malformed amount: show zero */ }
  return (
    <Rise dy={10} spring="snappy" instant={!fresh} layout>
      <Press kind="row" haptics="select" onPress={() => row && setReceipt(row)} accessibilityRole="button" accessibilityLabel={`Paid ${seller} ${money(amount)}. Open receipt`}
        style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 20, backgroundColor: c.canvas }}>
        <View>
          <Avatar label={seller} size={44} />
          <View style={{ position: "absolute", right: -4, bottom: -4, borderRadius: 12, borderWidth: 2, borderColor: c.canvas, backgroundColor: c.canvas }}>
            <SuccessMark size={20} delay={180} still={!fresh} />
          </View>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T v="row" w="semi" numberOfLines={1}>Paid {cleanText(seller, 30)}</T>
          <T v="sub" color="muted" numberOfLines={1}>{cleanText(item, 60)}</T>
          <T v="cap" color="faint" style={{ color: c.muted }} numberOfLines={1}>{e.cosigned ? "Co-signed by you · " : ""}Tx {shortHex(String(e.tx ?? ""), 6, 4)}</T>
        </View>
        <T v="row" w="semi">{money(amount)}</T>
      </Press>
    </Rise>
  );
}
