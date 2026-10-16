// What each pocket-app block shows, derived from the event stream only (the same events the phone and the console already
// read). A spec never carries a number: every figure on a pocket app comes from here, so the phone and the console agree and
// nothing is typed in. Amounts arrive as decimal strings (wire format) and leave as bigints in USDC units (6 decimals).
// No imports beyond the shared sim files: Metro, Vite and Node tests load it.
import { available, nextRuns, periodWindow, type Period, type Routine, type RoutineItem } from "./pocketApp";

type Ev = { type: string; pocket?: string; at: number; [k: string]: any };
const same = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
const big = (x: unknown): bigint => { try { return typeof x === "bigint" ? x : BigInt(String(x ?? "0")); } catch { return 0n; } };
const mine = (events: Ev[], pocket: string) => events.filter((e) => same(e.pocket, pocket));

export type Purchase = { at: number; sellerId: string; sku: string; amount: bigint; list?: bigint; tx?: string; cosigned: boolean; agent?: string; run?: number; routineId?: string };
/** Settled payments, oldest first. */
export function purchasesOf(events: Ev[], pocket: string): Purchase[] {
  return mine(events, pocket).filter((e) => e.type === "payment").map((e) => ({
    at: e.at, sellerId: String(e.sellerId), sku: String(e.sku), amount: big(e.amount), ...(e.list != null ? { list: big(e.list) } : {}),
    tx: e.tx, cosigned: !!e.cosigned, agent: e.agent, run: e.routine?.run, routineId: e.routine?.id,
  }));
}

export type Budget = {
  /** "period": a routine's allowance this period; "balance": what is left of what was put in. */
  kind: "period" | "balance";
  spent: bigint; limit: bigint; left: bigint; period?: Period; window?: { start: number; end: number };
  /** settled spend inside the period that was co-signed above the allowance */ over: bigint;
};
/** The budget meter. With a routine: this period's routine spend against its allowance (ERC20PeriodTransferEnforcer, no
 *  carry-over). Without: the balance against everything put in (funded minus returned). */
export function budgetOf(events: Ev[], pocket: string, o: { routine?: Routine | null; balance: bigint; funded?: bigint; now: number }): Budget {
  const pays = purchasesOf(events, pocket);
  if (o.routine) {
    const allowance = big(Math.round(Number(o.routine.allowance.amount) * 1e6));
    const rp = pays.filter((p) => p.routineId === o.routine!.id);
    const a = available(allowance, rp, o.routine.allowance.period, o.now);
    return { kind: "period", spent: a.spent, limit: allowance, left: a.left, period: o.routine.allowance.period, window: a.window, over: a.spent > allowance ? a.spent - allowance : 0n };
  }
  const spent = pays.reduce((n, p) => n + p.amount, 0n);
  const limit = o.funded ?? o.balance + spent;
  return { kind: "balance", spent: limit > o.balance ? limit - o.balance : spent, limit, left: o.balance, over: 0n };
}

export type Quote = { at: number; sellerId: string; sku: string; price: bigint; limit?: bigint; below: boolean; run?: number };
/** Every price the seller quoted to this pocket's routine, oldest first (price watch). */
export function quotesOf(events: Ev[], pocket: string, since = 0): Quote[] {
  return mine(events, pocket).filter((e) => e.type === "quote" && e.at >= since).map((e) => ({
    at: e.at, sellerId: String(e.sellerId), sku: String(e.sku), price: big(e.price), ...(e.limit != null ? { limit: big(e.limit) } : {}), below: !!e.below, run: e.run,
  }));
}

/** The price chart: quotes in range, the limit, buys marked at their price, and the low and high for the axis. */
export function priceSeries(events: Ev[], pocket: string, o: { now: number; days: number; limit?: bigint }) {
  const since = o.now - o.days * 86_400_000;
  const quotes = quotesOf(events, pocket, since);
  const buys = purchasesOf(events, pocket).filter((p) => p.at >= since);
  const limit = o.limit ?? quotes.at(-1)?.limit;
  const prices = [...quotes.map((q) => q.price), ...(limit != null ? [limit] : [])];
  const lo = prices.length ? prices.reduce((a, b) => (b < a ? b : a)) : 0n;
  const hi = prices.length ? prices.reduce((a, b) => (b > a ? b : a)) : 0n;
  const last = quotes.at(-1);
  const first = quotes[0];
  return { quotes, buys, limit, lo, hi, last, change: last && first && first.price > 0n ? Number(last.price - first.price) / Number(first.price) : 0 };
}

export type PriceChange = { sellerId: string; sku: string; from: bigint; to: bigint; pct: number; at: number };
/** Prices that moved between consecutive quotes or renewals of the same item, newest move per item, rises first. */
export function priceChanges(events: Ev[], pocket: string): PriceChange[] {
  const series = new Map<string, { at: number; price: bigint; sellerId: string; sku: string }[]>();
  const push = (sellerId: string, sku: string, at: number, price: bigint) => {
    const k = `${sellerId}/${sku}`;
    if (!series.has(k)) series.set(k, []);
    series.get(k)!.push({ at, price, sellerId, sku });
  };
  for (const q of quotesOf(events, pocket)) push(q.sellerId, q.sku, q.at, q.price);
  // a renewal is a quote too: the price it paid that day (skipped when the same run already logged its quote)
  for (const p of purchasesOf(events, pocket)) if (!quotesOf(events, pocket).some((q) => q.run === p.run && q.sku === p.sku && p.run != null)) push(p.sellerId, p.sku, p.at, p.amount);
  const out: PriceChange[] = [];
  for (const xs of series.values()) {
    xs.sort((a, b) => a.at - b.at);
    for (let i = xs.length - 1; i > 0; i--) {
      if (xs[i].price !== xs[i - 1].price) { out.push({ sellerId: xs[i].sellerId, sku: xs[i].sku, from: xs[i - 1].price, to: xs[i].price, pct: Number(xs[i].price - xs[i - 1].price) / Number(xs[i - 1].price), at: xs[i].at }); break; }
    }
  }
  return out.sort((a, b) => (b.pct > 0 ? 1 : 0) - (a.pct > 0 ? 1 : 0) || Math.abs(b.pct) - Math.abs(a.pct));
}

/** This month's spend by seller (subscriptions hero), largest first, and the month's window. */
export function monthBySeller(events: Ev[], pocket: string, now: number) {
  const w = periodWindow("month", now);
  const by = new Map<string, bigint>();
  for (const p of purchasesOf(events, pocket)) if (p.at >= w.start && p.at < w.end) by.set(p.sellerId, (by.get(p.sellerId) ?? 0n) + p.amount);
  const rows = [...by.entries()].map(([sellerId, amount]) => ({ sellerId, amount })).sort((a, b) => (b.amount > a.amount ? 1 : b.amount < a.amount ? -1 : 0));
  return { rows, total: rows.reduce((n, r) => n + r.amount, 0n), window: w };
}

export type Renewal = RoutineItem & { nextAt: number; last?: Purchase; lastAt?: number };
/** Each renewal by its next date with what it cost last time (a routine renews all its items on each run). */
export function renewalsOf(events: Ev[], pocket: string, routine: Routine): Renewal[] {
  const pays = purchasesOf(events, pocket).filter((p) => p.routineId === routine.id);
  return routine.items.map((it) => {
    const last = pays.filter((p) => p.sellerId === it.sellerId && p.sku === it.sku).at(-1);
    return { ...it, nextAt: routine.nextAt, ...(last ? { last, lastAt: last.at } : {}) };
  }).sort((a, b) => a.nextAt - b.nextAt || a.sellerId.localeCompare(b.sellerId));
}
/** The next `n` run times (the next-run block's day tiles). */
export const upcoming = (routine: Routine, n: number) => (routine.status === "active" ? [routine.nextAt, ...nextRuns(routine.cadence, routine.nextAt, n - 1)] : []);

export type Run = { run: number; at: number; scheduledFor?: number; early?: boolean; paid: bigint; outs: { sellerId: string; sku: string; outcome: string; amount?: string; reason?: string }[]; ignored: { sellerId: string; excerpt: string }[]; asked: boolean };
/** The routine's runs, newest first: what each paid, what it asked about, and any delivery that tried to change the routine. */
export function runsOf(events: Ev[], pocket: string): Run[] {
  const evs = mine(events, pocket).filter((e) => e.type === "routine");
  const out: Run[] = [];
  for (const e of evs) {
    if (e.kind !== "run") continue;
    const ignored = evs.filter((x) => x.kind === "ignored" && x.run === e.run && x.routineId === e.routineId).map((x) => ({ sellerId: String(x.sellerId), excerpt: String(x.excerpt ?? "") }));
    const outs = Array.isArray(e.outs) ? e.outs : [];
    out.push({ run: e.run, at: e.at, scheduledFor: e.scheduledFor, early: !!e.early, paid: big(e.paid), outs, ignored, asked: outs.some((o: { outcome: string }) => o.outcome === "cosigned" || o.outcome === "declined") });
  }
  return out.reverse();
}
/** A run in progress (between run-start and run), for the "running now" state. */
export function runningNow(events: Ev[], pocket: string): { run: number; since: number } | null {
  const evs = mine(events, pocket).filter((e) => e.type === "routine" && (e.kind === "run-start" || e.kind === "run"));
  const last = evs.at(-1);
  return last && last.kind === "run-start" ? { run: last.run, since: last.at } : null;
}

/** `accepting`: the agent offered exactly the seller's counter, which accepts it (no new offer). */
export type HaggleStep = { round: number; offer: bigint; reply: string; price: bigint; final: boolean; at: number; accepting: boolean };
/** The latest negotiation: list price, each offer and the seller's answer, and what was paid (haggler hero). */
export function haggleOf(events: Ev[], pocket: string) {
  const hs = mine(events, pocket).filter((e) => e.type === "haggle");
  const last = hs.at(-1);
  if (!last) {
    // a one-off without haggling: the single purchase is the whole story
    const p = purchasesOf(events, pocket).at(-1);
    return p ? { sellerId: p.sellerId, sku: p.sku, list: p.list ?? p.amount, steps: [] as HaggleStep[], paid: p.amount, paidAt: p.at, tx: p.tx, cosigned: p.cosigned } : null;
  }
  const steps: HaggleStep[] = hs.filter((e) => e.quoteId === last.quoteId).map((e) => ({ round: e.round, offer: big(e.offer), reply: String(e.reply), price: big(e.price), final: !!e.final, at: e.at, accepting: !!e.accepting }));
  const paid = purchasesOf(events, pocket).filter((p) => p.at >= (steps[0]?.at ?? 0) && p.sellerId === last.sellerId).at(-1);
  return { sellerId: String(last.sellerId), sku: String(last.sku), list: big(last.list), steps, paid: paid?.amount, paidAt: paid?.at, tx: paid?.tx, cosigned: paid?.cosigned ?? false };
}

/** Sellers this pocket paid, with each one's share of the spend (sources block). */
export function sourcesOf(events: Ev[], pocket: string) {
  const by = new Map<string, { amount: bigint; count: number }>();
  for (const p of purchasesOf(events, pocket)) { const x = by.get(p.sellerId) ?? { amount: 0n, count: 0 }; by.set(p.sellerId, { amount: x.amount + p.amount, count: x.count + 1 }); }
  const total = [...by.values()].reduce((n, x) => n + x.amount, 0n);
  return [...by.entries()].map(([sellerId, x]) => ({ sellerId, ...x, share: total > 0n ? Number(x.amount) / Number(total) : 0 })).sort((a, b) => b.share - a.share);
}

/** Saved against the seller's first price, across the pocket's negotiated payments. */
export function savingsOf(events: Ev[], pocket: string) {
  const ps = purchasesOf(events, pocket).filter((p) => p.list != null && p.list > p.amount);
  const saved = ps.reduce((n, p) => n + (p.list! - p.amount), 0n);
  const list = ps.reduce((n, p) => n + p.list!, 0n);
  return { saved, list, paid: list - saved, count: ps.length };
}
