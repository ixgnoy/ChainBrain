import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { createWalletClient, createPublicClient, http, publicActions, parseEventLogs, keccak256, encodeAbiParameters, toHex, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { serve } from "@hono/node-server";
import { useDevKeys, DEV_KEYS } from "./env";

const ANVIL_PORT = 8546;
const SELLERS_PORT = 4521;
const USDC_BALANCE_SLOT = 9n; // FiatTokenV2_2 balanceAndBlacklistStates mapping (verified on Base Sepolia, 14 Oct)
const repo = new URL("../../../", import.meta.url);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rpcUp = (rpc: string) =>
  fetch(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' }).then((r) => r.ok).catch(() => false);

/** CHAIN=base-sepolia: anvil fork of Base Sepolia (real USDC v2.2). Otherwise the running local FISCO node. */
async function startChain(): Promise<{ rpc: string; stop: () => void }> {
  if (process.env.CHAIN === "base-sepolia") {
    const anvil: ChildProcess = spawn("anvil", ["--fork-url", process.env.FORK_URL ?? "https://sepolia.base.org", "--port", String(ANVIL_PORT), "--chain-id", "84532", "--silent"], { stdio: "ignore" });
    const rpc = `http://127.0.0.1:${ANVIL_PORT}`;
    for (let i = 0; !(await rpcUp(rpc)); i++) {
      if (i > 100) throw new Error("anvil did not start (is Foundry installed and on PATH?)");
      await sleep(200);
    }
    process.env.BASE_SEPOLIA_RPC = rpc;
    return { rpc, stop: () => anvil.kill() };
  }
  if (process.env.CHAIN && process.env.CHAIN !== "fisco") throw new Error(`unknown CHAIN ${process.env.CHAIN} (fisco | base-sepolia)`);
  process.env.CHAIN = "fisco";
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
 * A local copy of the whole stack: the chain (Base fork or local FISCO), a fresh factory (and fresh Mock e-HKD on
 * FISCO), x402's facilitator code in-process, and the test sellers. Uses anvil's public dev keys.
 */
export async function startStack() {
  useDevKeys();
  const chainProc = await startChain();
  Object.assign(process.env, { FACILITATOR: "local", SELLERS_URL: `http://127.0.0.1:${SELLERS_PORT}` });

  const { cfg } = await import("../../src/chains");
  const { factoryArtifact, factoryAbi, pocketAbi, tokenBalance } = await import("../../src/wallet/chain");
  const owner = privateKeyToAccount(DEV_KEYS.OWNER_PK);
  const agent = privateKeyToAccount(DEV_KEYS.AGENT_PK);
  const ownerWallet = createWalletClient({ account: owner, chain: cfg().chain, transport: http(chainProc.rpc) }).extend(publicActions);
  const deploy = async (abi: any, bytecode: Hex, args: unknown[]) =>
    (await ownerWallet.waitForTransactionReceipt({ hash: await ownerWallet.deployContract({ abi, bytecode, args } as any) })).contractAddress!;

  const fisco = cfg().key === "fisco";
  if (fisco) {
    const t = JSON.parse(readFileSync(new URL("contracts/out/MockEHKD.sol/MockEHKD.json", repo), "utf8"));
    process.env.TOKEN_ADDRESS = await deploy(t.abi, t.bytecode.object, [owner.address]);
  }
  const token = cfg().token;
  // the Sentinel's freeze-only guardian key (anvil dev key #8); on FISCO startChain funded it
  const sentinel = privateKeyToAccount(DEV_KEYS.SENTINEL_PK);
  if (!fisco) await ownerWallet.request({ method: "anvil_setBalance" as any, params: [sentinel.address, toHex(10n ** 18n)] as any });
  process.env.FACTORY_ADDRESS = await deploy(factoryAbi, factoryArtifact.bytecode.object as Hex, [token, sentinel.address]);
  const factory = process.env.FACTORY_ADDRESS as Address;

  const { sellersApp, sellerPayTo } = await import("../../src/sellers");
  const sellersServer = serve({ fetch: sellersApp().fetch, port: SELLERS_PORT });
  const payTo = sellerPayTo();
  const atomic = (s: string) => BigInt(Math.round(Number(s) * 1e6));

  /** Fund a new address: FISCO mints `amount` to it (adds); the fork writes its USDC balance slot (sets to `amount`). Same result for fresh pockets. */
  async function fundToken(addr: Address, amount: bigint) {
    if (fisco) {
      const mintAbi = [{ type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [] }] as const;
      await ownerWallet.waitForTransactionReceipt({ hash: await ownerWallet.writeContract({ address: token, abi: mintAbi, functionName: "mint", args: [addr, amount] }) });
      return;
    }
    const slot = keccak256(encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [addr, USDC_BALANCE_SLOT]));
    await ownerWallet.request({ method: "anvil_setStorageAt" as any, params: [token, slot, toHex(amount, { size: 32 })] as any });
  }

  async function ownerWrite(address: Address, functionName: string, args: unknown[] = []) {
    const hash = await ownerWallet.writeContract({ address, abi: pocketAbi, functionName, args } as any);
    return ownerWallet.waitForTransactionReceipt({ hash });
  }

  return {
    rpc: chainProc.rpc, factory, token, payTo, owner, agent,
    balance: (a: Address) => tokenBalance(a),
    usdcBalance: (a: Address) => tokenBalance(a), // name kept for the *-fork tests
    setUsdc: fundToken,
    ownerWrite,
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
