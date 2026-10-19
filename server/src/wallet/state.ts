import type { Address, Hex } from "viem";
import type { Authorization } from "./scheme";
import type { Intent } from "./intent";

export type Quote = { quoteId: string; sellerId: string; sku: string; url: string; description: string; payTo: Address; amount: bigint; asset: Address };
/** `list`: the seller's first price; `ask`: its current one while the agent haggles (counter_offer); `amount`: what pay settles. */
export type QuoteRec = Quote & { paid: boolean; auth?: Authorization; ownerSig?: Hex; list: bigint; ask: bigint; rounds: number; dealId?: string; agreed?: boolean };
export type PocketState = { intent?: Intent; seq: bigint; spent: bigint; items: number; quotes: Map<string, QuoteRec>; nextQuote: number; /** a routine run in progress */ routine?: { id: string; run: number } };

// ponytail: in-memory per process; a restart forgets the task (on-chain state is unaffected). Persist if the demo needs restarts.
const all = new Map<string, PocketState>();

export function state(pocket: Address): PocketState {
  const k = pocket.toLowerCase();
  if (!all.has(k)) all.set(k, { seq: 0n, spent: 0n, items: 0, quotes: new Map(), nextQuote: 1 });
  return all.get(k)!;
}

/** A new task: drop the old intent and counters; seq keeps counting so nonces never repeat in this process. */
export function newTask(pocket: Address) {
  const s = state(pocket);
  Object.assign(s, { intent: undefined, spent: 0n, items: 0, routine: undefined });
  s.quotes.clear();
}
