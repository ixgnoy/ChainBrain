// Small pure copies of server/src/wallet/{money,scheme,reasons}.ts (duplicated on purpose: cheaper than a shared package).
import type { Address, Hex } from "viem";

export const EHKD: Address = "0x0355c0c5Afe2A35369056FBB854903A4aF07781A";
export const NEVER = 2n ** 256n - 1n;

export function parseHkd(s: string): bigint {
  const m = /^(\d+)(?:\.(\d{1,6}))?$/.exec(String(s).trim());
  if (!m) throw new Error(`bad USD amount: ${s}`);
  return BigInt(m[1]) * 1_000_000n + BigInt((m[2] ?? "").padEnd(6, "0") || "0");
}
export function formatHkd(n: bigint): string {
  if (n === NEVER) return "never";
  const frac = (n % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "").padEnd(2, "0");
  return `${n / 1_000_000n}.${frac}`;
}

export type Authorization = { from: Address; to: Address; value: string; validAfter: string; validBefore: string; nonce: Hex };
export const transferTypedData = (a: Authorization) => ({
  domain: { name: "Mock e-HKD", version: "1", chainId: 20200, verifyingContract: EHKD },
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
  NEEDS_OWNER_APPROVAL: "Above the ask-me threshold: needs your approval",
  APPROVAL_EXPIRED: "The approval window passed",
  OWNER_DECLINED: "You declined",
  QUOTE_MISMATCH: "The seller's payment request differs from the quote",
  QUOTE_ALREADY_PAID: "This quote is already paid",
  QUOTE_UNKNOWN: "No such quote",
  DISCLOSURE_REFUSED: "The seller asked for data beyond the purchase; refused",
  SIGNATURE_TYPE_NOT_ALLOWED: "The wallet only signs in-rule eHKD payments",
  SETTLEMENT_FAILED: "Settlement failed",
  NOT_THIS_AGENT: "This pocket belongs to a different agent key",
  COUNTERPARTY_HIGH_RISK: "Radar traced this seller's funds to a high-risk source",
  COUNTERPARTY_REVIEW: "Radar found risk in this seller's funds: needs your approval",
  POCKET_FROZEN: "The pocket is frozen; only the owner can unfreeze",
  SENTINEL_HOLD: "The Sentinel saw unusual behaviour: needs your approval",
  OFFER_NOT_LOWER: "An offer must be below the seller's price and never above its first quote",
  NEGOTIATION_ROUNDS_USED: "No offers left on this quote (3 at most)",
  NEGOTIATION_NOT_OFFERED: "This seller does not take offers on this item",
  DEAL_ALREADY_AGREED: "A price is already agreed on this quote",
  QUOTE_ALREADY_APPROVED: "You already approved this price, so it cannot be renegotiated",
};

/** Which layer produces a reason code (api spec section 6.1). */
export const reasonLayer = (code: string): string =>
  ["SELLER_NOT_ALLOWED", "OVER_CAP", "OVER_BUDGET", "POCKET_REVOKED", "POCKET_EXPIRED"].includes(code) ? "Pocket contract"
  : ["PRICE_ABOVE_INTENT", "INTENT_TOTAL_REACHED", "INTENT_ITEMS_REACHED", "INTENT_EXPIRED", "INTENT_NOT_CONFIRMED"].includes(code) ? "Intent check"
  : ["NEEDS_OWNER_APPROVAL", "APPROVAL_EXPIRED", "OWNER_DECLINED"].includes(code) ? "Owner approval"
  : ["DISCLOSURE_REFUSED", "SIGNATURE_TYPE_NOT_ALLOWED"].includes(code) ? "Content scan"
  : ["QUOTE_MISMATCH", "QUOTE_ALREADY_PAID", "QUOTE_UNKNOWN"].includes(code) ? "Quote check"
  : ["COUNTERPARTY_HIGH_RISK", "COUNTERPARTY_REVIEW"].includes(code) ? "Radar"
  : code === "SENTINEL_HOLD" ? "Sentinel" : code === "POCKET_FROZEN" ? "Pocket contract"
  : code === "NOT_THIS_AGENT" ? "Agent key" : code === "SETTLEMENT_FAILED" ? "Settlement" : "Wallet";

export const shortAddr = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
/** The live server's FISCO chain, from /api/config (set by LiveNetwork): its RPC and explorer. */
export type ChainInfo = { key: "fisco"; id: number; name: string; rpc: string; currency: string; txUrl: string };
let chain: ChainInfo | null = null;
export const setChainInfo = (c: ChainInfo | null) => { chain = c; };
export const chainInfo = () => chain;
/** Money is Mock e-HKD everywhere: HK$ amounts, the eHKD token, on FISCO BCOS. */
export const curSign = () => "HK$";
export const tokenSymbol = () => "eHKD";
export const chainLabel = () => "FISCO BCOS";
// FISCO has no public explorer: the wallet server hosts a read-only one (txUrl prefix ".../explorer#/tx/")
export const txUrl = (h: string) => `${chain?.txUrl ?? "/explorer#/tx/"}${h}`;
export const addrUrl = (a: string) => `${(chain?.txUrl ?? "/explorer#/tx/").replace(/tx\/$/, "address/")}${a}`;

export type Seller = { id: string; name: string; category: string; payTo: Address; items: { sku: string; description: string; price: string | null }[] };
export type Config = { agent: Address; factory: Address; token: Address; chain?: ChainInfo; sellersUrl: string; sellers: Seller[]; abis: { pocket: any[]; factory: any[]; erc20: any[] } };

const cfgs = new Map<string, Promise<Config>>();
/** Cached per server after the first success. A failure (server down, 500 plain text) is not cached, so a retry can succeed. */
export const loadConfig = (api: string): Promise<Config> => {
  let p = cfgs.get(api);
  if (!p) {
    p = fetch(`${api}/api/config`)
      .then((r) => {
        if (!r.ok) throw new Error(`config HTTP ${r.status}`);
        return r.json() as Promise<Config>;
      })
      .catch((e) => {
        cfgs.delete(api);
        throw e;
      });
    cfgs.set(api, p);
  }
  return p;
};

export const store = {
  get<T>(k: string, fallback: T): T {
    try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
  },
  set(k: string, v: unknown) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: per-viewer convenience only */ }
  },
};
