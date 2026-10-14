// A small in-memory chain with the exact rules of contracts/src/Pocket.sol and PocketFactory.sol: canPay's check order,
// needsOwner, onlyOwner, and USDC balances. Every state change is a transaction with a hash, a block and a log row,
// which is what the apps show as evidence.
import { CATALOG } from "./catalog";
import type { Hex, SimPocketView, SimTx, SimTxKind } from "./types";
import { lower, type Rng } from "./util";

type PocketRec = {
  address: Hex; owner: Hex; agent: Hex; cap: bigint; askAbove: bigint; expiresAt: bigint; revoked: boolean;
  allowed: Set<string>; createdTx: Hex; createdBlock: bigint; createdAt: number;
};

export class ChainError extends Error {}

/** Block height for a time, about one block per 2 s like Base: every device's built-in chain agrees on heights. */
const EPOCH = Date.UTC(2026, 9, 1);
export const blockAt = (ms: number) => 32_000_000n + BigInt(Math.max(0, Math.floor((ms - EPOCH) / 2000)));

export function createChain(o: { rng: Rng; now: () => number; startBlock?: bigint }) {
  const usdc = new Map<string, bigint>();
  const eth = new Map<string, bigint>();
  const pockets = new Map<string, PocketRec>();
  const txs: SimTx[] = [];
  let block = o.startBlock ?? 0n;
  const listeners = new Set<(t: SimTx) => void>();

  const bal = (a: string) => usdc.get(lower(a)) ?? 0n;
  const setBal = (a: string, v: bigint) => usdc.set(lower(a), v);
  const get = (p: string) => {
    const r = pockets.get(lower(p));
    if (!r) throw new ChainError(`not a pocket: ${p}`);
    return r;
  };
  const onlyOwner = (p: PocketRec, from: string) => { if (lower(p.owner) !== lower(from)) throw new ChainError("transaction reverted: NOT_OWNER"); };

  function record(t: Omit<SimTx, "hash" | "block" | "logIndex" | "at"> & { at?: number }): SimTx {
    const at = t.at ?? o.now();
    block = blockAt(at) > block ? blockAt(at) : block + 1n;
    const tx: SimTx = { ...t, hash: o.rng.hex(32), block, logIndex: 0, at };
    txs.push(tx);
    for (const f of listeners) f(tx);
    return tx;
  }

  /** Pocket.canPay, same order of checks. */
  function canPay(pocket: string, to: string, value: bigint): string {
    const p = get(pocket);
    if (p.revoked) return "POCKET_REVOKED";
    if (BigInt(Math.floor(o.now() / 1000)) >= p.expiresAt) return "POCKET_EXPIRED";
    if (!p.allowed.has(lower(to))) return "SELLER_NOT_ALLOWED";
    if (value > p.cap) return "OVER_CAP";
    if (value > bal(p.address)) return "OVER_BUDGET";
    return "OK";
  }

  function view(pocket: string): SimPocketView {
    const p = get(pocket);
    return {
      address: p.address, owner: p.owner, agent: p.agent, cap: p.cap, askAbove: p.askAbove, expiresAt: p.expiresAt, revoked: p.revoked,
      balance: bal(p.address), allowed: CATALOG.filter((s) => p.allowed.has(lower(s.payTo))).map((s) => s.id),
      createdTx: p.createdTx, createdBlock: p.createdBlock, createdAt: p.createdAt,
    };
  }

  return {
    get block() { return block; },
    balanceOf: bal,
    ethOf: (a: string) => eth.get(lower(a)) ?? 0n,
    mint(a: string, amount: bigint, gas = 10n ** 17n) { setBal(a, bal(a) + amount); eth.set(lower(a), (eth.get(lower(a)) ?? 0n) + gas); },
    isPocket: (a: string) => pockets.has(lower(a)),
    view,
    pockets: () => [...pockets.values()].map((p) => view(p.address)),
    pocketsOf: (owner: string) => [...pockets.values()].filter((p) => lower(p.owner) === lower(owner)).map((p) => view(p.address)),
    canPay,
    needsOwner: (pocket: string, value: bigint) => value > get(pocket).askAbove,
    sellerAllowed: (pocket: string, payTo: string) => get(pocket).allowed.has(lower(payTo)),
    txs: () => txs.slice(),
    onTx(f: (t: SimTx) => void) { listeners.add(f); return () => void listeners.delete(f); },

    /** PocketFactory.create: deploys a pocket and emits PocketCreated. */
    createPocket(from: Hex, a: { agent: Hex; cap: bigint; askAbove: bigint; expiresAt: bigint; sellers: Hex[] }, at?: number) {
      const address = o.rng.hex(20);
      const t = at ?? o.now();
      const tx = record({ pocket: address, kind: "create", from, counterparty: from, status: "success", at: t });
      pockets.set(lower(address), {
        address, owner: from, agent: a.agent, cap: a.cap, askAbove: a.askAbove, expiresAt: a.expiresAt, revoked: false,
        allowed: new Set(a.sellers.map(lower)), createdTx: tx.hash, createdBlock: tx.block, createdAt: t,
      });
      return { pocket: address, tx: tx.hash };
    },
    /** USDC.transfer from an owner's main wallet (funding a pocket, or any transfer). */
    transfer(from: Hex, to: Hex, amount: bigint, at?: number) {
      if (bal(from) < amount) throw new ChainError("transaction reverted: ERC20: transfer amount exceeds balance");
      setBal(from, bal(from) - amount);
      setBal(to, bal(to) + amount);
      const kind: SimTxKind = pockets.has(lower(to)) ? "fund" : "out";
      return record({ pocket: pockets.has(lower(to)) ? to : from, kind, from, counterparty: from, amount, status: "success", at }).hash;
    },
    revoke(from: Hex, pocket: Hex, at?: number) {
      const p = get(pocket); onlyOwner(p, from);
      p.revoked = true;
      return record({ pocket: p.address, kind: "revoke", from, status: "success", at }).hash;
    },
    returnFunds(from: Hex, pocket: Hex, at?: number) {
      const p = get(pocket); onlyOwner(p, from);
      const amount = bal(p.address);
      setBal(p.address, 0n); setBal(p.owner, bal(p.owner) + amount);
      return record({ pocket: p.address, kind: "return", from, counterparty: p.owner, amount, status: "success", at }).hash;
    },
    setSeller(from: Hex, pocket: Hex, seller: Hex, ok: boolean) {
      const p = get(pocket); onlyOwner(p, from);
      if (ok) p.allowed.add(lower(seller)); else p.allowed.delete(lower(seller));
      return record({ pocket: p.address, kind: "rules", from, status: "success", label: ok ? "Seller allowed" : "Seller removed" }).hash;
    },
    setCap(from: Hex, pocket: Hex, cap: bigint) {
      const p = get(pocket); onlyOwner(p, from);
      p.cap = cap;
      return record({ pocket: p.address, kind: "rules", from, status: "success", label: "Cap changed" }).hash;
    },
    setAskAbove(from: Hex, pocket: Hex, x: bigint) {
      const p = get(pocket); onlyOwner(p, from);
      p.askAbove = x;
      return record({ pocket: p.address, kind: "rules", from, status: "success", label: "Ask-me limit changed" }).hash;
    },
    setExpiresAt(from: Hex, pocket: Hex, t: bigint) {
      const p = get(pocket); onlyOwner(p, from);
      p.expiresAt = t;
      return record({ pocket: p.address, kind: "rules", from, status: "success", label: "Lifetime changed" }).hash;
    },

    /**
     * USDC.transferWithAuthorization from the pocket, as the facilitator submits it: the pocket's ERC-1271 check runs
     * canPay and, above the ask-me limit, needs the owner's signature too. A failed check reverts on-chain.
     */
    settle(pocket: Hex, to: Hex, amount: bigint, o2: { submitter: Hex; ownerSigned: boolean; at?: number }): { tx: Hex; ok: boolean; reason?: string } {
      const p = get(pocket);
      const rule = canPay(pocket, to, amount);
      const needs = amount > p.askAbove;
      if (rule !== "OK" || (needs && !o2.ownerSigned)) {
        const tx = record({ pocket: p.address, kind: "out", from: o2.submitter, counterparty: to, amount, status: "reverted", at: o2.at, label: "Reverted by the pocket" });
        return { tx: tx.hash, ok: false, reason: rule !== "OK" ? rule : "NEEDS_OWNER_APPROVAL" };
      }
      setBal(p.address, bal(p.address) - amount);
      setBal(to, bal(to) + amount);
      const tx = record({ pocket: p.address, kind: "payment", from: o2.submitter, counterparty: to, amount, status: "success", at: o2.at });
      return { tx: tx.hash, ok: true };
    },
  };
}
export type Chain = ReturnType<typeof createChain>;
