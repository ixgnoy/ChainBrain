// Reads the network straight from the chain: every pocket the factory created, its live rules, and its on-chain history
// (create, fund, payments, return, revoke, rule changes). Read-only; works against /dev/rpc or a public Base Sepolia RPC.
import { createPublicClient, http, parseAbiItem, type Address, type Hex, type PublicClient } from "viem";
import type { Config } from "../shared";

export type PocketState = {
  address: Address; owner: Address; agent: Address; createdTx?: Hex; createdBlock?: bigint;
  balance: bigint; cap: bigint; askAbove: bigint; expiresAt: number; revoked: boolean; allowed: string[];
  /** The owner's own label for it (only a phone knows it; the chain has none). */
  name?: string;
};
export type TxKind = "create" | "fund" | "payment" | "return" | "out" | "revoke" | "rules";
export type ChainTx = {
  hash: Hex; block: bigint; logIndex: number; pocket: Address; kind: TxKind; amount?: bigint; counterparty?: Address;
  /** Known when the source has them (the built-in network); logs alone do not carry them. */
  at?: number; from?: Address; status?: "success" | "reverted";
};

const CREATED = parseAbiItem("event PocketCreated(address indexed pocket, address indexed owner, address indexed agent)");
const TRANSFER = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
const REVOKED = parseAbiItem("event Revoked()");
const RULES = parseAbiItem("event RulesChanged()");

export const clientFor = (rpcUrl: string): PublicClient => createPublicClient({ transport: http(rpcUrl, { batch: true }) });

/** First block to scan: the fork point on the dev stack (no upstream history), otherwise a recent window. */
export async function scanFrom(client: PublicClient, dev: boolean, window = 20_000n): Promise<bigint> {
  if (dev) {
    try {
      const info = (await client.request({ method: "anvil_nodeInfo" as any })) as any;
      const fork = info?.forkConfig?.forkBlockNumber;
      if (fork != null) return BigInt(fork) + 1n;
    } catch { /* not anvil: fall through */ }
  }
  const latest = await client.getBlockNumber();
  return latest > window ? latest - window : 0n;
}

export async function loadPockets(client: PublicClient, cfg: Config, fromBlock: bigint, extra: string[] = []): Promise<PocketState[]> {
  const logs = await client.getLogs({ address: cfg.factory, event: CREATED, fromBlock });
  const created = new Map(logs.map((l) => [l.args.pocket!.toLowerCase(), l]));
  const addrs = [...new Set([...created.keys(), ...extra.map((a) => a.toLowerCase())])] as Address[];
  const read = (address: Address, functionName: string, args: unknown[] = []) => client.readContract({ address, abi: cfg.abis.pocket, functionName, args } as any) as Promise<any>;
  const states = await Promise.all(addrs.map(async (address) => {
    try {
      const [owner, agent, cap, askAbove, expiresAt, revoked, balance, ...allowedFlags] = await Promise.all([
        read(address, "owner"), read(address, "agent"), read(address, "perPaymentCap"), read(address, "askAbove"), read(address, "expiresAt"), read(address, "revoked"),
        client.readContract({ address: cfg.usdc, abi: cfg.abis.erc20, functionName: "balanceOf", args: [address] } as any) as Promise<bigint>,
        ...cfg.sellers.map((s) => read(address, "sellerAllowed", [s.payTo])),
      ]);
      const log = created.get(address.toLowerCase());
      return { address: (log?.args.pocket ?? address) as Address, owner, agent, cap, askAbove, expiresAt: Number(expiresAt), revoked, balance, allowed: cfg.sellers.filter((_, i) => allowedFlags[i]).map((s) => s.id), createdTx: log?.transactionHash ?? undefined, createdBlock: log?.blockNumber ?? undefined } as PocketState;
    } catch { return null; } // not a pocket (or not readable on this chain)
  }));
  return states.filter((s): s is PocketState => !!s).sort((a, b) => Number((b.createdBlock ?? 0n) - (a.createdBlock ?? 0n)));
}

/** Every on-chain step of the given pockets, oldest first. */
export async function loadHistory(client: PublicClient, cfg: Config, pockets: PocketState[], fromBlock: bigint): Promise<ChainTx[]> {
  if (!pockets.length) return [];
  const list = pockets.map((p) => p.address);
  const owners = new Map(pockets.map((p) => [p.address.toLowerCase(), p.owner.toLowerCase()]));
  const sellers = new Set(cfg.sellers.map((s) => s.payTo.toLowerCase()));
  const [incoming, outgoing, revokes, rules] = await Promise.all([
    client.getLogs({ address: cfg.usdc, event: TRANSFER, args: { to: list }, fromBlock }),
    client.getLogs({ address: cfg.usdc, event: TRANSFER, args: { from: list }, fromBlock }),
    client.getLogs({ address: list, event: REVOKED, fromBlock }),
    client.getLogs({ address: list, event: RULES, fromBlock }),
  ]);
  const out: ChainTx[] = [];
  for (const p of pockets) if (p.createdTx && p.createdBlock != null) out.push({ hash: p.createdTx, block: p.createdBlock, logIndex: -1, pocket: p.address, kind: "create", counterparty: p.owner });
  for (const l of incoming) out.push({ hash: l.transactionHash!, block: l.blockNumber!, logIndex: l.logIndex!, pocket: l.args.to!, kind: "fund", amount: l.args.value, counterparty: l.args.from });
  for (const l of outgoing) {
    const to = l.args.to!.toLowerCase(), owner = owners.get(l.args.from!.toLowerCase());
    out.push({ hash: l.transactionHash!, block: l.blockNumber!, logIndex: l.logIndex!, pocket: l.args.from!, kind: sellers.has(to) ? "payment" : to === owner ? "return" : "out", amount: l.args.value, counterparty: l.args.to });
  }
  for (const l of revokes) out.push({ hash: l.transactionHash!, block: l.blockNumber!, logIndex: l.logIndex!, pocket: l.address, kind: "revoke" });
  for (const l of rules) out.push({ hash: l.transactionHash!, block: l.blockNumber!, logIndex: l.logIndex!, pocket: l.address, kind: "rules" });
  // a create tx also emits RulesChanged in some versions; keep one row per (hash, kind)
  const seen = new Set<string>();
  return out.sort((a, b) => Number(a.block - b.block) || a.logIndex - b.logIndex).filter((t) => { const k = `${t.hash}-${t.kind}-${t.logIndex}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

export const TX_LABEL: Record<TxKind, string> = { create: "Pocket created", fund: "Funded", payment: "Agent payment", return: "Returned to owner", out: "Transfer out", revoke: "Revoked", rules: "Rules changed" };
