// Turns v2 wallet events into display rows (Live trace pane, per-turn trace line in chat).
// Quirks handled here (api spec, quirk checklist 5 and 6): `tool` is a duplicate of tool_call + tool_result and is
// ignored; the final model text arrives as both `thinking` and `reply`, so the `thinking` copy is dropped;
// `result` is an object, not a JSON string.
import { reasonsOf, reasonsOfResult, type WalletEvent } from "./events";
import { cleanText } from "./sanitize";
import { usd, shortHex } from "./format";
import { parseUsd } from "../shared";

export type ChipKind = "ok" | "refused" | "stepup" | "revoked" | "info" | "neutral";
export type Actor = "Agent" | "Seller" | "Policy" | "Owner" | "Chain";
export type TraceRow = {
  key: string; at: number; doneAt?: number; event: WalletEvent; result?: any;
  kind: ChipKind; verdict: string; actor: Actor; label: string; title: string; reasons: string[]; running?: boolean; tx?: string;
};

const atomicUsd = (x: unknown) => { try { return `US$${usd(BigInt(x as string))}`; } catch { return ""; } };
const priceUsd = (p: unknown) => { try { return typeof p === "string" ? `US$${usd(parseUsd(p))}` : ""; } catch { return ""; } };

/** One-line summary of a tool args object (strings are cleaned, long ones cut). */
export function argSummary(args: unknown): string {
  if (!args || typeof args !== "object") return "";
  return Object.entries(args as Record<string, unknown>)
    .filter(([, v]) => typeof v !== "object" || v === null)
    .slice(0, 3).map(([k, v]) => `${k}=${cleanText(v, 28)}`).join(" ");
}

export const eventKey = (e: WalletEvent, i: number) => `${i}-${e.at}-${e.type}-${e.phase ?? e.approval?.id ?? ""}`;

/** Verdict of a finished tool call. */
export function resultVerdict(tool: string | undefined, r: any): { kind: ChipKind; verdict: string; reasons: string[] } {
  const reasons = reasonsOfResult(r);
  if (reasons.length) return { kind: "refused", verdict: "Refused", reasons };
  if (r && r.ok === false) return { kind: "refused", verdict: "Failed", reasons };
  if (r?.needsOwnerApproval === true || r?.status === "asked") return { kind: "stepup", verdict: "Needs you", reasons };
  if (tool === "pay") return { kind: "ok", verdict: "Paid", reasons };
  return { kind: "ok", verdict: "OK", reasons };
}

/** Plain-language outcome of a tool result. Money comes from numbers in the result, text is cleaned. */
export function resultSummary(tool: string | undefined, r: any): string {
  if (!r || typeof r !== "object") return cleanText(r, 80);
  const reasons = reasonsOfResult(r);
  switch (tool) {
    case "get_pocket": return r.ok ? `balance US$${cleanText(r.balance, 12)} · cap US$${cleanText(r.perPaymentCap, 12)} · ask above ${r.askMeAbove === "never" ? "never" : `US$${cleanText(r.askMeAbove, 12)}`}` : "pocket unavailable";
    case "search_sellers": return Array.isArray(r.sellers) ? `${r.sellers.length} sellers` : "sellers";
    case "draft_intent": return r.ok ? "task confirmed by owner" : "task not confirmed";
    case "get_quote": {
      if (r.free) return reasons.length ? "free content, parts refused" : "free content read";
      const p = priceUsd(r.price);
      const gate = r.allowedByPocket && r.allowedByPocket !== "OK" ? "blocked by pocket" : r.needsOwnerApproval ? "needs your approval" : "within rules";
      return r.ok ? `${cleanText(r.sellerId, 24)}/${cleanText(r.sku, 32)} ${p} · ${gate}` : cleanText(r.error, 80) || "no quote";
    }
    case "ask_owner": return r.status === "asked" ? "asked the owner a question" : r.approved ? "owner approved" : "owner did not approve";
    case "pay": return r.ok ? `paid US$${cleanText(r.paid, 12)} to ${cleanText(r.sellerId, 24)}` : "payment refused";
    default: return cleanText(Object.keys(r).slice(0, 4).join(", "), 60);
  }
}

const approvalRow = (e: WalletEvent): Pick<TraceRow, "kind" | "verdict" | "title" | "label"> => {
  const a = e.approval ?? {};
  const kindWord = a.kind === "payment" ? "payment" : a.kind === "intent" ? "task" : "question";
  const first = cleanText(a.text, 200).split("\n")[0];
  const pend = a.status === "pending";
  const kind: ChipKind = pend ? "stepup" : a.status === "approved" ? "ok" : "refused";
  const verdict = pend ? "Needs you" : a.status === "approved" ? (a.kind === "question" ? "Answered" : "Approved") : a.status === "declined" ? "Declined" : "Timed out";
  const title = a.kind === "payment" && a.data?.amount ? `US$${cleanText(a.data.amount, 12)} to ${cleanText(a.data.sellerId, 24)}: ${first}` : first;
  return { kind, verdict, title, label: `${kindWord} approval` };
};

export function traceRows(events: WalletEvent[]): TraceRow[] {
  const rows: TraceRow[] = [];
  const replies = new Set(events.filter((e) => e.type === "trace" && e.phase === "reply").map((e) => e.text));
  const open = new Map<string, TraceRow[]>(); // tool name -> calls still waiting for a result
  events.forEach((e, i) => {
    const key = eventKey(e, i);
    const base = { key, at: e.at, event: e };
    if (e.type === "trace") {
      if (e.phase === "tool") return;
      if (e.phase === "thinking") {
        if (replies.has(e.text)) return;
        rows.push({ ...base, kind: "info", verdict: "", actor: "Agent", label: "thinking", title: cleanText(e.text, 240) || "Thinking", reasons: [] });
      } else if (e.phase === "reply") {
        rows.push({ ...base, kind: "info", verdict: "", actor: "Agent", label: "reply", title: cleanText(e.text, 240) || "Reply", reasons: [] });
      } else if (e.phase === "tool_call") {
        const row: TraceRow = { ...base, kind: "info", verdict: "Working", actor: "Agent", label: e.tool, title: `${e.tool}(${argSummary(e.args)})`, reasons: [], running: true };
        rows.push(row);
        open.set(e.tool, [...(open.get(e.tool) ?? []), row]);
      } else if (e.phase === "tool_result") {
        const call = open.get(e.tool)?.shift();
        const v = resultVerdict(e.tool, e.result);
        const summary = resultSummary(e.tool, e.result);
        const tx = typeof e.result?.tx === "string" ? e.result.tx : undefined;
        if (call) {
          Object.assign(call, { ...v, running: false, doneAt: e.at, result: e.result, tx, title: `${e.tool}(${argSummary(call.event.args)}) → ${summary}` });
        } else {
          rows.push({ ...base, ...v, actor: "Agent", label: e.tool, title: `${e.tool} → ${summary}`, result: e.result, tx });
        }
      }
      return;
    }
    if (e.type === "payment") {
      rows.push({ ...base, kind: "ok", verdict: "Paid", actor: "Chain", label: "payment", title: `${e.sellerId}/${e.sku}  ${atomicUsd(e.amount)}${e.cosigned ? " · co-signed by you" : ""}`, reasons: [], tx: e.tx });
    } else if (e.type === "refusal") {
      rows.push({ ...base, kind: "refused", verdict: "Refused", actor: "Policy", label: "refusal", title: `${e.sellerId}/${e.sku}  ${atomicUsd(e.amount)}`, reasons: reasonsOf(e) });
    } else if (e.type === "disclosure") {
      const asked = [...(Array.isArray(e.asked) ? e.asked : []).map((x: string) => cleanText(x, 30)), e.signRequest ? "a signature" : ""].filter(Boolean).join(", ");
      rows.push({ ...base, kind: "refused", verdict: "Refused", actor: "Policy", label: "disclosure", title: `${cleanText(e.sellerId, 30)} asked for ${asked || "extra data"}`, reasons: reasonsOf(e) });
    } else if (e.type === "intent" || e.type === "approval" || e.type === "question") {
      rows.push({ ...base, ...approvalRow(e), actor: "Owner", reasons: [] });
    }
  });
  return rows;
}

/** Compact lines for the per-turn trace under an agent reply (one per finished step). */
export function stepLines(rows: TraceRow[]): { text: string; kind: ChipKind }[] {
  const out: { text: string; kind: ChipKind }[] = [];
  for (const r of rows) {
    if (r.label === "reply") continue;
    if (r.label === "thinking") { out.push({ text: r.title.length > 90 ? `${r.title.slice(0, 90)}…` : r.title, kind: "info" }); continue; }
    if (r.event.type === "trace" && r.running) { out.push({ text: `${r.label}…`, kind: "info" }); continue; }
    if (r.event.type === "trace") {
      const codes = r.reasons;
      out.push({ text: `${r.label}  ${codes.length ? codes.join(", ") : cleanText(r.title.split("→")[1] ?? "", 80).trim() || r.verdict}`.trim(), kind: r.kind });
    } else if (r.event.type === "payment") out.push({ text: `paid ${r.title.split("  ")[1] ?? ""}`.trim(), kind: "ok" });
    else if (r.event.type === "refusal" || r.event.type === "disclosure") out.push({ text: `${r.label}  ${r.reasons.join(", ")}`.trim(), kind: "refused" });
  }
  return out;
}

/** Instruction-like text detection for seller content in tool results (never rendered as HTML). */
export const INJECTION_RE = /(ignore|disregard)[^.]{0,60}(previous|above|prior|instruction)|\bsend\s+\d[\d,.]*\s*(usdc|usd|eth)|private key|system prompt|transfer\s+\d|note for ai assistants|ai assistants?:/i;
export function untrustedOf(e: WalletEvent): { source?: string; text: string; injection: boolean } | null {
  if (e.type !== "trace" || e.phase !== "tool_result") return null;
  const content = e.result?.content;
  if (typeof content !== "string" || !content) return null;
  const m = /<untrusted_content(?:\s+source="([^"]*)")?>([\s\S]*?)<\/untrusted_content>/i.exec(content);
  return { source: m?.[1], text: cleanText(m ? m[2] : content, 1200), injection: INJECTION_RE.test(content) };
}
export const shortTx = (t?: string) => shortHex(t, 10, 6);
