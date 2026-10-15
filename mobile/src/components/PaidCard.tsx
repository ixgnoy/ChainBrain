// A settled payment inside the agent chat, in the shared event-card grammar: the check draws (Success haptic once per payment),
// "Paid DataLite", what was bought, whether the owner co-signed, the amount on the right; a tap opens the receipt.
import React from "react";
import { useApp } from "../store";
import { T } from "../ui/Text";
import { firstTime } from "../ui/Rise";
import { SuccessMark } from "../ui/SuccessMark";
import { cleanText } from "../lib/sanitize";
import { money } from "../lib/util";
import type { WalletEvent } from "../lib/events";
import { EventCard } from "./EventCard";

export function PaidCard({ e }: { e: WalletEvent }) {
  const { sellerName, cfg, ledger, setReceipt } = useApp();
  const seller = sellerName(e.sellerId);
  const item = cfg?.sellers.find((s) => s.id === e.sellerId)?.items.find((i) => i.sku === e.sku)?.description ?? e.sku;
  const row = ledger.find((r) => r.kind === "payment" && r.tx === e.tx);
  const fresh = React.useRef(firstTime(`paid:${e.tx}`)).current; // read once: re-renders must not replay the moment
  let amount = 0n;
  try { amount = BigInt(e.amount ?? 0); } catch { /* malformed amount: show zero */ }
  return (
    <EventCard
      tone="paid" instant={!fresh} title={`Paid ${cleanText(seller, 30)}`} amount={money(amount)}
      mark={<SuccessMark size={40} delay={180} still={!fresh} />}
      body={<>
        <T v="sub" color="muted" numberOfLines={1}>{cleanText(item, 60)}</T>
        {e.cosigned ? <T v="cap" w="medium" color="accent" numberOfLines={1}>Co-signed by you</T> : null}
      </>}
      onPress={() => row && setReceipt(row)} a11y={`Paid ${seller} ${money(amount)}. Open receipt`}
    />
  );
}
