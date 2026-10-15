import { defineChain, type Address, type Chain } from "viem";
import { baseSepolia } from "viem/chains";
import { readFileSync, existsSync } from "node:fs";

const deployments = (id: number) => {
  const f = new URL(`../../contracts/deployments/${id}.json`, import.meta.url);
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {};
};

export const fiscoChain = defineChain({
  id: 20200, name: "FISCO BCOS (local)", nativeCurrency: { name: "FISCO", symbol: "FISCO", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } }, blockTime: 500,
});

export type ChainCfg = {
  key: "fisco" | "base-sepolia"; chain: Chain; rpc: string; network: `eip155:${number}`;
  token: Address; domain: { name: string; version: string }; currency: "HK$" | "US$"; priceKey: "hkd" | "usd";
  /** FISCO has no public explorer: link to the wallet API's receipt endpoint. */
  txUrl: (hash: string) => string;
};

/** CHAIN=fisco (default) | base-sepolia. Read per call so tests can switch env before use. */
export function cfg(): ChainCfg {
  if ((process.env.CHAIN || "fisco") === "base-sepolia") return {
    key: "base-sepolia", chain: baseSepolia, rpc: process.env.BASE_SEPOLIA_RPC ?? "https://sepolia.base.org", network: "eip155:84532",
    token: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", domain: { name: "USDC", version: "2" }, currency: "US$", priceKey: "usd",
    txUrl: (h) => `https://sepolia.basescan.org/tx/${h}`,
  };
  if (process.env.CHAIN && process.env.CHAIN !== "fisco") throw new Error(`unknown CHAIN ${process.env.CHAIN}`);
  return {
    key: "fisco", chain: fiscoChain, rpc: process.env.FISCO_RPC ?? "http://127.0.0.1:8545", network: "eip155:20200",
    token: (process.env.TOKEN_ADDRESS || deployments(20200).Token) as Address, domain: { name: "Mock e-HKD", version: "1" },
    currency: "HK$", priceKey: "hkd",
    txUrl: (h) => `${process.env.PUBLIC_API_URL ?? "http://localhost:8787"}/api/tx/${h}`,
  };
}

export const factoryFromDeployments = (id: number): Address | undefined => deployments(id).PocketFactory;

const NEVER = 2n ** 256n - 1n;
/** Demo pockets per currency (atomic, 6 decimals). research: DataLite + DataPro until tonight; tight: DataLite only (scene 8). */
export const presets = () => cfg().key === "fisco"
  ? { research: { budget: 40_000_000n, cap: 15_000_000n, askAbove: 8_000_000n }, tight: { budget: 1_500_000n, cap: 1_500_000n, askAbove: NEVER } }
  : { research: { budget: 5_000_000n, cap: 2_000_000n, askAbove: 1_000_000n }, tight: { budget: 200_000n, cap: 200_000n, askAbove: NEVER } };
