import { createPublicClient, http, hexToString, type Address, type PublicClient } from "viem";
import { baseSepolia } from "viem/chains";
import { readFileSync, existsSync } from "node:fs";

const root = new URL("../../../contracts/", import.meta.url);
const artifact = (name: string) => JSON.parse(readFileSync(new URL(`out/${name}.sol/${name}.json`, root), "utf8"));

export const USDC: Address = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
export const pocketArtifact = artifact("Pocket");
export const factoryArtifact = artifact("PocketFactory");
export const pocketAbi = pocketArtifact.abi;
export const factoryAbi = factoryArtifact.abi;
export const erc20Abi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] },
] as const;

/** FACTORY_ADDRESS (tests, overrides) or contracts/deployments/84532.json (written by Deploy.s.sol). */
export function factoryAddress(): Address {
  if (process.env.FACTORY_ADDRESS) return process.env.FACTORY_ADDRESS as Address;
  const f = new URL("deployments/84532.json", root);
  if (!existsSync(f)) throw new Error("No factory: run contracts/script/Deploy.s.sol or set FACTORY_ADDRESS");
  return JSON.parse(readFileSync(f, "utf8")).PocketFactory;
}

const clients = new Map<string, PublicClient>();
export function pub(): PublicClient {
  const rpc = process.env.BASE_SEPOLIA_RPC ?? "https://sepolia.base.org";
  if (!clients.has(rpc)) clients.set(rpc, createPublicClient({ chain: baseSepolia, transport: http(rpc) }) as PublicClient);
  return clients.get(rpc)!;
}

export const usdcBalance = (a: Address) => pub().readContract({ address: USDC, abi: erc20Abi, functionName: "balanceOf", args: [a] });

export type PocketInfo = { address: Address; owner: Address; agent: Address; cap: bigint; askAbove: bigint; expiresAt: bigint; revoked: boolean; balance: bigint };

export function pocket(address: Address) {
  const r = (functionName: string, args: unknown[] = []) => pub().readContract({ address, abi: pocketAbi, functionName, args }) as Promise<any>;
  return {
    async info(): Promise<PocketInfo> {
      const [owner, agent, cap, askAbove, expiresAt, revoked, balance] = await Promise.all([
        r("owner"), r("agent"), r("perPaymentCap"), r("askAbove"), r("expiresAt"), r("revoked"), usdcBalance(address),
      ]);
      return { address, owner, agent, cap, askAbove, expiresAt, revoked, balance };
    },
    canPay: async (to: Address, v: bigint): Promise<string> => hexToString(await r("canPay", [to, v]), { size: 32 }).replace(/\0+$/, ""),
    needsOwner: (v: bigint) => r("needsOwner", [v]) as Promise<boolean>,
    sellerAllowed: (s: Address) => r("sellerAllowed", [s]) as Promise<boolean>,
    /** Pocket.frozen (Sentinel guardian or owner). Pockets from an older factory have no freeze: false. */
    frozen: () => (r("frozen") as Promise<boolean>).catch(() => false),
  };
}
