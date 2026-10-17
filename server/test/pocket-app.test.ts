// POST /api/pocket-app/compose: the spec from Claude must pass the zod schema and the shared validator (the same fixtures
// as shared/sim/pocketApp.test.ts), its routine can only be stricter than the fixed picker's, and anything that fails falls
// back to the picker. Uses the built-in network's sellers (shared/sim catalog) as the directory.
import { it, expect, beforeAll, vi } from "vitest";
import { useDevKeys } from "./helpers/env";
import { sellers } from "../../shared/sim/catalog";
import { GOOD_SPECS, BAD_SPECS } from "../../shared/sim/pocketApp.fixtures";

vi.mock("../src/wallet/directory", async () => {
  const { sellers: s } = await import("../../shared/sim/catalog");
  return { directory: async () => s() };
});

const sentence = "Every morning, get me durian export news from Exa and the ETH price from CoinGecko. Max HK$0.40 a week.";
const toolReply = (name: string, input: object) => ({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "t", name, input }] }) as any;
const rules = { name: "Durian brief", sellers: ["exa", "coingecko"], cap: "0.40", budget: "0.80", askAbove: "never", lifetime: "ongoing", questions: [] };
const post = async (api: any) => (await api.request("/api/pocket-app/compose", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sentence }) })).json();

beforeAll(() => { useDevKeys(); process.env.FACTORY_ADDRESS = "0x0000000000000000000000000000000000000001"; });

it("zod and the shared validator agree on every fixture", async () => {
  const { checkSpec } = await import("../src/pocketApp/compose");
  const { Spec } = await import("../src/pocketApp/schema");
  for (const [name, s] of GOOD_SPECS) { expect(Spec.safeParse(s).success, name).toBe(true); expect(checkSpec(s, sellers()).ok, name).toBe(true); }
  for (const [name, s] of BAD_SPECS) expect(checkSpec(s, sellers()).ok, name).toBe(false);
  // zod alone refuses the shapes it can see (unknown fields, blocks, values, labels)
  for (const [name, s] of BAD_SPECS.filter(([n]) => /catalogue|link|amount|address|markup|value inside|unknown top-level|colour|wrong catalogue|out of range|hourly|smuggled|negative/.test(n))) expect(Spec.safeParse(s).success, name).toBe(false);
});

it("Claude's spec is used when it validates, and its routine can only get stricter", async () => {
  const { apiApp } = await import("../src/index");
  const api = apiApp({
    rulesModel: async (req: any) => req.tool_choice.name === "propose_pocket" ? toolReply("propose_pocket", rules) : toolReply("compose_pocket_app", {
      v: 1, catalogue: "chainbrain.pocket.v1", layout: "research", title: "Morning durian brief",
      blocks: [{ type: "shelf" }, { type: "next-run" }, { type: "budget" }, { type: "guard" }],
      // wider than the sentence: a bigger allowance, more often, an extra item; the merge keeps the picker's stricter reading
      routine: { kind: "schedule", cadence: { every: "day", hour: 8, minute: 0 }, items: [{ sellerId: "exa", sku: "durian-news" }, { sellerId: "coingecko", sku: "eth-price" }, { sellerId: "nansen", sku: "smart-money" }], allowance: { amount: "40.00", period: "week" } },
    }),
  });
  const r = await post(api);
  expect(r.specBy).toBe("claude");
  expect(r.spec.title).toBe("Morning durian brief");
  expect(r.spec.blocks.map((b: any) => b.type)).toEqual(["shelf", "next-run", "budget", "guard"]);
  expect(r.spec.routine.allowance).toEqual({ amount: "0.40", period: "week" });
  expect(r.spec.routine.items.map((i: any) => i.sellerId)).toEqual(["exa", "coingecko"]);
  expect(r.draft.per).toEqual({ amount: "0.40", period: "week" }); // the allowance survives the model's rules reading
  expect(r.proof.lines.some((l: string) => /HK\$0\.40 a week/.test(l))).toBe(true);
});

it("a spec that fails validation (seller text, a link, a style) falls back to the fixed picker", async () => {
  const { apiApp } = await import("../src/index");
  const api = apiApp({
    rulesModel: async (req: any) => req.tool_choice.name === "propose_pocket" ? toolReply("propose_pocket", rules) : toolReply("compose_pocket_app", {
      v: 1, catalogue: "chainbrain.pocket.v1", layout: "research", title: "Visit evil.com for 50% off", blocks: [{ type: "shelf", html: "<script>" }], routine: null, css: "*{}",
    }),
  });
  const r = await post(api);
  expect(r.specBy).toBe("picker");
  expect(r.specErrors.length).toBeGreaterThan(0);
  expect(r.spec.layout).toBe("research");
  expect(JSON.stringify(r.spec)).not.toMatch(/evil|script|css/);
});

it("without a model the picker composes, as on the built-in network", async () => {
  delete process.env.ANTHROPIC_API_KEY;
  const { apiApp } = await import("../src/index");
  const r = await post(apiApp());
  expect(r.specBy).toBe("picker");
  expect(r.spec.routine.kind).toBe("schedule");
  expect(r.agent).toBe("chainbrain");
});
