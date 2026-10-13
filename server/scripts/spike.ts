// Day-1 gate on the LIVE chain: create + fund a pocket from OWNER, then pay twice through the hosted facilitator.
//   1) US$0.30 with the agent key alone      → must settle
//   2) US$1.50 above ask-me, owner co-signs  → must settle
// Prints tx hashes for docs/evidence.md. Requires: Deploy.s.sol done, OWNER funded with ETH + ≥2 USDC.
import "dotenv/config";
import { serve } from "@hono/node-server";
import { createWalletClient, http, publicActions, parseEventLogs, keccak256, toHex, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { sellersApp, sellerPayTo } from "../src/sellers";
import { factoryAbi, factoryAddress, erc20Abi, USDC, usdcBalance } from "../src/wallet/chain";

process.env.SELLERS_URL = "http://127.0.0.1:4599";
const server = serve({ fetch: sellersApp().fetch, port: 4599 });
const { fetchQuote, track, settle, prepareApproval, agentAccount } = await import("../src/wallet/pay");
const { transferTypedData } = await import("../src/wallet/scheme");

const owner = privateKeyToAccount(process.env.OWNER_PK as Hex);
const w = createWalletClient({ account: owner, chain: baseSepolia, transport: http(process.env.BASE_SEPOLIA_RPC) }).extend(publicActions);
const payTo = sellerPayTo();

const create = await w.writeContract({
  address: factoryAddress(), abi: factoryAbi, functionName: "create",
  args: [agentAccount().address, 2_000_000n, 1_000_000n, BigInt(Math.floor(Date.now() / 1000) + 86_400), [payTo.datalite, payTo.datapro]],
} as any);
const [ev] = parseEventLogs({ abi: factoryAbi, logs: (await w.waitForTransactionReceipt({ hash: create })).logs, eventName: "PocketCreated" }) as any[];
const pocket = ev.args.pocket;
const fund = await w.writeContract({ address: USDC, abi: erc20Abi, functionName: "transfer", args: [pocket, 2_000_000n] });
await w.waitForTransactionReceipt({ hash: fund });
console.log("pocket", pocket, "\n create", create, "\n fund  ", fund);

const intentHash = keccak256(toHex(`spike-${Date.now()}`));
const q1 = await fetchQuote("datalite", "durian-report");
if (q1.kind !== "priced") throw new Error("expected 402");
const r1 = await settle(pocket, track(pocket, q1.quote), intentHash);
console.log("0.30 agent-only    →", r1);

const q2 = await fetchQuote("datapro", "premium-report");
if (q2.kind !== "priced") throw new Error("expected 402");
const rec = track(pocket, q2.quote);
rec.ownerSig = await owner.signTypedData(transferTypedData(prepareApproval(pocket, rec, intentHash)));
const r2 = await settle(pocket, rec, intentHash);
console.log("1.50 owner co-sign →", r2);
console.log("pocket balance", await usdcBalance(pocket));
server.close();
process.exit(r1.ok && r2.ok ? 0 : 1);
