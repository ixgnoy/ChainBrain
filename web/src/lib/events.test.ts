import { it, expect } from "vitest";
import { appendEvents, approvalStates, pendingApprovals, parseEvent, reasonsOf, forPocket, APPROVAL_TTL_MS, type StoredEvent } from "./events";

const P = "0xAbC0000000000000000000000000000000000001";
const ev = (e: object) => JSON.stringify({ pocket: P, at: 1000, ...e });
const approval = (id: string, status: string, kind = "payment", extra: object = {}) => ({ id, kind, status, text: "t", pocket: P, ...extra });

it("drops replayed SSE data after a reconnect (no ids on the wire)", () => {
  const seen = new Set<string>();
  const first = [ev({ type: "payment", tx: "0x1" }), ev({ type: "refusal", reason: "OVER_CAP", at: 1001 })];
  let events = appendEvents([], first, seen);
  expect(events).toHaveLength(2);
  const replay = [...first, ev({ type: "payment", tx: "0x2", at: 1002 })];
  events = appendEvents(events, replay, seen);
  expect(events.map((e) => e.tx ?? e.reason)).toEqual(["0x1", "OVER_CAP", "0x2"]);
});
it("returns the same array when nothing new arrives and ignores bad JSON", () => {
  const seen = new Set<string>();
  const a = appendEvents([], [ev({ type: "payment" })], seen);
  expect(appendEvents(a, [ev({ type: "payment" }), "not json", '{"no":"type"}'], seen)).toBe(a);
  expect(parseEvent("[]")).toBeNull();
});
it("approval state: last event wins, resolved never goes back to pending", () => {
  const events = [
    { type: "approval", pocket: P, at: 1, seen: 1, approval: approval("a", "pending") },
    { type: "approval", pocket: P, at: 2, seen: 2, approval: approval("a", "approved", "payment", { signature: "0xsig" }) },
    { type: "approval", pocket: P, at: 2, seen: 3, approval: approval("a", "pending") },
  ] as StoredEvent[];
  const [s] = approvalStates(events);
  expect(s.approval.status).toBe("approved");
  expect(s.approval.signature).toBe("0xsig");
});
it("hides a stale pending approval once /api/pending no longer lists it, but keeps one that arrived after the poll", () => {
  const now = 100_000;
  const events = [
    { type: "approval", pocket: P, at: now - 60_000, seen: now - 60_000, approval: approval("old", "pending") },
    { type: "approval", pocket: P, at: now - 1_000, seen: now - 500, approval: approval("new", "pending") },
  ] as StoredEvent[];
  expect(pendingApprovals(events, undefined, now).map((a) => a.id)).toEqual(["old", "new"]);
  expect(pendingApprovals(events, { ids: new Set(), at: now - 2_000 }, now).map((a) => a.id)).toEqual(["new"]);
  expect(pendingApprovals(events, { ids: new Set(["old"]), at: now }, now).map((a) => a.id)).toEqual(["old"]);
});
it("a payment approval older than the 10 minute server wait is hidden, a question is not", () => {
  const now = 10_000_000;
  const at = now - APPROVAL_TTL_MS - 1;
  const events = [
    { type: "approval", pocket: P, at, seen: at, approval: approval("pay", "pending") },
    { type: "question", pocket: P, at, seen: at, approval: approval("q", "pending", "question") },
  ] as StoredEvent[];
  expect(pendingApprovals(events, undefined, now).map((a) => a.id)).toEqual(["q"]);
});
it("reads reason codes from refusals, disclosures and tool results; filters by pocket case-insensitively", () => {
  expect(reasonsOf({ type: "refusal", reason: "OVER_CAP", at: 1 })).toEqual(["OVER_CAP"]);
  expect(reasonsOf({ type: "disclosure", refused: ["DISCLOSURE_REFUSED", "SIGNATURE_TYPE_NOT_ALLOWED"], at: 1 })).toHaveLength(2);
  expect(reasonsOf({ type: "trace", phase: "tool_result", tool: "get_quote", result: { ok: true, allowedByPocket: { reason: "SELLER_NOT_ALLOWED" } }, at: 1 })).toEqual(["SELLER_NOT_ALLOWED"]);
  const all = [{ type: "payment", pocket: P, at: 1, seen: 1 }, { type: "payment", pocket: "0xother", at: 2, seen: 2 }] as StoredEvent[];
  expect(forPocket(all, P.toLowerCase())).toHaveLength(1);
});
