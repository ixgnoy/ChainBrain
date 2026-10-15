import { Hono } from "hono";
import { isAddress } from "viem";
import { toJson } from "../wallet/events";
import { directory } from "../wallet/directory";
import { labels, isRisky } from "./labels";
import { radar, screen, brief } from "./screen";
import { THRESHOLDS } from "./rules";
import { ask, type AskModel } from "./ask";

const json = (c: any, v: unknown, status = 200) => c.body(toJson(v), status, { "content-type": "application/json" });

async function target(who: string) {
  if (isAddress(who)) return who;
  const s = (await directory()).find((x) => x.id === who);
  return s?.payTo;
}

/** /api/radar/*: screening other agents and apps can call, the alert queue, and "Ask Radar". */
export function radarRoutes(deps: { model?: AskModel } = {}) {
  const app = new Hono();

  // ?full=1 adds both exposures and the fund-flow graph (the investigation view)
  app.get("/screen/:who", async (c) => {
    const a = await target(c.req.param("who"));
    if (!a) return c.json({ error: "UNKNOWN_COUNTERPARTY" }, 404);
    const s = await screen(a);
    return c.req.query("full") ? json(c, s) : json(c, { ...brief(s), factors: s.factors, narrative: s.narrative, at: s.at });
  });
  app.get("/alerts", (c) => json(c, radar.alerts()));
  app.post("/alerts/:id/close", (c) => {
    const a = radar.alerts().find((x) => x.id === c.req.param("id"));
    if (!a) return c.json({ error: "NOT_FOUND" }, 404);
    a.status = "closed";
    return c.json({ ok: true });
  });
  app.get("/rules", (c) => c.json({ thresholds: THRESHOLDS, rules: radar.rules() }));
  app.get("/labels", (c) => json(c, labels.all()));
  app.post("/ask", async (c) => {
    const { question } = (await c.req.json()) as { question?: string };
    if (!question?.trim()) return c.json({ error: "EMPTY_QUESTION" }, 400);
    try {
      return json(c, await ask(question, { model: deps.model }));
    } catch (e) {
      return c.json({ error: "MODEL_UNAVAILABLE", detail: String((e as Error).message).slice(0, 200) }, 503);
    }
  });

  // Demo-only, like the sellers' /admin: plant a risky label (RADAR_ADMIN=1). Only risky categories, so it can only tighten.
  app.post("/admin/labels", async (c) => {
    if (process.env.RADAR_ADMIN !== "1") return c.json({ error: "ADMIN_DISABLED" }, 403);
    const b = (await c.req.json()) as { address?: string; category?: string; name?: string };
    if (!b.address || !isAddress(b.address) || !b.category || !isRisky(b.category)) return c.json({ error: "BAD_LABEL" }, 400);
    return json(c, labels.add({ address: b.address, category: b.category, name: (b.name ?? b.category).slice(0, 40), source: "demo" }));
  });
  return app;
}
