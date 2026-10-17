import { it, expect, beforeAll, vi } from "vitest";
import { useDevKeys } from "./helpers/env";

vi.mock("../src/wallet/directory", () => ({
  directory: async () => [
    { id: "datalite", name: "DataLite", category: "Research data", payTo: "0x1", items: [] },
    { id: "datapro", name: "DataPro", category: "Research data", payTo: "0x2", items: [] },
    { id: "harbour-wines", name: "Harbour Wines", category: "Food and drink", payTo: "0x3", items: [] },
  ],
}));

let api: ReturnType<typeof import("../src/index").apiApp>;
const sentence = "HK$40 for durian research from DataLite or DataPro, at most HK$15 each, ask me above HK$8, until tonight";
const reply = (input: object) => ({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "p", name: "propose_pocket", input }] }) as any;

beforeAll(async () => {
  useDevKeys();
  process.env.FACTORY_ADDRESS = "0x0000000000000000000000000000000000000001";
});

it("two readings that disagree: the stricter value wins and the proof card is computed", async () => {
  const { apiApp } = await import("../src/index");
  let n = 0;
  api = apiApp({
    rulesModel: async () => reply(n++ === 0
      ? { name: "Durian research", sellers: ["datalite", "datapro"], cap: "15.00", budget: "40.00", askAbove: "8.00", lifetime: "until-tonight", questions: [] }
      : { name: "Durian", sellers: ["datalite", "datapro", "harbour-wines", "0xattacker"], cap: "24", budget: "400", askAbove: "never", lifetime: "ongoing", questions: [] }),
  });
  const r = await (await api.request("/api/rules/compile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sentence }) })).json();
  expect(r.by).toBe("claude");
  expect(r.draft).toEqual({ name: "Durian research", sellers: ["datalite", "datapro"], cap: "15.00", budget: "40.00", askAbove: "8.00", lifetime: "until-tonight" });
  expect(r.disagreements.length).toBe(5);
  expect(r.proof.worstCase).toBe("40.00");
  expect(r.proof.neverPayable).toEqual(["Harbour Wines"]);
  expect(r.proof.tests.every((t: any) => t.ok)).toBe(true);
});

it("without a model the fixed parser answers, with the same proof card", async () => {
  delete process.env.ANTHROPIC_API_KEY;
  const { apiApp } = await import("../src/index");
  const r = await (await apiApp().request("/api/rules/compile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sentence }) })).json();
  expect(r).toMatchObject({ by: "parser", draft: { sellers: ["datalite", "datapro"], cap: "15.00", budget: "40.00", askAbove: "8.00", lifetime: "until-tonight" }, questions: [] });
});
