import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { fileURLToPath } from "node:url";
import { recoverTypedDataAddress, type Address, type Hex } from "viem";
import type Anthropic from "@anthropic-ai/sdk";
import { sse, bus, toJson } from "./wallet/events";
import { approvals } from "./wallet/approvals";
import { pocket, factoryAddress, pocketAbi, factoryAbi, erc20Abi, USDC } from "./wallet/chain";
import { transferTypedData } from "./wallet/scheme";
import { directory } from "./wallet/directory";
import { agentAccount } from "./wallet/pay";
import { runTurn, type ModelFn } from "./agent/loop";

type Msg = Anthropic.Beta.Messages.BetaMessageParam;

/** Wallet tool layer + agent API for the app. The LLM only ever reaches the tools; keys stay in this process. */
export function apiApp(deps: { model?: ModelFn } = {}) {
  const app = new Hono();
  const chats = new Map<string, Msg[]>();
  app.use("*", cors({ origin: "*" }));

  app.get("/api/events", sse);
  // React Native has no EventSource: the mobile app polls this instead (events after `after` ms, for one pocket).
  app.get("/api/events.json", (c) => {
    const p = c.req.query("pocket")?.toLowerCase();
    const after = Number(c.req.query("after") ?? 0);
    const out = bus.recent().filter((e) => (e.at ?? 0) > after && (!p || e.pocket?.toLowerCase() === p));
    return c.body(toJson(out), 200, { "content-type": "application/json" });
  });
  app.get("/api/config", async (c) =>
    c.json({
      agent: agentAccount().address, factory: factoryAddress(), usdc: USDC, sellersUrl: process.env.SELLERS_URL ?? "http://localhost:4021",
      sellers: await directory(), abis: { pocket: pocketAbi, factory: factoryAbi, erc20: erc20Abi },
    }));
  app.get("/api/pending", (c) => c.json(approvals.pending(c.req.query("pocket") ?? "")));

  app.post("/api/approvals/:id", async (c) => {
    const a = approvals.get(c.req.param("id"));
    if (!a || a.status !== "pending") return c.json({ error: "NOT_PENDING" }, 404);
    const body = (await c.req.json()) as { approved: boolean; signature?: Hex; answer?: string };
    if (a.kind === "payment" && body.approved) {
      const signer = await recoverTypedDataAddress({ ...transferTypedData((a.data as any).auth), signature: body.signature! }).catch(() => undefined);
      const { owner } = await pocket(a.pocket as Address).info();
      if (!signer || signer.toLowerCase() !== owner.toLowerCase()) return c.json({ error: "OWNER_SIGNATURE_INVALID" }, 400);
    }
    approvals.resolve(a.id, body);
    return c.json({ ok: true });
  });

  app.post("/api/chat", async (c) => {
    const { pocket: p, conversationId = p, text } = (await c.req.json()) as { pocket: Address; conversationId?: string; text: string };
    for (const q of approvals.pending(p).filter((x) => x.kind === "question")) approvals.resolve(q.id, { approved: true, answer: text });
    const out = await runTurn({ pocket: p }, chats.get(conversationId) ?? [], text, { model: deps.model });
    chats.set(conversationId, out.history);
    return c.json({ reply: out.reply, stopped: out.stopped });
  });
  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 8787);
  serve({ fetch: apiApp().fetch, port });
  console.log(`wallet API on http://localhost:${port}`);
}
