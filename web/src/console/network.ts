// The one shape every screen reads, whichever source feeds it (a real server, or the built-in network).
import { createContext, useContext } from "react";
import type { Address, Hex } from "viem";
import type { Attempt } from "@sim/checks";
import type { Config } from "../shared";
import type { WalletEvent } from "../lib/events";
import { TX_LABEL, type ChainTx, type PocketState } from "./chain";
import { listedPockets, pocketNamer } from "./story";

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
  /** Types an attack sentence to the agent of this pocket; `text` of the result is what the agent answered. */
  chat?(pocket: string, text: string): Promise<SayResult>;
  /** Induced transfer, "assume the AI is fooled": the agent's own key signs the attacker's transfer and the pocket contract refuses it. */
  hijack?(pocket: string, text?: string): Promise<ForceResult>;
  /** The Brain page's test: what one test would buy (a payment the pocket allows, or one its rules must refuse). */
  testPlan?(pocket: string, mode: TestMode): TestPlan | null;
  /** Runs that test for real through the wallet tools (quote, rules, Radar, pre-flight, settlement), then a reflection. */
  runTest?(pocket: string, mode: TestMode): Promise<{ ok: boolean; tx?: string; reason?: string }>;
};
export type TestMode = "pay" | "refuse";
export type TestPlan = { sellerId: string; seller: string; sku: string; description: string; price: string };
export type SayResult = { ok: boolean; text: string; pocket?: string };

export type TxDetail = {
  hash: Hex; label: string; status: "success" | "reverted" | "pending"; amount?: bigint; pocket: Address;
  from?: string; to?: string; block?: bigint; at?: number; submittedBy?: string;
};

export type Network = {
  /** A local fork of the test chain (dev stack): hashes there are not on a public explorer. */
  dev: boolean;
  /** The network is the built-in one (runs in this tab, or on the linked phone). Its hashes are not on any public chain. */
  builtin: boolean;
  /** Plain name of the chain for headers and chips: "Test network" for the built-in one and the local fork, else the public chain's own name. */
  chainName: string;
  cfg: Config; events: WalletEvent[];
  pockets: PocketState[]; txs: ChainTx[]; chainError?: string;
  /** Every transaction including reverted ones (the in-app explorer's data). */
  allTxs: ChainTx[];
  /** Every attempt (payment, refusal, attack) in the events, computed once per change of the events. */
  attempts: Attempt[];
  /** BaseScan link for a transaction; only on a public chain (the in-app explorer is always there for every hash). */
  explorer?: (hash: string) => string;
  scenes: Scene[];
  /** The pocket the story is on, when the source knows (Live follows it unless one is picked). */
  follow?: string;
  /** The scene the built-in story is playing right now (not set while a phone is linked or on a server). */
  storyScene?: string;
  /** A phone is linked: its pockets lead, Live follows them and Play is typed on the phone. */
  linked: boolean;
  /** Lower-case addresses of the linked phone's pockets. */
  phonePockets: string[];
  /** One name for a pocket on every screen (the phone's name for it, else "Pocket 2B3C"). */
  nameOf(address: string): string;
  isPhone(address: string): boolean;
  /** Pockets worth offering in pickers (stale empty stopped ones left out unless in `keep`). */
  listed(keep?: (string | undefined)[], opts?: { all?: boolean }): PocketState[];
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

export const txLabel = (t: Pick<ChainTx, "kind"> & { status?: string; reason?: string; label?: string }) =>
  t.status === "reverted" ? (t.kind === "rules" ? `Rule change refused${t.reason ? ` (${t.reason})` : ""}` : "Blocked transfer")
  : t.kind === "rules" && t.label ? t.label : TX_LABEL[t.kind]; // "Frozen by the Sentinel", "Cap changed"… when the source names it

/** Who sent and who received, by money flow (a payment leaves the pocket; funding arrives from the owner). */
export function describeTx(t: ChainTx, owner?: string): TxDetail {
  const status = t.status ?? "success";
  const pocket = t.pocket;
  const [from, to]: (string | undefined)[] =
    t.kind === "payment" || t.kind === "out" ? [pocket, t.counterparty]
    : t.kind === "fund" ? [t.counterparty, pocket]
    : t.kind === "rules" && status === "reverted" ? [t.from, pocket]
    : t.kind === "return" ? [pocket, t.counterparty ?? owner]
    : [t.counterparty ?? owner, pocket];
  return { hash: t.hash, label: txLabel(t), status, amount: t.amount, pocket, from, to, block: t.block, at: t.at, submittedBy: t.from && t.from.toLowerCase() !== from?.toLowerCase() && t.kind === "payment" ? t.from : undefined };
}

export const pocketTag = (a: string, name?: string) => name || `Pocket ${a.slice(-4).toUpperCase()}`;
/** Name, phone and listing lookups over a pocket list, the same for every source. */
export function pocketLookups(pockets: PocketState[], phone: string[] = [], events: WalletEvent[] = []): Pick<Network, "nameOf" | "isPhone" | "phonePockets" | "listed"> {
  const mine = new Set(phone.map((a) => a.toLowerCase()));
  const nameOf = pocketNamer(listedPockets(pockets, events));
  return { phonePockets: [...mine], nameOf, isPhone: (a) => mine.has(a.toLowerCase()), listed: (keep, opts) => listedPockets(pockets, events, keep, Date.now(), opts?.all ? undefined : [...mine]) };
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
