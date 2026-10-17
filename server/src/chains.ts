import { defineChain, type Address, type Chain } from "viem";
import { readFileSync, existsSync } from "node:fs";

// Read once per chain id: cfg() runs on every request. A redeploy needs a server restart (or TOKEN_ADDRESS / FACTORY_ADDRESS).
const deployed = new Map<number, Record<string, Address>>();
const deployments = (id: number) => {
  if (!deployed.has(id)) {
    const f = new URL(`../../contracts/deployments/${id}.json`, import.meta.url);
    deployed.set(id, existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {});
  }
  return deployed.get(id)!;
};

export const fiscoChain = defineChain({
  id: 20200, name: "FISCO BCOS (local)", nativeCurrency: { name: "FISCO", symbol: "FISCO", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } }, blockTime: 500,
});

export type ChainCfg = {
  key: "fisco"; chain: Chain; rpc: string; network: `eip155:${number}`;
  token: Address; domain: { name: string; version: string }; currency: "HK$";
  /** FISCO has no public explorer: link to the wallet API's own explorer page (/explorer). */
  txUrl: (hash: string) => string;
};

/** The one chain: FISCO BCOS (chain id 20200) with the Mock e-HKD. Read per call so tests can set env before use. */
export function cfg(): ChainCfg {
  const token = (process.env.TOKEN_ADDRESS || deployments(20200).Token) as Address | undefined;
  if (!token) throw new Error("No Mock e-HKD token: run scripts/fisco/deploy.sh or set TOKEN_ADDRESS");
  return {
    key: "fisco", chain: fiscoChain, rpc: process.env.FISCO_RPC ?? "http://127.0.0.1:8545", network: "eip155:20200",
    token, domain: { name: "Mock e-HKD", version: "1" }, currency: "HK$",
    txUrl: (h) => `${process.env.PUBLIC_API_URL ?? "http://localhost:8787"}/explorer#/tx/${h}`,
  };
}

export const factoryFromDeployments = (id: number): Address | undefined => deployments(id).PocketFactory;

const NEVER = 2n ** 256n - 1n;
/** Demo pockets in HK$ (atomic, 6 decimals). research: DataLite + DataPro until tonight; tight: DataLite only (scene 8). */
export const presets = () => ({ research: { budget: 40_000_000n, cap: 15_000_000n, askAbove: 8_000_000n }, tight: { budget: 1_500_000n, cap: 1_500_000n, askAbove: NEVER } });
