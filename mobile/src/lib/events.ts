// Pure derivations over the wallet event stream (server/src/wallet/events.ts). No React Native imports: Node tests load this file.
//
// Quirks of the real stream this file absorbs (API spec section 2, quirk checklist):
//  - events carry no id/seq; the only cursor is `at` (ms, strict > on /api/events.json) -> dedupe by content, cursor = lastAt - 1
//  - every approval emits two events (pending, then resolved); last status wins; timeouts emit nothing -> reconcile with /api/pending
//  - a payment approval has event type "approval"; "payment" is a settled x402 payment
//  - every tool call emits tool_call, tool and tool_result: ignore `tool`; the final reply is emitted as `thinking` and `reply`
//  - quote-time refusals live only in get_quote tool results, refusal events only appear when `pay` was attempted
import { parseHkd, type Authorization } from "./shared";
import { curSign } from "./runtime";

export type WalletEvent = { type: string; pocket?: string; at: number; [k: string]: any };

export type Approval = {
  id: string; pocket: string; kind: "intent" | "payment" | "question"; text: string; data?: any;
  status: "pending" | "approved" | "declined" | "timeout"; signature?: string; answer?: string;
  /** the agent that holds the pocket and asked (built-in network: chainbrain, claude, chatgpt) */ agent?: string;
  /** asked at / times out at (ms), when the network says */ createdAt?: number; expiresAt?: number;
};

export const APPROVAL_MAX_AGE_MS = 10 * 60 * 1000;
export const MAX_EVENTS = 3000;
export const sameAddr = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

// ---------------------------------------------------------------- dedupe and cursor

const hash = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
/** Content key: identical events (same ms, same body) collapse, which is what a re-fetch with an overlapping cursor produces. */
export const eventKey = (e: WalletEvent) => `${e.at}:${e.type}:${hash(JSON.stringify(e))}`;

/** Merge fresh events into the list. Returns the same array instance when nothing was new (no needless re-render). */
export function mergeEvents(prev: WalletEvent[], fresh: WalletEvent[], seen: Set<string>): WalletEvent[] {
  const add: WalletEvent[] = [];
  for (const e of fresh) {
    if (!e || typeof e.at !== "number" || typeof e.type !== "string") continue;
    const k = eventKey(e);
    if (seen.has(k)) continue;
    seen.add(k);
    add.push(e);
  }
  if (!add.length) return prev;
  // stable sort by `at`: same-ms events keep their arrival (publish) order
  const out = [...prev, ...add].map((e, i) => [e, i] as const).sort((a, b) => a[0].at - b[0].at || a[1] - b[1]).map((x) => x[0]);
  return out.length > MAX_EVENTS ? out.slice(out.length - MAX_EVENTS) : out;
}

/** Next `after` for /api/events.json: strict > on the server, several events can share a millisecond, so step back by one and let dedupe drop repeats. */
export const nextCursor = (events: WalletEvent[], current = 0) => Math.max(current, (events.at(-1)?.at ?? 0) - 1, 0);

// ---------------------------------------------------------------- approvals

/** Latest state of each approval. Last event wins, but a resolved status is never downgraded to pending by a late/reordered duplicate. */
export function approvalsFrom(events: WalletEvent[]): Approval[] {
  const by = new Map<string, Approval>();
  for (const e of events) {
    const a = e.approval as Approval | undefined;
    if (!a?.id) continue;
    const old = by.get(a.id);
    if (old && old.status !== "pending" && a.status === "pending") continue;
    by.set(a.id, { ...a, pocket: a.pocket ?? e.pocket ?? "" });
  }
  return [...by.values()];
}

/** Approvals that really wait for the owner. `pendingIds` (from GET /api/pending) is authoritative; without it fall back to age. */
export function livePending(events: WalletEvent[], opts: { pendingIds?: Set<string> | null; now?: number; kinds?: Approval["kind"][]; pocket?: string } = {}): Approval[] {
  const now = opts.now ?? Date.now();
  const lastAt = new Map<string, number>();
  for (const e of events) if (e.approval?.id) lastAt.set(e.approval.id, e.at);
  return approvalsFrom(events).filter((a) => {
    if (a.status !== "pending") return false;
    if (opts.kinds && !opts.kinds.includes(a.kind)) return false;
    if (opts.pocket && !sameAddr(a.pocket, opts.pocket)) return false;
    if (opts.pendingIds) return opts.pendingIds.has(a.id);
    return now - (lastAt.get(a.id) ?? 0) < APPROVAL_MAX_AGE_MS;
  });
}

/** The exact authorization to co-sign, validated for shape. Returns null if the approval carries none. */
export function authOf(a: Approval): Authorization | null {
  const x = a.data?.auth;
  if (!x || typeof x.from !== "string" || typeof x.to !== "string" || typeof x.nonce !== "string") return null;
  return { from: x.from, to: x.to, value: String(x.value), validAfter: String(x.validAfter), validBefore: String(x.validBefore), nonce: x.nonce };
}
/**
 * The owner signs only what the sheet shows: this pocket, to the named seller, for the stated amount. A server that
 * sent a different authorization (another payee or amount) gets no signature.
 */
export function authMismatch(a: Approval, auth: Authorization, sellers: { id: string; payTo: string }[]): string | null {
  if (!sameAddr(auth.from, a.pocket)) return "AUTH_WRONG_POCKET";
  const payTo = sellers.find((s) => s.id === a.data?.sellerId)?.payTo;
  if (!payTo || !sameAddr(auth.to, payTo)) return "AUTH_WRONG_SELLER";
  const shown = decimalToAtomic(a.data?.amount);
  if (shown == null || BigInt(auth.value) !== shown) return "AUTH_WRONG_AMOUNT";
  return null;
}
export const authExpired = (auth: Authorization, now = Date.now()) => BigInt(auth.validBefore) <= BigInt(Math.floor(now / 1000) + 10);

// ---------------------------------------------------------------- tool results and reasons

/** Reason codes found in a tool result: result.reason, allowedByPocket.reason, intentCheck.reason, refused[]. */
export function reasonsOf(r: any): string[] {
  if (!r || typeof r !== "object") return [];
  const out = [r.reason, r.allowedByPocket?.reason, r.intentCheck?.reason, ...(Array.isArray(r.refused) ? r.refused : [])].filter((x): x is string => typeof x === "string");
  return [...new Set(out)];
}
export const toolResultOf = (e: WalletEvent): any => { const r = e.result; if (typeof r === "string") { try { return JSON.parse(r); } catch { return { text: r }; } } return r; };

const decimalToAtomic = (s: unknown): bigint | undefined => { try { return typeof s === "string" ? parseHkd(s) : undefined; } catch { return undefined; } };
const atomic = (s: unknown): bigint | undefined => { try { return typeof s === "string" || typeof s === "number" ? BigInt(s) : undefined; } catch { return undefined; } };

export function summarizeTool(tool: string | undefined, r: any): string {
  if (!r || typeof r !== "object") return "";
  if (r.ok === false) return reasonsOf(r)[0] ?? r.error ?? "failed";
  switch (tool) {
    case "get_pocket": return r.revoked ? "revoked" : `balance ${curSign()}${r.balance}`;
    case "search_sellers": return `${Array.isArray(r.sellers) ? r.sellers.length : 0} sellers`;
    case "draft_intent": return r.status === "confirmed" ? "task confirmed" : "waiting";
    case "get_quote": {
      const bad = reasonsOf(r)[0];
      const risk = r.counterpartyRisk && typeof r.counterpartyRisk === "object" ? `, Radar ${r.counterpartyRisk.score}/10` : "";
      return r.free ? (r.refused?.length ? "free, data request refused" : "free") : `${curSign()}${r.price}${bad ? `, ${bad}` : r.needsOwnerApproval ? ", needs you" : ""}${risk}`;
    }
    case "ask_owner": return r.approved ? "approved" : r.status === "asked" ? "asked you" : "";
    case "pay": return r.paid ? `paid ${curSign()}${r.paid}${r.preflight ? (r.preflight.matched ? " · as predicted" : " · prediction missed") : ""}` : "";
    default: return "";
  }
}

// ---------------------------------------------------------------- per-turn trace

export type TraceLine = { key: string; kind: "think" | "tool"; tool?: string; text?: string; state: "run" | "ok" | "refused" | "ask"; reasons: string[]; summary?: string };

/** Compact trace for a slice of events: ignores `tool`, pairs tool_call with its tool_result, drops `thinking` that repeats the reply. */
export function traceLines(events: WalletEvent[]): TraceLine[] {
  const t = events.filter((e) => e.type === "trace");
  const replies = new Set(t.filter((e) => e.phase === "reply" && typeof e.text === "string").map((e) => (e.text as string).trim()));
  const lines: TraceLine[] = [];
  for (const e of t) {
    const key = eventKey(e);
    if (e.phase === "tool" || e.phase === "reply") continue;
    if (e.phase === "thinking") {
      const txt = typeof e.text === "string" ? e.text.trim() : "";
      if (txt && !replies.has(txt)) lines.push({ key, kind: "think", text: txt, state: "ok", reasons: [] });
    } else if (e.phase === "tool_call") {
      lines.push({ key, kind: "tool", tool: e.tool, state: "run", reasons: [] });
    } else if (e.phase === "tool_result") {
      const r = toolResultOf(e);
      const reasons = reasonsOf(r);
      const open = lines.find((l) => l.kind === "tool" && l.state === "run" && l.tool === e.tool);
      const state: TraceLine["state"] = r?.ok === false || r?.approved === false || (r?.allowedByPocket && r.allowedByPocket !== "OK") ? "refused" : r?.status === "asked" || r?.needsOwnerApproval ? "ask" : "ok";
      const patch = { state, reasons, summary: summarizeTool(e.tool, r) };
      if (open) Object.assign(open, patch); else lines.push({ key, kind: "tool", tool: e.tool, ...patch });
    }
  }
  return lines;
}

export const replyOf = (events: WalletEvent[]): string | undefined => events.filter((e) => e.type === "trace" && e.phase === "reply" && typeof e.text === "string").at(-1)?.text;

/** Boundaries of chat turns: a turn owns the events after `fromAt` (server clock) up to the next turn's `fromAt`. */
export const sliceTurn = (events: WalletEvent[], fromAt: number, toAt?: number) => events.filter((e) => e.at > fromAt && (toAt == null || e.at <= toAt));

// ---------------------------------------------------------------- ledger (Activity tab and receipts)

export type LedgerKind = "payment" | "refusal" | "blocked" | "disclosure" | "approval" | "intent" | "owner" | "forced";
export type LedgerRow = {
  key: string; at: number; pocket: string; kind: LedgerKind; /** the agent that holds the pocket */ agent?: string;
  outcome: "paid" | "refused" | "pending" | "approved" | "declined" | "info";
  sellerId?: string; sku?: string; description?: string; amount?: bigint; tx?: string; cosigned?: boolean; intentHash?: string; nonce?: string;
  ownerKind?: string; reasons: string[]; detail?: string; text?: string; asked?: string[]; signRequest?: boolean; approvalId?: string; reasonText?: string;
};

/** Everything the owner should see, newest last: settled payments, refusals (incl. quote-time blocks), disclosures, payment approvals and confirmed tasks. */
export function ledgerFrom(events: WalletEvent[], pocket?: string): LedgerRow[] {
  const mine = pocket ? events.filter((e) => sameAddr(e.pocket, pocket)) : events;
  const rows: LedgerRow[] = [];
  const approvalAt = new Map<string, number>();
  for (const e of mine) if (e.approval?.id) approvalAt.set(e.approval.id, e.at);
  for (const e of mine) {
    const base = { key: eventKey(e), at: e.at, pocket: e.pocket ?? "", agent: typeof e.agent === "string" ? e.agent : undefined };
    if (e.type === "payment") {
      rows.push({ ...base, kind: "payment", outcome: "paid", sellerId: e.sellerId, sku: e.sku, amount: atomic(e.amount), tx: e.tx, cosigned: !!e.cosigned, intentHash: e.intentHash, nonce: e.nonce, reasons: [] });
    } else if (e.type === "refusal") {
      rows.push({ ...base, kind: "refusal", outcome: "refused", sellerId: e.sellerId, sku: e.sku, amount: atomic(e.amount), reasons: e.reason ? [e.reason] : [], detail: typeof e.detail === "string" ? e.detail : undefined });
    } else if (e.type === "forced") {
      // someone submitted a transfer straight to eHKD with the agent's signature (scene 5's backstop): the pocket decides on-chain
      rows.push({ ...base, kind: "forced", outcome: e.reverted ? "refused" : "paid", amount: atomic(e.amount), tx: e.tx, reasons: e.reverted ? ["REVERTED"] : [], detail: typeof e.to === "string" ? e.to : undefined });
    } else if (e.type === "disclosure") {
      rows.push({ ...base, kind: "disclosure", outcome: "refused", sellerId: e.sellerId, asked: Array.isArray(e.asked) ? e.asked : [], signRequest: !!e.signRequest, reasons: Array.isArray(e.refused) ? e.refused : [] });
    } else if (e.type === "trace" && e.phase === "tool_result" && e.tool === "get_quote") {
      const r = toolResultOf(e);
      const bad = r?.ok === true ? [r.allowedByPocket?.reason, r.intentCheck?.reason, r.counterpartyRisk?.verdict === "block" ? "COUNTERPARTY_HIGH_RISK" : undefined].filter((x): x is string => typeof x === "string") : [];
      if (bad.length) rows.push({ ...base, kind: "blocked", outcome: "refused", sellerId: r.sellerId, sku: r.sku, description: r.description, amount: decimalToAtomic(r.price), reasons: bad });
    }
  }
  // approvals are shown once, in their latest state, at the time of their latest event
  for (const a of approvalsFrom(mine)) {
    const at = approvalAt.get(a.id) ?? 0;
    const key = `approval:${a.id}`;
    if (a.kind === "payment") {
      rows.push({ key, at, pocket: a.pocket, agent: a.agent, kind: "approval", outcome: a.status === "approved" ? "approved" : a.status === "pending" ? "pending" : "declined", approvalId: a.id, sellerId: a.data?.sellerId, sku: a.data?.sku, description: a.data?.description, amount: decimalToAtomic(a.data?.amount), text: a.text, reasons: a.status === "declined" ? ["OWNER_DECLINED"] : a.status === "timeout" ? ["APPROVAL_EXPIRED"] : [], intentHash: undefined });
    } else if (a.kind === "intent" && a.status !== "pending") {
      rows.push({ key, at, pocket: a.pocket, agent: a.agent, kind: "intent", outcome: a.status === "approved" ? "approved" : "declined", approvalId: a.id, text: a.text, intentHash: a.data?.intentHash, reasons: a.status === "declined" ? ["OWNER_DECLINED"] : [] });
    }
  }
  return rows.sort((x, y) => x.at - y.at);
}

export const paidTotal = (rows: LedgerRow[]) => rows.filter((r) => r.kind === "payment").reduce((n, r) => n + (r.amount ?? 0n), 0n);

/** "How it happened" for a payment row: the confirmed task (matched by intentHash), the quote, the owner co-signature, the settlement. */
export function chainFor(events: WalletEvent[], row: LedgerRow) {
  const mine = events.filter((e) => sameAddr(e.pocket, row.pocket) && e.at <= row.at + 1);
  const intent = approvalsFrom(mine).filter((a) => a.kind === "intent" && a.status === "approved").reverse().find((a) => !row.intentHash || a.data?.intentHash === row.intentHash);
  const quote = [...mine].reverse().map((e) => (e.type === "trace" && e.phase === "tool_result" && e.tool === "get_quote" ? toolResultOf(e) : null)).find((r) => r?.ok && r.sellerId === row.sellerId && r.sku === row.sku);
  const approval = row.cosigned ? approvalsFrom(mine).filter((a) => a.kind === "payment" && a.status === "approved" && a.data?.sellerId === row.sellerId && a.data?.sku === row.sku).at(-1) : undefined;
  return { task: intent?.text, quote, approval };
}

// ---------------------------------------------------------------- Radar (server/src/radar, shared/sim/radar.ts)

export type RadarVerdict = "ok" | "review" | "block";
export type RadarView = {
  key: string; at: number; sellerId?: string; counterparty: string; score: number; verdict: RadarVerdict; reasons: string[];
  narrative: string; trail: string[]; share?: number; direction?: string; /** Radar read only part of the history (a lower bound) */ partial?: boolean;
};
const verdictOf = (v: unknown): RadarVerdict => (v === "block" || v === "review" ? v : "ok");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);

/** Radar's latest screen of each counterparty in these events (one per seller: a later screen replaces an earlier one). */
export function radarScreens(events: WalletEvent[]): RadarView[] {
  const by = new Map<string, RadarView>();
  for (const e of events) {
    if (e.type !== "radar" || e.kind !== "screen") continue;
    const k = String(e.sellerId ?? e.address ?? e.counterparty ?? "?");
    by.set(k, {
      key: `radar:${k}:${e.at}`, at: e.at, sellerId: typeof e.sellerId === "string" ? e.sellerId : undefined, counterparty: String(e.counterparty ?? e.sellerId ?? "a seller"),
      score: num(e.score), verdict: verdictOf(e.verdict), reasons: Array.isArray(e.reasons) ? e.reasons.map(String) : [], narrative: String(e.narrative ?? ""),
      trail: Array.isArray(e.trail) ? e.trail.map(String) : [], share: typeof e.share === "number" ? e.share : undefined, direction: typeof e.direction === "string" ? e.direction : undefined,
      partial: e.partial === true || undefined,
    });
  }
  return [...by.values()];
}

export type RadarAlert = { key: string; id: string; at: number; pocket?: string; name: string; from?: { score: number; verdict: RadarVerdict } | null; to: { score: number; verdict: RadarVerdict }; narrative: string; reasons: string[] };
/** Radar alerts (a counterparty's risk rose), once each, newest last. With `pocket`, only the alerts sent to that pocket. */
export function radarAlerts(events: WalletEvent[], pocket?: string): RadarAlert[] {
  const by = new Map<string, RadarAlert>();
  for (const e of events) {
    if (e.type !== "radar" || e.kind !== "alert" || !e.alert?.id) continue;
    if (pocket ? !sameAddr(e.pocket, pocket) : !e.pocket) continue;
    const a = e.alert;
    by.set(a.id, {
      key: `alert:${a.id}:${e.pocket ?? ""}`, id: a.id, at: e.at, pocket: e.pocket, name: String(a.name ?? "a seller"),
      from: a.from ? { score: num(a.from.score), verdict: verdictOf(a.from.verdict) } : null, to: { score: num(a.to?.score), verdict: verdictOf(a.to?.verdict) },
      narrative: String(a.narrative ?? ""), reasons: Array.isArray(a.factors) ? a.factors.slice(0, 3).map((f: any) => String(f?.text ?? "")) : [],
    });
  }
  return [...by.values()].sort((a, b) => a.at - b.at);
}

/** The narrative without its "Risk 9/10 for TradeWire: blocked." head (the card shows that as a title and a score bar). */
export const radarBody = (n: string) => n.replace(/^Risk \d+\/10 for [^:]+: [^.]+\.\s*/, "");

// ---------------------------------------------------------------- Sentinel (server/src/sentinel, shared/sim/sentinel.ts)

export type SentinelKind = "watch" | "hold" | "freeze" | "clear";
export type SentinelView = {
  key: string; at: number; pocket?: string; kind: SentinelKind; signals: { id: string; severity: string; text: string }[];
  ai?: { hijack: number; action: string; confidence: number; by: string }; raisedBy?: string; tx?: string; note?: string; by?: string;
};
/** The Sentinel's decisions in these events, oldest first. */
export function sentinelEvents(events: WalletEvent[]): SentinelView[] {
  return events.filter((e) => e.type === "sentinel" && ["watch", "hold", "freeze", "clear"].includes(e.kind)).map((e) => ({
    key: `sentinel:${e.kind}:${e.at}`, at: e.at, pocket: e.pocket, kind: e.kind as SentinelKind,
    signals: Array.isArray(e.signals) ? e.signals.map((x: any) => ({ id: String(x?.id ?? ""), severity: String(x?.severity ?? ""), text: String(x?.text ?? "") })) : [],
    ai: e.ai && typeof e.ai === "object" ? { hijack: Number(e.ai.hijack) || 0, action: String(e.ai.action ?? ""), confidence: Number(e.ai.confidence) || 0, by: String(e.ai.by ?? "") } : undefined,
    raisedBy: typeof e.raisedBy === "string" ? e.raisedBy : undefined, tx: typeof e.tx === "string" ? e.tx : undefined,
    note: typeof e.note === "string" ? e.note : undefined, by: typeof e.by === "string" ? e.by : undefined,
  }));
}
/** "Jev", "Claude Haiku (stand-in for Jev)" or "the built-in network's scripted check": who answered the AI questions. */
export const aiName = (by?: string) => (by === "jev" ? "Jev (TypeSafe)" : by === "claude-haiku" ? "Claude Haiku, standing in for Jev" : by === "scripted" ? "scripted check (built-in network)" : "rules only");

// ---------------------------------------------------------------- pre-flight (server/src/wallet/preflight.ts)

export type PreflightView = { key: string; at: number; quoteId?: string; sellerId?: string; amount?: bigint; predicted: { outcome: string; reason?: string; by?: string }; actual: { outcome: string; reason?: string; tx?: string }; matched: boolean };
/** Each payment's prediction and what really happened, oldest first. */
export function preflightResults(events: WalletEvent[]): PreflightView[] {
  return events.filter((e) => e.type === "preflight" && e.kind === "result" && e.predicted && e.actual).map((e) => ({
    key: `pre:${e.at}:${e.quoteId ?? ""}`, at: e.at, quoteId: e.quoteId, sellerId: e.sellerId, amount: atomic(e.amount),
    predicted: { outcome: String(e.predicted.outcome), reason: e.predicted.reason, by: e.predicted.by }, actual: { outcome: String(e.actual.outcome), reason: e.actual.reason, tx: e.actual.tx }, matched: !!e.matched,
  }));
}
/** "on-chain simulation" (server, eth_call) or "the built-in chain" (dry run of the same rules). */
export const preflightBy = (by?: string) => (by === "eth_call" ? "a simulation of the exact transfer (eth_call)" : by === "sim" ? "a dry run on the built-in chain" : "the pocket's rules");

export type HaggleStep = { who: "seller" | "you"; price: bigint; final?: boolean };
export type HaggleView = { key: string; at: number; pocket?: string; quoteId: string; sellerId?: string; list: bigint; steps: HaggleStep[]; deal?: bigint; saved?: bigint };
/**
 * The haggler's negotiations, one per quote: the seller's first price, then each offer and counter in order, and the
 * deal if one was agreed. Numbers only (the events carry prices, never seller text).
 */
export function haggles(events: WalletEvent[]): HaggleView[] {
  const by = new Map<string, HaggleView>();
  for (const e of events) {
    if (e.type !== "haggle" || !e.quoteId) continue;
    const list = atomic(e.list), offer = atomic(e.offer), price = atomic(e.price);
    if (list === undefined || price === undefined) continue;
    const k = `${String(e.pocket ?? "").toLowerCase()}:${e.quoteId}`;
    const v: HaggleView = by.get(k) ?? { key: `hag:${k}`, at: e.at, pocket: e.pocket, quoteId: String(e.quoteId), sellerId: e.sellerId, list, steps: [{ who: "seller", price: list }] };
    if (!e.accepting && offer !== undefined) v.steps.push({ who: "you", price: offer });
    if (e.reply === "accept") { v.deal = price; v.saved = list - price; } else v.steps.push({ who: "seller", price, final: !!e.final });
    by.set(k, v);
  }
  return [...by.values()];
}
