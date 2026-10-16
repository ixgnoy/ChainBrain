// Pure helpers shared with web/src/shared.ts (copied on purpose: cheaper than a shared package). No React Native imports here.
import type { Address, Hex } from "viem";
import { getApi, fetchTimeout, isBuiltin } from "./runtime";
import { builtin } from "./builtin";

export const USDC: Address = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
export const NEVER = 2n ** 256n - 1n;
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

export { transferTypedData, type Authorization } from "./typed";

/** The complete reason-code map (24 codes, server/src/wallet/reasons.ts). The mobile app used to miss QUOTE_UNKNOWN and NOT_THIS_AGENT. */
export const REASONS: Record<string, string> = {
  SELLER_NOT_ALLOWED: "This seller is not in the pocket's allowlist",
  OVER_CAP: "Above the pocket's per-payment cap",
  OVER_BUDGET: "Not enough left in the pocket",
  POCKET_REVOKED: "The owner revoked this pocket",
  POCKET_EXPIRED: "The pocket has expired",
  PRICE_ABOVE_INTENT: "The price is above the intent's max per item",
  INTENT_TOTAL_REACHED: "This would exceed the intent's total",
  INTENT_ITEMS_REACHED: "The intent's item count is already reached",
  INTENT_EXPIRED: "The intent's deadline has passed",
  INTENT_NOT_CONFIRMED: "The owner has not confirmed an intent for this task",
  NEEDS_OWNER_APPROVAL: "Above the ask-me threshold: call ask_owner with this quote first",
  APPROVAL_EXPIRED: "The owner's approval window passed; ask again",
  OWNER_DECLINED: "The owner declined",
  QUOTE_MISMATCH: "The seller's payment request differs from the quote",
  QUOTE_ALREADY_PAID: "This quote is already paid",
  QUOTE_UNKNOWN: "No such quote",
  DISCLOSURE_REFUSED: "The seller asked for data beyond the purchase; refused and shown to the owner",
  SIGNATURE_TYPE_NOT_ALLOWED: "The wallet only signs in-rule USDC payments it built itself",
  SETTLEMENT_FAILED: "Settlement failed",
  NOT_THIS_AGENT: "This pocket belongs to a different agent key",
  COUNTERPARTY_HIGH_RISK: "Radar traced this seller's funds to a high-risk source; choose another seller",
  COUNTERPARTY_REVIEW: "Radar found risk in this seller's funds: call ask_owner with this quote first",
  POCKET_FROZEN: "The pocket is frozen (by the Sentinel or the owner); only the owner can unfreeze",
  SENTINEL_HOLD: "The Sentinel saw unusual behaviour: call ask_owner with this quote; the owner must co-sign the next payment",
};
export const reasonText = (code: string) => REASONS[code] ?? code;

export const shortAddr = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

export type Seller = { id: string; name: string; category: string; payTo: Address; items: { sku: string; description: string; price: string | null }[] };
export type Config = { agent: Address; factory: Address; usdc: Address; sellersUrl: string; sellers: Seller[]; abis: { pocket: any[]; factory: any[]; erc20: any[] } };

const cache = new Map<string, Promise<Config>>();
export const resetConfig = () => cache.clear();
export function loadConfig(): Promise<Config> {
  if (isBuiltin()) return Promise.resolve(builtin().config() as Config);
  const base = getApi();
  let p = cache.get(base);
  if (!p) {
    p = fetchTimeout(`${base}/api/config`, {}, 10000).then((r) => {
      if (!r.ok) throw new Error(`wallet API ${r.status}`);
      return r.json() as Promise<Config>;
    });
    p.catch(() => cache.delete(base));
    cache.set(base, p);
  }
  return p;
}
