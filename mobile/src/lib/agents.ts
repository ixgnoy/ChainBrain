// Agents and spending, computed from what the store already holds (pockets, events, the ledger). Pure functions, no React,
// so Node tests cover them. Every figure the Home chart, the Agents screen and Agent detail show comes from here.
import { AGENTS, agentByAddress, type AgentId, type AgentStatus } from "../../../shared/sim/agents";
import { sameAddr, type LedgerRow, type WalletEvent } from "./events";

export type { AgentId, AgentStatus };
export const DAY = 86_400_000;

type PocketLike = { address: string; agent: string; balance: bigint; revoked: boolean; frozen?: boolean };

/**
 * Which agent holds a pocket: its immutable agent key. On a real server (serverAgent given) every card's agent is
 * ChainBrain's: the shared legacy key or a key derived for that card alone (POST /v1/cards/agent), since no outside agent
 * can connect there yet.
 */
export function agentIdOf(p: { agent: string } | undefined, serverAgent?: string): AgentId | undefined {
  if (!p) return undefined;
  const a = agentByAddress(p.agent)?.id;
  if (a) return a;
  return serverAgent ? "chainbrain" : undefined;
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
      refusals: rows.filter((r) => r.kind === "refusal").length, // pay-time refusals only (a quote-time block of the same attempt is not counted twice)
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

// ---- an agent's own ledger (Agent detail): what it did, step by step, in plain words, newest first

export type AgentStep = {
  key: string; at: number; pocket: string;
  kind: "search" | "quote" | "ask" | "task" | "paid" | "refused" | "connected" | "disconnected";
  title: string; detail?: string; amount?: bigint; tx?: string;
  status: { label: string; tone: "fill" | "blue" | "vermillion" | "green" | "ink" };
  approvalId?: string; note?: string;
};

const atomic = (v: unknown): bigint | undefined => { try { return v == null ? undefined : BigInt(String(v)); } catch { return undefined; } };
const cents = (s?: string): bigint | undefined => {
  if (!s || !/^\d+(\.\d+)?$/.test(s)) return undefined;
  const [a, b = ""] = s.split(".");
  return BigInt(a) * 1_000_000n + BigInt((b + "000000").slice(0, 6));
};

/** Steps for the given pockets (an agent's), from the events the phone already holds. `name` names a seller id. */
export function agentSteps(events: WalletEvent[], pockets: string[], name: (sellerId?: string) => string, plainReason: (code?: string) => string): AgentStep[] {
  const mine = (p?: string) => pockets.some((x) => sameAddr(x, p));
  const out: AgentStep[] = [];
  const approvals = new Map<string, AgentStep>();
  for (const e of events) {
    if (!mine(e.pocket)) continue;
    const base = { key: `${e.id ?? e.at}:${e.type}`, at: e.at, pocket: e.pocket! };
    if (e.type === "trace" && e.phase === "tool_result") {
      const r = typeof e.result === "string" ? (() => { try { return JSON.parse(e.result); } catch { return {}; } })() : e.result ?? {};
      if (e.tool === "search_sellers" && r.ok) {
        const all = Array.isArray(r.sellers) ? r.sellers : [];
        const ok = all.filter((s: any) => s.allowedByPocket).map((s: any) => s.name);
        out.push({ ...base, kind: "search", title: "Searched sellers", detail: ok.length ? `Allowed here: ${ok.join(", ")}` : "None allowed in this card", status: { label: "Checked", tone: "fill" } });
      } else if (e.tool === "get_quote" && r.ok && !r.free) {
        const blocked = r.allowedByPocket !== "OK";
        out.push({ ...base, kind: "quote", title: `Quote from ${name(r.sellerId)}`, detail: r.description, amount: cents(r.price),
          status: blocked ? { label: "Not allowed", tone: "vermillion" } : r.counterpartyRisk ? { label: `Risk ${r.counterpartyRisk.score}/10`, tone: r.counterpartyRisk.verdict === "ok" ? "fill" : "vermillion" } : { label: "Checked", tone: "fill" } });
      }
    } else if (e.type === "payment") {
      out.push({ ...base, kind: "paid", title: `Paid ${name(e.sellerId)}`, amount: atomic(e.amount), tx: e.tx, detail: e.cosigned ? "Co-signed by you" : "Inside the card's limits", status: { label: "Paid", tone: "green" } });
    } else if (e.type === "refusal") {
      out.push({ ...base, kind: "refused", title: `Asked to pay ${name(e.sellerId)}`, amount: atomic(e.amount), detail: plainReason(e.reason), status: { label: "Refused", tone: "vermillion" } });
    } else if (e.approval?.id && (e.approval.kind === "payment" || e.approval.kind === "intent")) {
      const a = e.approval;
      const st = a.status === "pending" ? { label: "Waiting for you", tone: "blue" as const } : a.status === "approved" ? { label: a.kind === "payment" ? "Co-signed" : "Confirmed", tone: "ink" as const }
        : a.status === "timeout" ? { label: "Expired", tone: "fill" as const } : { label: "Declined", tone: "fill" as const };
      const step: AgentStep = a.kind === "payment"
        ? { ...base, key: `approval:${a.id}`, kind: "ask", title: `Asked to pay ${name(a.data?.sellerId)}`, amount: cents(a.data?.amount), detail: a.data?.description, note: a.text, status: st, approvalId: a.id }
        : { ...base, key: `approval:${a.id}`, kind: "task", title: "Asked you to confirm a task", detail: String(a.text ?? "").split("\n")[0]?.replace(/^Buy:\s*/, ""), status: st, approvalId: a.id };
      const old = approvals.get(a.id);
      if (old) Object.assign(old, { status: st, at: e.at }); else { approvals.set(a.id, step); out.push(step); }
    }
  }
  return out.sort((x, y) => y.at - x.at);
}
