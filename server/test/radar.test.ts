import { describe, it, expect, beforeEach } from "vitest";
import type { Address, Hex } from "viem";
import { exposure, memorySource, type Transfer } from "../src/radar/exposure";
import { labels } from "../src/radar/labels";
import { score } from "../src/radar/rules";
import { radar, screen } from "../src/radar/screen";
import { ask, type AskModel } from "../src/radar/ask";
import { bus } from "../src/wallet/events";

const A = (n: number) => `0x${n.toString(16).padStart(40, "0")}` as Address;
const t = (from: number, to: number, usd: number): Transfer => ({ from: A(from), to: A(to), value: BigInt(usd * 1e6), tx: "0x00" as Hex, block: 1n });
const SELLER = 1, MID = 2, DRAINER = 3, EXCHANGE = 4, POCKET = 5, MIXER = 6;

beforeEach(() => {
  labels.clear();
  radar.reset();
  labels.add({ address: A(DRAINER), category: "drainer", name: "Demo drainer", source: "test" });
  labels.add({ address: A(EXCHANGE), category: "exchange", name: "Exchange", source: "test" });
});

describe("exposure (proportional, hops reported but not the measure)", () => {
  it("splits a seller's funds by share through an unlabelled middle wallet", async () => {
    // seller got 6 from MID and 4 from a pocket; MID got 50/50 from a drainer and an exchange
    const src = memorySource([t(MID, SELLER, 6), t(POCKET, SELLER, 4), t(DRAINER, MID, 10), t(EXCHANGE, MID, 10)]);
    const e = await exposure(src, A(SELLER), "source");
    expect(e.byCategory.drainer!.share).toBeCloseTo(0.3);
    expect(e.byCategory.drainer!.hops).toBe(2);
    expect(e.byCategory.drainer!.path).toEqual([A(SELLER), A(MID), A(DRAINER)]);
    expect(e.byCategory.exchange!.share).toBeCloseTo(0.3);
    expect(e.unknown).toBeCloseTo(0.4); // the pocket has no inbound history in the window
  });

  it("stops at the hop limit and on cycles without double counting", async () => {
    const src = memorySource([t(MID, SELLER, 1), t(SELLER, MID, 1), t(6, MID, 1), t(7, 6, 1), t(DRAINER, 7, 1)]);
    const e = await exposure(src, A(SELLER), "source", { maxHops: 3 });
    expect(e.byCategory.drainer).toBeUndefined(); // 4 hops back
    const deep = await exposure(src, A(SELLER), "source", { maxHops: 4 });
    expect(deep.byCategory.drainer!.share).toBeCloseTo(0.5);
    expect(deep.byCategory.drainer!.share + deep.unknown).toBeCloseTo(1);
  });

  it("follows money out (destination) as well as in", async () => {
    const e = await exposure(memorySource([t(SELLER, MIXER, 9), t(SELLER, 8, 1)]), A(SELLER), "destination");
    expect(e.byCategory.mixer).toBeUndefined();
    labels.add({ address: A(MIXER), category: "mixer", name: "Mixer", source: "test" });
    const e2 = await exposure(memorySource([t(SELLER, MIXER, 9), t(SELLER, 8, 1)]), A(SELLER), "destination");
    expect(e2.byCategory.mixer!.share).toBeCloseTo(0.9);
  });

  it("marks a failed lookup as incomplete instead of clean", async () => {
    const e = await exposure({ inbound: async () => { throw new Error("rpc down"); }, outbound: async () => [] }, A(SELLER), "source");
    expect(e).toMatchObject({ incomplete: true, unknown: 1 });
  });
});

describe("rules and verdicts", () => {
  it("scores by the strongest rule: 30% drainer blocks, a trace of mixer only reviews", () => {
    const exp = (cat: string, share: number) => ({ direction: "source" as const, byCategory: { [cat]: { share, hops: 2, path: [] } }, unknown: 0, incomplete: false, nodes: 1, edges: [] });
    expect(score(undefined, [exp("drainer", 0.3)])).toMatchObject({ score: 9, verdict: "block" });
    expect(score(undefined, [exp("drainer", 0.05)])).toMatchObject({ score: 6, verdict: "review" });
    expect(score(undefined, [exp("mixer", 0.05)])).toMatchObject({ score: 5, verdict: "review" });
    expect(score(undefined, [exp("exchange", 1)])).toMatchObject({ score: 0, verdict: "ok" });
    expect(score("sanctioned", [])).toMatchObject({ score: 10, verdict: "block" });
  });

  it("a label never downgrades", () => {
    labels.add({ address: A(DRAINER), category: "flagged", name: "x", source: "test" });
    expect(labels.get(A(DRAINER))!.category).toBe("drainer");
    labels.add({ address: A(9), category: "flagged", name: "x", source: "test" });
    labels.add({ address: A(9), category: "sanctioned", name: "x", source: "test" });
    expect(labels.get(A(9))!.category).toBe("sanctioned");
  });
});

describe("screen, alerts and the copilot narrative", () => {
  it("opens one alert when a watched seller's risk rises, sent to the pocket that dealt with it", async () => {
    const ts = [t(POCKET, SELLER, 1)];
    radar.use({ source: memorySource(ts) });
    radar.name(A(SELLER), "DataPro");
    radar.watch(A(POCKET), A(SELLER));
    expect((await screen(A(SELLER))).verdict).toBe("ok");
    expect(radar.alerts()).toHaveLength(0);

    ts.push(t(DRAINER, SELLER, 9)); // after onboarding, the seller is paid by a drainer
    const before = bus.recent().length;
    const s = await screen(A(SELLER));
    expect(s).toMatchObject({ verdict: "block", score: 9 });
    expect(s.narrative).toContain("Risk 9/10 for DataPro: blocked.");
    expect(s.narrative).toContain("90% of the money DataPro received traces back to Demo drainer (drainer), directly.");
    expect(radar.alerts()).toHaveLength(1);
    expect(bus.recent().slice(before).some((e) => e.type === "radar" && e.kind === "alert" && e.pocket === A(POCKET).toLowerCase())).toBe(true);

    await screen(A(SELLER)); // same risk again: no duplicate alert
    expect(radar.alerts()).toHaveLength(1);
  });
});

describe("Ask Radar", () => {
  it("answers from tool results only, and records the evidence", async () => {
    radar.use({ source: memorySource([t(DRAINER, SELLER, 3), t(POCKET, SELLER, 7)]) });
    radar.name(A(SELLER), "DataPro");
    const calls: any[] = [];
    const model: AskModel = async (req) => {
      calls.push(req);
      if (calls.length === 1) return { content: [{ type: "tool_use", id: "u1", name: "screen_counterparty", input: { who: A(SELLER) } }], stop_reason: "tool_use" } as any;
      const last = req.messages.at(-1)!.content as any[];
      const r = JSON.parse(last[0].content);
      return { content: [{ type: "text", text: `${r.counterparty} scores ${r.score}/10 (${r.verdict}).` }], stop_reason: "end_turn" } as any;
    };
    const out = await ask("Is DataPro safe to pay?", { model });
    expect(out.answer).toBe("DataPro scores 9/10 (block).");
    expect(out.evidence[0]).toMatchObject({ tool: "screen_counterparty", result: { verdict: "block" } });
    expect(calls[0].tools.map((x: any) => x.name)).toEqual(["screen_counterparty", "trace_funds", "list_alerts", "list_labels"]);
  });
});
