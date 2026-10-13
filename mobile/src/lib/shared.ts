// Pure helpers shared with web/src/shared.ts (copied on purpose: cheaper than a shared package). No React Native imports here.
import type { Address, Hex } from "viem";

export const USDC: Address = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
export const NEVER = 2n ** 256n - 1n;
// On a phone running Expo Go, "localhost" is the phone: set EXPO_PUBLIC_API_URL=http://<laptop LAN IP>:8787
export const API = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787";
export const RPC = process.env.EXPO_PUBLIC_RPC_URL ?? "https://sepolia.base.org";

export function parseUsd(s: string): bigint {
  const m = /^(\d+)(?:\.(\d{1,6}))?$/.exec(String(s).trim());
  if (!m) throw new Error(`bad USD amount: ${s}`);
  return BigInt(m[1]) * 1_000_000n + BigInt((m[2] ?? "").padEnd(6, "0") || "0");
}
export function formatUsd(n: bigint): string {
  if (n === NEVER) return "never";
  const frac = (n % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "").padEnd(2, "0");
  return `${n / 1_000_000n}.${frac}`;
}

export type Authorization = { from: Address; to: Address; value: string; validAfter: string; validBefore: string; nonce: Hex };
export const transferTypedData = (a: Authorization) => ({
  domain: { name: "USDC", version: "2", chainId: 84532, verifyingContract: USDC },
  types: {
    TransferWithAuthorization: [
      { name: "from", type: "address" }, { name: "to", type: "address" }, { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" }, { name: "validBefore", type: "uint256" }, { name: "nonce", type: "bytes32" },
    ],
  },
  primaryType: "TransferWithAuthorization" as const,
  message: { from: a.from, to: a.to, value: BigInt(a.value), validAfter: BigInt(a.validAfter), validBefore: BigInt(a.validBefore), nonce: a.nonce },
});

export const REASONS: Record<string, string> = {
  SELLER_NOT_ALLOWED: "Seller not in this pocket's allowlist",
  OVER_CAP: "Above the per-payment cap",
  OVER_BUDGET: "Not enough left in the pocket",
  POCKET_REVOKED: "You revoked this pocket",
  POCKET_EXPIRED: "The pocket has expired",
  PRICE_ABOVE_INTENT: "Price above the task's max per item",
  INTENT_TOTAL_REACHED: "Would exceed the task's total",
  INTENT_ITEMS_REACHED: "Task's item count reached",
  INTENT_EXPIRED: "Task deadline passed",
  INTENT_NOT_CONFIRMED: "You haven't confirmed a task yet",
  NEEDS_OWNER_APPROVAL: "Above your ask-me threshold",
  APPROVAL_EXPIRED: "Approval window passed",
  OWNER_DECLINED: "You declined",
  QUOTE_MISMATCH: "Seller changed the payment request",
  QUOTE_ALREADY_PAID: "Already paid",
  DISCLOSURE_REFUSED: "Seller asked for your data; refused",
  SIGNATURE_TYPE_NOT_ALLOWED: "Only in-rule USDC payments are signed",
  SETTLEMENT_FAILED: "Settlement failed",
};

export const shortAddr = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
export const txUrl = (h: string) => `https://sepolia.basescan.org/tx/${h}`;

export type Seller = { id: string; name: string; category: string; payTo: Address; items: { sku: string; description: string; price: string | null }[] };
export type Config = { agent: Address; factory: Address; usdc: Address; sellersUrl: string; sellers: Seller[]; abis: { pocket: any[]; factory: any[]; erc20: any[] } };

let cfg: Promise<Config> | undefined;
export const loadConfig = (): Promise<Config> =>
  (cfg ??= fetch(`${API}/api/config`).then((r) => {
    if (!r.ok) throw new Error(`wallet API ${r.status}`);
    return r.json();
  }).catch((e) => { cfg = undefined; throw e; }));
