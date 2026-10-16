// Shapes the simulator shares with the real wallet API (server/src/index.ts), as they arrive over JSON: bigints are
// decimal strings in events, addresses are 0x strings. No imports: both apps (Metro and Vite) and Node tests load this.
export type Hex = `0x${string}`;

export type SimEvent = { type: string; pocket?: string; at: number; [k: string]: any };

export type SimApproval = {
  id: string;
  pocket: string;
  kind: "intent" | "payment" | "question";
  text: string;
  data?: any;
  status: "pending" | "approved" | "declined" | "timeout";
  signature?: string;
  answer?: string;
  /** The agent that holds the pocket and asked (chainbrain, claude, chatgpt). */
  agent?: string;
  /** When it was asked, and when it times out unanswered (ms). */
  createdAt?: number; expiresAt?: number;
};

export type Authorization = { from: Hex; to: Hex; value: string; validAfter: string; validBefore: string; nonce: Hex };

export type SimSeller = {
  id: string; name: string; category: string; payTo: Hex;
  items: { sku: string; /** a few words, for rows */ short?: string; description: string; price: string | null; /** the seller takes offers (the haggler); its floor stays private */ negotiable?: boolean }[];
};

export type SimConfig = { agent: Hex; factory: Hex; usdc: Hex; sellersUrl: string; sellers: SimSeller[]; abis: { pocket: any[]; factory: any[]; erc20: any[] } };

/** What `readPocket` returns on the phone (mobile/src/lib/wallet.ts PocketView), with bigints. */
export type SimPocketView = {
  address: Hex; owner: Hex; agent: Hex; cap: bigint; askAbove: bigint; expiresAt: bigint; revoked: boolean; balance: bigint; allowed: string[];
  /** Pocket.frozen: the Sentinel (guardian) or the owner stopped all payments; only the owner unfreezes. */
  frozen?: boolean;
  createdTx?: Hex; createdBlock?: bigint; createdAt?: number;
};

export type SimTxKind = "create" | "fund" | "payment" | "return" | "out" | "revoke" | "rules";
/** One on-chain step, as the web console's chain reader reports it (web/src/console/chain.ts ChainTx). */
export type SimTx = {
  hash: Hex; block: bigint; logIndex: number; pocket: Hex; kind: SimTxKind; amount?: bigint; counterparty?: Hex;
  at: number; from: Hex; status: "success" | "reverted"; label?: string;
  /** The contract function called (for the in-app explorer). */
  method?: SimMethod;
  /** Why a reverted transaction reverted (a Pocket.sol reason, e.g. SELLER_NOT_ALLOWED, NOT_OWNER). */
  reason?: string;
  /** The call's arguments, as plain strings (explorer "Input"). */
  args?: Record<string, string>;
};
export type SimMethod = "createPocket" | "transfer" | "transferWithAuthorization" | "revoke" | "returnFunds" | "setSeller" | "setCap" | "setAskAbove" | "setExpiresAt" | "freeze" | "unfreeze";

export type ChatResult = { reply: string; stopped?: string };
export type AnswerResult = { ok: true } | { ok: false; error: string };
