import { spawn, type ChildProcess } from "node:child_process";
import { createWalletClient, http, publicActions, parseEventLogs, keccak256, encodeAbiParameters, toHex, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { serve } from "@hono/node-server";
import { useDevKeys, DEV_KEYS } from "./env";

const ANVIL_PORT = 8546;
const SELLERS_PORT = 4521;
const USDC: Address = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const USDC_BALANCE_SLOT = 9n; // FiatTokenV2_2 balanceAndBlacklistStates mapping (verified on Base Sepolia, 14 Oct)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * A local copy of the whole stack: anvil fork of Base Sepolia (real USDC v2.2), the factory, x402's facilitator
 * code in-process, and the test sellers. Uses anvil's public dev keys.
 */
export async function startStack() {
  const forkUrl = process.env.FORK_URL ?? "https://sepolia.base.org";
  const anvil: ChildProcess = spawn("anvil", ["--fork-url", forkUrl, "--port", String(ANVIL_PORT), "--chain-id", "84532", "--silent"], { stdio: "ignore" });
  const rpc = `http://127.0.0.1:${ANVIL_PORT}`;
  for (let i = 0; ; i++) {
    const ok = await fetch(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' }).then((r) => r.ok).catch(() => false);
    if (ok) break;
    if (i > 100) throw new Error("anvil did not start (is Foundry installed and on PATH?)");
    await sleep(200);
  }

  useDevKeys();
  Object.assign(process.env, { BASE_SEPOLIA_RPC: rpc, FACILITATOR: "local", SELLERS_URL: `http://127.0.0.1:${SELLERS_PORT}` });

  const { factoryArtifact, factoryAbi, pocketAbi, usdcBalance } = await import("../../src/wallet/chain");
  const owner = privateKeyToAccount(DEV_KEYS.OWNER_PK);
  const agent = privateKeyToAccount(DEV_KEYS.AGENT_PK);
  const ownerWallet = createWalletClient({ account: owner, chain: baseSepolia, transport: http(rpc) }).extend(publicActions);

  const deployHash = await ownerWallet.deployContract({ abi: factoryAbi, bytecode: factoryArtifact.bytecode.object as Hex, args: [USDC] });
  const factory = (await ownerWallet.waitForTransactionReceipt({ hash: deployHash })).contractAddress!;
  process.env.FACTORY_ADDRESS = factory;

  const { sellersApp, sellerPayTo } = await import("../../src/sellers");
  const sellersServer = serve({ fetch: sellersApp().fetch, port: SELLERS_PORT });
  const payTo = sellerPayTo();
  const usd = (s: string) => BigInt(Math.round(Number(s) * 1e6));

  async function setUsdc(addr: Address, amount: bigint) {
    const slot = keccak256(encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [addr, USDC_BALANCE_SLOT]));
    await ownerWallet.request({ method: "anvil_setStorageAt" as any, params: [USDC, slot, toHex(amount, { size: 32 })] as any });
  }

  async function ownerWrite(address: Address, functionName: string, args: unknown[] = []) {
    const hash = await ownerWallet.writeContract({ address, abi: pocketAbi, functionName, args } as any);
    return ownerWallet.waitForTransactionReceipt({ hash });
  }

  return {
    rpc, factory, payTo, owner, agent,
    usdcBalance: (a: Address) => usdcBalance(a),
    setUsdc,
    ownerWrite,
    /** Create through the factory as the owner, then fund it (budget = balance). */
    async newPocket(o: { cap: string; askAbove: string | "never"; sellers: string[]; budget: string; expiresIn?: number; agent?: Address }): Promise<Address> {
      const ask = o.askAbove === "never" ? 2n ** 256n - 1n : usd(o.askAbove);
      const expiresAt = BigInt(Math.floor(Date.now() / 1000) + (o.expiresIn ?? 86_400));
      const hash = await ownerWallet.writeContract({ address: factory, abi: factoryAbi, functionName: "create", args: [o.agent ?? agent.address, usd(o.cap), ask, expiresAt, o.sellers.map((s) => payTo[s])] } as any);
      const rc = await ownerWallet.waitForTransactionReceipt({ hash });
      const [ev] = parseEventLogs({ abi: factoryAbi, logs: rc.logs, eventName: "PocketCreated" }) as any[];
      await setUsdc(ev.args.pocket, usd(o.budget));
      return ev.args.pocket as Address;
    },
    ownerSignTransfer: async (auth: any) => {
      const { transferTypedData } = await import("../../src/wallet/scheme");
      return owner.signTypedData(transferTypedData(auth));
    },
    async stop() {
      await new Promise<void>((r) => sellersServer.close(() => r()));
      anvil.kill();
    },
  };
}
