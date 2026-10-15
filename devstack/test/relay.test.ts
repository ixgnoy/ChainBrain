import { describe, expect, it } from "vitest";
import { relayApp } from "../src/relay";

const post = (app: ReturnType<typeof relayApp>, path: string, body: unknown) =>
  app.request(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("relay", () => {
  it("keeps the phone's events and snapshot, dedupes by id, and resets on a new phone session", async () => {
    const app = relayApp();
    expect((await (await app.request("/state")).json()).linked).toBe(false);
    await post(app, "/push", { device: "a", events: [{ id: "s1", type: "trace" }, { id: "s2", type: "payment" }], snapshot: { pockets: [1] } });
    await post(app, "/push", { device: "a", events: [{ id: "s2", type: "payment" }, { id: "s3", type: "refusal" }] });
    let st = await (await app.request("/state")).json();
    expect(st.linked).toBe(true);
    expect(st.events.map((e: any) => e.id)).toEqual(["s1", "s2", "s3"]);
    expect(st.snapshot).toEqual({ pockets: [1] });
    await post(app, "/push", { device: "b", events: [{ id: "s1", type: "trace" }] });
    st = await (await app.request("/state")).json();
    expect(st.events.map((e: any) => e.id)).toEqual(["s1"]);
  });

  it("delivers console commands to the phone until acknowledged", async () => {
    const app = relayApp();
    expect((await post(app, "/command", { type: "force", pocket: "0x1" })).status).toBe(409); // no phone yet
    await post(app, "/push", { device: "a", events: [] });
    const { id } = await (await post(app, "/command", { type: "plant", sellerId: "shadyfeed", text: "hi" })).json();
    const r1 = await (await post(app, "/push", { device: "a", events: [], cmdAfter: 0 })).json();
    expect(r1.commands).toEqual([{ id, type: "plant", sellerId: "shadyfeed", text: "hi" }]);
    const r2 = await (await post(app, "/push", { device: "a", events: [], cmdAfter: id, results: [{ id, result: { ok: true } }] })).json();
    expect(r2.commands).toEqual([]);
    expect((await post(app, "/command", { type: "nope" })).status).toBe(400);
  });
});

describe("relay restart", () => {
  it("reports a new epoch so a phone resets its command cursor", async () => {
    const a = relayApp(), b = relayApp();
    const ea = (await (await post(a, "/push", { device: "x", events: [] })).json()).epoch;
    const eb = (await (await post(b, "/push", { device: "x", events: [] })).json()).epoch;
    expect(typeof ea).toBe("string");
    expect(ea).not.toBe(eb);
    const { id } = await (await post(b, "/command", { type: "say", text: "hi" })).json();
    expect(id).toBe(1); // numbering starts over: the phone must not skip it
  });
});
