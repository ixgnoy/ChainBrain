// Day-1 gate on the live chain (CHAIN=fisco | base-sepolia): create + fund the research pocket from OWNER, then pay twice.
//   1) DataLite durian report with the agent key alone       → must settle
//   2) DataPro premium report above ask-me, owner co-signs   → must settle
// Prints tx hashes for the evidence file. Requires: factory deployed, OWNER funded (gas + token).
import "dotenv/config";
import { serve } from "@hono/node-server";
import { createWalletClient, http, publicActions, parseEventLogs, keccak256, toHex, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { cfg, presets } from "../src/chains";
import { record } from "./evidence";
import { sellersApp, sellerPayTo } from "../src/sellers";
import { factoryAbi, factoryAddress, erc20Abi, tokenBalance } from "../src/wallet/chain";

process.env.SELLERS_URL = "http://127.0.0.1:4599";
const server = serve({ fetch: sellersApp().fetch, port: 4599 });
const { fetchQuote, track, settle, prepareApproval, agentAccount } = await import("../src/wallet/pay");
const { transferTypedData } = await import("../src/wallet/scheme");

const owner = privateKeyToAccount(process.env.OWNER_PK as Hex);
const w = createWalletClient({ account: owner, chain: cfg().chain, transport: http(cfg().rpc) }).extend(publicActions);
const payTo = sellerPayTo();
const p = presets().research;

const create = await w.writeContract({
  address: factoryAddress(), abi: factoryAbi, functionName: "create",
  args: [agentAccount().address, p.cap, p.askAbove, BigInt(Math.floor(Date.now() / 1000) + 86_400), [payTo.datalite, payTo.datapro]],
} as any);
const [ev] = parseEventLogs({ abi: factoryAbi, logs: (await w.waitForTransactionReceipt({ hash: create })).logs, eventName: "PocketCreated" }) as any[];
const pocket = ev.args.pocket;
const fund = await w.writeContract({ address: cfg().token, abi: erc20Abi, functionName: "transfer", args: [pocket, p.budget] });
await w.waitForTransactionReceipt({ hash: fund });
console.log("pocket", pocket, "\n create", create, "\n fund  ", fund);
record("spike: create research pocket", create, "success", "PocketCreated(address,address,address)");
record("spike: fund research pocket", fund, "success", "Transfer(address,address,uint256)");

const intentHash = keccak256(toHex(`spike-${Date.now()}`));
const q1 = await fetchQuote("datalite", "durian-report");
if (q1.kind !== "priced") throw new Error("expected 402");
const r1 = await settle(pocket, track(pocket, q1.quote), intentHash);
console.log("agent-only    →", r1);
if (r1.ok) record("spike: DataLite paid by the agent key alone (x402, EIP-3009 + ERC-1271)", r1.tx, "success", "AuthorizationUsed(address,bytes32)");

const q2 = await fetchQuote("datapro", "premium-report");
if (q2.kind !== "priced") throw new Error("expected 402");
const rec = track(pocket, q2.quote);
rec.ownerSig = await owner.signTypedData(transferTypedData(prepareApproval(pocket, rec, intentHash)));
const r2 = await settle(pocket, rec, intentHash);
console.log("owner co-sign →", r2);
if (r2.ok) record("spike: DataPro above ask-me, owner co-signed", r2.tx, "success", "AuthorizationUsed(address,bytes32)");
console.log("pocket balance", await tokenBalance(pocket));
server.close();
process.exit(r1.ok && r2.ok ? 0 : 1);
