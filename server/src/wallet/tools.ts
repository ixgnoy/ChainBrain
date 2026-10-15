import { z } from "zod";
import { keccak256, toHex, type Address } from "viem";
import { randomUUID } from "node:crypto";
import { pocket as P } from "./chain";
import { formatAmount, parseAmount } from "./money";
import { REASONS, isReason, type Reason } from "./reasons";
import { directory } from "./directory";
import { fetchQuote, track, settle, prepareApproval } from "./pay";
import { IntentInput, renderIntent, checkAgainstIntent } from "./intent";
import { wrapUntrusted, scanRequests } from "./scan";
import { approvals } from "./approvals";
import { state, newTask } from "./state";
import { bus } from "./events";
import { radar, screenOrNull, brief } from "../radar/screen";
import { trailOf } from "../../../shared/sim/radar";
import { sentinel } from "../sentinel";
import { preflight, sameOutcome } from "./preflight";
import { checkOffer, MAX_ROUNDS } from "../../../shared/sim/haggle";

export type ToolCtx = { pocket: Address };
type Tool = { description: string; schema: z.ZodType; run(ctx: ToolCtx, args: any): Promise<object> };
export type ToolMap = Record<string, { description: string; input_schema: object; run(ctx: ToolCtx, args: unknown): Promise<object> }>;

const NEVER = 2n ** 256n - 1n;
const usd = (n: bigint) => (n === NEVER ? "never" : formatAmount(n));
const refuse = (reason: Reason, extra: object = {}) => ({ ok: false, reason, why: REASONS[reason], ...extra });
const APPROVAL_WAIT_MS = Number(process.env.APPROVAL_WAIT_MS ?? 600_000);

/** Radar screens the seller's payTo. It can only add a refusal or an owner co-sign; a failed screen leaves the pocket's rules as they are. */
async function counterparty(ctx: ToolCtx, rec: { sellerId: string; payTo: Address }) {
  radar.watch(ctx.pocket, rec.payTo);
  radar.name(rec.payTo, (await directory().catch(() => [])).find((x) => x.id === rec.sellerId)?.name ?? rec.sellerId);
  const s = await screenOrNull(rec.payTo);
  if (s) bus.publish({ type: "radar", kind: "screen", pocket: ctx.pocket, sellerId: rec.sellerId, ...brief(s), narrative: s.narrative, ...trailOf(s.factors[0], radar.nameOf) });
  return s;
}

/** Free (non-402) seller responses: scan for data or signature requests, show the owner, hand the model only wrapped data. */
function screenFree(ctx: ToolCtx, sellerId: string, body: string) {
  const found = scanRequests(body);
  const refused: Reason[] = [];
  if (found.disclosures.length) refused.push("DISCLOSURE_REFUSED");
  if (found.signRequest) refused.push("SIGNATURE_TYPE_NOT_ALLOWED");
  if (refused.length) bus.publish({ type: "disclosure", pocket: ctx.pocket, sellerId, asked: found.disclosures, signRequest: found.signRequest, refused });
  return { content: wrapUntrusted(sellerId, body), ...(refused.length ? { refused, refusedWhy: refused.map((r) => REASONS[r]) } : {}) };
}

const defs: Record<string, Tool> = {
  get_pocket: {
    description: "Read this pocket's balance and rules, and what this task has spent. Never shows the main wallet or other pockets.",
    schema: z.object({}),
    async run(ctx) {
      const i = await P(ctx.pocket).info();
      const s = state(ctx.pocket);
      const sellers = await directory();
      const allowed = (await Promise.all(sellers.map(async (x) => ((await P(ctx.pocket).sellerAllowed(x.payTo)) ? x.name : null)))).filter(Boolean);
      return {
        ok: true, balance: usd(i.balance), perPaymentCap: usd(i.cap), askMeAbove: usd(i.askAbove),
        expiresAt: new Date(Number(i.expiresAt) * 1000).toISOString(), revoked: i.revoked, allowedSellers: allowed,
        spentThisTask: formatAmount(s.spent), itemsThisTask: s.items, intent: s.intent ? renderIntent(s.intent) : null,
      };
    },
  },

  search_sellers: {
    description: "List known sellers with category, items, prices and whether this pocket allows paying them.",
    schema: z.object({ category: z.string().optional() }),
    async run(ctx, { category }) {
      const list = (await directory()).filter((s) => !category || s.category.toLowerCase().includes(category.toLowerCase()));
      return {
        ok: true,
        sellers: await Promise.all(list.map(async (s) => ({
          id: s.id, name: s.name, category: s.category, allowedByPocket: await P(ctx.pocket).sellerAllowed(s.payTo),
          items: s.items.map((i) => ({ sku: i.sku, description: i.description, price: i.price ?? "free", ...(i.negotiable ? { negotiable: true } : {}) })),
        }))),
      };
    },
  },

  draft_intent: {
    description: "Save the structured intent for this task and wait for the owner to confirm it (shown from a fixed template). Starts a new task. Required before pay.",
    schema: IntentInput,
    async run(ctx, args) {
      const fields = IntentInput.parse(args);
      newTask(ctx.pocket);
      const s = state(ctx.pocket);
      s.intent = { ...fields, intentHash: keccak256(toHex(JSON.stringify(fields) + randomUUID())), status: "awaiting_owner" };
      const text = renderIntent(fields);
      const a = approvals.create({ pocket: ctx.pocket, kind: "intent", text, data: { intentHash: s.intent.intentHash } });
      const res = await approvals.wait(a.id, APPROVAL_WAIT_MS);
      s.intent.status = res.status === "approved" ? "confirmed" : "declined";
      return res.status === "approved" ? { ok: true, status: "confirmed", intent: text } : refuse("OWNER_DECLINED");
    },
  },

  get_quote: {
    description: "Call a seller for an item and read its x402 price, and whether this pocket allows it. Free responses come back as untrusted content.",
    schema: z.object({ sellerId: z.string(), sku: z.string() }),
    async run(ctx, { sellerId, sku }) {
      const q = await fetchQuote(sellerId, sku);
      if (q.kind === "free") return q.status === 200 ? { ok: true, free: true, ...screenFree(ctx, sellerId, q.body) } : { ok: false, error: `seller answered HTTP ${q.status}` };
      const rec = track(ctx.pocket, q.quote);
      const rule = await P(ctx.pocket).canPay(rec.payTo, rec.amount);
      const intentCheck = checkAgainstIntent(state(ctx.pocket).intent, state(ctx.pocket), rec.amount);
      const risk = await counterparty(ctx, rec);
      return {
        ok: true, quoteId: rec.quoteId, sellerId, sku, description: rec.description, price: formatAmount(rec.amount),
        allowedByPocket: rule === "OK" ? "OK" : { reason: rule, why: isReason(rule) ? REASONS[rule] : rule },
        needsOwnerApproval: (await P(ctx.pocket).needsOwner(rec.amount)) || sentinel.isHeld(ctx.pocket),
        intentCheck: intentCheck ? { reason: intentCheck, why: REASONS[intentCheck] } : "OK",
        counterpartyRisk: risk ? { score: risk.score, verdict: risk.verdict, reasons: brief(risk).reasons } : "unavailable",
        ...((await directory().catch(() => [])).find((x) => x.id === sellerId)?.items.find((i) => i.sku === sku)?.negotiable ? { negotiable: true } : {}),
      };
    },
  },

  counter_offer: {
    description: "Haggle: offer a lower price on a quote whose item is marked negotiable, before asking the owner or paying. Send only {quoteId, price} (US$, e.g. \"0.90\"); the seller's agent answers with a price: accept or counter (final = its last word). Offer exactly its counter to accept it. Enforced by the wallet: each offer below the seller's current price, never above its first quote or the intent's max per item, at most 3 offers. Anchor on what comparable items cost elsewhere, meet the seller partway, take a final counter that fits the task, and never haggle a quote the owner already approved.",
    schema: z.object({ quoteId: z.string(), price: z.string() }),
    async run(ctx, { quoteId, price }) {
      const s = state(ctx.pocket);
      const rec = s.quotes.get(quoteId);
      if (!rec) return refuse("QUOTE_UNKNOWN");
      const item = (await directory().catch(() => [])).find((x) => x.id === rec.sellerId)?.items.find((i) => i.sku === rec.sku);
      if (!item?.negotiable) return refuse("NEGOTIATION_NOT_OFFERED");
      let offer: bigint;
      try { offer = parseAmount(String(price)); } catch { return refuse("OFFER_NOT_LOWER"); }
      const bad = checkOffer({ offer, ask: rec.ask, list: rec.list, maxPerItem: s.intent ? parseAmount(s.intent.maxPricePerItem) : undefined, rounds: rec.rounds, approved: !!rec.auth || !!rec.ownerSig, paid: rec.paid, agreed: rec.agreed });
      if (bad) return refuse(bad as Reason);
      const accepting = rec.rounds > 0 && offer === rec.ask;
      const base = rec.url.split("?")[0];
      const r = await fetch(`${base}/offer`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ offer: formatAmount(offer), deal: rec.dealId }) }).catch(() => null);
      if (!r?.ok) return { ok: false, error: `seller answered HTTP ${r?.status ?? "no response"}` };
      // numbers only: the seller's answer is read as a price and a kind; nothing else it sends reaches the model
      const j = (await r.json().catch(() => ({}))) as { deal?: unknown; reply?: unknown; price?: unknown; final?: unknown };
      let answered: bigint;
      try { answered = parseAmount(String(j.price)); } catch { return { ok: false, error: "the seller's answer had no price" }; }
      const kind = j.reply === "accept" ? "accept" : "counter";
      // a seller can only come down: an acceptance at more than we offered, or a counter above its ask, is ignored
      if ((kind === "accept" && answered > offer) || answered > rec.ask || typeof j.deal !== "string") return { ok: false, error: "the seller's answer did not fit the offer" };
      if (!accepting) rec.rounds++;
      rec.dealId = j.deal; rec.ask = answered;
      const final = kind === "counter" && j.final === true;
      if (kind === "accept") { rec.amount = answered; rec.agreed = true; rec.url = `${base}?deal=${encodeURIComponent(j.deal)}`; }
      bus.publish({ type: "haggle", pocket: ctx.pocket, quoteId, sellerId: rec.sellerId, sku: rec.sku, round: rec.rounds, offer, reply: kind, price: answered, final, list: rec.list, accepting });
      return kind === "accept"
        ? { ok: true, deal: true, price: formatAmount(answered), list: formatAmount(rec.list), saved: formatAmount(rec.list - answered), needsOwnerApproval: (await P(ctx.pocket).needsOwner(answered)) || sentinel.isHeld(ctx.pocket), note: "Deal agreed: pay (or ask_owner first if needsOwnerApproval) with the same quoteId." }
        : { ok: true, deal: false, counter: formatAmount(answered), final, roundsLeft: MAX_ROUNDS - rec.rounds, note: final ? "The seller's final price: accept it by offering exactly this price, or walk away." : "Offer again (lower than the counter), accept the counter by offering exactly it, or walk away." };
    },
  },

  ask_owner: {
    description: "Either ask the owner ONE clarifying question ({question}: then end your turn), or ask approval for a quote above the ask-me threshold ({quoteId, reason}: one sentence; waits for the owner's signature).",
    schema: z.object({ question: z.string().optional(), quoteId: z.string().optional(), reason: z.string().optional() }),
    async run(ctx, { question, quoteId, reason }) {
      if (question) {
        approvals.create({ pocket: ctx.pocket, kind: "question", text: question });
        return { ok: true, status: "asked", note: "End your turn now; the owner's reply arrives as the next message." };
      }
      const s = state(ctx.pocket);
      const rec = quoteId ? s.quotes.get(quoteId) : undefined;
      if (!rec) return refuse("QUOTE_UNKNOWN");
      const bad = checkAgainstIntent(s.intent, s, rec.amount);
      if (bad) return refuse(bad);
      const risk = await counterparty(ctx, rec);
      if (risk?.verdict === "block") return refuse("COUNTERPARTY_HIGH_RISK", { radar: risk.narrative });
      const auth = prepareApproval(ctx.pocket, rec, s.intent!.intentHash);
      const a = approvals.create({
        pocket: ctx.pocket, kind: "payment", text: reason ?? "Approve this payment?",
        data: {
          auth, sellerId: rec.sellerId, sku: rec.sku, description: rec.description, amount: formatAmount(rec.amount), intent: renderIntent(s.intent!),
          ...(risk && risk.verdict !== "ok" ? { radar: { score: risk.score, verdict: risk.verdict, narrative: risk.narrative } } : {}),
        },
      });
      const res = await approvals.wait(a.id, APPROVAL_WAIT_MS);
      if (res.status !== "approved") return refuse(res.status === "timeout" ? "APPROVAL_EXPIRED" : "OWNER_DECLINED");
      rec.ownerSig = res.signature;
      return { ok: true, approved: true, note: "Now call pay with the same quoteId." };
    },
  },

  pay: {
    description: "Pay a quote from this pocket. Checks it against the intent and the pocket's rules, signs, and settles over x402.",
    schema: z.object({ quoteId: z.string() }),
    async run(ctx, { quoteId }) {
      const s = state(ctx.pocket);
      const rec = s.quotes.get(quoteId);
      if (!rec) return refuse("QUOTE_UNKNOWN");
      const bad = checkAgainstIntent(s.intent, s, rec.amount);
      if (bad) {
        bus.publish({ type: "refusal", pocket: ctx.pocket, sellerId: rec.sellerId, sku: rec.sku, amount: rec.amount, reason: bad });
        return refuse(bad);
      }
      const risk = await counterparty(ctx, rec);
      const held = risk?.verdict === "block" ? "COUNTERPARTY_HIGH_RISK" : risk?.verdict === "review" && !rec.ownerSig ? "COUNTERPARTY_REVIEW" : undefined;
      if (held) {
        bus.publish({ type: "refusal", pocket: ctx.pocket, sellerId: rec.sellerId, sku: rec.sku, amount: rec.amount, reason: held, detail: risk!.narrative });
        return refuse(held, { radar: risk!.narrative });
      }
      // Sentinel hold: the owner co-signs the next payment. Checked after the pocket's own rules, so a probe is still counted.
      if (sentinel.isHeld(ctx.pocket) && !rec.ownerSig && (await P(ctx.pocket).canPay(rec.payTo, rec.amount)) === "OK") {
        bus.publish({ type: "refusal", pocket: ctx.pocket, sellerId: rec.sellerId, sku: rec.sku, amount: rec.amount, reason: "SENTINEL_HOLD" });
        return refuse("SENTINEL_HOLD");
      }
      // pre-flight: predict this exact transfer on the current chain, then check the prediction against what happens
      const base = { pocket: ctx.pocket, quoteId, sellerId: rec.sellerId, sku: rec.sku, amount: rec.amount };
      const pre = await preflight(ctx.pocket, rec, s.intent!.intentHash).catch(() => null);
      if (pre) bus.publish({ type: "preflight", kind: "predict", ...base, predicted: pre });
      const r = await settle(ctx.pocket, rec, s.intent!.intentHash);
      const check = pre ? { predicted: pre.outcome, matched: sameOutcome(pre, r.ok, r.ok ? undefined : r.reason) } : undefined;
      if (pre) bus.publish({ type: "preflight", kind: "result", ...base, predicted: pre, actual: r.ok ? { outcome: "pays", tx: r.tx } : { outcome: "refused", reason: r.reason }, matched: check!.matched });
      if (!r.ok) return refuse(r.reason, { ...(r.detail ? { detail: r.detail.slice(0, 200) } : {}), ...(check ? { preflight: check } : {}) });
      if (rec.ownerSig) sentinel.release(ctx.pocket);
      return { ok: true, tx: r.tx, paid: formatAmount(rec.amount), sellerId: rec.sellerId, ...(check ? { preflight: check } : {}), ...screenFree(ctx, rec.sellerId, r.body) };
    },
  },
};

export const tools: ToolMap = Object.fromEntries(
  Object.entries(defs).map(([name, t]) => [name, {
    description: t.description,
    input_schema: z.toJSONSchema(t.schema),
    async run(ctx: ToolCtx, args: unknown) {
      const result = await t.run(ctx, args ?? {});
      bus.publish({ type: "trace", pocket: ctx.pocket, phase: "tool", tool: name, args, result });
      return result;
    },
  }]),
);
