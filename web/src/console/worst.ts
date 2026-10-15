// The product's one sentence, as numbers: what a hijacked agent could lose from this pocket, and to whom.
import type { ChainTx, PocketState } from "./chain";

export type Worst = {
  /** Most the agent could lose now (0 when the pocket is revoked or expired). */
  max: bigint;
  /** What the pocket was funded with in total (never less than what it holds). */
  funded: bigint;
  /** Share of the funding still exposed, 0..1. Moves only when money moves: a refused attempt leaves it where it was. */
  share: number;
  to: string[];
  stopped: boolean;
  /** True when `funded` is the sum of the pocket's fund transactions (not a fallback to its balance). */
  fundedKnown: boolean;
};

export function worstCase(p: PocketState, txs: ChainTx[], sellerName: (id: string) => string, now = Date.now()): Worst {
  const stopped = p.revoked || p.expiresAt * 1000 < now;
  const put = txs.filter((t) => t.kind === "fund" && t.pocket.toLowerCase() === p.address.toLowerCase() && t.status !== "reverted").reduce((n, t) => n + (t.amount ?? 0n), 0n);
  // funded comes from the fund transactions; a pocket with none on record is at least what it holds
  const funded = put > p.balance ? put : p.balance;
  const max = stopped ? 0n : p.balance;
  const share = funded > 0n ? Number((max * 10_000n) / funded) / 10_000 : 0;
  return { max, funded, share, to: p.allowed.map(sellerName), stopped, fundedKnown: put > 0n };
}

/** "DataLite", "DataLite or DataPro", "DataLite, DataPro or Harbour Wines". */
export const orList = (xs: string[]) => (xs.length === 0 ? "nobody" : xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(", ")} or ${xs[xs.length - 1]}`);

export type Segment = { key: "spent" | "risk" | "safe"; label: string; value: bigint };
/** The funding split for the meter: what already left, what could still be lost, or (stopped) what no longer can be. */
export function worstSegments(w: Worst): Segment[] {
  if (w.stopped) return w.funded > 0n ? [{ key: "safe", label: "No longer at risk", value: w.funded }] : [];
  const spent = w.funded > w.max ? w.funded - w.max : 0n;
  return [...(spent > 0n ? [{ key: "spent" as const, label: "Spent so far", value: spent }] : []), ...(w.max > 0n ? [{ key: "risk" as const, label: "Can still be lost", value: w.max }] : [])];
}
