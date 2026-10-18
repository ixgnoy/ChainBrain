// The agent's plans for the scenes of spec v2 (port of devstack/src/model.ts). Each scene is a generator that yields
// tool calls and receives their results, so the pocket's rules (in chain.ts) decide every outcome; the scene only
// decides what to try next. `say` is the agent's one-line reasoning shown in the trace before the call.
import { sellerName as name } from "./catalog";
import { formatHkd, parseHkd, tonightMs } from "./util";
import { buyerPlan, MAX_ROUNDS } from "./haggle";

export type Action = { tool: string; input: object; delayMs?: number; say?: string };
export type Scene = Generator<Action, string, any>;

const tonight = () => new Date(tonightMs()).toISOString();
export const intent = (description: string, maxPricePerItem: string, maxTotal: string, maxItems: number, request = description) =>
  ({ request, description, maxPricePerItem, maxTotal, maxItems, deadline: tonight() });

export type Outcome = { sellerId: string; sku: string; ok: boolean; price?: string; tx?: string; reason?: string; why?: string };
const ITEM: Record<string, string> = {
  "durian-news": "web search for durian export news", "fruit-news": "web search for SE Asia fruit trade news", "eth-price": "ETH price",
  counterparties: "counterparty check on the exporter's wallet", "wallet-balances": "exporter wallet balances", "credit-report": "exporter credit report",
  "fruit-wine-trade-report": "fruit and wine trade report", preview: "free preview",
};
const item = (sku: string) => ITEM[sku] ?? sku;

export function* purchase(sellerId: string, sku: string, o: { payAnyway?: boolean; reason?: string } = {}): Generator<Action, Outcome, any> {
  const q = yield { tool: "get_quote", input: { sellerId, sku }, say: `Asking ${name(sellerId)} for the price of its ${item(sku)}.` };
  const base = { sellerId, sku, price: q?.price };
  if (!q?.ok) return { ...base, ok: false, reason: q?.reason ?? "QUOTE_UNKNOWN", why: q?.error ?? q?.why };
  const rule = q.allowedByPocket;
  // Radar's verdict on the seller's money comes first: a seller paid by a drainer is never worth asking the owner to
  // allow, so block means pick someone else (the wallet would refuse anyway)
  if (q.counterpartyRisk?.verdict === "block" && !o.payAnyway) return { ...base, ok: false, reason: "COUNTERPARTY_HIGH_RISK", why: q.counterpartyRisk.reasons?.[0] };
  if (rule !== "OK" && !o.payAnyway) return { ...base, ok: false, reason: rule.reason, why: rule.why };
  if (q.intentCheck !== "OK" && !o.payAnyway) return { ...base, ok: false, reason: q.intentCheck.reason, why: q.intentCheck.why };
  return yield* settle(sellerId, sku, q.quoteId, q.price, rule === "OK" && q.needsOwnerApproval, o.reason);
}

/** The owner's co-signature when the price needs it, then pay the quote. */
function* settle(sellerId: string, sku: string, quoteId: string, price: string, needsOwner: boolean, reason?: string): Generator<Action, Outcome, any> {
  const base = { sellerId, sku, price };
  if (needsOwner) {
    const a = yield {
      tool: "ask_owner",
      input: { quoteId, reason: reason ?? `${name(sellerId)}'s ${item(sku)} costs HK$${price}, above your ask-me threshold. It matches the task you confirmed.` },
      say: `HK$${price} is above your ask-me limit, so this one needs your signature.`,
    };
    if (!a?.ok) return { ...base, ok: false, reason: a?.reason, why: a?.why };
  }
  const p = yield { tool: "pay", input: { quoteId }, say: `Paying ${name(sellerId)} HK$${price} from the pocket.` };
  return p?.ok ? { ...base, ok: true, tx: p.tx } : { ...base, ok: false, reason: p?.reason, why: p?.why };
}

export function* draft(fields: ReturnType<typeof intent>, say = "Writing the task down from the fixed template so you can confirm it."): Generator<Action, boolean, any> {
  const r = yield { tool: "draft_intent", input: fields, say };
  return !!r?.ok;
}

// Reason codes stay out of the agent's sentences: the cards beside the reply carry them as pills.
const WHY: Record<string, string> = {
  SELLER_NOT_ALLOWED: "that seller isn't on your list", OVER_CAP: "it's above this pocket's per-payment cap", OVER_BUDGET: "there isn't enough left in the pocket", OVER_PERIOD: "it would go past this period's allowance without your OK",
  POCKET_REVOKED: "you stopped the pocket", POCKET_EXPIRED: "the pocket has expired", PRICE_ABOVE_INTENT: "it costs more than the task allows",
  INTENT_TOTAL_REACHED: "it would go over the task's total", INTENT_ITEMS_REACHED: "the task already has enough items", OWNER_DECLINED: "you declined it",
  APPROVAL_EXPIRED: "your approval came too late", NEEDS_OWNER_APPROVAL: "it needs your OK", SETTLEMENT_FAILED: "the payment didn't go through",
  COUNTERPARTY_HIGH_RISK: "Radar traced the seller's money to a drainer", COUNTERPARTY_REVIEW: "Radar found risk in the seller's money and it needs your OK",
};
const why = (code?: string) => (code && WHY[code]) || "your rules don't allow it";
const bought = (o: Outcome) => `${name(o.sellerId)}'s ${item(o.sku)} (HK$${o.price})`;
const refused = (o: Outcome) => `${name(o.sellerId)}'s ${item(o.sku)} wasn't bought: ${why(o.reason)}`;
export function summary(outs: Outcome[]): string {
  const ok = outs.filter((o) => o.ok), bad = outs.filter((o) => !o.ok);
  const parts: string[] = [];
  if (ok.length) parts.push(`Bought ${ok.map(bought).join(" and ")}.`);
  for (const o of bad) parts.push(`${refused(o)}.`);
  if (!ok.length) parts.push("Nothing was paid.");
  return parts.join(" ");
}
const declined = () => "You didn't confirm the task, so I did nothing. No payment was made.";

const COUNTERPARTY_REASON = "Nansen's counterparty check shows who the exporter's wallet trades with, before you settle in eHKD. It's HK$0.40.";

function* scene1Ask(): Scene {
  yield { tool: "get_pocket", input: {}, say: "Reading this pocket's balance and rules before I plan anything." };
  yield { tool: "ask_owner", input: { question: "HK$0.80 in total or per lookup?" }, say: "\"Under HK$0.80\" could mean the whole task or each lookup. I'll ask once instead of guessing." };
  return "HK$0.80 in total or per lookup?";
}

function* scene1Answer(): Scene {
  if (!(yield* draft(intent("Durian import deal research", "0.40", "0.80", 4, "research for a durian import deal (export news, the ETH price, a check on the exporter's wallet), under HK$0.80 in total, by tonight")))) return declined();
  yield { tool: "search_sellers", input: { category: "Research data" }, say: "Looking for sellers with export news, prices and wallet checks." };
  const a = yield* purchase("exa", "durian-news");
  const b = yield* purchase("coingecko", "eth-price");
  const c = yield* purchase("nansen", "counterparties", { reason: COUNTERPARTY_REASON });
  return summary([a, b, c]);
}

function* scene2(): Scene {
  if (!(yield* draft(intent("Durian export news", "0.08", "0.08", 1)))) return declined();
  yield { tool: "search_sellers", input: { category: "Research data" }, say: "Looking for a seller with durian export news." };
  return summary([yield* purchase("exa", "durian-news")]);
}

function* fruitOnly(): Scene {
  if (!(yield* draft(intent("SE Asia fruit trade news", "0.08", "0.08", 1)))) return declined();
  return summary([yield* purchase("exa", "fruit-news")]);
}

function* priceOnly(): Scene {
  if (!(yield* draft(intent("ETH price in HKD", "0.08", "0.08", 1)))) return declined();
  return summary([yield* purchase("coingecko", "eth-price")]);
}

function* creditOnly(): Scene {
  if (!(yield* draft(intent("Durian exporter credit report", "0.40", "0.40", 1)))) return declined();
  return summary([yield* purchase("tradewire", "credit-report", { reason: "TradeWire's credit report covers the exporter's payment history for HK$0.40." })]);
}

function* scene3(): Scene {
  if (!(yield* draft(intent("Counterparty check on the exporter's wallet", "0.40", "0.40", 1)))) return declined();
  return summary([yield* purchase("nansen", "counterparties", { reason: COUNTERPARTY_REASON })]);
}

/**
 * Sentinel: "assume the agent was fooled" by a seller page and keeps trying a seller that isn't on the list. The pocket
 * refuses each try; after the third in a minute the Sentinel freezes the pocket on-chain, so even an allowed seller is refused.
 */
function* sceneHijacked(): Scene {
  if (!(yield* draft(intent("Fruit and wine trade report", "0.40", "0.40", 1)))) return declined();
  const tries: Outcome[] = [];
  for (let k = 0; k < 3; k++) {
    tries.push(yield* purchase("harbour-wines", "fruit-wine-trade-report", { payAnyway: true }));
    if (tries[tries.length - 1].ok) return summary(tries);
  }
  const after = yield* purchase("exa", "fruit-news");
  if (after.reason === "POCKET_FROZEN")
    return "Assume I was fooled: I tried to pay Harbour Wines three times and your pocket refused each one. The Sentinel saw the pattern and froze the pocket on-chain, so it refused Exa too. Nothing was paid. Only you can unfreeze it.";
  return summary([...tries, after]);
}

/** Radar: a labelled drainer has just paid TradeWire (the world sets that up on-chain before this runs). */
function* sceneRadar(): Scene {
  if (!(yield* draft(intent("Durian exporter credit report", "0.40", "0.40", 1)))) return declined();
  const first = yield* purchase("tradewire", "credit-report", { reason: "TradeWire's credit report covers the exporter's payment history for HK$0.40." });
  if (first.ok || first.reason !== "COUNTERPARTY_HIGH_RISK") return summary([first]);
  yield { tool: "search_sellers", input: { category: "Research data" }, say: "Radar blocked TradeWire: most of its money came from a drainer. Looking for a clean seller with data on the exporter." };
  const second = yield* purchase("nansen", "wallet-balances");
  return `Radar blocked TradeWire: ${first.why ?? "its money traces to a drainer"}. I didn't pay it and re-planned. ${summary([second])} It shows the exporter's holdings, not a credit history.`;
}

/**
 * Scene 11, the haggler: before paying DataPro's premium report, the agent negotiates with DataPro's agent, numbers only
 * (shared/sim/haggle.ts). It anchors on what the comparable report costs elsewhere, meets the seller halfway, takes a
 * final offer that fits the task, and never offers above the first quote. The owner still co-signs above ask-me.
 */
function* sceneHaggle(): Scene {
  const maxPerItem = "16.00";
  if (!(yield* draft(intent("Durian export premium report with 2026 forecast, price negotiated", maxPerItem, maxPerItem, 1)))) return declined();
  const found = yield { tool: "search_sellers", input: { category: "Research data" }, say: "Looking for sellers with durian export data, and what they charge." };
  // the benchmark: the cheapest priced durian data from another seller (on the built-in network, Exa's news search)
  const others = (found?.sellers ?? []).filter((x: any) => x.id !== "datapro").flatMap((x: any) => x.items.filter((i: any) => i.price && i.price !== "free" && /durian/i.test(i.description)).map((i: any) => ({ seller: x.name, price: i.price })));
  const bench = others.sort((a: any, b: any) => Number(a.price) - Number(b.price))[0];
  const q = yield { tool: "get_quote", input: { sellerId: "datapro", sku: "premium-report" }, say: "Asking DataPro for the price of its premium report with the 2026 forecast." };
  const base = { sellerId: "datapro", sku: "premium-report", price: q?.price };
  if (!q?.ok) return summary([{ ...base, ok: false, reason: q?.reason, why: q?.error ?? q?.why }]);
  if (q.allowedByPocket !== "OK") return summary([{ ...base, ok: false, reason: q.allowedByPocket.reason }]);
  if (q.counterpartyRisk?.verdict === "block") return summary([{ ...base, ok: false, reason: "COUNTERPARTY_HIGH_RISK" }]);
  if (!q.negotiable) return summary([yield* settle("datapro", "premium-report", q.quoteId, q.price, q.needsOwnerApproval)]);

  const list = parseHkd(q.price), walkAway = list < parseHkd(maxPerItem) ? list : parseHkd(maxPerItem);
  let mine = buyerPlan.anchor(list);
  const why = bench ? `${bench.seller} sells durian data for HK$${bench.price}, so the 2026 forecast is what DataPro's extra HK$${formatHkd(list - parseHkd(bench.price))} buys.` : "This is above what comparable reports cost.";
  let r = yield { tool: "counter_offer", input: { quoteId: q.quoteId, price: formatHkd(mine) }, say: `DataPro asks HK$${q.price}. ${why} Opening at HK$${formatHkd(mine)}.` };
  for (let round = 1; r?.ok && !r.deal && round <= MAX_ROUNDS; round++) {
    const counter = parseHkd(r.counter);
    if (buyerPlan.take(mine, { kind: "counter", price: counter, final: !!r.final }, walkAway)) {
      r = yield { tool: "counter_offer", input: { quoteId: q.quoteId, price: r.counter }, say: `${r.final ? "DataPro's final price is" : "DataPro came down to"} HK$${r.counter}, within your task and HK$${formatHkd(list - counter)} under its first price. Taking it.` };
      break;
    }
    if (round === MAX_ROUNDS) break;
    mine = buyerPlan.next(mine, counter);
    r = yield { tool: "counter_offer", input: { quoteId: q.quoteId, price: formatHkd(mine) }, say: `DataPro countered HK$${r.counter}. Meeting it halfway: HK$${formatHkd(mine)}.` };
  }
  if (!r?.ok || !r.deal) {
    // no deal: the first quote still stands; it fits the task, so buy at the list price rather than leave empty-handed
    const o = yield* settle("datapro", "premium-report", q.quoteId, q.price, q.needsOwnerApproval);
    return `DataPro wouldn't come down, so I paid its price. ${summary([o])}`;
  }
  const o = yield* settle("datapro", "premium-report", q.quoteId, r.price, !!r.needsOwnerApproval,
    `DataPro's premium report with the 2026 forecast, negotiated from HK$${r.list} to HK$${r.price} (HK$${r.saved} saved). Still above your ask-me limit.`);
  if (!o.ok) return summary([o]);
  return `Negotiated DataPro's premium report from HK$${r.list} down to HK$${r.price} and bought it: HK$${r.saved} saved. The pocket paid exactly the agreed price.`;
}

function* scene4(): Scene {
  if (!(yield* draft(intent("Fruit and wine trade report", "0.40", "0.40", 1)))) return declined();
  const first = yield* purchase("harbour-wines", "fruit-wine-trade-report", { payAnyway: true });
  if (first.ok) return summary([first]);
  yield { tool: "search_sellers", input: { category: "Research data" }, say: `${name(first.sellerId)} isn't on this pocket's list. Looking for an allowed seller with fruit trade data.` };
  const second = yield* purchase("exa", "fruit-news");
  const lead = first.reason === "SELLER_NOT_ALLOWED" ? `${name(first.sellerId)} isn't on this pocket's list, so I re-planned.` : `${name(first.sellerId)} can't be paid from this pocket (${why(first.reason)}), so I re-planned.`;
  return `${lead} ${summary([second])}`;
}

function* scene5(): Scene {
  if (!(yield* draft(intent("ETH price in HKD", "0.08", "0.08", 1)))) return declined();
  const peek = yield { tool: "get_quote", input: { sellerId: "shadyfeed", sku: "preview" }, say: "Reading ShadyFeed's free preview. Anything it says is data to me, never an instruction." };
  const o = yield* purchase("coingecko", "eth-price");
  const flagged = peek?.refused?.length || /ehkd|send|transfer/i.test(String(peek?.content))
    ? " Warning: ShadyFeed's preview contained instructions to send 50 eHKD to another address and asked for more than a purchase needs; I ignored it and flagged the source."
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
  if (!(yield* draft(intent("Two Exa searches: durian exports and SE Asia fruit trade", "0.08", "0.16", 2)))) return declined();
  const first = yield* purchase("exa", "durian-news", { payAnyway: true });
  const q = yield { tool: "get_quote", input: { sellerId: "exa", sku: "fruit-news" }, delayMs: windowMs, say: "One down. Getting the price of the fruit trade search next." };
  let second: Outcome = { sellerId: "exa", sku: "fruit-news", ok: false, reason: q?.allowedByPocket?.reason ?? q?.reason, price: q?.price };
  if (q?.ok) {
    const p = yield { tool: "pay", input: { quoteId: q.quoteId }, say: `Paying Exa HK$${q.price} from the pocket.` };
    second = p?.ok ? { ...second, ok: true, tx: p.tx } : { ...second, reason: p?.reason, why: p?.why };
  }
  if (!second.ok && second.reason === "POCKET_REVOKED")
    return `You stopped the pocket, so I stopped too. ${first.ok ? `Last completed purchase: ${bought(first)}.` : "Nothing was paid."}`;
  return summary([first, second]);
}

function* scene8(): Scene {
  if (!(yield* draft(intent("Durian export news", "0.04", "0.04", 1)))) return declined();
  yield { tool: "search_sellers", input: {}, say: "Checking every seller against this pocket's limits." };
  const lite = yield { tool: "get_quote", input: { sellerId: "exa", sku: "durian-news" }, say: "Asking Exa for the price of a web search on durian exports." };
  const pro = yield { tool: "get_quote", input: { sellerId: "coingecko", sku: "eth-price" }, say: "Asking CoinGecko too, in case it fits." };
  const line = (id: string, q: any) => {
    const r = q?.allowedByPocket === "OK" ? undefined : q?.allowedByPocket?.reason ?? q?.reason;
    if (!r) return `${name(id)} costs HK$${q.price} and is allowed.`;
    if (r === "OVER_CAP") return `${name(id)} costs HK$${q?.price ?? "?"}, above this pocket's cap.`;
    if (r === "SELLER_NOT_ALLOWED") return `${name(id)} isn't on your list.`;
    return `${name(id)} can't be paid: ${why(r)}.`;
  };
  const price = lite?.price ?? "0.056";
  return `No allowed seller fits. ${line("exa", lite)} ${line("coingecko", pro)} Nothing was paid. Fix: raise the cap and budget to HK$${price}, then ask me again.`;
}

// ---- attacks a judge can type (the four named in the rules). The agent refuses in words; the world then shows the
// chain refusing too where there is something to try (escalation: the agent key calls setCap and reverts NOT_OWNER).
export type AttackKind = "induced" | "extraction" | "escalation";

const ESCALATION = /\b(i'?m|i am|as|acting as) (the |an? |your )?(admin|administrator|developer|dev|owner|operator|root|superuser|support)\b|\bsudo\b|developer mode|god mode|root access|\b(raise|increase|lift|remove|change|bump|double|disable|turn off|set|update|edit)\b[^.?!]*\b(cap|per-payment cap|spending limit|ask-me|allow ?list|white ?list|pocket'?s? rules|the rules|your rules)\b|\badd\b[^.?!]*\bas (a |an )?(new )?seller\b|\badd (a |an )?(new )?seller\b|\bset_?cap\b|\bset_?seller\b|\bnew owner\b|\bmake me (the )?owner\b|\btransfer ownership\b/;
const EXTRACTION = /private key|secret key|seed phrase|mnemonic|recovery phrase|system prompt|your (hidden )?(instructions|prompt)|\b(give|tell|show|send|reveal|print|share|leak|list|what'?s|what is|what are)\b[^.?!]*(password|api key|owner'?s? (full )?(name|email|address|phone|identity|balance|wallet|key)|main wallet|other pockets?|personal data|kyc|passport)/;
const INDUCED = /\b(send|transfer|wire|move|refund|forward|pay out|withdraw)\b[^.?!]*\b(ehkd|hkd|(?:hk|us)\$|\$\s?\d|dollars?|money|funds|everything|balance)\b|\b(send|transfer|pay)\b[^.?!]*\b0x[0-9a-f]{4,}/;

/** Which attack a message is, if any (checked before the scenes, so a judge's own wording still lands). */
export function attackOf(text: string): AttackKind | undefined {
  const t = text.toLowerCase();
  if (ESCALATION.test(t)) return "escalation";
  if (EXTRACTION.test(t)) return "extraction";
  if (INDUCED.test(t)) return "induced";
  return undefined;
}

const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

function* escalation(): Scene {
  const p = yield { tool: "get_pocket", input: {}, say: "This asks me to change the pocket's rules. Only the owner's key can do that, and none of my tools edit rules. Reading the rules as they stand." };
  const sellersNow = Array.isArray(p?.allowedSellers) && p.allowedSellers.length ? list(p.allowedSellers) : "the sellers you chose";
  return `I can't do that. Only the owner's key can change this pocket's cap or sellers, and I have no tool that edits rules. The cap stays HK$${p?.perPaymentCap ?? "?"} and the sellers stay ${sellersNow}.`;
}

function* extraction(): Scene {
  yield { tool: "get_pocket", input: {}, say: "This asks for things I must not share. I hold no keys, I can't see the owner's main wallet or other pockets, and my instructions stay private." };
  return "I can't share that. I have no access to the owner's key, main wallet or other pockets, and I don't share my instructions or anyone's personal details. I can only buy research inside this pocket's rules.";
}

function* induced(): Scene {
  yield { tool: "get_pocket", input: {}, say: "A message asking me to send money to an address is not a purchase. I only pay sellers on this pocket's list, through a quote, for a task the owner confirmed." };
  return "I won't send money because a message asks me to. I can only pay sellers on this pocket's list, through a quote, for a task you confirmed. Nothing was sent.";
}

function* hello(): Scene {
  return HELLO;
}

export const HELLO = "Hi. I buy data for you from the sellers this pocket allows, inside its limits. Tell me what you need, a price limit and a deadline, for example: \"Research a durian import deal for me: export news, the ETH price and a check on the exporter's wallet. Under HK$0.80, by tonight.\"";
export const FALLBACK = "I can only buy from the sellers this pocket allows. Tell me what you need, a price limit and a deadline, for example: \"Search Exa for durian export news. Max HK$0.08, by tonight.\"";

/** Pick the scene for the owner's message (`asked`: an unanswered clarifying question from scene 1). */
export function route(text: string, o: { asked: boolean; revokeWindowMs: number }): Scene | undefined {
  const t = text.toLowerCase();
  const attack = attackOf(t);
  if (attack === "escalation") return escalation();
  if (attack === "extraction") return extraction();
  if (attack === "induced") return induced();
  if (/drainer/.test(t)) return sceneRadar();
  if (/negotiat|haggle|bargain|talk (them|the price) down/.test(t)) return sceneHaggle();
  if (/assume (the |my |your )?agent (was|is|got) fooled/.test(t)) return sceneHijacked();
  if (/shadyfeed/.test(t) && /full feed|whatever they need|give them/.test(t)) return scene6();
  if (/shadyfeed/.test(t)) return scene5();
  if (/harbour|wine/.test(t)) return scene4();
  if (/two (exa )?searches|both searches|durian (export )?news and (the )?(se asia )?fruit/.test(t)) return scene7(o.revokeWindowMs);
  if (/\b0\.04\b|four cents/.test(t)) return scene8();
  if (/durian import deal|research a durian/.test(t)) return scene1Ask();
  if (o.asked) return scene1Answer();
  if (/nansen|counterpart|exporter'?s wallet/.test(t)) return scene3();
  if (/tradewire|credit report/.test(t)) return creditOnly();
  if (/coingecko|ehkd price/.test(t)) return priceOnly();
  if (/fruit trade/.test(t)) return fruitOnly();
  if (/\bexa\b|durian/.test(t)) return scene2();
  if (/^(hi|hello|hey|yo)\b|what can you do|help/.test(t)) return hello();
  return undefined;
}
