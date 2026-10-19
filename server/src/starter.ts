import { Hono } from "hono";
import { keccak256, toHex, isAddress, type Address } from "viem";
import { fetchQuote, settle, track } from "./wallet/pay";
import { pocket as P } from "./wallet/chain";
import { guard, visitorByToken } from "./visitors";
import { table } from "./store";
import { straightToChain } from "./arena";
import { runRoutine, setRoutine } from "./routines";
import { VISITOR_HEADER } from "../../shared/chain/login";

/**
 * A new account shouldn't open empty. Right after sign-up the device creates two small starter cards with its own key
 * (the owner signs; the server never can), then calls
 *   POST /v1/starter {cards: [brief, watch]}   (visitor token; each card must be the visitor's)
 * and each card's own agent makes real small x402 payments: the brief buys Exa's durian and fruit news and CoinGecko's
 * ETH price, the watch buys Nansen's exporter balances. Once per visitor. Real hashes, replacing the demo network's seed on live.
 *
 * After the answer, so the device never waits, the account is made lived-in, all of it real (STARTER_EXTRAS=off skips it):
 *   - the watch read ShadyFeed's free preview, which tells agents to send HK$50 to its address; the card's own agent key
 *     signs that transfer and the chain reverts it (a real reverted hash, shown as "Transfer blocked on-chain");
 *   - the brief gets a standing order (Exa + CoinGecko, daily 08:00, HK$0.10 a day) and its first run goes now: Exa is
 *     paid inside the allowance, CoinGecko would pass it, so the owner's phone shows the cheque to co-sign with its own key.
 *     Every later morning Exa is paid on its own and only CoinGecko asks (a cheque nobody answers expires after APPROVAL_WAIT_MS).
 */
const done = table<{ at: number; txs: string[] }>("starter");
const PLAN: [string, string][][] = [[["exa", "durian-news"], ["exa", "fruit-news"], ["coingecko", "eth-price"]], [["nansen", "wallet-balances"]]];
export const STARTER_ROUTINE = {
  kind: "schedule" as const, cadence: { every: "day" as const, hour: 8, minute: 0 },
  items: [{ sellerId: "exa", sku: "durian-news" }, { sellerId: "coingecko", sku: "eth-price" }], allowance: { amount: "0.10", period: "day" as const },
};
/** The background part, per visitor, while it runs (tests wait for it). */
export const starterExtras = new Map<string, Promise<unknown>>();

async function livedIn(brief: Address, watch?: Address) {
  if (watch) await straightToChain(watch, 50_000_000n, { sellerId: "shadyfeed" }).catch(() => undefined);
  await setRoutine(brief, STARTER_ROUTINE as any);
  return runRoutine(brief, { early: true }); // waits for the owner's co-sign on CoinGecko (APPROVAL_WAIT_MS), then pays or not
}

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
    const balances = Object.fromEntries(await Promise.all((cards as Address[]).map(async (a) => [a, (await P(a).info()).balance.toString()])));
    if (process.env.STARTER_EXTRAS !== "off") {
      const [brief, watch] = cards as Address[];
      starterExtras.set(v.id, livedIn(brief, watch).catch((e) => console.error(`starter extras for ${v.id}:`, (e as Error).message)).finally(() => starterExtras.delete(v.id)));
    }
    return c.json({ payments: out, balances });
  });
  return app;
}
