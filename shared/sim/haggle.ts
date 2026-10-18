// The haggler: the agent negotiates a seller's price before paying, with numbers only. One source for the server
// (server/src/wallet/tools.ts counter_offer, server/src/sellers.ts /offer) and the built-in network (world.ts).
//
// Safety, enforced here in code, not by the model: an offer is a price and nothing else (no seller text reaches the
// agent), it is always below the seller's current ask, never above the first quote or the task's max per item, and a
// negotiation has at most MAX_ROUNDS offers. A deal can only make a payment cheaper.
//
// The seller side is a fixed concession rule with a hidden floor: the simulated sellers use it, and so do the server's
// test sellers. The buyer's strategy (anchor, next offer, when to accept) is what the agent decides; `buyerPlan` is the
// scripted version the built-in network uses, and the server's model is held to the same guards.

export const MAX_ROUNDS = 3;
const STEP = 400_000n; // HK$0.40 in eHKD base units

const down = (v: bigint) => (v / STEP) * STEP;

export type SellerReply = { kind: "accept"; price: bigint } | { kind: "counter"; price: bigint; final: boolean };

/**
 * The seller's answer to an offer. It accepts anything at or above its floor; otherwise it meets the buyer halfway
 * (rounded down to HK$0.40), never below the floor, and says "final" once it is at the floor.
 */
export function sellerReply(ask: bigint, offer: bigint, floor: bigint): SellerReply {
  if (offer >= ask) return { kind: "accept", price: ask };
  if (offer >= floor) return { kind: "accept", price: offer };
  const mid = down(ask - (ask - offer) / 2n);
  const price = mid > floor ? mid : floor;
  return { kind: "counter", price, final: price === floor };
}

/**
 * Why an offer is not allowed (a reason code), or null. `ask` is the seller's current price (its quote, then its last
 * counter), `list` the first quote, `rounds` the offers already made. Offering exactly the seller's counter accepts it,
 * which is allowed even after the last round.
 */
export function checkOffer(o: { offer: bigint; ask: bigint; list: bigint; maxPerItem?: bigint; rounds: number; approved?: boolean; paid?: boolean; agreed?: boolean }): string | null {
  if (o.paid) return "QUOTE_ALREADY_PAID";
  if (o.approved) return "QUOTE_ALREADY_APPROVED";
  if (o.agreed) return "DEAL_ALREADY_AGREED";
  const accepting = o.rounds > 0 && o.offer === o.ask;
  if (!accepting && o.rounds >= MAX_ROUNDS) return "NEGOTIATION_ROUNDS_USED";
  if (o.offer <= 0n || o.offer > o.list || (!accepting && o.offer >= o.ask)) return "OFFER_NOT_LOWER";
  if (o.maxPerItem !== undefined && o.offer > o.maxPerItem) return "PRICE_ABOVE_INTENT";
  return null;
}

/**
 * The scripted buyer (built-in network): open at about 60% of the ask, then offer halfway between our last offer and
 * the seller's counter, and take a final counter or one within HK$0.40. Walk away above `walkAway`.
 */
export const buyerPlan = {
  anchor: (ask: bigint) => down((ask * 60n) / 100n),
  next: (mine: bigint, theirs: bigint) => down((mine + theirs) / 2n),
  take: (mine: bigint, r: SellerReply & { kind: "counter" }, walkAway: bigint) => r.price <= walkAway && (r.final || r.price - mine <= STEP),
};

export type HaggleStep = { round: number; offer: bigint; reply: SellerReply };
