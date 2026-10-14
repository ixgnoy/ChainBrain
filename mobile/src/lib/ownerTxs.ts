// Owner transactions signed on this phone (create, add money, return, revoke, rule edits). The chain has them, but the API
// event stream does not, so the phone keeps a small local list per owner: kind, pocket, hash, time. No React Native imports.
import type { LedgerRow } from "./events";

export type OwnerTxKind = "create" | "fund" | "return" | "revoke" | "seller" | "cap" | "ask";
export type OwnerTx = { kind: OwnerTxKind; pocket: string; hash: string; at: number; amount?: string; note?: string };

export const MAX_OWNER_TXS = 60;

/** Newest first is not needed: the list is kept oldest first, deduped by hash, trimmed to the last MAX_OWNER_TXS. */
export function addOwnerTx(list: OwnerTx[], tx: OwnerTx): OwnerTx[] {
  if (list.some((x) => x.hash === tx.hash && x.kind === tx.kind)) return list;
  return [...list, tx].slice(-MAX_OWNER_TXS);
}

export function parseOwnerTxs(raw: string | null): OwnerTx[] {
  try {
    const j = JSON.parse(raw ?? "[]");
    return Array.isArray(j) ? j.filter((x) => x && typeof x.hash === "string" && typeof x.pocket === "string" && typeof x.at === "number" && typeof x.kind === "string") : [];
  } catch { return []; }
}

export const OWNER_TITLE: Record<OwnerTxKind, string> = {
  create: "Pocket created", fund: "Money added", return: "Funds returned", revoke: "Pocket revoked",
  seller: "Seller list changed", cap: "Payment cap changed", ask: "Ask-me limit changed",
};

/** Owner transactions as ledger rows, so Activity and the pocket history show task, payment and owner transactions together. */
export function ownerRows(list: OwnerTx[]): LedgerRow[] {
  return list.map((t) => ({
    key: `own:${t.kind}:${t.hash}`, at: t.at, pocket: t.pocket, kind: "owner" as const, outcome: "info" as const, tx: t.hash, ownerKind: t.kind,
    text: OWNER_TITLE[t.kind] ?? "Transaction", detail: t.note, amount: t.amount != null ? safeBig(t.amount) : undefined, reasons: [],
  }));
}
const safeBig = (s: string) => { try { return BigInt(s); } catch { return undefined; } };
