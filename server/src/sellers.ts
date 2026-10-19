import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Address, Hex } from "viem";
import sellers from "./sellers.json" with { type: "json" };
import { facilitatorClient } from "./facilitator";
import { sellerReply } from "../../shared/sim/haggle";
import { randomUUID } from "node:crypto";
import { cfg } from "./chains";
import { parseAmount, formatAmount } from "./wallet/money";

// Test sellers: stock x402 middleware only, nothing from ChainBrain.
// /admin/* is a demo-only hook (red-team box, payTo lookup); it is not part of what a seller must run.
const content = (f: string) => readFileSync(new URL(`./content/${f}`, import.meta.url), "utf8");

/**
 * CoinGecko's ETH price is live: its public simple-price API (no key), in HKD, cached a minute. Any failure (timeout,
 * rate limit, no network) serves the stored file instead, so a paid request always gets its data. COINGECKO_LIVE=off keeps
 * the stored file (tests).
 */
let ethCache: { at: number; md: string } | undefined;
export async function liveEthPrice(f: typeof fetch = fetch, now = Date.now()): Promise<string | null> {
  if (process.env.COINGECKO_LIVE === "off") return null;
  if (ethCache && now - ethCache.at < 60_000) return ethCache.md;
  try {
    const r = await f("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=hkd&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true",
      { signal: AbortSignal.timeout(3000), headers: { accept: "application/json" } });
    if (!r.ok) return null;
    const e = ((await r.json()) as { ethereum?: { hkd?: number; hkd_24h_vol?: number; hkd_24h_change?: number; last_updated_at?: number } }).ethereum;
    if (!e || typeof e.hkd !== "number") return null;
    const hk = (n: number, d = 0) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
    const when = (s: number) => new Date(s * 1000).toLocaleString("en-GB", { timeZone: "Asia/Hong_Kong", dateStyle: "medium", timeStyle: "short" }) + " HKT";
    const md = [
      "# ETH price (CoinGecko, simple price, live)",
      `- ethereum: ${hk(e.hkd)} HKD`,
      ...(typeof e.hkd_24h_change === "number" ? [`- 24 h change: ${e.hkd_24h_change >= 0 ? "+" : ""}${e.hkd_24h_change.toFixed(2)}%`] : []),
      ...(typeof e.hkd_24h_vol === "number" ? [`- 24 h volume: ${hk(e.hkd_24h_vol / 1e9, 2)} billion HKD`] : []),
      ...(e.last_updated_at ? [`- last updated: ${when(e.last_updated_at)}`] : []),
      "- source: api.coingecko.com, fetched for this purchase",
    ].join("\n");
    ethCache = { at: now, md };
    return md;
  } catch { return null; }
}

/** Where each seller is paid: its key's address (SELLER_*_PK), or a fixed payTo for the mocked sellers that only receive. */
export const sellerPayTo = (): Record<string, Address> =>
  Object.fromEntries((sellers as { id: string; keyEnv?: string; payTo?: string }[]).map((s) => [s.id, (s.payTo ?? privateKeyToAccount(process.env[s.keyEnv!] as Hex).address) as Address]));

export function sellersApp() {
  const payTo = sellerPayTo();
  const inject = new Map<string, string>();
  const app = new Hono();
  app.use("*", cors({ origin: "*", exposeHeaders: ["PAYMENT-REQUIRED", "PAYMENT-RESPONSE"] }));

  app.get("/admin/payto", (c) => c.json(payTo));
  app.post("/admin/inject", async (c) => {
    const { sellerId, text } = await c.req.json();
    if (!payTo[sellerId]) return c.json({ error: "unknown seller" }, 404);
    inject.set(sellerId, String(text).slice(0, 2000));
    return c.json({ ok: true });
  });
  app.delete("/admin/inject/:sellerId", (c) => (inject.delete(c.req.param("sellerId")), c.json({ ok: true })));

  // Red-team text goes into that seller's next delivered content (200), then is cleared.
  app.use("*", async (c, next) => {
    await next();
    const id = c.req.path.split("/")[1];
    const t = inject.get(id);
    if (!t || c.res.status !== 200) return;
    inject.delete(id);
    const body = await c.res.clone().text();
    const headers = new Headers(c.res.headers);
    headers.delete("content-length");
    const isJson = headers.get("content-type")?.includes("json");
    c.res = new Response(isJson ? JSON.stringify({ ...JSON.parse(body), note: t }) : `${body}\n${t}`, { status: 200, headers });
  });

  // The haggler: a seller's agent takes offers on items with a private floor (sellers.json "floor"). It answers with a
  // price only, using the same concession rule as the built-in network (shared/sim/haggle.ts). An agreed deal is one
  // use: the item's x402 price is the deal's price when the request carries ?deal=<id>, and the list price otherwise.
  // Prices in HK$, sent as an explicit asset amount of the Mock e-HKD (x402's "$" prices mean USDC).
  const { network, token, domain, currency } = cfg();
  const deals = new Map<string, { item: string; ask: bigint; agreed?: bigint; used?: boolean }>();
  for (const s of sellers) for (const it of s.items) if ("floor" in it && it.floor && it.price) {
    const item = `${s.id}/${it.sku}`, floor = it.floor;
    app.post(`/${item}/offer`, async (c) => {
      const b = await c.req.json().catch(() => ({}));
      const offer = Number(b.offer);
      if (!Number.isFinite(offer) || offer <= 0) return c.json({ error: `offer must be a price in ${currency}` }, 400);
      const d = b.deal ? deals.get(String(b.deal)) : undefined;
      if (b.deal && (!d || d.item !== item)) return c.json({ error: "unknown deal" }, 404);
      if (d?.agreed !== undefined) return c.json({ error: "deal already agreed" }, 409);
      const id = d ? String(b.deal) : randomUUID();
      const cur = d ?? { item, ask: parseAmount(it.price) };
      const r = sellerReply(cur.ask, parseAmount(offer.toFixed(2)), parseAmount(floor));
      cur.ask = r.price;
      if (r.kind === "accept") cur.agreed = r.price;
      deals.set(id, cur);
      return c.json({ deal: id, reply: r.kind, price: formatAmount(r.price), final: r.kind === "counter" && r.final });
    });
  }
  const dealOf = (url: string, item: string) => {
    const id = new URL(url, "http://x").searchParams.get("deal");
    const d = id ? deals.get(id) : undefined;
    return d && d.item === item && d.agreed !== undefined && !d.used ? { id: id!, d } : undefined;
  };

  const routes: Record<string, unknown> = {};
  for (const s of sellers) for (const it of s.items) if (it.price) {
    const item = `${s.id}/${it.sku}`, list = parseAmount(it.price);
    const asset = (v: bigint) => ({ amount: v.toString(), asset: token, extra: domain });
    const price = "floor" in it && it.floor ? (ctx: { adapter: { getUrl(): string } }) => asset(dealOf(ctx.adapter.getUrl(), item)?.d.agreed ?? list) : asset(list);
    routes[`GET /${item}`] = { accepts: [{ scheme: "exact", price, network, payTo: payTo[s.id] }], description: it.description };
  }
  app.use(paymentMiddleware(routes as any, new x402ResourceServer(facilitatorClient()).register(network, new ExactEvmScheme())));

  for (const s of sellers) for (const it of s.items)
    app.get(`/${s.id}/${it.sku}`, async (c) => {
      const x = dealOf(c.req.url, `${s.id}/${it.sku}`);
      if (x) x.d.used = true; // paid at the deal's price (the middleware settled it before this handler runs)
      if (s.id === "coingecko" && it.sku === "eth-price") return c.text((await liveEthPrice()) ?? content(it.content));
      return it.content.endsWith(".json") ? c.json(JSON.parse(content(it.content))) : c.text(content(it.content));
    });
  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.SELLERS_PORT ?? 4021);
  serve({ fetch: sellersApp().fetch, port });
  console.log(`test sellers on http://localhost:${port}`);
}
