// Pure helpers over the wallet event stream (api spec section 2). No React here so they are easy to test.
export type WalletEvent = { type: string; pocket?: string; at: number; [k: string]: any };
/** An event plus the browser time it first arrived (used to reconcile approvals with /api/pending). */
export type StoredEvent = WalletEvent & { seen: number };

export type Approval = {
  id: string;
  pocket: string;
  kind: "intent" | "payment" | "question";
  text: string;
  data?: any;
  status: "pending" | "approved" | "declined" | "timeout";
  signature?: string;
  answer?: string;
};

export const MAX_EVENTS = 3000;
/** Approvals wait up to 10 minutes on the server and then time out without any event. */
export const APPROVAL_TTL_MS = 10 * 60_000 + 15_000;

export const samePocket = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

export function parseEvent(raw: string, now = Date.now()): StoredEvent | null {
  try {
    const e = JSON.parse(raw);
    if (!e || typeof e !== "object" || typeof e.type !== "string") return null;
    return { ...e, at: typeof e.at === "number" ? e.at : now, seen: now };
  } catch {
    return null;
  }
}

/**
 * Append raw SSE `data:` strings, dropping any string already seen. The server sends no ids and replays its whole
 * buffer on every reconnect, so the raw JSON text is the identity of an event. Mutates `seen`; call it outside a
 * React state updater (StrictMode runs updaters twice).
 */
export function appendEvents(current: StoredEvent[], raws: string[], seen: Set<string>, now = Date.now()): StoredEvent[] {
  let out = current;
  for (const raw of raws) {
    if (seen.has(raw)) continue;
    seen.add(raw);
    const e = parseEvent(raw, now);
    if (!e) continue;
    if (out === current) out = current.slice();
    out.push(e);
  }
  if (out.length > MAX_EVENTS) out = out.slice(out.length - MAX_EVENTS);
  return out;
}

export const forPocket = (events: StoredEvent[], pocket?: string) => (pocket ? events.filter((e) => samePocket(e.pocket, pocket)) : events);

export type ApprovalState = { approval: Approval; at: number; seen: number };

/** Latest state of each approval: events repeat it on every status change, last event wins, resolved never goes back to pending. */
export function approvalStates(events: WalletEvent[]): ApprovalState[] {
  const by = new Map<string, ApprovalState>();
  for (const e of events as StoredEvent[]) {
    const a = e.approval as Approval | undefined;
    if (!a?.id) continue;
    const prev = by.get(a.id);
    if (prev && e.at < prev.at) continue;
    if (prev && prev.approval.status !== "pending" && a.status === "pending") continue;
    by.set(a.id, { approval: { ...a, pocket: a.pocket ?? e.pocket }, at: e.at, seen: e.seen ?? 0 });
  }
  return [...by.values()];
}
export const approvalsFrom = (events: WalletEvent[]) => approvalStates(events).map((s) => s.approval);

export type PollResult = { ids: Set<string>; at: number };

/**
 * Approvals still waiting on the owner. The stream can show stale "pending" items (a timeout publishes nothing), so:
 * once /api/pending has answered, only ids it lists count, plus anything that arrived after that poll started.
 * Payment and intent approvals older than the server's 10 minute wait are hidden even without a poll.
 */
export function pendingApprovals(events: WalletEvent[], poll?: PollResult, now = Date.now()): Approval[] {
  return approvalStates(events)
    .filter(({ approval: a, at, seen }) => {
      if (a.status !== "pending") return false;
      if (a.kind !== "question" && now - at > APPROVAL_TTL_MS) return false;
      if (poll && !poll.ids.has(a.id) && seen <= poll.at) return false;
      return true;
    })
    .map((s) => s.approval);
}

/** Which reason codes a tool result or event carries (result.reason, quote checks, disclosure refusals). */
export function reasonsOfResult(r: any): string[] {
  if (!r || typeof r !== "object") return [];
  const out: string[] = [];
  if (typeof r.reason === "string") out.push(r.reason);
  if (typeof r.allowedByPocket?.reason === "string") out.push(r.allowedByPocket.reason);
  if (typeof r.intentCheck?.reason === "string") out.push(r.intentCheck.reason);
  if (Array.isArray(r.refused)) for (const c of r.refused) if (typeof c === "string") out.push(c);
  return [...new Set(out)];
}
export function reasonsOf(e: WalletEvent): string[] {
  if (e.type === "refusal") return typeof e.reason === "string" ? [e.reason] : [];
  if (e.type === "disclosure") return Array.isArray(e.refused) ? e.refused.filter((c: unknown) => typeof c === "string") : [];
  if (e.type === "trace" && (e.phase === "tool_result" || e.phase === "tool")) return reasonsOfResult(e.result);
  return [];
}
