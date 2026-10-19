// How the brain decided one payment, step by step, rebuilt from the events that step left: the task it worked under, the
// seller's quote, the pocket's on-chain rules (Pocket.sol), Radar's seller screen, your co-signature, pre-flight's
// prediction, the x402 settlement, the Sentinel's look afterwards and what the brain learned. Each stage says what the
// event said; a stage with no event says so ("—"), it is never filled in. Pure: Node tests load it.
import type { WalletEvent } from "./events";
import { plainReason } from "./plain";
import { curSign } from "./runtime";

export type StageKey = "task" | "quote" | "rules" | "radar" | "owner" | "preflight" | "settle" | "sentinel" | "memory";
/** ok: passed. stop: this stage refused it. info: ran, nothing to pass or fail. skip: never reached, or no event. wait: not yet. */
export type StageState = "ok" | "stop" | "info" | "skip" | "wait";
export type Stage = { key: StageKey; label: string; value: string; state: StageState; at?: number };
export type Trace = { pocket: string; sellerId?: string; outcome: "paid" | "refused" | "running"; at: number; stages: Stage[] };

export const STAGE_LABEL: Record<StageKey, string> = {
  task: "Task", quote: "Quote", rules: "Card rules", radar: "Radar", owner: "You", preflight: "Pre-flight", settle: "Settlement", sentinel: "Sentinel", memory: "Memory",
};
const RULE_REASONS = new Set(["SELLER_NOT_ALLOWED", "OVER_CAP", "OVER_BUDGET", "POCKET_REVOKED", "POCKET_EXPIRED"]);
const TASK_REASONS = new Set(["PRICE_ABOVE_INTENT", "INTENT_TOTAL_REACHED", "INTENT_ITEMS_REACHED", "INTENT_EXPIRED", "INTENT_NOT_CONFIRMED"]);
const OWNER_REASONS = new Set(["NEEDS_OWNER_APPROVAL", "APPROVAL_EXPIRED", "OWNER_DECLINED"]);
const RADAR_REASONS = new Set(["COUNTERPARTY_HIGH_RISK", "COUNTERPARTY_REVIEW"]);

const same = (a?: unknown, b?: unknown) => !!a && !!b && String(a).toLowerCase() === String(b).toLowerCase();
// HK$ with 2 decimals (3 below HK$0.10, trimmed to 2 when the third is 0): HK$2.30, HK$0.056, HK$0.08
const amt = (units: unknown) => { try { const n = Number(BigInt(String(units ?? 0))) / 1e6; return `${curSign()}${n < 0.1 ? n.toFixed(3).replace(/0$/, "") : n.toFixed(2)}`; } catch { return ""; } };
const tail = (h?: unknown) => (h ? `${String(h).slice(0, 6)}…${String(h).slice(-4)}` : "");
const isQuote = (e: WalletEvent) => e.type === "trace" && e.phase === "tool_result" && e.tool === "get_quote" && e.result?.ok;

/** The trace of one outcome: a payment (by tx) or a refusal (by pocket, seller and time). */
export function traceOf(events: WalletEvent[], o: { pocket: string; sellerId?: string; at: number; tx?: string }, sellerName: (id?: string) => string = String): Trace | null {
  const mine = events.filter((e) => same(e.pocket, o.pocket));
  const end = o.tx ? mine.find((e) => e.type === "payment" && e.tx === o.tx) : mine.find((e) => e.type === "refusal" && e.at === o.at && (!o.sellerId || e.sellerId === o.sellerId));
  if (!end) return null;
  return build(mine, end, sellerName);
}

/** A test in progress, from the events since it started: the stages so far, the rest waiting. */
export function liveTraceOf(events: WalletEvent[], pocket: string, since: number, sellerName: (id?: string) => string = String): Trace | null {
  const mine = events.filter((e) => same(e.pocket, pocket) && e.at >= since);
  const end = mine.find((e) => e.type === "payment" || e.type === "refusal");
  if (end) return build(events.filter((e) => same(e.pocket, pocket)), end, sellerName);
  const call = mine.find((e) => e.type === "trace" && e.phase === "tool_call" && e.tool === "get_quote");
  const q = mine.find(isQuote);
  const radar = mine.filter((e) => e.type === "radar" && e.kind === "screen").at(-1);
  const pre = mine.find((e) => e.type === "preflight" && e.kind === "predict");
  const sellerId = q?.result?.sellerId ?? call?.args?.sellerId;
  const stages: Stage[] = [
    { key: "task", label: STAGE_LABEL.task, value: "Your test", state: "ok", at: since },
    q ? quoteStage(q, sellerName) : { key: "quote", label: STAGE_LABEL.quote, value: call ? `Asking ${sellerName(sellerId)}…` : "…", state: "wait" },
    q ? rulesStage(q) : wait("rules"),
    radar ? radarStage(radar) : wait("radar"),
    q ? ownerStage(q, undefined) : wait("owner"),
    pre ? { key: "preflight", label: STAGE_LABEL.preflight, value: `Predicts ${pre.predicted?.outcome === "pays" ? "it pays" : "a refusal"}`, state: "info", at: pre.at } : wait("preflight"),
    wait("settle"), wait("sentinel"), wait("memory"),
  ];
  return { pocket, sellerId, outcome: "running", at: since, stages };
}

const wait = (key: StageKey): Stage => ({ key, label: STAGE_LABEL[key], value: "…", state: "wait" });
const none = (key: StageKey, value = "—"): Stage => ({ key, label: STAGE_LABEL[key], value, state: "skip" });

function quoteStage(q: WalletEvent, sellerName: (id?: string) => string): Stage {
  return { key: "quote", label: STAGE_LABEL.quote, value: `${sellerName(q.result.sellerId)} · ${curSign()}${q.result.price}`, state: "ok", at: q.at };
}
function rulesStage(q: WalletEvent): Stage {
  const a = q.result.allowedByPocket;
  return a === "OK" ? { key: "rules", label: STAGE_LABEL.rules, value: "Allowed seller · under the cap", state: "ok", at: q.at }
    : { key: "rules", label: STAGE_LABEL.rules, value: plainReason(String(a?.reason ?? "")), state: "stop", at: q.at };
}
function radarStage(r: WalletEvent): Stage {
  const v = String(r.verdict ?? "ok");
  return { key: "radar", label: STAGE_LABEL.radar, value: `Risk ${Number(r.score) || 0}/10${v === "ok" ? "" : ` · ${v}`}`, state: v === "block" ? "stop" : v === "review" ? "info" : "ok", at: r.at };
}
function ownerStage(q: WalletEvent | undefined, cosigned: boolean | undefined): Stage {
  if (cosigned) return { key: "owner", label: STAGE_LABEL.owner, value: "Co-signed by you", state: "ok" };
  if (q?.result?.needsOwnerApproval) return { key: "owner", label: STAGE_LABEL.owner, value: "Above your ask-me limit", state: "info", at: q.at };
  return { key: "owner", label: STAGE_LABEL.owner, value: "Under your ask-me limit", state: "ok", at: q?.at };
}

function build(mine: WalletEvent[], end: WalletEvent, sellerName: (id?: string) => string): Trace {
  const S = end.sellerId, T = end.at;
  const before = mine.filter((e) => e.at <= T && e.at >= T - 30 * 60_000);
  const q = before.filter((e) => isQuote(e) && e.result.sellerId === S).at(-1);
  const radar = before.filter((e) => e.type === "radar" && e.kind === "screen" && e.sellerId === S).at(-1);
  const pre = mine.find((e) => e.type === "preflight" && e.kind === "result" && e.sellerId === S && e.at >= T - 1000 && e.at <= T + 10_000)
    ?? before.filter((e) => e.type === "preflight" && e.kind === "predict" && e.sellerId === S).at(-1);
  const startAt = q?.at ?? T;
  const taskEv = before.filter((e) => e.at <= startAt && ((e.type === "intent" && e.approval?.status === "approved") || (e.type === "trace" && e.phase === "thinking" && e.test) || (e.type === "routine" && e.kind === "run-start"))).at(-1);
  const after = mine.filter((e) => e.at > T);
  const nextEnd = after.find((e) => e.type === "payment" || e.type === "refusal");
  const until = Math.min(nextEnd?.at ?? Infinity, T + 10 * 60_000);
  const sentinel = after.find((e) => e.type === "sentinel" && e.at <= T + 60_000 && e.at <= until);
  const mem = after.find((e) => e.type === "trace" && e.phase === "memory" && e.at <= until + 5000);
  const paid = end.type === "payment";
  const reason = String(end.reason ?? "");

  const task: Stage = end.routine ? { key: "task", label: STAGE_LABEL.task, value: `Routine run ${end.routine.run}`, state: "ok" }
    : taskEv?.type === "trace" ? { key: "task", label: STAGE_LABEL.task, value: "Your test", state: "ok", at: taskEv.at }
    : taskEv?.type === "routine" ? { key: "task", label: STAGE_LABEL.task, value: `Routine run ${taskEv.run}`, state: "ok", at: taskEv.at }
    : taskEv ? { key: "task", label: STAGE_LABEL.task, value: "Task you confirmed", state: "ok", at: taskEv.at }
    : none("task");
  if (!paid && TASK_REASONS.has(reason)) Object.assign(task, { state: "stop", value: plainReason(reason) });

  const rules = q ? rulesStage(q) : none("rules");
  if (!paid && RULE_REASONS.has(reason)) Object.assign(rules, { state: "stop", value: plainReason(reason) });
  const rad = radar ? radarStage(radar) : none("radar");
  if (!paid && RADAR_REASONS.has(reason)) rad.state = "stop";
  const owner = ownerStage(q, paid ? !!end.cosigned : undefined);
  if (!paid && OWNER_REASONS.has(reason)) Object.assign(owner, { state: "stop", value: plainReason(reason) });
  const preflight: Stage = pre
    ? { key: "preflight", label: STAGE_LABEL.preflight, value: `Predicted ${pre.predicted?.outcome === "pays" ? "it pays" : "a refusal"}${pre.kind === "result" ? (pre.matched ? " · matched" : " · missed") : ""}`, state: pre.kind === "result" && !pre.matched ? "stop" : "info", at: pre.at }
    : none("preflight");
  const settle: Stage = paid
    ? { key: "settle", label: STAGE_LABEL.settle, value: `${amt(end.amount)} on-chain · ${tail(end.tx)}`, state: "ok", at: T }
    : { key: "settle", label: STAGE_LABEL.settle, value: "Refused · no money moved", state: "stop", at: T };
  const sen: Stage = sentinel
    ? { key: "sentinel", label: STAGE_LABEL.sentinel, value: sentinel.kind === "freeze" ? "Froze the card" : sentinel.kind === "hold" ? "Holding payments for you" : sentinel.kind === "watch" ? "Watching closer" : "All clear", state: sentinel.kind === "freeze" || sentinel.kind === "hold" ? "stop" : "ok", at: sentinel.at }
    : { key: "sentinel", label: STAGE_LABEL.sentinel, value: "No alert", state: "ok" };
  const added = Array.isArray(mem?.applied) ? mem!.applied.filter((a: { op?: string }) => a?.op === "add").length : 0;
  const memory: Stage = mem
    ? { key: "memory", label: STAGE_LABEL.memory, value: `Version ${Number(mem.version) || 1}${added ? ` · learned ${added}` : ""}`, state: "ok", at: mem.at }
    : none("memory", "Nothing new");
  return { pocket: String(end.pocket), sellerId: S, outcome: paid ? "paid" : "refused", at: T, stages: [task, q ? quoteStage(q, sellerName) : none("quote"), rules, rad, owner, preflight, settle, sen, memory] };
}
