import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorld, seedOwner, SIM_AGENT, CATALOG, parseUsd, NEVER, factsFrom, sellerName, type Hex } from "../../../shared/sim";
import { createAutoplay, type HostState } from "./autoplay";
import { registerTarget, resetTargets, autoplayRunning, typeOut, type TargetName } from "./autoplayTargets";

const OWNER = "0x0000000000000000000000000000000000a11ce0" as Hex;
const payTo = (...ids: string[]) => CATALOG.filter((s) => ids.includes(s.id)).map((s) => s.payTo);

test("auto-play: wizard, then scenes 1-8 through the screens' targets, on the real built-in network", async () => {
  resetTargets();
  const w = createWorld({ speed: 0.005, seed: 3, revokeWindowMs: 9000 });
  const { pockets: seeded } = await seedOwner(w, OWNER);
  let active: Hex = seeded[0].address;
  const subs = new Set<() => void>();
  const changed = () => subs.forEach((f) => f());
  w.subscribe(changed); w.chain.onTx(changed);
  const pressed: string[] = [];
  const on = (name: TargetName, f: (arg?: any) => unknown) => registerTarget(name, async (arg) => { pressed.push(name); await f(arg); });

  // what each screen's handler does when a finger presses it
  let continues = 0;
  on("home.newPocket", () => {});
  on("wizard.preset", (p) => assert.equal(p, "research"));
  on("wizard.continue", () => { if (++continues === 6) on("wizard.create", async () => {
    const { pocket } = w.chain.createPocket(OWNER, { agent: SIM_AGENT, cap: parseUsd("2"), askAbove: parseUsd("1"), expiresAt: BigInt(Math.floor(Date.now() / 1000) + 6 * 3600), sellers: payTo("datalite", "datapro") });
    w.chain.transfer(OWNER, pocket, parseUsd("5"));
    active = pocket;
  }); });
  on("wizard.open", () => {});
  let typed = "";
  on("composer", async ({ text }) => { await typeOut(text, (s) => { typed = s; }, { sleep: async () => {} }); void w.chat(active, typed); });
  on("question.answer", (a) => { assert.equal(a, "per report"); void w.chat(active, "US$2 per report."); });
  const answerPending = (kind: string) => { const p = w.pending(active).find((x) => x.kind === kind); if (p) void w.answer(p.id, { approved: true, signature: kind === "payment" ? "0xsig" : undefined }); };
  on("intent.confirm", () => answerPending("intent"));
  on("approval.slide", () => answerPending("payment"));
  on("revoke.open", () => {});
  on("revoke.hold", () => { w.chain.revoke(OWNER, active); });
  on("return.open", () => {});
  on("return.slide", () => { w.chain.returnFunds(OWNER, active); });
  on("picker.open", () => {});
  on("picker.pocket", (name) => { assert.equal(name, "One purchase"); active = seeded.find((p) => p.name === name)!.address; });
  on("deadend.fix", () => {});
  on("rules.slide", () => { w.chain.setCap(OWNER, active, parseUsd("0.30")); w.chain.transfer(OWNER, active, parseUsd("0.10")); });
  on("sheet.close", () => {});
  on("deadend.askAgain", () => { void w.chat(active, "Buy the DataLite durian report. Max US$0.30, by tonight."); });

  const state = (): HostState => ({
    pending: w.pending(active).map((a) => ({ id: a.id, kind: a.kind })),
    busy: w.isBusy(active),
    activeAddress: active,
    pocketCount: w.chain.pocketsOf(OWNER).length,
    lastPaymentAt: Math.max(0, ...w.events(0).filter((e) => e.type === "payment" && w.chain.view(e.pocket!).owner === OWNER).map((e) => e.at)),
    ownerTxCount: w.txs().filter((t) => t.from === OWNER).length,
  });
  const ap = createAutoplay({
    navigate: () => {}, state, subscribe: (f) => { subs.add(f); return () => void subs.delete(f); },
    forceTransfer: (p) => w.forceTransfer(p as Hex), sleep: (ms) => new Promise((r) => setTimeout(r, Math.min(ms, 5))), pace: 0,
  });
  ap.start();
  assert.equal(autoplayRunning(), true);
  await ap.done;
  assert.equal(autoplayRunning(), false);

  const mine = w.chain.pocketsOf(OWNER).map((p) => p.address);
  const f = factsFrom(w.events(0), w.txs(), { sellerName, pockets: mine, since: Date.now() - 60_000 });
  for (const id of ["pocketCreated", "onchainPayment", "cosigned", "clarifyingQuestion", "refusedReplanned", "injectionIgnored", "dataRefused", "forcedReverted", "escalationBlocked", "killSwitch", "safeStop", "fixApplied"] as const) assert.ok(f[id], `${id} (pressed: ${pressed.join(", ")})`);
  assert.ok(w.events(0).some((e) => e.type === "refusal" && e.reason === "POCKET_REVOKED"), "scene 7: the second payment was refused after the revoke");
  assert.equal(w.chain.view(seeded[1].address).cap, parseUsd("0.30"));
  assert.equal(pressed.filter((p) => p === "approval.slide").length, 1, "only DataPro needed a co-signature");
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
