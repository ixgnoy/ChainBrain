// Pure rules behind the Live page: grouping the trace into turns, the "N new" hold, the decision strip, the presenter
// headline and the small time formats. No React, so each rule is tested (live.test.ts).
import type { TraceRow } from "../lib/trace";
import type { WalletEvent } from "../lib/events";
import { cleanText } from "../lib/sanitize";
import { REASONS } from "../shared";
import { injectionsIn } from "./story";
import { curSign } from "../shared";

// ------------------------------------------------------------------ turns
export type Turn = { key: string; at: number; end: number; rows: TraceRow[]; calls: number; task?: string };
const GAP_MS = 60_000;
const isCall = (r: TraceRow) => r.event.type === "trace" && r.label !== "reply" && r.label !== "thinking";

/** Chronological rows -> turns. A turn ends with the agent's reply, or when the agent was quiet for a minute. */
export function groupTurns(rows: TraceRow[]): Turn[] {
  const turns: Turn[] = [];
  let cur: Turn | undefined;
  let closed = true;
  for (const r of rows) {
    const last = cur?.rows.at(-1);
    if (!cur || closed || (last && r.at - (last.doneAt ?? last.at) > GAP_MS)) {
      cur = { key: r.key, at: r.at, end: r.at, rows: [], calls: 0 };
      turns.push(cur);
    }
    cur.rows.push(r);
    cur.end = Math.max(cur.end, r.doneAt ?? r.at);
    if (isCall(r)) cur.calls++;
    if (r.label === "task approval" && !cur.task) cur.task = cleanText(r.title, 120);
    closed = r.label === "reply";
  }
  return turns;
}

/** "+0.4s", "+12.0s", "+1m 05s": time since the turn began. */
export function offsetLabel(ms: number): string {
  const s = Math.max(0, ms) / 1000;
  return s < 60 ? `+${s.toFixed(1)}s` : `+${Math.floor(s / 60)}m ${String(Math.floor(s % 60)).padStart(2, "0")}s`;
}
/** "0.4 s", "1.2 s", "1 m 05 s" for a whole turn. */
export function durationLabel(ms: number): string {
  const s = Math.max(0, ms) / 1000;
  return s < 60 ? `${s.toFixed(1)} s` : `${Math.floor(s / 60)} m ${String(Math.floor(s % 60)).padStart(2, "0")} s`;
}

// ------------------------------------------------------------------ holding the list still
/**
 * Rows that may be shown. While the viewer reads (scrolled down, paused, pointer over the list) the set of visible keys is
 * frozen at the moment that began; rows that arrive later wait behind an "N new" button. Letting go shows everything.
 */
export function holdKeys(prev: Set<string> | null, keys: string[], hold: boolean): Set<string> | null {
  if (!hold) return null;
  return prev ?? new Set(keys);
}
export const waiting = (keys: string[], held: Set<string> | null) => (held ? keys.filter((k) => !held.has(k)).length : 0);

// ------------------------------------------------------------------ decision strip
export type DecisionKind = "paid" | "refused" | "blocked" | "ignored" | "settled";
export type Decision = { key: string; kind: DecisionKind; tip: string };
const DECISION_TIP: Record<DecisionKind, string> = { paid: "Paid", refused: "Refused", blocked: "Forced transfer reverted", ignored: "Injected order ignored", settled: "Forced transfer NOT refused" };

/** The last `n` decisions the wallet took for one pocket, oldest first. */
export function decisionsOf(events: WalletEvent[], n = 20): Decision[] {
  const out: Decision[] = [];
  events.forEach((e, i) => {
    let kind: DecisionKind | undefined;
    if (e.type === "payment") kind = "paid";
    else if (e.type === "refusal" || e.type === "disclosure") kind = "refused";
    else if (e.type === "forced") kind = e.reverted ? "blocked" : "settled";
    else if (injectionsIn([e]).length) kind = "ignored";
    if (kind) out.push({ key: `${i}-${e.at}-${kind}`, kind, tip: DECISION_TIP[kind] });
  });
  return out.slice(-n);
}

// ------------------------------------------------------------------ presenter headline
export type Headline = { kind: "ok" | "refused" | "stepup"; text: string; code?: string };
/** The verdict of the most recent decision, in one plain line for the big screen. `injections` are the orders the agent ignored. */
export function headlineOf(rows: TraceRow[], injections: { at: number; seller: string }[] = [], nameOf: (id: string) => string = (id) => id): Headline | undefined {
  let best: (Headline & { at: number }) | undefined;
  for (let i = rows.length - 1; i >= 0 && !best; i--) {
    const r = rows[i];
    const code = r.reasons[0];
    if (r.label === "forced transfer") best = { at: r.at, kind: r.verdict === "Reverted" ? "ok" : "refused", text: r.verdict === "Reverted" ? "Reverted: the pocket refused the forced transfer and the balance did not move" : "The forced transfer was not refused" };
    else if (code) best = { at: r.at, kind: "refused", text: `Refused: ${REASONS[code] ?? "the wallet said no"}`, code };
    else if (r.verdict === "Paid") {
      // "Paid Exa US$0.007": the seller's name and the amount, not the item code
      const e = r.event as any;
      let amount = "";
      try { amount = e.type === "payment" ? ` ${curSign()}${(Number(BigInt(e.amount)) / 1e6).toFixed(2)}` : ""; } catch { /* no amount */ }
      best = { at: r.at, kind: "ok", text: e.type === "payment" && e.sellerId ? `Paid ${cleanText(nameOf(String(e.sellerId)), 40)}${amount}${e.cosigned ? ", co-signed by the owner" : ""}` : `Paid: ${cleanText(r.title, 90)}` };
    }
    else if (r.verdict === "Needs you") best = { at: r.at, kind: "stepup", text: `Needs you: ${cleanText(r.title, 90)}` };
  }
  const inj = injections.at(-1);
  if (inj && (!best || inj.at > best.at)) return { kind: "stepup", text: `Ignored: ${inj.seller} tried to give the agent an order` };
  if (!best) return undefined;
  const { kind, text, code } = best;
  return { kind, text, code };
}

// ------------------------------------------------------------------ time formats
export function ago(at: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
/** Heading of a day group: "Today", "Yesterday", "Tue 13 Oct". */
export function dayLabel(at: number, now = Date.now()): string {
  const d = new Date(at), t = new Date(now);
  if (d.toDateString() === t.toDateString()) return "Today";
  const y = new Date(now); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
