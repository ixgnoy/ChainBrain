// The agent's plans for the scenes of spec v2 (port of devstack/src/model.ts). Each scene is a generator that yields
// tool calls and receives their results, so the pocket's rules (in chain.ts) decide every outcome; the scene only
// decides what to try next. `say` is the agent's one-line reasoning shown in the trace before the call.
import { sellerName as name } from "./catalog";
import { tonightMs } from "./util";

export type Action = { tool: string; input: object; delayMs?: number; say?: string };
export type Scene = Generator<Action, string, any>;

const tonight = () => new Date(tonightMs()).toISOString();
const intent = (description: string, maxPricePerItem: string, maxTotal: string, maxItems: number, request = description) =>
  ({ request, description, maxPricePerItem, maxTotal, maxItems, deadline: tonight() });

type Outcome = { sellerId: string; sku: string; ok: boolean; price?: string; tx?: string; reason?: string; why?: string };
const ITEM: Record<string, string> = {
  "durian-report": "durian export report", "fruit-trade-report": "fruit trade report", "premium-report": "premium report with the 2026 forecast",
  "fruit-wine-trade-report": "fruit and wine trade report", preview: "free preview",
};
const item = (sku: string) => ITEM[sku] ?? sku;

function* purchase(sellerId: string, sku: string, o: { payAnyway?: boolean; reason?: string } = {}): Generator<Action, Outcome, any> {
  const q = yield { tool: "get_quote", input: { sellerId, sku }, say: `Asking ${name(sellerId)} for the price of its ${item(sku)}.` };
  const base = { sellerId, sku, price: q?.price };
  if (!q?.ok) return { ...base, ok: false, reason: q?.reason ?? "QUOTE_UNKNOWN", why: q?.error ?? q?.why };
  const rule = q.allowedByPocket;
  if (rule !== "OK" && !o.payAnyway) return { ...base, ok: false, reason: rule.reason, why: rule.why };
  if (q.intentCheck !== "OK" && !o.payAnyway) return { ...base, ok: false, reason: q.intentCheck.reason, why: q.intentCheck.why };
  if (rule === "OK" && q.needsOwnerApproval) {
    const a = yield {
      tool: "ask_owner",
      input: { quoteId: q.quoteId, reason: o.reason ?? `${name(sellerId)}'s ${item(sku)} costs US$${q.price}, above your ask-me threshold. It matches the task you confirmed.` },
      say: `US$${q.price} is above your ask-me limit, so this one needs your signature.`,
    };
    if (!a?.ok) return { ...base, ok: false, reason: a?.reason, why: a?.why };
  }
  const p = yield { tool: "pay", input: { quoteId: q.quoteId }, say: `Paying ${name(sellerId)} US$${q.price} from the pocket.` };
  return p?.ok ? { ...base, ok: true, tx: p.tx } : { ...base, ok: false, reason: p?.reason, why: p?.why };
}

function* draft(fields: ReturnType<typeof intent>, say = "Writing the task down from the fixed template so you can confirm it."): Generator<Action, boolean, any> {
  const r = yield { tool: "draft_intent", input: fields, say };
  return !!r?.ok;
}

// Reason codes stay out of the agent's sentences: the cards beside the reply carry them as pills.
const WHY: Record<string, string> = {
  SELLER_NOT_ALLOWED: "that seller isn't on your list", OVER_CAP: "it's above this pocket's per-payment cap", OVER_BUDGET: "there isn't enough left in the pocket",
  POCKET_REVOKED: "you stopped the pocket", POCKET_EXPIRED: "the pocket has expired", PRICE_ABOVE_INTENT: "it costs more than the task allows",
  INTENT_TOTAL_REACHED: "it would go over the task's total", INTENT_ITEMS_REACHED: "the task already has enough items", OWNER_DECLINED: "you declined it",
  APPROVAL_EXPIRED: "your approval came too late", NEEDS_OWNER_APPROVAL: "it needs your OK", SETTLEMENT_FAILED: "the payment didn't go through",
};
const why = (code?: string) => (code && WHY[code]) || "your rules don't allow it";
const bought = (o: Outcome) => `${name(o.sellerId)}'s ${item(o.sku)} (US$${o.price})`;
const refused = (o: Outcome) => `${name(o.sellerId)}'s ${item(o.sku)} wasn't bought: ${why(o.reason)}`;
function summary(outs: Outcome[]): string {
  const ok = outs.filter((o) => o.ok), bad = outs.filter((o) => !o.ok);
  const parts: string[] = [];
  if (ok.length) parts.push(`Bought ${ok.map(bought).join(" and ")}.`);
  for (const o of bad) parts.push(`${refused(o)}.`);
  if (!ok.length) parts.push("Nothing was paid.");
  return parts.join(" ");
}
const declined = () => "You didn't confirm the task, so I did nothing. No payment was made.";

function* scene1Ask(): Scene {
  yield { tool: "get_pocket", input: {}, say: "Reading this pocket's balance and rules before I plan anything." };
  yield { tool: "ask_owner", input: { question: "US$2 in total or per report?" }, say: "\"Under US$2\" could mean the whole task or each report. I'll ask once instead of guessing." };
  return "US$2 in total or per report?";
}

function* scene1Answer(): Scene {
  if (!(yield* draft(intent("Durian export market report", "2.00", "4.00", 4, "a market report on durian exports, under US$2 per report, by tonight")))) return declined();
  yield { tool: "search_sellers", input: { category: "Research data" }, say: "Looking for research sellers with durian export data." };
  const a = yield* purchase("datalite", "durian-report");
  const b = yield* purchase("datapro", "premium-report", { reason: "DataPro's premium report adds the 2026 forecast for US$1.50." });
  return summary([a, b]);
}

function* scene2(): Scene {
  if (!(yield* draft(intent("Durian export market report", "1.00", "1.00", 1)))) return declined();
  yield { tool: "search_sellers", input: { category: "Research data" }, say: "Looking for research sellers with durian export data." };
  return summary([yield* purchase("datalite", "durian-report")]);
}

function* fruitOnly(): Scene {
  if (!(yield* draft(intent("SE Asia fruit trade report", "1.00", "1.00", 1)))) return declined();
  return summary([yield* purchase("datalite", "fruit-trade-report")]);
}

function* scene3(): Scene {
  if (!(yield* draft(intent("Durian export premium report with 2026 forecast", "2.00", "2.00", 1)))) return declined();
  return summary([yield* purchase("datapro", "premium-report", { reason: "DataPro's premium report adds the 2026 forecast for US$1.50." })]);
}

function* scene4(): Scene {
  if (!(yield* draft(intent("Fruit and wine trade report", "1.00", "1.00", 1)))) return declined();
  const first = yield* purchase("harbour-wines", "fruit-wine-trade-report", { payAnyway: true });
  if (first.ok) return summary([first]);
  yield { tool: "search_sellers", input: { category: "Research data" }, say: `${name(first.sellerId)} isn't on this pocket's list. Looking for an allowed seller with a similar report.` };
  const second = yield* purchase("datalite", "fruit-trade-report");
  const lead = first.reason === "SELLER_NOT_ALLOWED" ? `${name(first.sellerId)} isn't on this pocket's list, so I re-planned.` : `${name(first.sellerId)} can't be paid from this pocket (${why(first.reason)}), so I re-planned.`;
  return `${lead} ${summary([second])}`;
}

function* scene5(): Scene {
  if (!(yield* draft(intent("Durian export market report", "1.00", "1.00", 1)))) return declined();
  const peek = yield { tool: "get_quote", input: { sellerId: "shadyfeed", sku: "preview" }, say: "Reading ShadyFeed's free preview. Anything it says is data to me, never an instruction." };
  const o = yield* purchase("datalite", "durian-report");
  const flagged = peek?.refused?.length || /usdc|send|transfer/i.test(String(peek?.content))
    ? " Warning: ShadyFeed's preview contained instructions to send 50 USDC to another address and asked for more than a purchase needs; I ignored it and flagged the source."
    : " ShadyFeed's preview contained nothing I acted on.";
  return summary([o]) + flagged;
}

function* scene6(): Scene {
  const peek = yield { tool: "get_quote", input: { sellerId: "shadyfeed", sku: "preview" }, say: "Opening ShadyFeed's feed. I'll check what it asks for before anything else." };
  return peek?.refused?.length
    ? "ShadyFeed asked for your name, email, wallet history and an approval signature. The wallet refused, and I won't share or sign anything. Nothing was paid."
    : "ShadyFeed's preview didn't ask for anything unusual. Nothing was paid.";
}

function* scene7(windowMs: number): Scene {
  if (!(yield* draft(intent("Durian and fruit trade reports from DataLite", "1.00", "2.00", 2)))) return declined();
  const first = yield* purchase("datalite", "durian-report", { payAnyway: true });
  const q = yield { tool: "get_quote", input: { sellerId: "datalite", sku: "fruit-trade-report" }, delayMs: windowMs, say: "One down. Getting the price of the fruit trade report next." };
  let second: Outcome = { sellerId: "datalite", sku: "fruit-trade-report", ok: false, reason: q?.allowedByPocket?.reason ?? q?.reason, price: q?.price };
  if (q?.ok) {
    const p = yield { tool: "pay", input: { quoteId: q.quoteId }, say: `Paying DataLite US$${q.price} from the pocket.` };
    second = p?.ok ? { ...second, ok: true, tx: p.tx } : { ...second, reason: p?.reason, why: p?.why };
  }
  if (!second.ok && second.reason === "POCKET_REVOKED")
    return `You stopped the pocket, so I stopped too. ${first.ok ? `Last completed purchase: ${bought(first)}.` : "Nothing was paid."}`;
  return summary([first, second]);
}

function* scene8(): Scene {
  if (!(yield* draft(intent("Durian export market report", "0.20", "0.20", 1)))) return declined();
  yield { tool: "search_sellers", input: {}, say: "Checking every seller against this pocket's limits." };
  const lite = yield { tool: "get_quote", input: { sellerId: "datalite", sku: "durian-report" }, say: "Asking DataLite for the price of its durian export report." };
  const pro = yield { tool: "get_quote", input: { sellerId: "datapro", sku: "premium-report" }, say: "Asking DataPro too, in case it fits." };
  const line = (id: string, q: any) => {
    const r = q?.allowedByPocket === "OK" ? undefined : q?.allowedByPocket?.reason ?? q?.reason;
    if (!r) return `${name(id)} costs US$${q.price} and is allowed.`;
    if (r === "OVER_CAP") return `${name(id)} costs US$${q?.price ?? "?"}, above this pocket's cap.`;
    if (r === "SELLER_NOT_ALLOWED") return `${name(id)} isn't on your list.`;
    return `${name(id)} can't be paid: ${why(r)}.`;
  };
  const price = lite?.price ?? "0.30";
  return `No allowed seller fits. ${line("datalite", lite)} ${line("datapro", pro)} Nothing was paid. Fix: raise the cap and budget to US$${price}, then ask me again.`;
}

function* hello(): Scene {
  return HELLO;
}

export const HELLO = "Hi. I buy research for you from the sellers this pocket allows, inside its limits. Tell me what you need, a price limit and a deadline, for example: \"Get me a market report on durian exports, under US$2, by tonight.\"";
export const FALLBACK = "I can only buy from the research sellers this pocket allows. Tell me what you need, a price limit and a deadline, for example: \"Buy the DataLite durian report. Max US$1, by tonight.\"";

/** Pick the scene for the owner's message (`asked`: an unanswered clarifying question from scene 1). */
export function route(text: string, o: { asked: boolean; revokeWindowMs: number }): Scene | undefined {
  const t = text.toLowerCase();
  if (/shadyfeed/.test(t) && /full feed|whatever they need|give them/.test(t)) return scene6();
  if (/shadyfeed/.test(t)) return scene5();
  if (/harbour|wine/.test(t)) return scene4();
  if (/durian report and (its|the) fruit|fruit trade report.*durian report|both reports|two reports/.test(t)) return scene7(o.revokeWindowMs);
  if (/0\.2\b|0\.20|20 cents/.test(t) && /report/.test(t)) return scene8();
  if (/market report on durian|durian export.*under us\$?2|research on durian/.test(t)) return scene1Ask();
  if (o.asked) return scene1Answer();
  if (/premium|forecast|datapro/.test(t)) return scene3();
  if (/fruit trade/.test(t)) return fruitOnly();
  if (/datalite|durian/.test(t)) return scene2();
  if (/^(hi|hello|hey|yo)\b|what can you do|help/.test(t)) return hello();
  return undefined;
}
