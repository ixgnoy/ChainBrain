import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createWalletClient, createPublicClient, http, publicActions, parseEventLogs, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { serve } from "@hono/node-server";
import { useDevKeys, DEV_KEYS } from "./env";

const SELLERS_PORT = 4521;
const repo = new URL("../../../", import.meta.url);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rpcUp = (rpc: string) =>
  fetch(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' }).then((r) => r.ok).catch(() => false);

/** The running local FISCO node (scripts/fisco/setup.sh, then start.sh). */
async function startChain(): Promise<{ rpc: string; stop: () => void }> {
  const rpc = process.env.FISCO_RPC ?? "http://127.0.0.1:8545";
  if (!(await rpcUp(rpc))) throw new Error(`no FISCO node at ${rpc}: run scripts/fisco/setup.sh (first time) or scripts/fisco/start.sh`);
  // FISCO's web3 RPC refuses senders with zero native balance: fund the dev senders once per chain.
  const pc = createPublicClient({ transport: http(rpc) });
  const senders = [DEV_KEYS.OWNER_PK, DEV_KEYS.FACILITATOR_PK, DEV_KEYS.FORCE_PK, DEV_KEYS.SENTINEL_PK].map((k) => privateKeyToAccount(k).address);
  const unfunded = [];
  for (const a of senders) if ((await pc.getBalance({ address: a })) === 0n) unfunded.push(a);
  if (unfunded.length) {
    try {
      execFileSync("bash", [new URL("scripts/fisco/fund.sh", repo).pathname, ...unfunded], { encoding: "utf8", stdio: "pipe" });
    } catch (e: any) {
      throw new Error(`fund.sh failed for ${unfunded.join(", ")}: ${(e.stdout ?? "") + (e.stderr ?? "")}`.trim());
    }
  }
  return { rpc, stop: () => {} };
}

/**
 * A local copy of the whole stack on the local FISCO node: a fresh Mock e-HKD and factory, x402's facilitator code
 * in-process, and the test sellers. Uses well-known public dev keys.
 */
export async function startStack() {
  useDevKeys();
  const chainProc = await startChain();
  Object.assign(process.env, { SELLERS_URL: `http://127.0.0.1:${SELLERS_PORT}` });

  const { cfg } = await import("../../src/chains");
  const { factoryArtifact, factoryAbi, pocketAbi, tokenBalance } = await import("../../src/wallet/chain");
  const owner = privateKeyToAccount(DEV_KEYS.OWNER_PK);
  const agent = privateKeyToAccount(DEV_KEYS.AGENT_PK);
  const ownerWallet = createWalletClient({ account: owner, chain: cfg().chain, transport: http(chainProc.rpc) }).extend(publicActions);
  const deploy = async (abi: any, bytecode: Hex, args: unknown[]) =>
    (await ownerWallet.waitForTransactionReceipt({ hash: await ownerWallet.deployContract({ abi, bytecode, args } as any) })).contractAddress!;

  {
    const t = JSON.parse(readFileSync(new URL("contracts/out/MockEHKD.sol/MockEHKD.json", repo), "utf8"));
    process.env.TOKEN_ADDRESS = await deploy(t.abi, t.bytecode.object, [owner.address]);
  }
  const token = cfg().token;
  // the Sentinel's freeze-only guardian key (startChain funded it)
  const sentinel = privateKeyToAccount(DEV_KEYS.SENTINEL_PK);
  process.env.FACTORY_ADDRESS = await deploy(factoryAbi, factoryArtifact.bytecode.object as Hex, [token, sentinel.address]);
  const factory = process.env.FACTORY_ADDRESS as Address;

  const { sellersApp, sellerPayTo } = await import("../../src/sellers");
  const sellersServer = serve({ fetch: sellersApp().fetch, port: SELLERS_PORT });
  const payTo = sellerPayTo();
  const atomic = (s: string) => BigInt(Math.round(Number(s) * 1e6));

  /** Mint `amount` eHKD to an address (OWNER is the Mock e-HKD's issuer). */
  async function fundToken(addr: Address, amount: bigint) {
    const mintAbi = [{ type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [] }] as const;
    await ownerWallet.waitForTransactionReceipt({ hash: await ownerWallet.writeContract({ address: token, abi: mintAbi, functionName: "mint", args: [addr, amount] }) });
  }

  async function ownerWrite(address: Address, functionName: string, args: unknown[] = []) {
    const hash = await ownerWallet.writeContract({ address, abi: pocketAbi, functionName, args } as any);
    return ownerWallet.waitForTransactionReceipt({ hash });
  }

  return {
    rpc: chainProc.rpc, factory, token, payTo, owner, agent,
    balance: (a: Address) => tokenBalance(a),
    fundToken,
    ownerWrite,
    /** Give an address native balance so it can send (FISCO refuses senders with none). */
    async gas(a: Address) {
      execFileSync("bash", [new URL("scripts/fisco/fund.sh", repo).pathname, a], { stdio: "pipe" });
    },
    /** Create through the factory as the owner, then fund it (budget = balance; new pockets start empty). */
    async newPocket(o: { cap: string; askAbove: string | "never"; sellers: string[]; budget: string; expiresIn?: number; agent?: Address }): Promise<Address> {
      const ask = o.askAbove === "never" ? 2n ** 256n - 1n : atomic(o.askAbove);
      const expiresAt = BigInt(Math.floor(Date.now() / 1000) + (o.expiresIn ?? 86_400));
      const hash = await ownerWallet.writeContract({ address: factory, abi: factoryAbi, functionName: "create", args: [o.agent ?? agent.address, atomic(o.cap), ask, expiresAt, o.sellers.map((s) => payTo[s])] } as any);
      const rc = await ownerWallet.waitForTransactionReceipt({ hash });
      const [ev] = parseEventLogs({ abi: factoryAbi, logs: rc.logs, eventName: "PocketCreated" }) as any[];
      await fundToken(ev.args.pocket, atomic(o.budget));
      return ev.args.pocket as Address;
    },
    ownerSignTransfer: async (auth: any) => {
      const { transferTypedData } = await import("../../src/wallet/scheme");
      return owner.signTypedData(transferTypedData(auth));
    },
    async stop() {
      await new Promise<void>((r) => sellersServer.close(() => r()));
      chainProc.stop();
    },
  };
}
