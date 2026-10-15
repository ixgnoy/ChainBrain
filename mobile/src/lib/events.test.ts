/// <reference types="node" />
// Event stream quirks (API spec quirk checklist): dedupe, cursor, approvals last-wins, pending reconciliation, trace, ledger.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeEvents, nextCursor, approvalsFrom, livePending, traceLines, ledgerFrom, chainFor, reasonsOf, authOf, authExpired, sliceTurn, type WalletEvent, authMismatch } from "./events";
import { REASONS } from "./shared";

const P = "0x00000000000000000000000000000000000000aa";
const apv = (at: number, kind: string, status: string, id = "a1", data?: any) => ({ type: kind === "payment" ? "approval" : kind, pocket: P, at, approval: { id, pocket: P, kind, status, text: "t", data } }) as WalletEvent;

test("dedupe: overlapping polls and SSE-style replays add nothing", () => {
  const seen = new Set<string>();
  const e1 = { type: "payment", pocket: P, at: 10, amount: "300000", tx: "0x1" };
  const e2 = { type: "trace", pocket: P, at: 10, phase: "tool_call", tool: "get_pocket" };
  let list = mergeEvents([], [e1, e2], seen);
  assert.equal(list.length, 2);
  const same = mergeEvents(list, [{ ...e1 }, { ...e2 }], seen);
  assert.equal(same, list, "same instance when nothing is new");
  list = mergeEvents(list, [{ type: "payment", pocket: P, at: 10, amount: "350000", tx: "0x2" }], seen);
  assert.equal(list.length, 3, "same millisecond, different body is kept");
});

test("cursor steps back one ms so same-ms events are not skipped", () => {
  assert.equal(nextCursor([{ type: "x", at: 1000 }]), 999);
  assert.equal(nextCursor([], 50), 50);
  assert.equal(nextCursor([{ type: "x", at: 10 }], 500), 500, "never moves backwards");
});

test("approvals: last status wins, resolved is never downgraded", () => {
  const out = approvalsFrom([apv(1, "payment", "pending"), apv(2, "payment", "approved"), apv(2, "payment", "pending")]);
  assert.deepEqual(out.map((a) => a.status), ["approved"]);
});

test("livePending: /api/pending is authoritative, age is the fallback, kinds filter", () => {
  const evs = [apv(1000, "payment", "pending", "p1"), apv(1000, "intent", "pending", "i1"), apv(1000, "question", "pending", "q1")];
  assert.deepEqual(livePending(evs, { pendingIds: new Set(["p1"]) }).map((a) => a.id), ["p1"], "timed out ones vanish");
  assert.equal(livePending(evs, { now: 1000 + 11 * 60_000 }).length, 0, "older than 10 min hidden without pending list");
  assert.equal(livePending(evs, { now: 2000 }).length, 3);
  assert.deepEqual(livePending(evs, { now: 2000, kinds: ["question"] }).map((a) => a.id), ["q1"]);
});

test("trace: ignores the duplicate `tool` phase and the repeated final text, pairs call with result", () => {
  const t = (at: number, o: object) => ({ type: "trace", pocket: P, at, ...o }) as WalletEvent;
  const lines = traceLines([
    t(1, { phase: "tool_call", tool: "get_quote", args: {} }),
    t(2, { phase: "tool", tool: "get_quote", args: {}, result: { ok: true } }),
    t(2, { phase: "tool_result", tool: "get_quote", result: { ok: true, price: "0.30", allowedByPocket: { reason: "SELLER_NOT_ALLOWED", why: "x" } } }),
    t(3, { phase: "thinking", text: "Harbour is not allowed." }),
    t(3, { phase: "reply", text: "Harbour is not allowed." }),
  ]);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].state, "refused");
  assert.deepEqual(lines[0].reasons, ["SELLER_NOT_ALLOWED"]);
});

test("ledger: payment, refusal, disclosure, quote-time block, approvals and tasks; per pocket", () => {
  const evs: WalletEvent[] = [
    apv(1, "intent", "pending", "i1", { intentHash: "0xh" }), apv(2, "intent", "approved", "i1", { intentHash: "0xh" }),
    { type: "trace", pocket: P, at: 3, phase: "tool_result", tool: "get_quote", result: { ok: true, sellerId: "datapro", sku: "premium-report", price: "1.50", allowedByPocket: "OK", needsOwnerApproval: true } },
    apv(4, "payment", "pending", "p1", { sellerId: "datapro", sku: "premium-report", amount: "1.50", description: "d" }), apv(5, "payment", "approved", "p1", { sellerId: "datapro", sku: "premium-report", amount: "1.50" }),
    { type: "payment", pocket: P, at: 6, sellerId: "datapro", sku: "premium-report", amount: "1500000", tx: "0xabc", intentHash: "0xh", cosigned: true },
    { type: "refusal", pocket: P, at: 7, sellerId: "harbour-wines", sku: "x", amount: "400000", reason: "SELLER_NOT_ALLOWED" },
    { type: "disclosure", pocket: P, at: 8, sellerId: "shadyfeed", asked: ["owner_email"], signRequest: true, refused: ["DISCLOSURE_REFUSED", "SIGNATURE_TYPE_NOT_ALLOWED"] },
    { type: "trace", pocket: P, at: 9, phase: "tool_result", tool: "get_quote", result: { ok: true, sellerId: "datalite", sku: "durian-report", price: "0.30", allowedByPocket: { reason: "OVER_CAP", why: "w" } } },
    { type: "payment", pocket: "0xother", at: 10, sellerId: "datalite", sku: "s", amount: "1", tx: "0x9" },
  ];
  const rows = ledgerFrom(evs, P);
  assert.deepEqual(rows.map((r) => r.kind), ["intent", "approval", "payment", "refusal", "disclosure", "blocked"].sort((a, b) => rows.findIndex((r) => r.kind === a) - rows.findIndex((r) => r.kind === b)));
  const kinds = new Set(rows.map((r) => r.kind));
  for (const k of ["intent", "approval", "payment", "refusal", "disclosure", "blocked"]) assert.ok(kinds.has(k as any), k);
  assert.equal(rows.find((r) => r.kind === "payment")!.amount, 1_500_000n);
  assert.equal(rows.find((r) => r.kind === "approval")!.amount, 1_500_000n);
  assert.equal(rows.find((r) => r.kind === "approval")!.outcome, "approved");
  assert.deepEqual(rows.find((r) => r.kind === "blocked")!.reasons, ["OVER_CAP"]);
  assert.equal(rows.some((r) => r.pocket === "0xother"), false);
  const pay = rows.find((r) => r.kind === "payment")!;
  const ch = chainFor(evs, pay);
  assert.ok(ch.task && ch.quote && ch.approval, "task matched by intentHash, quote and co-sign found");
});

test("reason codes: complete map, reasonsOf reads every place a code can hide", () => {
  assert.equal(Object.keys(REASONS).length, 20);
  assert.ok(REASONS.QUOTE_UNKNOWN && REASONS.NOT_THIS_AGENT);
  assert.deepEqual(reasonsOf({ ok: false, reason: "OVER_BUDGET", refused: ["DISCLOSURE_REFUSED"], intentCheck: { reason: "PRICE_ABOVE_INTENT" } }), ["OVER_BUDGET", "PRICE_ABOVE_INTENT", "DISCLOSURE_REFUSED"]);
});

test("auth: shape check, expiry (10 s margin), turn slicing", () => {
  const a = apv(1, "payment", "pending", "p", { auth: { from: P, to: P, value: "1", validAfter: "0", validBefore: "2000", nonce: "0x" + "11".repeat(32) } }).approval as any;
  const auth = authOf(a)!;
  assert.equal(authExpired(auth, 1_000_000), false);
  assert.equal(authExpired(auth, 1_995_000), true);
  assert.equal(authOf({ ...a, data: {} }), null);
  const evs = [{ type: "x", at: 1 }, { type: "x", at: 5 }, { type: "x", at: 9 }];
  assert.deepEqual(sliceTurn(evs, 1, 5).map((e) => e.at), [5]);
});

test("co-sign: only the transfer the sheet shows (pocket, seller, amount)", () => {
  const P = "0x00000000000000000000000000000000000000aa", S = "0x00000000000000000000000000000000000000bb";
  const sellers = [{ id: "datapro", payTo: S }];
  const a = { id: "x", pocket: P, kind: "payment", text: "", status: "pending", data: { sellerId: "datapro", amount: "1.50" } } as any;
  const auth = (o: object = {}) => ({ from: P, to: S, value: "1500000", validAfter: "0", validBefore: "9999999999", nonce: "0x01", ...o }) as any;
  assert.equal(authMismatch(a, auth(), sellers), null);
  assert.equal(authMismatch(a, auth({ from: S }), sellers), "AUTH_WRONG_POCKET");
  assert.equal(authMismatch(a, auth({ to: P }), sellers), "AUTH_WRONG_SELLER");
  assert.equal(authMismatch(a, auth({ value: "50000000" }), sellers), "AUTH_WRONG_AMOUNT");
});
