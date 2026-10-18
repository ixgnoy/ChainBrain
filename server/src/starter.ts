import { Hono } from "hono";
import { keccak256, toHex, isAddress, type Address } from "viem";
import { fetchQuote, settle, track } from "./wallet/pay";
import { pocket as P } from "./wallet/chain";
import { guard, visitorByToken } from "./visitors";
import { table } from "./store";
import { VISITOR_HEADER } from "../../shared/chain/login";

/**
 * A new account shouldn't open empty. Right after sign-up the device creates two small starter cards with its own key
 * (the owner signs; the server never can), then calls
 *   POST /v1/starter {cards: [brief, watch]}   (visitor token; each card must be the visitor's)
 * and each card's own agent makes real small x402 payments: the brief buys Exa's durian news and CoinGecko's ETH price,
 * the watch buys Nansen's exporter balances. Once per visitor. Real hashes, replacing the demo network's seed on live.
 */
const done = table<{ at: number; txs: string[] }>("starter");
const PLAN: [string, string][][] = [[["exa", "durian-news"], ["coingecko", "eth-price"]], [["nansen", "wallet-balances"]]];

export function starterRoutes() {
  const app = new Hono();
  app.post("/v1/starter", async (c) => {
    const v = visitorByToken(c.req.header(VISITOR_HEADER));
    if (!v) return c.json({ error: "VISITOR_TOKEN_REQUIRED" }, 401);
    if (done.get(v.id)) return c.json({ error: "ALREADY_SEEDED", ...done.get(v.id) }, 409);
    const { cards } = (await c.req.json().catch(() => ({}))) as { cards?: string[] };
    if (!Array.isArray(cards) || !cards.length || cards.length > PLAN.length || !cards.every((a) => isAddress(a))) return c.json({ error: "BAD_CARDS" }, 400);
    for (const card of cards) { const denied = await guard(c, card); if (denied) return denied; }
    done.set(v.id, { at: Date.now(), txs: [] }); // claimed before paying: a second call can't double up
    const out: { card: string; sellerId: string; sku: string; tx?: string; reason?: string }[] = [];
    for (const [i, card] of (cards as Address[]).entries()) {
      for (const [sellerId, sku] of PLAN[i]) {
        try {
          const q = await fetchQuote(sellerId, sku);
          if (q.kind !== "priced") { out.push({ card, sellerId, sku, reason: "NOT_PRICED" }); continue; }
          const r = await settle(card, track(card, q.quote), keccak256(toHex(`starter:${v.id}:${card}`)));
          out.push(r.ok ? { card, sellerId, sku, tx: r.tx } : { card, sellerId, sku, reason: r.reason });
        } catch (e) { out.push({ card, sellerId, sku, reason: String((e as Error).message).slice(0, 80) }); }
      }
    }
    done.set(v.id, { at: Date.now(), txs: out.flatMap((o) => (o.tx ? [o.tx] : [])) });
    return c.json({ payments: out, balances: Object.fromEntries(await Promise.all((cards as Address[]).map(async (a) => [a, (await P(a).info()).balance.toString()]))) });
  });
  return app;
}
