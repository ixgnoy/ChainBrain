// Runs before the wallet API on Railway: makes the chain usable, idempotently.
//   1. waits for the node, 2. funds OWNER / FACILITATOR / FORCE (and SENTINEL, if set) through the node gateway's /admin/fund (FUND_URL + FUND_TOKEN),
//   3. on an empty chain deploys MockEHKD + PocketFactory from OWNER and mints HK$10,000 to OWNER.
// Same keys + fresh chain = the committed addresses in contracts/deployments/20200.json; anything else is an error.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, http, publicActions, zeroAddress, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { fiscoChain } from "../src/chains";
import { fundIfEmpty } from "../src/fund";

const rpc = process.env.FISCO_RPC ?? "http://127.0.0.1:8545";
const root = new URL("../../contracts/", import.meta.url);
const art = (n: string) => JSON.parse(readFileSync(new URL(`out/${n}.sol/${n}.json`, root), "utf8"));
const want = JSON.parse(readFileSync(new URL("deployments/20200.json", root), "utf8")) as { Token: Address; PocketFactory: Address };
const pc = createPublicClient({ chain: fiscoChain, transport: http(rpc) });

async function main() {
  for (let i = 0; ; i++) {
    if (await pc.getChainId().then((id) => id === 20200).catch(() => false)) break;
    if (i > 120) throw new Error(`no FISCO node at ${rpc}`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  const owner = privateKeyToAccount(process.env.OWNER_PK as Hex);
  const senders = ["OWNER_PK", "FACILITATOR_PK", "FORCE_PK", "SENTINEL_PK"].filter((k) => process.env[k]);
  const funded = await fundIfEmpty(pc as any, senders.map((k) => privateKeyToAccount(process.env[k] as Hex).address));
  if (funded.length) console.log("funded", funded.join(", "));

  if ((await pc.getCode({ address: want.Token }))?.length && (await pc.getCode({ address: want.PocketFactory }))?.length) {
    console.log("contracts present:", want);
    return;
  }
  if ((await pc.getTransactionCount({ address: owner.address })) !== 0)
    throw new Error(`no contracts at ${want.Token} / ${want.PocketFactory} but OWNER has sent txs: this chain does not match deployments/20200.json`);
  const w = createWalletClient({ account: owner, chain: fiscoChain, transport: http(rpc) }).extend(publicActions);
  // one tx at a time: FISCO does not order a sender's txs by nonce inside a block
  const deploy = async (n: string, args: unknown[]) =>
    (await w.waitForTransactionReceipt({ hash: await w.deployContract({ abi: art(n).abi, bytecode: art(n).bytecode.object, args } as any) })).contractAddress!;
  const token = await deploy("MockEHKD", [owner.address]);
  const guardian = process.env.SENTINEL_PK ? privateKeyToAccount(process.env.SENTINEL_PK as Hex).address : zeroAddress; // the Sentinel, if any
  const factory = await deploy("PocketFactory", [token, guardian]);
  const mint = await w.writeContract({ address: token, abi: art("MockEHKD").abi, functionName: "mint", args: [owner.address, 10_000_000_000n] } as any);
  if ((await w.waitForTransactionReceipt({ hash: mint })).status !== "success") throw new Error(`mint reverted: ${mint}`);
  if (token.toLowerCase() !== want.Token.toLowerCase() || factory.toLowerCase() !== want.PocketFactory.toLowerCase())
    throw new Error(`deployed ${token} / ${factory}, expected ${want.Token} / ${want.PocketFactory}`);
  console.log("deployed MockEHKD", token, "PocketFactory", factory, "minted HK$10,000 to OWNER");
}

if (process.argv[1] === new URL(import.meta.url).pathname) await main();
