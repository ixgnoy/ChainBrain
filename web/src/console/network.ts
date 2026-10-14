// The one shape every screen reads, whichever source feeds it (a real server, or the built-in network).
import { createContext, useContext } from "react";
import type { Address, Hex } from "viem";
import type { Config } from "../shared";
import type { WalletEvent } from "../lib/events";
import { TX_LABEL, type ChainTx, type PocketState } from "./chain";

export type Scene = { id: string; title: string; text: string; followUp?: string; note: string; preset: string | null };
export type ActionResult = { ok: boolean; text: string };
export type ForceResult = ActionResult & { tx?: string };

/** What a screen can offer to try; an action a source cannot do is simply absent. */
export type Actions = {
  /** Plants text into a seller's next response (red-team box). null clears it. */
  plant?(sellerId: string, text: string | null): Promise<ActionResult>;
  /** Submits a transfer past the agent; the pocket contract refuses it. */
  forceTransfer?(pocket: string): Promise<ForceResult>;
  /** Plays one scene of the story on a fresh pocket now. */
  runScene?(id: string): Promise<{ pocket: string } | void>;
  /** Linked phone only: the phone types this to its agent on a pocket that fits `preset`; the owner confirms on the phone. */
  say?(text: string, preset?: string | null): Promise<SayResult>;
};
export type SayResult = { ok: boolean; text: string; pocket?: string };

export type TxDetail = {
  hash: Hex; label: string; status: "success" | "reverted" | "pending"; amount?: bigint; pocket: Address;
  from?: string; to?: string; block?: bigint; at?: number; submittedBy?: string;
};

export type Network = {
  /** A local fork of the test chain (dev stack): hashes there are not on a public explorer. */
  dev: boolean;
  /** Plain name of the chain for headers and chips. */
  chainName: string;
  cfg: Config; events: WalletEvent[];
  pockets: PocketState[]; txs: ChainTx[]; chainError?: string;
  /** Block-explorer link for a transaction; absent when there is none to link to (the app shows its own detail). */
  explorer?: (hash: string) => string;
  scenes: Scene[];
  /** The pocket the story is on, when the source knows (Live follows it unless one is picked). */
  follow?: string;
  /** A phone is linked: its pockets lead, Live follows them and Play is typed on the phone. */
  linked: boolean;
  /** Lower-case addresses of the linked phone's pockets. */
  phonePockets: string[];
  /** One name for a pocket on every screen (the phone's name for it, else "Pocket 2B3C"). */
  nameOf(address: string): string;
  isPhone(address: string): boolean;
  txDetail(hash: string): TxDetail | undefined;
  actions: Actions;
  refresh(): void;
};

export const NetworkCtx = createContext<Network | null>(null);
export function useNetwork(): Network {
  const v = useContext(NetworkCtx);
  if (!v) throw new Error("NetworkProvider missing");
  return v;
}

export const txLabel = (t: Pick<ChainTx, "kind"> & { status?: string }) => (t.status === "reverted" ? "Blocked transfer" : TX_LABEL[t.kind]);

/** Who sent and who received, by money flow (a payment leaves the pocket; funding arrives from the owner). */
export function describeTx(t: ChainTx, owner?: string): TxDetail {
  const status = t.status ?? "success";
  const pocket = t.pocket;
  const [from, to]: (string | undefined)[] =
    t.kind === "payment" || t.kind === "out" ? [pocket, t.counterparty]
    : t.kind === "fund" ? [t.counterparty, pocket]
    : t.kind === "return" ? [pocket, t.counterparty ?? owner]
    : [t.counterparty ?? owner, pocket];
  return { hash: t.hash, label: txLabel(t), status, amount: t.amount, pocket, from, to, block: t.block, at: t.at, submittedBy: t.from && t.from.toLowerCase() !== from?.toLowerCase() && t.kind === "payment" ? t.from : undefined };
}

export const pocketTag = (a: string, name?: string) => name || `Pocket ${a.slice(-4).toUpperCase()}`;
/** Name and phone lookups over a pocket list, the same for every source. */
export function pocketLookups(pockets: PocketState[], phone: string[] = []): Pick<Network, "nameOf" | "isPhone" | "phonePockets"> {
  const by = new Map(pockets.map((p) => [p.address.toLowerCase(), p.name]));
  const mine = new Set(phone.map((a) => a.toLowerCase()));
  return { phonePockets: [...mine], nameOf: (a) => pocketTag(a, by.get(a.toLowerCase())), isPhone: (a) => mine.has(a.toLowerCase()) };
}

/**
 * The detail of any hash a screen can show: a chain transaction first, else the event that carried it (a payment or a
 * blocked transfer can be on screen before the chain read catches up), else a bare hash that is still "Pending" (never dashes).
 */
export function lookupTx(hash: string, all: ChainTx[], events: WalletEvent[], pockets: PocketState[], payTo: (sellerId: string) => string | undefined): TxDetail {
  const l = hash.toLowerCase();
  const t = all.find((x) => x.hash.toLowerCase() === l);
  if (t) return { ...describeTx(t, pockets.find((p) => p.address.toLowerCase() === t.pocket.toLowerCase())?.owner), at: t.at ?? events.find((e) => e.tx?.toLowerCase() === l)?.at };
  const e = events.find((x) => typeof x.tx === "string" && x.tx.toLowerCase() === l && (x.type === "payment" || x.type === "forced"));
  if (e?.type === "payment") return { hash: hash as Hex, label: "Payment", status: "success", amount: e.amount != null ? BigInt(e.amount) : undefined, pocket: e.pocket as Address, from: e.pocket, to: payTo(e.sellerId), at: e.at };
  if (e?.type === "forced") return { hash: hash as Hex, label: e.reverted ? "Blocked transfer" : "Forced transfer", status: e.reverted ? "reverted" : "success", amount: BigInt(e.amount ?? 0), pocket: e.pocket as Address, from: e.pocket, to: e.to, at: e.at };
  return { hash: hash as Hex, label: "Transaction", status: "pending", pocket: "" as Address };
}
