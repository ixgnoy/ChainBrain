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
import { radarRoutes } from "./radar/api";
import { startMonitor } from "./radar/monitor";
import { startSentinel, sentinel } from "./sentinel";
import { chainSource } from "./radar/chainSource";
import type { AskModel } from "./radar/ask";
import { memory, render } from "./brain/memory";
import { reflect, type ReflectModel } from "./brain/reflect";
import { trimHistory } from "./brain/window";

type Msg = Anthropic.Beta.Messages.BetaMessageParam;

/** Wallet tool layer + agent API for the app. The LLM only ever reaches the tools; keys stay in this process. */
export function apiApp(deps: { model?: ModelFn; radarModel?: AskModel; memoryModel?: ReflectModel } = {}) {
  const app = new Hono();
  const chats = new Map<string, Msg[]>();
  const reflecting = new Map<string, Promise<unknown>>();
  // Memory is on with a model or a key; BRAIN_MEMORY=off turns it off (history is still trimmed).
  const memoryOn = () => process.env.BRAIN_MEMORY !== "off" && (!!deps.memoryModel || !!process.env.ANTHROPIC_API_KEY);
  app.use("*", cors({ origin: "*" }));

  app.route("/api/radar", radarRoutes({ model: deps.radarModel }));
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
    await reflecting.get(conversationId); // the last reflection lands before this turn reads memory
    const out = await runTurn({ pocket: p }, chats.get(conversationId) ?? [], text, { model: deps.model, memory: render(memory.get(p)) });
    chats.set(conversationId, trimHistory(out.history)); // only the last few raw turns stay; the rest lives in the snapshot
    if (memoryOn()) reflecting.set(conversationId, reflect(p, out.history, { model: deps.memoryModel }).catch(() => null));
    return c.json({ reply: out.reply, stopped: out.stopped });
  });

  app.get("/api/sentinel", async (c) => c.body(toJson(await sentinel.status((c.req.query("pocket") ?? "") as Address)), 200, { "content-type": "application/json" }));
  app.get("/api/memory", async (c) => {
    const p = c.req.query("pocket") ?? "";
    await Promise.all(reflecting.values()); // read after the latest reflection, not before it
    return c.body(toJson({ snapshot: memory.get(p), log: memory.log(p) }), 200, { "content-type": "application/json" });
  });
  // ponytail: no owner auth, like the other demo routes; production needs an owner signature here.
  app.post("/api/memory/forget", async (c) => {
    const { pocket: p, id } = (await c.req.json()) as { pocket: string; id: string };
    return memory.forget(p, id) ? c.json({ ok: true }) : c.json({ error: "NOT_FOUND" }, 404);
  });
  return app;
}

// ghost checks only look at transfers after the server started (earlier payments are not in this process's event log)
let sentinelFrom = 0n;
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  sentinelFrom = await import("./wallet/chain").then((m) => m.pub().getBlockNumber()).catch(() => 0n);
  const port = Number(process.env.PORT ?? 8787);
  serve({ fetch: apiApp().fetch, port });
  startMonitor();
  // ghost transfers: USDC that left a pocket (seen by Radar's transfer index) with no payment event, not back to the owner
  startSentinel({
    ghosts: async (p, paid) => {
      const owner = (await pocket(p).info()).owner.toLowerCase();
      return (await chainSource.outbound(p)).filter((t) => !paid.has(t.tx) && t.to.toLowerCase() !== owner && t.block >= sentinelFrom).map((t) => ({ tx: t.tx, to: t.to, amount: t.value }));
    },
  });
  console.log(`wallet API on http://localhost:${port}`);
}
