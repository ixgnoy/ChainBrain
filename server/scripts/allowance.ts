// The period allowance on the live chain (FISCO): the pocket, not the server, holds "at most HK$3.00 a week".
//   1) owner creates + funds a pocket (cap 15, never asks) and sets a weekly allowance of HK$3.00   → must settle
//   2) DataLite durian report (HK$2.30) with the agent key alone                                  → must settle (Spent)
//   3) a second report, agent key alone, submitted straight to the token (no server in the way)   → must revert
//   4) the same second report with the owner's co-signature (the cheque)                          → must settle (Spent)
// Prints tx hashes for the evidence file. Requires: factory deployed, OWNER and FORCE funded.
import "dotenv/config";
import { serve } from "@hono/node-server";
import { createWalletClient, http, publicActions, parseEventLogs, keccak256, toHex, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { randomBytes } from "node:crypto";
import { cfg } from "../src/chains";
import { record } from "./evidence";
import { sellersApp, sellerPayTo } from "../src/sellers";
import { factoryAbi, factoryAddress, erc20Abi, pocketAbi } from "../src/wallet/chain";
import { parseAmount } from "../src/wallet/money";

const remote = process.env.SPIKE_SELLERS_URL;
process.env.SELLERS_URL = remote ?? "http://127.0.0.1:4599";
const server = remote ? undefined : serve({ fetch: sellersApp().fetch, port: 4599 });
const { fetchQuote, track, settle, prepareApproval, agentAccount } = await import("../src/wallet/pay");
const { buildAuthorization, transferTypedData, envelope } = await import("../src/wallet/scheme");

const owner = privateKeyToAccount(process.env.OWNER_PK as Hex);
const w = createWalletClient({ account: owner, chain: cfg().chain, transport: http(cfg().rpc) }).extend(publicActions);
const force = createWalletClient({ account: privateKeyToAccount(process.env.FORCE_PK as Hex), chain: cfg().chain, transport: http(cfg().rpc) }).extend(publicActions);
const payTo = sellerPayTo();
const send = async (address: Address, abi: any, functionName: string, args: unknown[]) => {
  const hash = await w.writeContract({ address, abi, functionName, args } as any);
  const rc = await w.waitForTransactionReceipt({ hash });
  if (rc.status !== "success") throw new Error(`${functionName} reverted: ${hash}`);
  return { hash, rc };
};

const NEVER = 2n ** 256n - 1n;
const created = await send(factoryAddress(), factoryAbi, "create", [agentAccount().address, parseAmount("15"), NEVER, BigInt(Math.floor(Date.now() / 1000) + 86_400), [payTo.datalite]]);
const pocket = (parseEventLogs({ abi: factoryAbi, logs: created.rc.logs, eventName: "PocketCreated" }) as any[])[0].args.pocket as Address;
const funded = await send(cfg().token, erc20Abi, "transfer", [pocket, parseAmount("10")]);
const limit = await send(pocket, pocketAbi, "setPeriodLimit", [2, parseAmount("3.00")]);
console.log("pocket", pocket);
record("allowance: create pocket (DataLite only, never asks)", created.hash, "success", "PocketCreated(address,address,address)", factoryAddress());
record("allowance: fund pocket HK$10", funded.hash, "success", "Transfer(address,address,uint256)", cfg().token);
record("allowance: owner sets at most HK$3.00 a week (Hong Kong time)", limit.hash, "success", "RulesChanged()", pocket);

const intentHash = keccak256(toHex(`allowance-${Date.now()}`));
const q1 = await fetchQuote("datalite", "durian-report");
if (q1.kind !== "priced") throw new Error("expected 402");
const r1 = await settle(pocket, track(pocket, q1.quote), intentHash);
console.log("first report, agent alone →", r1);
if (r1.ok) record("allowance: first report HK$2.30, agent key alone (counted on-chain)", r1.tx, "success", "Spent(address,uint256,uint256)", pocket);

// the second report: a compromised agent key goes straight to the token, past any server check
const q2 = await fetchQuote("datalite", "durian-report");
if (q2.kind !== "priced") throw new Error("expected 402");
const value = BigInt(q2.quote.amount);
const auth = buildAuthorization(pocket, payTo.datalite as Address, value, `0x${randomBytes(32).toString("hex")}`, 0n);
const forced = await force.writeContract({
  address: cfg().token,
  abi: [{ type: "function", name: "transferWithAuthorization", stateMutability: "nonpayable",
    inputs: [{ type: "address" }, { type: "address" }, { type: "uint256" }, { type: "uint256" }, { type: "uint256" }, { type: "bytes32" }, { type: "bytes" }], outputs: [] }],
  functionName: "transferWithAuthorization",
  args: [auth.from, auth.to, BigInt(auth.value), 0n, BigInt(auth.validBefore), auth.nonce, envelope(auth, await agentAccount().signTypedData(transferTypedData(auth)), "0x")],
  gas: 300_000n, // explicit gas skips estimateGas, so the revert lands on-chain as evidence
});
const frc = await force.waitForTransactionReceipt({ hash: forced });
console.log(frc.status === "reverted" ? `second report, agent alone: REVERTED (expected) ${forced}` : `!!! SUCCEEDED ${forced}`);
record("allowance: second report, agent key alone straight to the token: over the week's allowance", forced, "reverted", undefined, cfg().token);

const rec = track(pocket, q2.quote);
rec.ownerSig = await owner.signTypedData(transferTypedData(prepareApproval(pocket, rec, intentHash)));
const r2 = await settle(pocket, rec, intentHash);
console.log("second report, owner co-signed →", r2);
if (r2.ok) record("allowance: second report with the owner's co-signature (the cheque)", r2.tx, "success", "Spent(address,uint256,uint256)", pocket);

server?.close();
process.exit(r1.ok && r2.ok && frc.status === "reverted" ? 0 : 1);
