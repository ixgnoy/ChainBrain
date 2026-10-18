import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorld, seedOwner, SIM_AGENT, CLAUDE_AGENT, CATALOG, parseHkd, NEVER, factsFrom, sellerName, errand, firstRun, type Hex } from "../../../shared/sim";
import { createAutoplay, type HostState } from "./autoplay";
import { registerTarget, resetTargets, autoplayRunning, typeOut, type TargetName } from "./autoplayTargets";

const OWNER = "0x0000000000000000000000000000000000a11ce0" as Hex;
const payTo = (...ids: string[]) => CATALOG.filter((s) => ids.includes(s.id)).map((s) => s.payTo);

test("auto-play: wizard, scenes 1-11, Claude via Connect and the ask dock, then scene 12's pocket app and its routine, through the screens' targets, on the real built-in network", async () => {
  resetTargets();
  const w = createWorld({ speed: 0.005, seed: 3, revokeWindowMs: 9000 });
  const { pockets: seeded } = await seedOwner(w, OWNER);
  let active: Hex = seeded[0].address;
  let created: Hex | undefined; // the pocket the wizard makes in scene 1
  const subs = new Set<() => void>();
  const changed = () => subs.forEach((f) => f());
  w.subscribe(changed); w.chain.onTx(changed);
  const pressed: string[] = [];
  const on = (name: TargetName, f: (arg?: any) => unknown) => registerTarget(name, async (arg) => { pressed.push(name); await f(arg); });

  // what each screen's handler does when a finger presses it
  let continues = 0;
  on("home.newPocket", () => {});
  on("compose.manual", () => {});
  // scene 12: New pocket app composes from the sentence; the slide creates and funds it and stores its routine
  let composed: any;
  let routinePocket: Hex | undefined;
  on("compose.text", ({ text }) => { composed = w.composeApp(text); assert.equal(composed.spec.layout, "research"); assert.ok(composed.spec.routine); });
  on("compose.create", () => {
    const d = composed.draft;
    const { pocket } = w.chain.createPocket(OWNER, { agent: SIM_AGENT, cap: parseHkd(d.cap), askAbove: NEVER, expiresAt: BigInt(Math.floor(Date.now() / 1000) + 365 * 86_400), sellers: payTo(...d.sellers) });
    w.chain.transfer(OWNER, pocket, parseHkd(d.budget));
    w.setRoutine(pocket, composed.spec.routine);
    active = routinePocket = pocket;
  });
  on("compose.open", () => {});
  on("routine.runNow", () => { void w.runRoutineNow(active); });
  on("wizard.preset", (p) => assert.equal(p, "research"));
  on("wizard.continue", () => { if (++continues === 1) on("wizard.create", async () => { // a preset goes straight to Review
    const { pocket } = w.chain.createPocket(OWNER, { agent: SIM_AGENT, cap: parseHkd("0.40"), askAbove: parseHkd("0.16"), expiresAt: BigInt(Math.floor(Date.now() / 1000) + 6 * 3600), sellers: payTo("exa", "coingecko", "nansen") });
    w.chain.transfer(OWNER, pocket, parseHkd("8"));
    active = created = pocket;
  }); });
  on("wizard.open", () => {});
  let typed = "";
  on("composer", async ({ text }) => { await typeOut(text, (s) => { typed = s; }, { sleep: async () => {} }); void w.chat(active, typed); });
  on("question.answer", (a) => { assert.equal(a, "in total"); void w.chat(active, "HK$0.80 in total."); });
  let claudePocket: Hex | undefined;
  let focus: string | undefined; // the ask dock opened this approval (an outside agent's)
  const answerPending = (kind: string) => {
    const p = (focus ? w.approvals().find((x) => x.id === focus && x.status === "pending" && x.kind === kind) : undefined) ?? w.pending(active).find((x) => x.kind === kind);
    focus = undefined;
    if (p) void w.answer(p.id, { approved: true, signature: kind === "payment" ? "0xsig" : undefined });
  };
  on("intent.confirm", () => answerPending("intent"));
  on("approval.slide", () => answerPending("payment"));
  on("revoke.open", () => {});
  on("revoke.hold", () => { w.chain.revoke(OWNER, active); });
  on("return.open", () => {});
  on("return.slide", () => { w.chain.returnFunds(OWNER, active); });
  on("picker.open", () => {});
  // the picker's rule (components/PocketPickerSheet.tsx): exact name, then a name that contains it; live pockets first
  on("picker.pocket", (name) => {
    const all = [...seeded.filter((p) => (p.agent ?? "chainbrain") === "chainbrain").map((p) => ({ name: p.name, address: p.address })), ...(created ? [{ name: "Research data · 16 Oct", address: created }] : [])];
    const want = String(name).toLowerCase();
    const named = (xs: typeof all) => xs.find((x) => x.name.toLowerCase() === want) ?? xs.find((x) => x.name.toLowerCase().includes(want));
    const p = named(all.filter((x) => !w.chain.view(x.address).revoked)) ?? named(all);
    assert.ok(p, String(name));
    active = p.address;
  });
  on("home.connect", () => {});
  on("connect.agent", (a) => assert.equal(a, "claude"));
  on("connect.copy", () => {});
  on("consent.allow", () => {
    const { pocket } = w.chain.createPocket(OWNER, { agent: CLAUDE_AGENT, cap: parseHkd("0.40"), askAbove: parseHkd("0.16"), expiresAt: BigInt(Math.floor(Date.now() / 1000) + 7 * 86_400), sellers: payTo("exa", "coingecko", "nansen") });
    w.chain.transfer(OWNER, pocket, parseHkd("4.0"));
    claudePocket = pocket;
    w.connect("claude");
    void (async () => { await w.act("claude", pocket, firstRun()); await w.act("claude", pocket, errand({ what: "A check on the exporter's wallet", maxPrice: "0.40", maxTotal: "0.40", buys: [["nansen", "counterparties"]] })); })();
  });
  on("consent.done", () => {});
  on("dock.open", (arg) => { focus = w.approvals().filter((a) => a.status === "pending" && a.agent === arg?.agent && a.kind === arg?.kind).sort((x, y) => (y.createdAt ?? 0) - (x.createdAt ?? 0))[0]?.id; });
  on("radar.open", () => {});
  on("deadend.fix", () => {});
  on("rules.slide", () => { w.chain.setCap(OWNER, active, parseHkd("0.056")); w.chain.transfer(OWNER, active, parseHkd("0.016")); });
  on("sheet.close", () => {});
  on("deadend.askAgain", () => { void w.chat(active, "Search Exa for durian export news. Max HK$0.056, by tonight."); });

  const state = (): HostState => ({
    pending: w.pending(active).map((a) => ({ id: a.id, kind: a.kind })),
    busy: w.isBusy(active),
    activeAddress: active,
    pocketCount: w.chain.pocketsOf(OWNER).length,
    lastPaymentAt: Math.max(0, ...w.events(0).filter((e) => e.type === "payment" && w.chain.view(e.pocket!).owner === OWNER).map((e) => e.at)),
    ownerTxCount: w.txs().filter((t) => t.from === OWNER).length,
    outside: w.approvals().filter((a) => a.status === "pending" && a.agent && a.agent !== "chainbrain").map((a) => ({ id: a.id, kind: a.kind, agent: a.agent })),
    routineRuns: w.events(0, active).filter((e) => e.type === "routine" && e.kind === "run").length,
  });
  const ap = createAutoplay({
    navigate: () => {}, state, subscribe: (f) => { subs.add(f); return () => void subs.delete(f); },
    forceTransfer: (p) => w.forceTransfer(p as Hex), inject: (id, t) => { w.inject(id, t); }, sleep: (ms) => new Promise((r) => setTimeout(r, Math.min(ms, 5))), pace: 0,
  });
  ap.start();
  assert.equal(autoplayRunning(), true);
  await ap.done;
  assert.equal(autoplayRunning(), false);

  const mine = w.chain.pocketsOf(OWNER).map((p) => p.address);
  const f = factsFrom(w.events(0), w.txs(), { sellerName, pockets: mine, since: Date.now() - 60_000 });
  for (const id of ["pocketCreated", "onchainPayment", "cosigned", "clarifyingQuestion", "refusedReplanned", "injectionIgnored", "dataRefused", "forcedReverted", "escalationBlocked", "killSwitch", "safeStop", "fixApplied"] as const) assert.ok(f[id], `${id} (pressed: ${pressed.join(", ")})`);
  assert.ok(w.events(0).some((e) => e.type === "refusal" && e.reason === "POCKET_REVOKED"), "scene 7: the second payment was refused after the revoke");
  assert.equal(w.chain.view(seeded[1].address).cap, parseHkd("0.056"));
  assert.equal(pressed.filter((p) => p === "approval.slide").length, 4, "Nansen in scene 1, DataPro's negotiated HK$8.80 in scene 11, Claude's counterparty check, then the routine's cheque in scene 12");
  // scene 12: three runs this week, two on their own, one co-signed past the allowance; the rewrite attempt ignored
  assert.ok(routinePocket, "scene 12 made its pocket app");
  const rp = w.events(0, routinePocket).filter((e) => e.type === "payment");
  assert.equal(rp.length, 6);
  assert.equal(rp.filter((e) => e.cosigned).length, 1);
  assert.ok(w.events(0, routinePocket).some((e) => e.type === "routine" && e.kind === "ignored" && e.sellerId === "exa"), "the seller's rewrite attempt was reported");
  assert.equal(w.routine(routinePocket!)!.runs, 3);
  assert.ok(claudePocket, "Claude got its own pocket");
  assert.ok(w.events(0).some((e) => e.type === "payment" && e.agent === "claude" && e.cosigned && e.pocket === claudePocket), "Claude's co-signed payment from its new pocket");
  assert.ok(w.events(0).some((e) => e.type === "radar" && e.kind === "alert"), "scene 9: Radar alerted the pockets that paid TradeWire before");
  // one pocket carries the story for the Brain tab: 1, 4, 5, 6, escalation, Radar (9) and the Sentinel's freeze (10)
  const story = w.events(0, created);
  assert.ok(story.some((e) => e.type === "attack") && story.some((e) => e.type === "forced" && e.reverted) && story.some((e) => e.type === "disclosure"), "attacks on the scene-1 pocket");
  assert.ok(story.some((e) => e.type === "radar" && e.kind === "screen" && e.sellerId === "tradewire" && e.verdict === "block"), "scene 9: Radar blocked TradeWire on the scene-1 pocket");
  const freeze = story.find((e) => e.type === "sentinel" && e.kind === "freeze");
  assert.ok(freeze, "scene 10: the Sentinel froze the scene-1 pocket");
  const lastBuy = story.filter((e) => e.type === "payment").at(-1)!;
  assert.ok(freeze.at > lastBuy.at, "the freeze comes after the story's purchases, not earlier");
  assert.equal(w.chain.view(created!).frozen, true);
  assert.equal(w.chain.view(created!).revoked, false);
  assert.equal(w.chain.view(seeded[0].address).revoked, true, "scene 7 revoked the lived-in Research data pocket");
  const premium = seeded.find((p) => p.name === "Premium reports")!.address;
  const deal = w.events(0, premium).find((e) => e.type === "payment" && e.list);
  assert.deepEqual([deal?.amount, deal?.list, deal?.cosigned], ["8800000", "12000000", true], "scene 11: the haggler's deal on Premium reports, co-signed");
});

test("auto-play: stop() ends it at the next step and clears the running flag", async () => {
  resetTargets();
  let n = 0;
  registerTarget("home.newPocket", () => { n++; });
  const ap = createAutoplay({
    navigate: () => {}, state: () => ({ pending: [], busy: false, pocketCount: 0, lastPaymentAt: 0, ownerTxCount: 0 }),
    subscribe: () => () => {}, forceTransfer: async () => {}, sleep: (ms) => new Promise((r) => setTimeout(r, Math.min(ms, 20))), pace: 1,
  });
  ap.start();
  ap.stop();
  await ap.done;
  assert.equal(autoplayRunning(), false);
  assert.equal(n, 0);
  void NEVER;
});
