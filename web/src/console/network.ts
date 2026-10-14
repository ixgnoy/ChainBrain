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
};

export type TxDetail = {
  hash: Hex; label: string; status: "success" | "reverted"; amount?: bigint; pocket: Address;
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
