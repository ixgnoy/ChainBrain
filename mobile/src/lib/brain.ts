// The Brain tab's data: what the AI understood, planned, adapted, resisted, screened and remembers for one pocket, derived
// from the same event stream as the chat (server and built-in network alike). Pure: no React Native imports, Node tests load it.
import { approvalsFrom, preflightResults, radarScreens, reasonsOf, sameAddr, sentinelEvents, toolResultOf, type PreflightView, type RadarView, type SentinelView, type WalletEvent } from "./events";

export type Adapt = { from: string; reason: string; to?: string; at: number };
export type MemoryTrace = { at: number; version: number; questions: string[]; answers: string[]; added: number; removed: number; rejected: string[] };
export type Brain = {
  task?: { text: string; at: number; status: string };
  questionsAsked: number;
  lastQuestion?: string;
  turns: number;
  steps: number;
  sellersCompared: number;
  paid: number;
  spent: bigint;
  cosigned: number;
  adapted: Adapt[];
  resisted: { attacks: number; injections: number; dataRequests: number; forcedBlocked: number; total: number };
  radar: RadarView[];
  sentinel: SentinelView[];
  preflight: PreflightView[];
  memory?: MemoryTrace;
};

const big = (v: unknown) => { try { return BigInt(String(v ?? 0)); } catch { return 0n; } };

/** Splits a pocket's events into turns at each final reply, so re-plans are matched inside one turn. */
function turnsOf(evs: WalletEvent[]): WalletEvent[][] {
  const out: WalletEvent[][] = [[]];
  for (const e of evs) {
    out.at(-1)!.push(e);
    if (e.type === "trace" && e.phase === "reply") out.push([]);
  }
  return out.filter((t) => t.length);
}

/** `injections`: planted orders found in seller content (the chat's injectionsOf, which lives with its card). */
export function brainOf(events: WalletEvent[], pocket: string, sellerName: (id?: string) => string, injections = 0): Brain {
  const mine = events.filter((e) => sameAddr(e.pocket, pocket));
  const intents = approvalsFrom(mine).filter((a) => a.kind === "intent");
  const lastIntent = intents.at(-1);
  const intentAt = lastIntent ? Math.max(...mine.filter((e) => e.approval?.id === lastIntent.id).map((e) => e.at)) : 0;
  const questions = approvalsFrom(mine).filter((a) => a.kind === "question");
  const toolCalls = mine.filter((e) => e.type === "trace" && e.phase === "tool_call");
  const quoted = new Set(mine.filter((e) => e.type === "trace" && e.phase === "tool_result" && e.tool === "get_quote").map((e) => toolResultOf(e)?.sellerId).filter(Boolean));
  const pays = mine.filter((e) => e.type === "payment");

  // a seller refused in a turn, then another seller paid later in the same turn: that is a re-plan
  const adapted: Adapt[] = [];
  for (const t of turnsOf(mine)) {
    const refused: { sellerId: string; reason: string; at: number }[] = [];
    for (const e of t) {
      if (e.type === "refusal" && e.sellerId) refused.push({ sellerId: e.sellerId, reason: String(e.reason ?? ""), at: e.at });
      if (e.type === "trace" && e.phase === "tool_result" && e.tool === "get_quote") {
        const r = toolResultOf(e);
        const bad = r?.ok ? [...reasonsOf(r), r.counterpartyRisk?.verdict === "block" ? "COUNTERPARTY_HIGH_RISK" : ""].filter(Boolean)[0] : undefined;
        if (bad && r.sellerId) refused.push({ sellerId: r.sellerId, reason: bad, at: e.at });
      }
    }
    const seen = new Set<string>();
    for (const r of refused) {
      if (seen.has(r.sellerId) || r.reason === "NEEDS_OWNER_APPROVAL") continue;
      seen.add(r.sellerId);
      const next = t.find((e) => e.type === "payment" && e.at > r.at && e.sellerId !== r.sellerId);
      adapted.push({ from: sellerName(r.sellerId), reason: r.reason, to: next ? sellerName(next.sellerId) : undefined, at: r.at });
    }
  }

  const attacks = mine.filter((e) => e.type === "attack" && e.verdict !== "fooled").length;
  const forcedBlocked = mine.filter((e) => e.type === "forced" && e.reverted).length;
  const dataRequests = mine.filter((e) => e.type === "disclosure").length;

  const mem = mine.filter((e) => e.type === "trace" && e.phase === "memory").at(-1);
  const applied: { op: string }[] = Array.isArray(mem?.applied) ? mem!.applied : [];
  return {
    task: lastIntent ? { text: lastIntent.text, at: intentAt, status: lastIntent.status } : undefined,
    questionsAsked: questions.length,
    lastQuestion: questions.at(-1)?.text,
    turns: mine.filter((e) => e.type === "trace" && e.phase === "reply").length,
    steps: toolCalls.length,
    sellersCompared: quoted.size,
    paid: pays.length,
    spent: pays.reduce((n, e) => n + big(e.amount), 0n),
    cosigned: pays.filter((e) => e.cosigned).length,
    adapted: adapted.slice(-5).reverse(),
    resisted: { attacks, injections, dataRequests, forcedBlocked, total: attacks + injections + dataRequests + forcedBlocked },
    radar: radarScreens(mine).sort((a, b) => b.score - a.score || b.at - a.at),
    sentinel: sentinelEvents(mine),
    preflight: preflightResults(mine),
    memory: mem ? {
      at: mem.at, version: Number(mem.version) || 0, questions: Array.isArray(mem.questions) ? mem.questions.map(String) : [], answers: Array.isArray(mem.answers) ? mem.answers.map(String) : [],
      added: applied.filter((a) => a.op === "add").length, removed: applied.filter((a) => a.op === "delete").length, rejected: Array.isArray(mem.rejected) ? mem.rejected.map(String) : [],
    } : undefined,
  };
}

export type MemoryItem = { id: string; kind: "preference" | "open_task" | "seller_note" | "fact"; text: string; source: string; uses: number; updatedAt: number };
export type MemorySnapshot = { pocket: string; version: number; summary: string; items: MemoryItem[]; updatedAt: number };
export const MEMORY_KIND: Record<MemoryItem["kind"], string> = { preference: "Your preferences", open_task: "Still open", seller_note: "Sellers to avoid", fact: "Already bought" };
/** "You said this" for the owner's own words, "From your wallet" for typed events. */
export const sourceWords = (s: string) => (s.startsWith("m:") ? "You said this" : s.startsWith("e:") ? "From your wallet's record" : "From the brain");
