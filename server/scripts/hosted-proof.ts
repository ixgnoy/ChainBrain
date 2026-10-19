// Proof run for the red-team report on the hosted FISCO chain, with the exact contracts in contracts/out (a fresh
// Mock e-HKD, factory and card, deployed from a fresh key funded by the faucet). Two payments that should settle, then
// attempts the card must refuse, each sent with fixed gas so the refusal is mined as a reverted transaction.
//   FISCO_RPC=https://fisco-node-production.up.railway.app API=https://fisco-api-production-85c5.up.railway.app \
//     OUT=../docs/submission/redteam/hosted-proof.json pnpm tsx scripts/hosted-proof.ts
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createPublicClient, createWalletClient, defineChain, hexToString, http, parseEventLogs, toHex, type Address, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { buildAuthorization, envelope, transferTypedData } from "../src/wallet/scheme";

const RPC = process.env.FISCO_RPC ?? "https://fisco-node-production.up.railway.app";
const API = (process.env.API ?? "https://fisco-api-production-85c5.up.railway.app").replace(/\/+$/, "");
const OUT = process.env.OUT ?? "../docs/submission/redteam/hosted-proof.json";
const ATTACKER: Address = "0x000000000000000000000000000000000000ABC0";
const artifact = (n: string) => JSON.parse(readFileSync(new URL(`../../contracts/out/${n}.sol/${n}.json`, import.meta.url), "utf8"));
const atom = (s: string) => BigInt(Math.round(Number(s) * 1e6));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const chain = defineChain({ id: 20200, name: "FISCO BCOS", nativeCurrency: { name: "FISCO", symbol: "FISCO", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } });
const pub = createPublicClient({ chain, transport: http(RPC) });
const owner = privateKeyToAccount(generatePrivateKey());
const agent = privateKeyToAccount(generatePrivateKey());
const opts = { type: "legacy", gasPrice: 0n } as const;
const wallet = (a: typeof owner) => createWalletClient({ account: a, chain, transport: http(RPC) });

async function faucet(a: Address) {
  const r = await fetch(`${API}/api/faucet`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address: a }) });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`faucet ${a}: ${r.status} ${JSON.stringify(j)}`);
  for (let i = 0; i < 30 && (await pub.getBalance({ address: a })) === 0n; i++) await sleep(1000);
}

const sellers = (await (await fetch(`${API}/api/config`)).json() as any).sellers as { id: string; payTo: Address }[];
const payTo = Object.fromEntries(sellers.map((s) => [s.id, s.payTo])) as Record<string, Address>;
console.log(`owner ${owner.address}, agent ${agent.address} on ${RPC}`);
await faucet(owner.address);
await faucet(agent.address);

const ow = wallet(owner);
const deploy = async (name: string, args: unknown[]) => {
  const a = artifact(name);
  const rc = await pub.waitForTransactionReceipt({ hash: await ow.deployContract({ abi: a.abi, bytecode: a.bytecode.object, args, ...opts } as any) });
  return { address: rc.contractAddress!, tx: rc.transactionHash };
};
const send = async (address: Address, abi: any, functionName: string, args: unknown[], from = ow) =>
  pub.waitForTransactionReceipt({ hash: await from.writeContract({ address, abi, functionName, args, gas: 300_000n, ...opts } as any) });

const steps: { step: string; expect: "success" | "reverted"; tx: Hex; status: string; reason?: string }[] = [];
const log = (step: string, expect: "success" | "reverted", rc: { transactionHash: Hex; status: string }, reason?: string) => {
  steps.push({ step, expect, tx: rc.transactionHash, status: rc.status, ...(reason ? { reason } : {}) });
  console.log(`${rc.status === expect ? "ok  " : "MISS"} ${expect.padEnd(8)} ${rc.transactionHash} ${step}${reason ? ` (${reason})` : ""}`);
};

const token = await deploy("MockEHKD", [owner.address]);
const factory = await deploy("PocketFactory", [token.address, "0x0000000000000000000000000000000000000000"]);
process.env.TOKEN_ADDRESS = token.address; // scheme.ts reads the token through cfg()
const ehkd = artifact("MockEHKD").abi, pocketAbi = artifact("Pocket").abi, factoryAbi = artifact("PocketFactory").abi;
log("deploy Mock e-HKD", "success", { transactionHash: token.tx, status: "success" });
log("deploy PocketFactory", "success", { transactionHash: factory.tx, status: "success" });
log("mint HK$50 to the owner", "success", await send(token.address, ehkd, "mint", [owner.address, atom("50")]));

const expires = BigInt(Math.floor(Date.now() / 1000) + 7 * 86_400);
const created = await send(factory.address, factoryAbi, "create", [agent.address, atom("15"), atom("8"), expires, [payTo.datalite, payTo.datapro]]);
const card = (parseEventLogs({ abi: factoryAbi, logs: created.logs, eventName: "PocketCreated" }) as any[])[0].args.pocket as Address;
log("owner creates the card (cap HK$15, owner co-signs above HK$8, DataLite and DataPro only)", "success", created);
log("owner funds the card with HK$40", "success", await send(token.address, ehkd, "transfer", [card, atom("40")]));

const domain = { name: "Mock e-HKD", version: "1", chainId: 20200, verifyingContract: token.address };
const typed = (a: any) => ({ ...transferTypedData(a), domain });
const canPay = async (to: Address, v: bigint) => hexToString((await pub.readContract({ address: card, abi: pocketAbi, functionName: "canPay", args: [to, v] })) as Hex, { size: 32 }).replace(/\0+$/, "");
const TWA = [{ type: "function", name: "transferWithAuthorization", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "address" }, { type: "uint256" }, { type: "uint256" }, { type: "uint256" }, { type: "bytes32" }, { type: "bytes" }], outputs: [] }];
let seq = 0n;
async function pay(step: string, expect: "success" | "reverted", to: Address, amount: string, o: { ownerSigns?: boolean; agentAsOwner?: boolean; reuse?: any } = {}) {
  const auth = o.reuse ?? buildAuthorization(card, to, atom(amount), toHex(crypto.getRandomValues(new Uint8Array(32))), seq++);
  const agentSig = await agent.signTypedData(typed(auth) as any);
  const ownerSig = o.ownerSigns ? await owner.signTypedData(typed(auth) as any) : o.agentAsOwner ? agentSig : "0x";
  const reason = expect === "reverted" && !o.reuse ? await canPay(to, atom(amount)) : undefined;
  const rc = await send(token.address, TWA, "transferWithAuthorization", [auth.from, auth.to, BigInt(auth.value), BigInt(auth.validAfter), BigInt(auth.validBefore), auth.nonce, envelope(auth, agentSig, ownerSig as Hex)]);
  log(step, expect, rc, reason === "OK" ? (o.agentAsOwner ? "agent key in the owner's place" : "NEEDS_OWNER_SIGNATURE") : reason);
  return auth;
}

const paid = await pay("the agent key pays DataLite HK$2.30 (inside the rules)", "success", payTo.datalite, "2.30");
await pay("DataPro HK$11.70, above HK$8, with the owner's co-signature", "success", payTo.datapro, "11.70", { ownerSigns: true });
await pay("the agent key sends HK$5 to an address a seller planted (not on the card)", "reverted", ATTACKER, "5");
await pay("the agent key pays DataPro HK$11.70 without the owner", "reverted", payTo.datapro, "11.70");
await pay("the agent key signs as the owner too", "reverted", payTo.datapro, "11.70", { agentAsOwner: true });
await pay("the agent key pays DataLite HK$20, above the HK$15 cap", "reverted", payTo.datalite, "20");
await pay("the same DataLite authorisation submitted again (replay)", "reverted", payTo.datalite, "2.30", { reuse: paid });
const aw = wallet(agent);
log("the agent key tries to raise the cap to HK$800", "reverted", await send(card, pocketAbi, "setCap", [atom("800")], aw), "NOT_OWNER");
log("the agent key tries to add the planted address as a seller", "reverted", await send(card, pocketAbi, "setSeller", [ATTACKER, true], aw), "NOT_OWNER");

const balance = (await pub.readContract({ address: token.address, abi: ehkd, functionName: "balanceOf", args: [card] })) as bigint;
const cap = (await pub.readContract({ address: card, abi: pocketAbi, functionName: "perPaymentCap" })) as bigint;
const out = {
  chain: "FISCO BCOS, hosted (chain id 20200)", rpc: RPC, explorer: `${API}/explorer#/tx/`, at: new Date().toISOString(),
  owner: owner.address, agent: agent.address, token: token.address, factory: factory.address, card,
  cardBalance: (Number(balance) / 1e6).toFixed(2), cardCap: (Number(cap) / 1e6).toFixed(2), expectedBalance: "26.00", steps,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2));
const misses = steps.filter((s) => s.status !== s.expect).length;
console.log(`card balance HK$${out.cardBalance} (expected 26.00), cap HK$${out.cardCap}; ${misses} misses; wrote ${OUT}`);
process.exit(misses || out.cardBalance !== "26.00" ? 1 : 0);
