// The payments ledger: settled payments and refusals, derived from the v2 event trail.
// Refusal events exist only when the agent actually calls `pay`; a seller refused at get_quote time shows its reason
// only inside the tool result (api spec quirk 7), so those are added here as source "quote".
import { approvalStates, samePocket, type WalletEvent } from "./events";
import { parseHkd } from "../shared";

export type LedgerRow = {
  key: string; at: number; pocket: string; sellerId: string; sku: string; amount?: bigint;
  outcome: "paid" | "refused"; source: "settlement" | "pay" | "quote"; reasons: string[];
  tx?: string; cosigned?: boolean; intentHash?: string; detail?: string; task?: string;
};

const toBig = (x: unknown): bigint | undefined => { try { return x == null ? undefined : BigInt(x as string); } catch { return undefined; } };
const QUOTE_DEDUPE_MS = 120_000;

export function buildLedger(events: WalletEvent[]): LedgerRow[] {
  const refusalEvents = events.filter((e) => e.type === "refusal");
  const states = approvalStates(events);
  const confirmed = states.filter((s) => s.approval.kind === "intent" && s.approval.status === "approved");
  const taskFor = (pocket: string | undefined, at: number): string | undefined =>
    confirmed.filter((s) => samePocket(s.approval.pocket, pocket) && s.at <= at + 1000).sort((a, b) => b.at - a.at)[0]?.approval.text;

  const rows: LedgerRow[] = [];
  events.forEach((e, i) => {
    const pocket = e.pocket ?? "";
    if (e.type === "payment") {
      rows.push({ key: `p-${i}-${e.tx ?? e.at}`, at: e.at, pocket, sellerId: e.sellerId, sku: e.sku ?? "", amount: toBig(e.amount), outcome: "paid", source: "settlement", reasons: [], tx: e.tx, cosigned: !!e.cosigned, intentHash: e.intentHash, task: taskFor(pocket, e.at) });
    } else if (e.type === "refusal") {
      rows.push({ key: `r-${i}-${e.at}`, at: e.at, pocket, sellerId: e.sellerId, sku: e.sku ?? "", amount: toBig(e.amount), outcome: "refused", source: "pay", reasons: typeof e.reason === "string" ? [e.reason] : [], detail: typeof e.detail === "string" ? e.detail : undefined, task: taskFor(pocket, e.at) });
    } else if (e.type === "trace" && e.phase === "tool_result" && e.tool === "get_quote" && e.result && !e.result.free) {
      const reasons = [e.result.allowedByPocket?.reason, e.result.intentCheck?.reason].filter((c): c is string => typeof c === "string");
      if (!reasons.length) return;
      const dup = refusalEvents.some((r) => samePocket(r.pocket, pocket) && r.sellerId === e.result.sellerId && r.sku === e.result.sku && reasons.includes(r.reason) && r.at >= e.at && r.at - e.at < QUOTE_DEDUPE_MS);
      if (dup) return;
      let amount: bigint | undefined;
      try { amount = parseHkd(String(e.result.price)); } catch { amount = undefined; }
      rows.push({ key: `q-${i}-${e.at}`, at: e.at, pocket, sellerId: String(e.result.sellerId ?? ""), sku: String(e.result.sku ?? ""), amount, outcome: "refused", source: "quote", reasons, task: taskFor(pocket, e.at) });
    }
  });
  return rows.sort((a, b) => a.at - b.at);
}
