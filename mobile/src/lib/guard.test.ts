/// <reference types="node" />
// The signing guard (shared/chain/guard.ts): the owner key signs only what it can decode and allows.
import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeFunctionData, encodeFunctionData, parseAbi, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { checkTx, checkTypedData, hk, type GuardContext } from "../../../shared/chain/guard";
import { loginTypedData } from "../../../shared/chain/login";
import { transferTypedData, type Authorization } from "./shared";
import { ownerWallet } from "./wallet";

const PK = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Foundry dev key 0 (public)
const me = privateKeyToAccount(PK).address;
const FACTORY: Address = "0x03aB4C311eeE7C3295c63F910D79a07Ffa7A097A";
const TOKEN: Address = "0x0355c0c5Afe2A35369056FBB854903A4aF07781A";
const MY_CARD: Address = "0x00000000000000000000000000000000000c0a1d";
const THEIR_CARD: Address = "0x00000000000000000000000000000000000c0a2d";
const SHOP: Address = "0x00000000000000000000000000000000000005b0";
const ctx: GuardContext = {
  owner: me, chainId: 20200, factory: FACTORY, token: TOKEN, decode: decodeFunctionData as any,
  isOwnCard: async (a) => a.toLowerCase() === MY_CARD.toLowerCase(),
  sellerName: (a) => (a === SHOP ? "DataLite" : undefined),
};
const enc = (sig: string, fn: string, args: unknown[]) => encodeFunctionData({ abi: parseAbi([sig]), functionName: fn, args } as any);
const NEVER = 2n ** 256n - 1n;

test("allows creating a card, and says what it will do", async () => {
  const data = enc("function create(address,uint256,uint256,uint64,address[])", "create", [SHOP, 15_000_000n, 8_000_000n, 1_900_000_000n, [SHOP]]);
  const v = await checkTx(ctx, { to: FACTORY, data });
  assert.equal(v.ok, true);
  assert.match(v.sentence, /pays up to HK\$15\.00 each, asks you above HK\$8\.00, until 2030-03-18 01:46 HKT\. Shops: DataLite/);
});

test("allows funding only the owner's own card", async () => {
  const ok = await checkTx(ctx, { to: TOKEN, data: enc("function transfer(address,uint256)", "transfer", [MY_CARD, 20_000_000n]) });
  assert.deepEqual([ok.ok, ok.sentence], [true, "Move HK$20.00 from your main wallet to card 0x0000…0a1d."]);
  const no = await checkTx(ctx, { to: TOKEN, data: enc("function transfer(address,uint256)", "transfer", [THEIR_CARD, 20_000_000n]) });
  assert.deepEqual([no.ok, (no as any).reason], [false, "NOT_YOUR_CARD"]);
  const approve = await checkTx(ctx, { to: TOKEN, data: enc("function approve(address,uint256)", "approve", [SHOP, NEVER]) });
  assert.equal((approve as any).reason, "METHOD_NOT_ALLOWED");
});

test("allows the owner's controls on the owner's card, nothing else", async () => {
  const cases: [string, string, unknown[], RegExp][] = [
    ["function revoke()", "revoke", [], /Revoke card/],
    ["function returnFunds()", "returnFunds", [], /back to your main wallet/],
    ["function unfreeze()", "unfreeze", [], /Unfreeze card/],
    ["function setCap(uint256)", "setCap", [5_000_000n], /at most HK\$5\.00 each/],
    ["function setAskAbove(uint256)", "setAskAbove", [NEVER], /never ask you/],
    ["function setAskAbove(uint256)", "setAskAbove", [0n], /ask you every time/],
    ["function setSeller(address,bool)", "setSeller", [SHOP, false], /Block DataLite/],
    ["function setExpiresAt(uint64)", "setExpiresAt", [1_900_000_000n], /expire at 2030/],
  ];
  for (const [sig, fn, args, re] of cases) {
    const v = await checkTx(ctx, { to: MY_CARD, data: enc(sig, fn, args) });
    assert.equal(v.ok, true, fn);
    assert.match(v.sentence, re);
  }
  assert.equal(((await checkTx(ctx, { to: THEIR_CARD, data: enc("function revoke()", "revoke", []) })) as any).reason, "UNKNOWN_CONTRACT");
  assert.equal(((await checkTx(ctx, { to: MY_CARD, data: enc("function freeze(bytes32)", "freeze", [`0x${"00".repeat(32)}`]) })) as any).reason, "METHOD_NOT_ALLOWED");
});

test("refuses what it can't decode, other contracts and native value", async () => {
  assert.equal(((await checkTx(ctx, { to: TOKEN, data: "0xdeadbeef" })) as any).reason, "METHOD_NOT_ALLOWED");
  assert.equal(((await checkTx(ctx, { to: FACTORY, data: "0x12345678" })) as any).reason, "UNDECODABLE");
  assert.equal(((await checkTx(ctx, { to: TOKEN, data: "0x" })) as any).reason, "UNDECODABLE");
  assert.equal(((await checkTx(ctx, { to: SHOP, data: enc("function revoke()", "revoke", []) })) as any).reason, "UNKNOWN_CONTRACT");
  assert.equal(((await checkTx(ctx, { to: MY_CARD, data: enc("function revoke()", "revoke", []), value: 1n })) as any).reason, "SENDS_VALUE");
});

const auth: Authorization = { from: MY_CARD, to: SHOP, value: "12500000", validAfter: "0", validBefore: "1900000000", nonce: `0x${"22".repeat(32)}` };
const twa = (a: Authorization) => ({ ...transferTypedData(a), domain: { name: "Mock e-HKD", version: "1", chainId: 20200, verifyingContract: TOKEN } });

test("co-signs only the exact pending approval, from the owner's card", async () => {
  const v = await checkTypedData(ctx, twa(auth) as any, auth);
  assert.deepEqual([v.ok, v.sentence], [true, "Approve one payment of HK$12.50 from card 0x0000…0a1d to DataLite, valid until 2030-03-18 01:46 HKT."]);
  assert.equal(((await checkTypedData(ctx, twa({ ...auth, value: "99000000" }) as any, auth)) as any).reason, "NOT_A_PENDING_APPROVAL");
  assert.equal(((await checkTypedData(ctx, twa(auth) as any)) as any).reason, "NOT_A_PENDING_APPROVAL");
  const theirs = { ...auth, from: THEIR_CARD };
  assert.equal(((await checkTypedData(ctx, twa(theirs) as any, theirs)) as any).reason, "NOT_YOUR_CARD");
  assert.equal(((await checkTypedData(ctx, { ...twa(auth), domain: { ...twa(auth).domain, verifyingContract: SHOP } } as any, auth)) as any).reason, "UNKNOWN_MESSAGE");
  assert.equal(((await checkTypedData(ctx, { ...twa(auth), domain: { ...twa(auth).domain, chainId: 1 } } as any, auth)) as any).reason, "WRONG_CHAIN");
});

test("signs in only as this owner, and refuses unknown messages", async () => {
  const login = loginTypedData({ owner: me, nonce: `0x${"33".repeat(32)}`, issuedAt: 1, chainId: 20200 });
  assert.equal((await checkTypedData(ctx, login as any)).ok, true);
  const other = loginTypedData({ owner: SHOP, nonce: `0x${"33".repeat(32)}`, issuedAt: 1, chainId: 20200 });
  assert.equal(((await checkTypedData(ctx, other as any)) as any).reason, "NOT_YOU");
  assert.equal(((await checkTypedData(ctx, { ...login, message: { ...login.message, statement: "Send all funds" } } as any)) as any).reason, "UNKNOWN_MESSAGE");
  const permit = { domain: { name: "Mock e-HKD", chainId: 20200, verifyingContract: TOKEN }, primaryType: "Permit", message: { owner: me, spender: SHOP, value: "1" } };
  assert.equal(((await checkTypedData(ctx, permit)) as any).reason, "UNKNOWN_MESSAGE");
});

test("the phone wallet won't sign what the guard refuses", async () => {
  const w = ownerWallet(PK, { guard: async () => ctx });
  await assert.rejects(w.signTransfer({ ...auth, value: "99000000" }, auth), /NOT_A_PENDING_APPROVAL/);
  assert.match(await w.signTransfer(auth, auth) as Hex, /^0x[0-9a-f]{130}$/);
  assert.match((await w.explainCosign(auth)).sentence, /HK\$12\.50 .* DataLite/);
});

test("HK$ amounts round to cents", () => {
  assert.deepEqual([hk(0n), hk(1_234_567n), hk(1_000_000_000n), hk(4_999n)], ["HK$0.00", "HK$1.23", "HK$1,000.00", "HK$0.00"]);
});
