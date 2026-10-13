/// <reference types="node" />
// Pure-logic tests for the mobile app (no React Native runtime needed): `npm test` runs them under Node.
import { test } from "node:test";
import assert from "node:assert/strict";
import { recoverTypedDataAddress, verifyTypedData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { parseUsd, formatUsd, NEVER, transferTypedData, type Authorization } from "./shared";
import { PRESETS, toPocketArgs } from "./presets";
import { ownerWallet, pocketStatus } from "./wallet";
import { approvalsFrom } from "./events";

const PK = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // anvil dev key 0 (public)
const auth: Authorization = {
  from: "0x00000000000000000000000000000000000000aa", to: "0x00000000000000000000000000000000000000bb",
  value: "1500000", validAfter: "0", validBefore: "1900000000", nonce: `0x${"11".repeat(32)}`,
};

test("owner co-sign from the phone is the exact USDC transfer the pocket checks", async () => {
  const w = ownerWallet(PK);
  const sig = await w.signTransfer(auth);
  assert.equal(await recoverTypedDataAddress({ ...transferTypedData(auth), signature: sig }), privateKeyToAccount(PK).address);
  assert.equal(await verifyTypedData({ address: w.address, ...transferTypedData({ ...auth, value: "1900000" }), signature: sig }), false);
});

test("presets match the spec and the web app", () => {
  const payTo = { datalite: "0x00000000000000000000000000000000000000d1", datapro: "0x00000000000000000000000000000000000000d2" } as const;
  const a = toPocketArgs(PRESETS.research, "0x00000000000000000000000000000000000000aa", payTo);
  assert.deepEqual([a.budget, a.cap, a.askAbove], [5_000_000n, 2_000_000n, 1_000_000n]);
  assert.equal(toPocketArgs(PRESETS.onePurchase, a.agent, payTo).askAbove, NEVER);
  assert.throws(() => toPocketArgs({ ...PRESETS.research, sellers: ["nope"] }, a.agent, payTo), /unknown seller/);
});

test("money and status helpers", () => {
  assert.equal(parseUsd("0.3"), 300_000n);
  assert.equal(formatUsd(2_150_000n), "2.15");
  assert.equal(formatUsd(NEVER), "never");
  const p = { revoked: false, expiresAt: 100n } as any;
  assert.equal(pocketStatus(p, 50_000), "Active");
  assert.equal(pocketStatus(p, 200_000), "Expired");
  assert.equal(pocketStatus({ ...p, revoked: true }, 0), "Revoked");
});

test("approvalsFrom keeps the latest status per approval", () => {
  const ev = (status: string) => ({ type: "approval", at: 1, approval: { id: "a1", kind: "payment", status } });
  assert.deepEqual(approvalsFrom([ev("pending"), ev("approved")]).map((a) => a.status), ["approved"]);
});
