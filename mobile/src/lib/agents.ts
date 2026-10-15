// Agents and spending, computed from what the store already holds (pockets, events, the ledger). Pure functions, no React,
// so Node tests cover them. Every figure the Home chart, the Agents screen and Agent detail show comes from here.
import { AGENTS, agentByAddress, type AgentId, type AgentStatus } from "../../../shared/sim/agents";
import { sameAddr, type LedgerRow, type WalletEvent } from "./events";

export type { AgentId, AgentStatus };
export const DAY = 86_400_000;

type PocketLike = { address: string; agent: string; balance: bigint; revoked: boolean; frozen?: boolean };

/** Which agent holds a pocket: its immutable agent key. On a real server every pocket uses the server's one agent key. */
export function agentIdOf(p: { agent: string } | undefined, serverAgent?: string): AgentId | undefined {
  if (!p) return undefined;
  const a = agentByAddress(p.agent)?.id;
  if (a) return a;
  return serverAgent && sameAddr(p.agent, serverAgent) ? "chainbrain" : undefined;
}

export type AgentView = {
  id: AgentId; name: string; maker: string; kind: "builtin" | "outside"; status: AgentStatus; connectedAt?: number; disconnectedAt?: number;
  pockets: string[]; balance: bigint; spent: bigint; spentToday: bigint; lastAt?: number; requestsToday: number; pending: number; payments: number; refusals: number;
};

/** The agents to show, with their numbers. `states` is the built-in network's registry; without it (a real server) only the
 *  built-in agent exists, because no outside agent can connect until the MCP server ships. */
export function agentViews(o: {
  pockets: PocketLike[]; events: WalletEvent[]; ledger: LedgerRow[]; pending: { pocket: string }[]; now?: number; serverAgent?: string;
  states?: { id: AgentId; status: AgentStatus; connectedAt?: number; disconnectedAt?: number }[];
}): AgentView[] {
  const now = o.now ?? Date.now();
  const dayStart = startOfDay(now);
  const list = o.states ? AGENTS.filter((a) => o.states!.some((s) => s.id === a.id)) : AGENTS.filter((a) => a.kind === "builtin");
  return list.map((a) => {
    const st = o.states?.find((s) => s.id === a.id);
    const mine = o.pockets.filter((p) => agentIdOf(p, o.serverAgent) === a.id);
    const has = (pocket?: string) => mine.some((p) => sameAddr(p.address, pocket));
    const rows = o.ledger.filter((r) => has(r.pocket));
    const pays = rows.filter((r) => r.kind === "payment");
    const evs = o.events.filter((e) => has(e.pocket));
    const acts = evs.filter((e) => e.type === "payment" || e.type === "refusal" || (e.type === "trace" && e.phase === "tool_call"));
    return {
      id: a.id, name: a.name, maker: a.maker, kind: a.kind,
      status: st?.status ?? "connected", connectedAt: st?.connectedAt, disconnectedAt: st?.disconnectedAt,
      pockets: mine.map((p) => p.address),
      balance: mine.reduce((n, p) => n + p.balance, 0n),
      spent: pays.reduce((n, r) => n + (r.amount ?? 0n), 0n),
      spentToday: pays.filter((r) => r.at >= dayStart).reduce((n, r) => n + (r.amount ?? 0n), 0n),
      lastAt: acts.at(-1)?.at,
      requestsToday: evs.filter((e) => e.type === "trace" && e.phase === "tool_call" && e.at >= dayStart).length,
      pending: o.pending.filter((x) => has(x.pocket)).length,
      payments: pays.length,
      refusals: rows.filter((r) => r.outcome === "refused").length,
    };
  });
}

export function startOfDay(t: number): number { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }

export type DaySpend = { day: number; total: bigint; byAgent: Partial<Record<AgentId, bigint>> };
/** Settled payments per calendar day, oldest first, for the last `days` days (today included). */
export function dailySpend(ledger: LedgerRow[], agentOfPocket: (pocket: string) => AgentId | undefined, days = 7, now = Date.now()): DaySpend[] {
  const today = startOfDay(now);
  const out: DaySpend[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    out.push({ day: d.getTime(), total: 0n, byAgent: {} });
  }
  for (const r of ledger) {
    if (r.kind !== "payment" || !r.amount) continue;
    let slot: DaySpend | undefined;
    for (const s of out) if (r.at >= s.day) slot = s;
    if (!slot || r.at >= today + DAY) continue;
    slot.total += r.amount;
    const a = agentOfPocket(r.pocket);
    if (a) slot.byAgent[a] = (slot.byAgent[a] ?? 0n) + r.amount;
  }
  return out;
}

/** This week (the last 7 days) against the 7 days before. `delta` is null when there is nothing to compare with. */
export function weekOverWeek(ledger: LedgerRow[], now = Date.now()): { thisWeek: bigint; lastWeek: bigint; delta: number | null; since?: number } {
  const t0 = startOfDay(now) + DAY - 7 * DAY, t1 = t0 - 7 * DAY;
  let thisWeek = 0n, lastWeek = 0n, first: number | undefined;
  for (const r of ledger) {
    if (r.kind !== "payment" || !r.amount) continue;
    first = first == null ? r.at : Math.min(first, r.at);
    if (r.at >= t0) thisWeek += r.amount; else if (r.at >= t1) lastWeek += r.amount;
  }
  // only a fair comparison when the history really covers last week
  const delta = lastWeek > 0n && first != null && first <= t1 + DAY ? Number(thisWeek - lastWeek) / Number(lastWeek) : null;
  return { thisWeek, lastWeek, delta, since: first };
}

/** "Active 3 min ago" / "Idle" style line for an agent. */
export function activityLine(a: Pick<AgentView, "status" | "lastAt" | "pending">, now = Date.now(), busy = false): { text: string; tone: "live" | "idle" | "off" | "wait" } {
  if (a.status === "disconnected") return { text: "Disconnected", tone: "off" };
  if (a.pending > 0) return { text: a.pending === 1 ? "Waiting for your OK" : `${a.pending} requests waiting`, tone: "wait" };
  if (busy) return { text: "Working now", tone: "live" };
  if (!a.lastAt) return { text: "Ready", tone: "idle" };
  const m = Math.round((now - a.lastAt) / 60_000);
  if (m < 15) return { text: m <= 1 ? "Active just now" : `Active ${m} min ago`, tone: "live" };
  return { text: `Last active ${ago(a.lastAt, now)}`, tone: "idle" };
}

export function ago(t: number, now = Date.now()): string {
  const m = Math.round((now - t) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}
