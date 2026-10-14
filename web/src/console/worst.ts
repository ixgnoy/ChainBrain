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
};

export function worstCase(p: PocketState, txs: ChainTx[], sellerName: (id: string) => string, now = Date.now()): Worst {
  const stopped = p.revoked || p.expiresAt * 1000 < now;
  const put = txs.filter((t) => t.kind === "fund" && t.pocket.toLowerCase() === p.address.toLowerCase() && t.status !== "reverted").reduce((n, t) => n + (t.amount ?? 0n), 0n);
  const funded = put > p.balance ? put : p.balance;
  const max = stopped ? 0n : p.balance;
  const share = funded > 0n ? Number((max * 10_000n) / funded) / 10_000 : 0;
  return { max, funded, share, to: p.allowed.map(sellerName), stopped };
}

/** "DataLite", "DataLite or DataPro", "DataLite, DataPro or Harbour Wines". */
export const orList = (xs: string[]) => (xs.length === 0 ? "nobody" : xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(", ")} or ${xs[xs.length - 1]}`);
