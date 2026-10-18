import { parseAbiItem } from "viem";
import { pub } from "../wallet/chain";
import { cfg } from "../chains";
import { LOG_STEP } from "../ledger";
import type { Transfer, TransferSource } from "./exposure";

const TRANSFER = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
// FISCO nodes can silently drop logs past 10 blocks per eth_getLogs call (ledger.ts): walk in LOG_STEP chunks
const STEP = process.env.RADAR_LOG_STEP ? BigInt(process.env.RADAR_LOG_STEP) : LOG_STEP;
// ponytail: back-fill only this many recent blocks at start (~1 h on Base); a hosted indexer would give full history.
const BACKFILL = BigInt(process.env.RADAR_BACKFILL_BLOCKS ?? 1_800);
const MAX_TRANSFERS = 200_000;

/**
 * Radar's own index of eHKD transfers, so tracing never depends on an RPC's log-range limit.
 * Back-fills recent blocks once, then each read first pulls any new blocks (one in-flight sync at a time).
 */
const byTo = new Map<string, Transfer[]>();
const byFrom = new Map<string, Transfer[]>();
let next: bigint | undefined;
let count = 0;
let gaps = 0;
let syncing: Promise<void> | undefined;

function add(t: Transfer) {
  if (count >= MAX_TRANSFERS) return;
  count++;
  const push = (m: Map<string, Transfer[]>, k: string) => (m.get(k) ?? m.set(k, []).get(k)!).push(t);
  push(byTo, t.to.toLowerCase());
  push(byFrom, t.from.toLowerCase());
}

async function pull(): Promise<void> {
  const latest = await pub().getBlockNumber();
  let at: bigint = next ?? (latest > BACKFILL ? latest - BACKFILL : 0n);
  while (at <= latest) {
    const to: bigint = at + STEP - 1n < latest ? at + STEP - 1n : latest;
    try {
      const ls = await pub().getLogs({ address: cfg().token, event: TRANSFER, fromBlock: at, toBlock: to });
      for (const l of ls) add({ from: l.args.from!, to: l.args.to!, value: l.args.value!, tx: l.transactionHash!, block: l.blockNumber! });
    } catch {
      gaps++; // a skipped range: screens report themselves partial from now on
    }
    at = next = to + 1n;
  }
  next = at;
}

export function sync(): Promise<void> {
  syncing ??= pull().finally(() => (syncing = undefined));
  return syncing;
}

const read = (m: Map<string, Transfer[]>, a: string) => async () => {
  await sync();
  const ts = (m.get(a.toLowerCase()) ?? []).slice();
  return gaps || count >= MAX_TRANSFERS ? Object.assign(ts, { partial: true }) : ts;
};

export const chainSource: TransferSource = {
  inbound: (a) => read(byTo, a)(),
  outbound: (a) => read(byFrom, a)(),
};

export const indexStats = () => ({ transfers: count, nextBlock: next?.toString(), gaps });
/** Tests: forget the index (the next read back-fills again). */
export function clearChainCache() {
  byTo.clear();
  byFrom.clear();
  next = undefined;
  count = gaps = 0;
}
