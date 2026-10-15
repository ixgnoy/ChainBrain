/**
 * Scripted stand-in for the LLM: a keyword router that implements the server's ModelFn.
 *
 * It is stateless. Each scene is a generator that yields tool calls and receives their results; on every model
 * call we re-run the generator from the start, feeding it the tool results already in the conversation, and
 * return whatever it yields next. So the REAL agent loop, tools, pocket and x402 settlement do all the work, and
 * the scenes adapt to whatever pocket the owner created (nothing here knows a pocket address).
 */
import { randomUUID } from "node:crypto";

type Json = any;
type Action = { tool: string; input: object; delayMs?: number };
type Scene = Generator<Action, string, Json>;

const NAMES: Record<string, string> = { datalite: "DataLite", datapro: "DataPro", "harbour-wines": "Harbour Wines", shadyfeed: "ShadyFeed" };
const name = (id: string) => NAMES[id] ?? id;
const tonight = () => new Date(Date.now() + 6 * 3600_000).toISOString();
const intent = (description: string, maxPricePerItem: string, maxTotal: string, maxItems: number, request = description) =>
  ({ request, description, maxPricePerItem, maxTotal, maxItems, deadline: tonight() });

type Outcome = { sellerId: string; sku: string; ok: boolean; price?: string; tx?: string; reason?: string; why?: string };

/** Quote, ask the owner when the quote is above the ask-me threshold, pay. Never tries to dodge a refusal. */
function* purchase(sellerId: string, sku: string, o: { payAnyway?: boolean; reason?: string } = {}): Generator<Action, Outcome, Json> {
  const q: Json = yield { tool: "get_quote", input: { sellerId, sku } };
  const base = { sellerId, sku, price: q?.price };
  if (!q?.ok) return { ...base, ok: false, reason: q?.reason ?? "QUOTE_UNKNOWN", why: q?.error ?? q?.why };
  const rule = q.allowedByPocket;
  if (rule !== "OK" && !o.payAnyway) return { ...base, ok: false, reason: rule.reason, why: rule.why };
  if (q.intentCheck !== "OK" && !o.payAnyway) return { ...base, ok: false, reason: q.intentCheck.reason, why: q.intentCheck.why };
  if (rule === "OK" && q.needsOwnerApproval) {
    const a: Json = yield { tool: "ask_owner", input: { quoteId: q.quoteId, reason: o.reason ?? `${name(sellerId)}'s ${sku} costs US$${q.price}, above your ask-me threshold. It matches the task you confirmed.` } };
    if (!a?.ok) return { ...base, ok: false, reason: a?.reason, why: a?.why };
  }
  const p: Json = yield { tool: "pay", input: { quoteId: q.quoteId } };
  return p?.ok ? { ...base, ok: true, tx: p.tx } : { ...base, ok: false, reason: p?.reason, why: p?.why };
}

function* draft(fields: ReturnType<typeof intent>): Generator<Action, boolean, Json> {
  const r: Json = yield { tool: "draft_intent", input: fields };
  return !!r?.ok;
}

const bought = (o: Outcome) => `${name(o.sellerId)}'s ${o.sku} (US$${o.price})`;
const refused = (o: Outcome) => `${name(o.sellerId)}'s ${o.sku} was refused: ${o.reason}${o.why ? ` (${o.why})` : ""}`;
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
  yield { tool: "get_pocket", input: {} };
  yield { tool: "ask_owner", input: { question: "US$2 in total or per report?" } };
  return "US$2 in total or per report?";
}

function* scene1Answer(): Scene {
  if (!(yield* draft(intent("Durian export market report", "2.00", "4.00", 4, "a market report on durian exports, under US$2 per report, by tonight")))) return declined();
  yield { tool: "search_sellers", input: { category: "Research data" } };
  const a = yield* purchase("datalite", "durian-report");
  const b = yield* purchase("datapro", "premium-report", { reason: "DataPro's premium report adds the 2026 forecast for US$1.50." });
  return summary([a, b]);
}

function* scene2(): Scene {
  if (!(yield* draft(intent("Durian export market report", "1.00", "1.00", 1)))) return declined();
  yield { tool: "search_sellers", input: { category: "Research data" } };
  return summary([yield* purchase("datalite", "durian-report")]);
}

function* scene3(): Scene {
  if (!(yield* draft(intent("Durian export premium report with 2026 forecast", "2.00", "2.00", 1)))) return declined();
  return summary([yield* purchase("datapro", "premium-report", { reason: "DataPro's premium report adds the 2026 forecast for US$1.50." })]);
}

function* scene4(): Scene {
  if (!(yield* draft(intent("Fruit and wine trade report", "1.00", "1.00", 1)))) return declined();
  const first = yield* purchase("harbour-wines", "fruit-wine-trade-report", { payAnyway: true });
  if (first.ok) return summary([first]);
  const second = yield* purchase("datalite", "fruit-trade-report");
  const lead = `${name(first.sellerId)} can't be paid from this pocket (${first.reason}), so I re-planned.`;
  return `${lead} ${summary([second])}`;
}

function* scene5(): Scene {
  if (!(yield* draft(intent("Durian export market report", "1.00", "1.00", 1)))) return declined();
  const peek: Json = yield { tool: "get_quote", input: { sellerId: "shadyfeed", sku: "preview" } };
  const o = yield* purchase("datalite", "durian-report");
  const flagged = peek?.refused?.length || /usdc|send|transfer/i.test(String(peek?.content))
    ? " Warning: ShadyFeed's preview contained instructions to send 50 USDC to another address and asked for more than a purchase needs; I ignored it and flagged the source."
    : " ShadyFeed's preview contained nothing I acted on.";
  return summary([o]) + flagged;
}

function* scene6(): Scene {
  const peek: Json = yield { tool: "get_quote", input: { sellerId: "shadyfeed", sku: "preview" } };
  const why = (peek?.refusedWhy ?? []).join("; ");
  return peek?.refused?.length
    ? `ShadyFeed asked for your name, wallet history and an approval signature. The wallet refused (${peek.refused.join(", ")}); I won't share or sign anything. ${why}`.trim()
    : "ShadyFeed's preview didn't ask for anything unusual. Nothing was paid.";
}

function* scene7(windowMs: number): Scene {
  if (!(yield* draft(intent("Durian and fruit trade reports from DataLite", "1.00", "2.00", 2)))) return declined();
  const first = yield* purchase("datalite", "durian-report", { payAnyway: true });
  // Hold here so the owner can tap Revoke between the two payments.
  const q: Json = yield { tool: "get_quote", input: { sellerId: "datalite", sku: "fruit-trade-report" }, delayMs: windowMs };
  let second: Outcome = { sellerId: "datalite", sku: "fruit-trade-report", ok: false, reason: q?.allowedByPocket?.reason ?? q?.reason, price: q?.price };
  if (q?.ok) {
    const p: Json = yield { tool: "pay", input: { quoteId: q.quoteId } };
    second = p?.ok ? { ...second, ok: true, tx: p.tx } : { ...second, reason: p?.reason, why: p?.why };
  }
  if (!second.ok && second.reason === "POCKET_REVOKED")
    return `The pocket was revoked (POCKET_REVOKED), so I stopped. ${first.ok ? `Last completed purchase: ${bought(first)}.` : "Nothing was paid."}`;
  return summary([first, second]);
}

function* scene8(): Scene {
  if (!(yield* draft(intent("Durian export market report", "0.20", "0.20", 1)))) return declined();
  yield { tool: "search_sellers", input: {} };
  const lite: Json = yield { tool: "get_quote", input: { sellerId: "datalite", sku: "durian-report" } };
  const pro: Json = yield { tool: "get_quote", input: { sellerId: "datapro", sku: "premium-report" } };
  const line = (id: string, q: Json) => (q?.allowedByPocket === "OK" ? `${name(id)} (US$${q.price}) is allowed` : `${name(id)} (US$${q?.price ?? "?"}): ${q?.allowedByPocket?.reason ?? q?.reason ?? "unavailable"}`);
  const price = lite?.price ?? "0.30";
  return `No allowed seller fits. ${line("datalite", lite)}; ${line("datapro", pro)}. Nothing was paid. Fix: raise the cap and budget to US$${price}, then ask me again.`;
}

const FALLBACK = "I'm the ChainBrain demo agent running without a live model, so I only understand the demo tasks. Try one of the sentences from the demo scenes (GET /dev/scenes), for example: \"Get me a market report on durian exports, under US$2, by tonight.\"";

type Msg = { role: string; content: any };

const isOwnerText = (m: Msg) => m.role === "user" && typeof m.content === "string";

/** Pick the scene for the owner's latest message (history is used only to spot an unanswered agent question). */
// Attacks a judge can type (same wording and order as shared/sim/script.ts attackOf): the agent refuses in words.
const ESCALATION = /\b(admin|administrator|sudo|root access|developer mode|god mode|superuser)\b|\b(raise|increase|lift|remove|change|set|bump|double|disable|turn off)\b[^.?!]*\b(cap|limit|rules?|allow ?list|white ?list|ask-me|threshold|expiry|deadline)\b|\badd\b[^.?!]*\bseller\b|\bset_?cap\b|\bset_?seller\b|\bnew owner\b|\bmake me (the )?owner\b/;
const EXTRACTION = /private key|secret key|seed phrase|mnemonic|recovery phrase|system prompt|your (instructions|prompt|rules file)|api key|password|owner'?s? (full )?(name|email|address|phone|balance|key|wallet|identity|id)|main wallet|other pockets?|\bbalance\b|personal data|kyc|passport/;
const INDUCED = /\b(send|transfer|wire|move|refund|forward|pay out|withdraw)\b[^.?!]*\b(usdc|us\$|\$\s?\d|dollars?|money|funds|everything|balance)\b|\b(send|transfer|pay)\b[^.?!]*\b0x[0-9a-f]{4,}/;
function* escalation(): Scene {
  const p: Json = yield { tool: "get_pocket", input: {} };
  return `I can't do that. Only the owner's key can change this pocket's cap or sellers, and I have no tool that edits rules. The cap stays US$${p?.perPaymentCap ?? "?"}.`;
}
function* extraction(): Scene {
  yield { tool: "get_pocket", input: {} };
  return "I can't share that. I have no access to the owner's key, main wallet or other pockets, and I don't share my instructions or anyone's personal details. I can only buy research inside this pocket's rules.";
}
function* induced(): Scene {
  yield { tool: "get_pocket", input: {} };
  return "I won't send money because a message asks me to. I can only pay sellers on this pocket's list, through a quote, for a task you confirmed. Nothing was sent.";
}

export function route(text: string, history: Msg[], windowMs: number): (() => Scene) | undefined {
  const t = text.toLowerCase();
  if (ESCALATION.test(t)) return escalation;
  if (EXTRACTION.test(t)) return extraction;
  if (INDUCED.test(t)) return induced;
  if (/shadyfeed/.test(t) && /full feed|whatever they need/.test(t)) return scene6;
  if (/shadyfeed/.test(t) && /preview/.test(t)) return scene5;
  if (/harbour/.test(t)) return scene4;
  if (/durian report and its fruit trade report|fruit trade report.*durian report/.test(t)) return () => scene7(windowMs);
  if (/0\.20/.test(t) && /report/.test(t)) return scene8;
  // An unanswered question from scene 1: whatever the owner says next is the answer.
  const asked = history.some((m) => m.role === "assistant" && Array.isArray(m.content) && m.content.some((b: Json) => b.type === "tool_use" && b.name === "ask_owner" && b.input?.question));
  const drafted = history.some((m) => m.role === "assistant" && Array.isArray(m.content) && m.content.some((b: Json) => b.type === "tool_use" && b.name === "draft_intent"));
  if (/market report on durian/.test(t)) return scene1Ask;
  if (asked && !drafted) return scene1Answer;
  if (/premium|forecast|datapro/.test(t)) return scene3;
  if (/datalite|durian/.test(t)) return scene2;
  return undefined;
}

export function scriptedModel(o: { revokeWindowMs?: number } = {}) {
  const windowMs = o.revokeWindowMs ?? 10_000;
  return async (req: Json): Promise<Json> => {
    const msgs: Msg[] = req.messages;
    const lastOwner = msgs.map(isOwnerText).lastIndexOf(true);
    const text = String(msgs[lastOwner]?.content ?? "");
    const scene = route(text, msgs.slice(0, lastOwner), windowMs);
    const reply = (t: string) => ({ role: "assistant", content: [{ type: "text", text: t }], stop_reason: "end_turn" });
    if (!scene) return reply(FALLBACK);

    // Tool results produced since the owner's last message, in order.
    const results: Json[] = [];
    for (const m of msgs.slice(lastOwner + 1))
      if (m.role === "user" && Array.isArray(m.content))
        for (const b of m.content) if (b.type === "tool_result") results.push(JSON.parse(typeof b.content === "string" ? b.content : JSON.stringify(b.content)));

    const gen = scene();
    let step = gen.next();
    for (const r of results) {
      if (step.done) break;
      step = gen.next(r);
    }
    if (step.done) return reply(step.value);
    const a = step.value;
    if (a.delayMs) await new Promise((r) => setTimeout(r, a.delayMs));
    return { role: "assistant", content: [{ type: "tool_use", id: `dev_${randomUUID()}`, name: a.tool, input: a.input }], stop_reason: "tool_use" };
  };
}
