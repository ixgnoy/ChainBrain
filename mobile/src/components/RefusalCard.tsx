// Refusals in the shared event-card grammar. The plain sentence is on the card; the reason codes sit under "Why".
import React from "react";
import { plainReason } from "../lib/plain";
import { ledgerFrom, type WalletEvent } from "../lib/events";
import { cleanText } from "../lib/sanitize";
import { EventCard } from "./EventCard";

// reasons that have their own card or are not a refusal by the pocket's rules
const SKIP = new Set(["NEEDS_OWNER_APPROVAL", "OWNER_DECLINED", "APPROVAL_EXPIRED", "POCKET_REVOKED", "DISCLOSURE_REFUSED", "SIGNATURE_TYPE_NOT_ALLOWED", "COUNTERPARTY_HIGH_RISK", "COUNTERPARTY_REVIEW"]); // Radar's own card tells those

/** Per seller, the rules that said no in this turn (quote-time blocks and pay refusals), e.g. scene 4's SELLER_NOT_ALLOWED. */
export function refusalsOf(evs: WalletEvent[]) {
  const by = new Map<string, { sellerId: string; reasons: string[] }>();
  for (const r of ledgerFrom(evs)) {
    if ((r.kind !== "blocked" && r.kind !== "refusal") || !r.sellerId) continue;
    const reasons = r.reasons.filter((x) => !SKIP.has(x));
    if (!reasons.length) continue;
    const hit = by.get(r.sellerId);
    if (hit) hit.reasons = [...new Set([...hit.reasons, ...reasons])]; else by.set(r.sellerId, { sellerId: r.sellerId, reasons: [...new Set(reasons)] });
  }
  return [...by.values()];
}

export function SellerRefusal({ id, seller, reasons }: { id: string; seller: string; reasons: string[] }) {
  const why = reasons.map((r) => plainReason(r)).join(", ");
  return (
    <EventCard
      tone="refused" alert={id} title={`${cleanText(seller, 40)} was refused`}
      body={`${why.replace(/^./, (x) => x.toUpperCase())}.`}
      why={{ codes: reasons }}
    />
  );
}
