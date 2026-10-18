/// <reference types="node" />
// Pure-logic tests for the mobile app (no React Native runtime needed): `npm test` runs them under Node.
import { test } from "node:test";
import assert from "node:assert/strict";
import { recoverTypedDataAddress, verifyTypedData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { parseHkd, formatHkd, NEVER, transferTypedData, type Authorization } from "./shared";
import { recoverTransferSigner } from "./typed";
import { PRESETS, toPocketArgs, isTightCap } from "./presets";
import { ownerWallet, pocketStatus } from "./wallet";
import { approvalsFrom } from "./events";

const PK = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Foundry dev key 0 (public)
const auth: Authorization = {
  from: "0x00000000000000000000000000000000000000aa", to: "0x00000000000000000000000000000000000000bb",
  value: "1500000", validAfter: "0", validBefore: "1900000000", nonce: `0x${"11".repeat(32)}`,
};

test("owner co-sign from the phone is the exact eHKD transfer the pocket checks", async () => {
  const w = ownerWallet(PK);
  const sig = await w.signTransfer(auth);
  assert.equal(await recoverTypedDataAddress({ ...transferTypedData(auth), signature: sig }), privateKeyToAccount(PK).address);
  assert.equal(await verifyTypedData({ address: w.address, ...transferTypedData({ ...auth, value: "1900000" }), signature: sig }), false);
});

test("presets match the spec and the web app", () => {
  const payTo = { datalite: "0x00000000000000000000000000000000000000d1", datapro: "0x00000000000000000000000000000000000000d2" } as const;
  const a = toPocketArgs(PRESETS.research, "0x00000000000000000000000000000000000000aa", payTo);
  assert.deepEqual([a.budget, a.cap, a.askAbove], [40_000_000n, 15_000_000n, 8_000_000n]);
  assert.equal(toPocketArgs(PRESETS.onePurchase, a.agent, payTo).askAbove, NEVER);
  assert.throws(() => toPocketArgs({ ...PRESETS.research, sellers: ["nope"] }, a.agent, payTo), /unknown seller/);
});

test("money and status helpers", () => {
  assert.equal(parseHkd("0.3"), 300_000n);
  assert.equal(formatHkd(2_150_000n), "2.15");
  assert.equal(formatHkd(NEVER), "never");
  const p = { revoked: false, expiresAt: 100n } as any;
  assert.equal(pocketStatus(p, 50_000), "Active");
  assert.equal(pocketStatus(p, 200_000), "Expired");
  assert.equal(pocketStatus({ ...p, revoked: true }, 0), "Revoked");
});

test("approvalsFrom keeps the latest status per approval", () => {
  const ev = (status: string) => ({ type: "approval", at: 1, approval: { id: "a1", kind: "payment", status } });
  assert.deepEqual(approvalsFrom([ev("pending"), ev("approved")]).map((a) => a.status), ["approved"]);
});

test("the dead-end pocket is told apart on both networks (console Play, chat suggestions)", async () => {
  const { CATALOG } = await import("../../../shared/sim");
  const builtinIds = CATALOG.map((s) => s.id);
  const devIds = ["datalite", "datapro", "harbour-wines", "shadyfeed"];
  assert.equal(isTightCap(40_000n, builtinIds), true); // built-in One purchase, HK$0.04
  assert.equal(isTightCap(400_000n, builtinIds), false); // built-in Research data, HK$0.40: research scenes play here
  assert.equal(isTightCap(1_500_000n, devIds), true); // server scene 8 pocket, HK$1.50
  assert.equal(isTightCap(15_000_000n, devIds), false); // server Research data, cap HK$15
});

test("the built-in network recovers the co-signer without viem's dynamic import (Expo Go --no-dev cannot load that chunk)", async () => {
  const PK = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as const;
  const me = privateKeyToAccount(PK);
  const auth: Authorization = { from: "0x645fe31beda926b30f0939ef4a741cb861c8faa6", to: "0x2c9b41e6f3a07d58b9c2e1f4a6d83b07e5c9a1f3", value: "50000", validAfter: "0", validBefore: "1792146589", nonce: "0xbf163731acede3da45841716bd51891e2c169eb3a931af8c4e636a5de8d58447" };
  const sig = await me.signTypedData(transferTypedData(auth));
  assert.equal(recoverTransferSigner(auth, sig), me.address);
  assert.equal(recoverTransferSigner(auth, sig), await recoverTypedDataAddress({ ...transferTypedData(auth), signature: sig }));
  assert.notEqual(recoverTransferSigner({ ...auth, value: "50001" }, sig), me.address);
});
