// Reads the network straight from the chain: every pocket the factory created, its live rules, and its on-chain history
// (create, fund, payments, return, revoke, rule changes). Read-only; works against /dev/rpc or the FISCO node's RPC.
import { createPublicClient, http, parseAbiItem, type Address, type Hex, type Log, type PublicClient } from "viem";
import type { Config } from "../shared";

export type PocketState = {
  address: Address; owner: Address; agent: Address; createdTx?: Hex; createdBlock?: bigint;
  balance: bigint; cap: bigint; askAbove: bigint; expiresAt: number; revoked: boolean; allowed: string[];
  /** Pocket.frozen: the Sentinel (or the owner) stopped all payments; only the owner can unfreeze. */
  frozen?: boolean;
  /** Pocket.periodKind (0 none, 1 day, 2 week, 3 month, Hong Kong calendar), periodLimit and spentThisPeriod(): the allowance the contract enforces. */
  periodKind?: number; periodLimit?: bigint; spentThisPeriod?: bigint;
  /** The owner's own label for it (only a phone knows it; the chain has none). */
  name?: string;
};
export type TxKind = "create" | "fund" | "payment" | "return" | "out" | "revoke" | "rules";
export type ChainTx = {
  hash: Hex; block: bigint; logIndex: number; pocket: Address; kind: TxKind; amount?: bigint; counterparty?: Address;
  /** Known when the source has them (the built-in network); logs alone do not carry them. */
  at?: number; from?: Address; status?: "success" | "reverted";
  /** The contract function called, why a reverted transaction reverted, the call's arguments and a short label (built-in network and linked phone). */
  method?: string; reason?: string; args?: Record<string, string>; label?: string;
};

/** A bigint from whatever an event carried; 0 when it is missing or not numeric (one odd event must never break a screen). */
export const toBig = (v: unknown): bigint => { try { return v == null || v === "" ? 0n : BigInt(v as string); } catch { return 0n; } };

const CREATED = parseAbiItem("event PocketCreated(address indexed pocket, address indexed owner, address indexed agent)");
const TRANSFER = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
const REVOKED = parseAbiItem("event Revoked()");
const RULES = parseAbiItem("event RulesChanged()");
const FROZEN = parseAbiItem("event Frozen(address indexed by, bytes32 reason)");
const UNFROZEN = parseAbiItem("event Unfrozen()");

// Not batched: FISCO 3.16.4 answers a one-element JSON-RPC batch with a bare object (the local node does; probe, round 6),
// which viem's batching can't match, so reads failed and receipt waits never resolved.
export const clientFor = (rpcUrl: string): PublicClient => createPublicClient({ transport: http(rpcUrl) });

/** First block to scan: a recent window (the dev stack's fresh factory has no older pockets anyway). */
// ponytail: fixed window; scan from the factory's deploy block if the chain outgrows it
export async function scanFrom(client: PublicClient, _dev: boolean, window = 20_000n): Promise<bigint> {
  const latest = await client.getBlockNumber({ cacheTime: 0 });
  return latest > window ? latest - window : 0n;
}

/**
 * The console's own log index. FISCO nodes can silently drop logs past 10 blocks per eth_getLogs call (and need an
 * address), so the console never asks for a wide range: it scans only the blocks it hasn't seen, 10 at a time (up to 50
 * calls in flight), and keeps every log it found. A FISCO block exists only when there was a transaction, so
 * the chain stays small and the first scan is short.
 */
export type ChainIndex = {
  /** Scan from where the last sync stopped (or `fromBlock` the first time) to the head. */
  sync(fromBlock: bigint): Promise<void>;
  created: Log[]; transfers: Log[]; pocketLogs: Log[];
};
const POCKET_EVENTS = [REVOKED, RULES, FROZEN, UNFROZEN];
export function chainIndex(client: PublicClient, cfg: Pick<Config, "factory" | "token">, step = 10n): ChainIndex {
  const idx: ChainIndex = { created: [], transfers: [], pocketLogs: [], sync };
  let next: bigint | undefined;
  const known = new Set<string>();
  let running: Promise<void> | undefined;
  async function scan(from: bigint, to: bigint) {
    const ranges: [bigint, bigint][] = [];
    for (let a = from; a <= to; a += step) ranges.push([a, a + step - 1n < to ? a + step - 1n : to]);
    for (let i = 0; i < ranges.length; i += 50) {
      const part = ranges.slice(i, i + 50);
      // pockets first: a new pocket's own events can only come after its creation, so they join the next calls' address list
      const made = (await Promise.all(part.map(([fromBlock, toBlock]) => client.getLogs({ address: cfg.factory, event: CREATED, fromBlock, toBlock })))).flat() as Log[];
      const pockets = [...new Set([...known, ...made.map((l) => (l as any).args.pocket.toLowerCase())])] as Address[];
      const [tr, pe] = await Promise.all([
        Promise.all(part.map(([fromBlock, toBlock]) => client.getLogs({ address: cfg.token, event: TRANSFER, fromBlock, toBlock }))),
        pockets.length ? Promise.all(part.map(([fromBlock, toBlock]) => client.getLogs({ address: pockets, events: POCKET_EVENTS, fromBlock, toBlock } as any))) : Promise.resolve([]),
      ]);
      // commit the chunk only once all of its calls answered, and move on: a failed call later retries from here, not
      // from the start, and nothing is indexed twice
      idx.created.push(...made);
      for (const l of made) known.add((l as any).args.pocket.toLowerCase());
      for (const ls of tr) idx.transfers.push(...(ls as Log[]));
      for (const ls of pe as Log[][]) idx.pocketLogs.push(...ls);
      next = part[part.length - 1][1] + 1n;
    }
  }
  function sync(fromBlock: bigint) {
    running ??= (async () => {
      const head = await client.getBlockNumber({ cacheTime: 0 });
      // the chain was reset (its head is behind what we indexed): start over
      if (next !== undefined && head + 1n < next) { idx.created.length = 0; idx.transfers.length = 0; idx.pocketLogs.length = 0; known.clear(); next = undefined; }
      const from = next ?? fromBlock;
      if (from <= head) await scan(from, head);
      next = head + 1n;
    })().finally(() => { running = undefined; });
    return running;
  }
  return idx;
}

/** Every pocket the index knows, read from the chain. `prev`: the last good reads; a pocket whose read fails this time (a
 *  timeout, a busy RPC) keeps its last state instead of vanishing from the screen. */
export async function loadPockets(client: PublicClient, cfg: Config, index: ChainIndex, extra: string[] = [], prev: PocketState[] = []): Promise<PocketState[]> {
  const last = new Map(prev.map((p) => [p.address.toLowerCase(), p]));
  const logs = index.created as unknown as { args: { pocket?: Address }; transactionHash: Hex | null; blockNumber: bigint | null }[];
  const created = new Map(logs.map((l) => [l.args.pocket!.toLowerCase(), l]));
  const addrs = [...new Set([...created.keys(), ...extra.map((a) => a.toLowerCase())])] as Address[];
  const read = (address: Address, functionName: string, args: unknown[] = []) => client.readContract({ address, abi: cfg.abis.pocket, functionName, args } as any) as Promise<any>;
  const states = await Promise.all(addrs.map(async (address) => {
    try {
      const [owner, agent, cap, askAbove, expiresAt, revoked, frozen, periodKind, periodLimit, spentThisPeriod, balance, ...allowedFlags] = await Promise.all([
        read(address, "owner"), read(address, "agent"), read(address, "perPaymentCap"), read(address, "askAbove"), read(address, "expiresAt"), read(address, "revoked"),
        read(address, "frozen").catch(() => false), // pockets from an older factory have no freeze
        read(address, "periodKind").catch(() => 0), read(address, "periodLimit").catch(() => 0n), read(address, "spentThisPeriod").catch(() => 0n), // nor an allowance
        client.readContract({ address: cfg.token, abi: cfg.abis.erc20, functionName: "balanceOf", args: [address] } as any) as Promise<bigint>,
        ...cfg.sellers.map((s) => read(address, "sellerAllowed", [s.payTo])),
      ]);
      const log = created.get(address.toLowerCase());
      return { address: (log?.args.pocket ?? address) as Address, owner, agent, cap, askAbove, expiresAt: Number(expiresAt), revoked, frozen: !!frozen, periodKind: Number(periodKind), periodLimit: toBig(periodLimit), spentThisPeriod: toBig(spentThisPeriod), balance, allowed: cfg.sellers.filter((_, i) => allowedFlags[i]).map((s) => s.id), createdTx: log?.transactionHash ?? undefined, createdBlock: log?.blockNumber ?? undefined } as PocketState;
    } catch { return last.get(address.toLowerCase()) ?? null; } // not a pocket, or not readable this time (then its last state)
  }));
  return states.filter((s): s is PocketState => !!s).sort((a, b) => Number((b.createdBlock ?? 0n) - (a.createdBlock ?? 0n)));
}

/** Every on-chain step of the given pockets, oldest first, from the index. */
export function loadHistory(cfg: Config, pockets: PocketState[], index: ChainIndex): ChainTx[] {
  if (!pockets.length) return [];
  const mine = new Set(pockets.map((p) => p.address.toLowerCase()));
  const owners = new Map(pockets.map((p) => [p.address.toLowerCase(), p.owner.toLowerCase()]));
  const sellers = new Set(cfg.sellers.map((s) => s.payTo.toLowerCase()));
  const T = index.transfers as unknown as { args: { from: Address; to: Address; value: bigint }; transactionHash: Hex; blockNumber: bigint; logIndex: number }[];
  const P = index.pocketLogs as unknown as { eventName: string; args: any; address: Address; transactionHash: Hex; blockNumber: bigint; logIndex: number }[];
  const out: ChainTx[] = [];
  for (const p of pockets) if (p.createdTx && p.createdBlock != null) out.push({ hash: p.createdTx, block: p.createdBlock, logIndex: -1, pocket: p.address, kind: "create", counterparty: p.owner });
  for (const l of T) {
    if (mine.has(l.args.to.toLowerCase())) out.push({ hash: l.transactionHash, block: l.blockNumber, logIndex: l.logIndex, pocket: l.args.to, kind: "fund", amount: l.args.value, counterparty: l.args.from });
    if (mine.has(l.args.from.toLowerCase())) {
      const to = l.args.to.toLowerCase(), owner = owners.get(l.args.from.toLowerCase());
      out.push({ hash: l.transactionHash, block: l.blockNumber, logIndex: l.logIndex, pocket: l.args.from, kind: sellers.has(to) ? "payment" : to === owner ? "return" : "out", amount: l.args.value, counterparty: l.args.to });
    }
  }
  for (const l of P) {
    if (!mine.has(l.address.toLowerCase())) continue;
    const base = { hash: l.transactionHash, block: l.blockNumber, logIndex: l.logIndex, pocket: l.address };
    if (l.eventName === "Revoked") out.push({ ...base, kind: "revoke" });
    else if (l.eventName === "RulesChanged") out.push({ ...base, kind: "rules" });
    else if (l.eventName === "Frozen") out.push({ ...base, kind: "rules", method: "freeze", label: l.args.by?.toLowerCase() === owners.get(l.address.toLowerCase()) ? "Frozen by the owner" : "Frozen by the Sentinel" });
    else if (l.eventName === "Unfrozen") out.push({ ...base, kind: "rules", method: "unfreeze", label: "Unfrozen by the owner" });
  }
  // a create tx also emits RulesChanged in some versions; keep one row per (hash, kind)
  const seen = new Set<string>();
  return out.sort((a, b) => Number(a.block - b.block) || a.logIndex - b.logIndex).filter((t) => { const k = `${t.hash}-${t.kind}-${t.logIndex}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

export const TX_LABEL: Record<TxKind, string> = { create: "Pocket created", fund: "Funded", payment: "Agent payment", return: "Returned to owner", out: "Transfer out", revoke: "Revoked", rules: "Rules changed" };
