import { createPublicClient, http, hexToString, type Address, type PublicClient } from "viem";
import { cfg, factoryFromDeployments } from "../chains";
import { readFileSync } from "node:fs";

const root = new URL("../../../contracts/", import.meta.url);
const artifact = (name: string) => JSON.parse(readFileSync(new URL(`out/${name}.sol/${name}.json`, root), "utf8"));

export const pocketArtifact = artifact("Pocket");
export const factoryArtifact = artifact("PocketFactory");
export const pocketAbi = pocketArtifact.abi;
export const factoryAbi = factoryArtifact.abi;
export const erc20Abi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] },
] as const;

/** FACTORY_ADDRESS (tests, overrides) or contracts/deployments/<chainId>.json (written by the deploy scripts). */
export function factoryAddress(): Address {
  const f = (process.env.FACTORY_ADDRESS as Address | undefined) || factoryFromDeployments(cfg().chain.id);
  if (!f) throw new Error(`No factory for ${cfg().key}: run the deploy script or set FACTORY_ADDRESS`);
  return f;
}

const clients = new Map<string, PublicClient>();
export function pub(): PublicClient {
  const { chain, rpc } = cfg();
  const k = `${chain.id}@${rpc}`;
  if (!clients.has(k)) clients.set(k, createPublicClient({ chain, transport: http(rpc) }) as PublicClient);
  return clients.get(k)!;
}

export const tokenBalance = (a: Address) => pub().readContract({ address: cfg().token, abi: erc20Abi, functionName: "balanceOf", args: [a] });

export type PocketInfo = { address: Address; owner: Address; agent: Address; cap: bigint; askAbove: bigint; expiresAt: bigint; revoked: boolean; balance: bigint };

export function pocket(address: Address) {
  const r = (functionName: string, args: unknown[] = []) => pub().readContract({ address, abi: pocketAbi, functionName, args }) as Promise<any>;
  return {
    async info(): Promise<PocketInfo> {
      const [owner, agent, cap, askAbove, expiresAt, revoked, balance] = await Promise.all([
        r("owner"), r("agent"), r("perPaymentCap"), r("askAbove"), r("expiresAt"), r("revoked"), tokenBalance(address),
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
