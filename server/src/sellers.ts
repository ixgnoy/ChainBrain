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

// Test sellers: stock x402 middleware only, nothing from ChainBrain.
// /admin/* is a demo-only hook (red-team box, payTo lookup); it is not part of what a seller must run.
const NETWORK = "eip155:84532";
const content = (f: string) => readFileSync(new URL(`./content/${f}`, import.meta.url), "utf8");

export const sellerPayTo = (): Record<string, Address> =>
  Object.fromEntries(sellers.map((s) => [s.id, privateKeyToAccount(process.env[s.keyEnv] as Hex).address]));

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

  const routes: Record<string, unknown> = {};
  for (const s of sellers) for (const it of s.items) if (it.price)
    routes[`GET /${s.id}/${it.sku}`] = { accepts: [{ scheme: "exact", price: `$${it.price}`, network: NETWORK, payTo: payTo[s.id] }], description: it.description };
  app.use(paymentMiddleware(routes as any, new x402ResourceServer(facilitatorClient()).register(NETWORK, new ExactEvmScheme())));

  for (const s of sellers) for (const it of s.items)
    app.get(`/${s.id}/${it.sku}`, (c) => (it.content.endsWith(".json") ? c.json(JSON.parse(content(it.content))) : c.text(content(it.content))));
  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.SELLERS_PORT ?? 4021);
  serve({ fetch: sellersApp().fetch, port });
  console.log(`test sellers on http://localhost:${port}`);
}
