// "Speak your rules": one sentence -> pocket rules -> a proof card. The AI only proposes; this file holds the parts that must not
// be AI: merging two independent readings so a disagreement never widens a rule, and the proof card, computed from the same
// rule order as Pocket.canPay. A fixed parser also lives here: the built-in network uses it, and the server falls back to it.
// No imports, so the server, the built-in network, the phone and Node tests share it.

export type Lifetime = "one-task" | "until-tonight" | "ongoing";
export type Draft = {
  name?: string;
  sellers: string[];
  /** HK$ strings, e.g. "16.00"; askAbove "never" (never ask) or "0" (ask every time) or an amount */
  cap: string;
  askAbove: string;
  budget: string;
  lifetime: Lifetime;
  /** A routine's allowance ("max HK$0.40 a week"): checked by ChainBrain's routine runner before each run, not by the
   *  contract (Pocket.sol has no period). Absent for a pocket with no routine. */
  per?: { amount: string; period: Period } | null;
  /** A price watch's limit ("when the price drops below HK$0.32"): also the pocket's per-payment cap, so the contract
   *  refuses anything above it. */
  limit?: string | null;
};
export type Period = "day" | "week" | "month";
export type Question = { field: keyof Draft; question: string; options: { label: string; value: string }[] };
export type Compiled = { draft: Draft; questions: Question[]; by: "claude" | "parser"; disagreements: string[] };
type Seller = { id: string; name: string };

const num = (s: string) => Number.parseFloat(s);
const fmt = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
const money = /(?:hk|us)?\$\s?(\d+(?:\.\d{1,2})?)|(\d+(?:\.\d{1,2})?)\s?(?:hkd|ehkd|dollars?)/i;

/** The fixed reader: catches the usual ways people say limits. Anything it is unsure of becomes a question, never a guess. */
export function parseSentence(text: string, sellers: Seller[]): Compiled {
  const t = ` ${text.toLowerCase()} `;
  const questions: Question[] = [];
  // whole words only: "Exa" must not match "exactly" or "example"
  const word = (w: string) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(t);
  const picked = sellers.filter((s) => word(s.name.toLowerCase()) || word(s.id.replace(/-/g, " ")));
  const amountNear = (re: RegExp) => { const m = re.exec(t); if (!m) return undefined; const a = money.exec(m[0]); return a ? fmt(num(a[1] ?? a[2])) : undefined; };
  const cap = amountNear(/(?:at most|up to|max(?:imum)?|no more than|under)\s+(?:hk|us)?\$\s?\d+(?:\.\d{1,2})?\s*(?:each|per (?:payment|report|item|purchase))|(?:hk|us)?\$\s?\d+(?:\.\d{1,2})?\s*(?:each|per (?:payment|report|item|purchase))/);
  const budget = amountNear(/(?:hk|us)?\$\s?\d+(?:\.\d{1,2})?\s*(?:budget|in total|total|for (?:the|this|a) (?:pocket|task|week|month))|(?:budget|total)(?: of)?\s+(?:hk|us)?\$\s?\d+(?:\.\d{1,2})?|^\s*(?:give it |put in |fund (?:it )?with )?(?:hk|us)?\$\s?\d+(?:\.\d{1,2})?\s+(?:for|to)/);
  let askAbove: string | undefined;
  if (/never ask|don'?t ask|no need to ask|without asking/.test(t)) askAbove = "never";
  else if (/ask (?:me )?(?:every time|for every|each time|always)|always ask/.test(t)) askAbove = "0";
  else askAbove = amountNear(/ask (?:me )?(?:above|over|for anything over|if (?:it'?s )?(?:more|over) than)\s+(?:hk|us)?\$\s?\d+(?:\.\d{1,2})?/);
  // a routine's allowance and a price watch's limit (pocket apps); their amounts are not the ambiguous "in total or each?"
  const perM = /(?:max(?:imum)?|at most|up to|no more than|budget(?: of)?|spend)?\s*(?:hk|us)?\$\s?(\d+(?:\.\d{1,2})?)\s*(?:a|per|each|every)\s+(day|week|month)\b/.exec(t);
  const per = perM ? { amount: fmt(num(perM[1])), period: perM[2] as Period } : null;
  const limM = /(?:drops?|falls?|dips?|goes|gets|is)\s+(?:below|under|to)\s+(?:hk|us)?\$\s?(\d+(?:\.\d{1,3})?)/.exec(t);
  const limit = limM && /price|drops?|falls?|dips?|cheap/.test(t) ? fmt(num(limM[1])) : null;
  const lifetime: Lifetime | undefined = /tonight|today|end of (?:the )?day/.test(t) ? "until-tonight" : /one (?:task|purchase|time)|one[- ]off|once|single/.test(t) ? "one-task" : /ongoing|every (?:week|month|day|morning|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|daily|weekly|monthly|until i (?:stop|revoke)|no end|for a year/.test(t) || per ? "ongoing" : undefined;

  // amounts with no "each" or "total" next to them: one amount is ambiguous, so ask (scene 1's "under HK$16" question)
  const loose = [...t.matchAll(/(?:hk|us)?\$\s?(\d+(?:\.\d{1,2})?)/g)].map((m) => fmt(num(m[1])));
  const used = new Set([cap, budget, askAbove, per?.amount, limit].filter(Boolean));
  const free = loose.filter((x) => !used.has(x));
  let capV = cap, budgetV = budget;
  if (!capV && !budgetV && free.length === 1) {
    questions.push({ field: "cap", question: `HK$${free[0]} in total or per payment?`, options: [{ label: `HK$${free[0]} in total`, value: `total:${free[0]}` }, { label: `HK$${free[0]} per payment`, value: `each:${free[0]}` }] });
    capV = free[0]; budgetV = free[0]; // until answered: the stricter reading (the pocket holds only that much, each payment at most that much)
  }
  if (!budgetV && capV) budgetV = free.find((x) => num(x) > num(capV!)) ?? capV;
  if (per) {
    // a routine pocket holds two periods' worth unless the owner said how much to put in; one payment is at most a period's
    if (!budgetV) budgetV = fmt(num(per.amount) * 2);
    if (!capV) capV = per.amount;
    if (askAbove === undefined) askAbove = "never"; // inside the allowance it runs on its own; above it the runner asks
  }
  if (limit) capV = capV && num(capV) < num(limit) ? capV : limit; // the contract refuses any price above the limit
  if (limit && !budgetV) budgetV = fmt(num(limit) * 5);
  if (!capV && budgetV) capV = budgetV;
  if (!picked.length) questions.push({ field: "sellers", question: "Which sellers may it pay?", options: sellers.map((s) => ({ label: s.name, value: s.id })) });
  if (!lifetime) questions.push({ field: "lifetime", question: "How long should it last?", options: [{ label: "One task", value: "one-task" }, { label: "Until tonight", value: "until-tonight" }, { label: "Ongoing", value: "ongoing" }] });
  if (askAbove === undefined) questions.push({ field: "askAbove", question: "When should it ask you first?", options: [{ label: "Every payment", value: "0" }, { label: `Above HK$${fmt(num(capV ?? "8") / 2)}`, value: fmt(num(capV ?? "8") / 2) }, { label: "Never", value: "never" }] });
  const name = /for ([a-z][a-z ]{2,30}?)(?: research| reports?| data)?(?: from| at| up to| under| with| until|,|\.|$)/.exec(t)?.[1]?.trim();
  return {
    draft: {
      name: name ? name.replace(/\b\w/g, (x) => x.toUpperCase()).slice(0, 24) : undefined,
      sellers: picked.map((s) => s.id), cap: capV ?? "8.00", budget: budgetV ?? "8.00",
      askAbove: askAbove ?? "0", lifetime: lifetime ?? "one-task",
      ...(per ? { per } : {}), ...(limit ? { limit } : {}),
    },
    questions, by: "parser", disagreements: [],
  };
}

/** Apply the owner's answer to a question. */
export function answer(d: Draft, field: keyof Draft, value: string): Draft {
  if (field === "cap" && value.startsWith("total:")) return { ...d, budget: value.slice(6), cap: value.slice(6) };
  if (field === "cap" && value.startsWith("each:")) return { ...d, cap: value.slice(5), budget: num(d.budget) > num(value.slice(5)) ? d.budget : fmt(num(value.slice(5)) * 2) };
  if (field === "sellers") return { ...d, sellers: d.sellers.includes(value) ? d.sellers : [...d.sellers, value] };
  return { ...d, [field]: value } as Draft;
}

const LIFE_RANK: Record<Lifetime, number> = { "one-task": 0, "until-tonight": 1, ongoing: 2 };
const askRank = (a: string) => (a === "never" ? Infinity : num(a));

/**
 * Two independent readings of the same sentence: where they differ, take the stricter value and say so. The pocket that
 * results can never allow more than either reading did, so a misread can only make it tighter.
 */
export function stricterDraft(a: Draft, b: Draft): { draft: Draft; disagreements: string[] } {
  const d: string[] = [];
  const pick = <K extends keyof Draft>(k: K, v: Draft[K], why: string) => { if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) d.push(why); return v; };
  const sellers = a.sellers.filter((s) => b.sellers.includes(s));
  return {
    draft: {
      name: a.name ?? b.name,
      sellers: pick("sellers", sellers, `Sellers: kept only those both readings agree on (${sellers.join(", ") || "none"})`),
      cap: pick("cap", fmt(Math.min(num(a.cap), num(b.cap))), "Per-payment cap: used the lower reading"),
      budget: pick("budget", fmt(Math.min(num(a.budget), num(b.budget))), "Budget: used the lower reading"),
      askAbove: pick("askAbove", askRank(a.askAbove) <= askRank(b.askAbove) ? a.askAbove : b.askAbove, "Ask-me limit: asks more often"),
      lifetime: pick("lifetime", LIFE_RANK[a.lifetime] <= LIFE_RANK[b.lifetime] ? a.lifetime : b.lifetime, "Lifetime: used the shorter reading"),
      ...stricterPer(a, b, d),
    },
    disagreements: d,
  };
}

const PERIOD_DAYS: Record<Period, number> = { day: 1, week: 7, month: 30 };
/** The allowance and the price limit: where only one reading has one, it is kept (a limit can only narrow); where both do,
 *  the lower spend rate and the lower limit win. */
function stricterPer(a: Draft, b: Draft, d: string[]): Pick<Draft, "per" | "limit"> {
  const out: Pick<Draft, "per" | "limit"> = {};
  const rate = (p: NonNullable<Draft["per"]>) => num(p.amount) / PERIOD_DAYS[p.period];
  if (a.per && b.per) {
    out.per = rate(a.per) < rate(b.per) || (rate(a.per) === rate(b.per) && PERIOD_DAYS[a.per.period] <= PERIOD_DAYS[b.per.period]) ? a.per : b.per;
    if (JSON.stringify(a.per) !== JSON.stringify(b.per)) d.push("Allowance: used the lower spend rate");
  } else if (a.per || b.per) { out.per = a.per ?? b.per; d.push("Allowance: kept the reading that has one"); }
  if (a.limit && b.limit) { out.limit = num(a.limit) <= num(b.limit) ? a.limit : b.limit; if (a.limit !== b.limit) d.push("Price limit: used the lower reading"); }
  else if (a.limit || b.limit) { out.limit = a.limit ?? b.limit; d.push("Price limit: kept the reading that has one"); }
  return out;
}

/** The routine runner's own check (shared/sim/world.ts runRoutine), on draft rules: a run that would take the period past
 *  its allowance asks the owner (the cheque) instead of paying. */
export function draftRunCheck(d: Draft, spentThisPeriod: number, hkd: number): "OK" | "ASKS_YOU" {
  return d.per && spentThisPeriod + hkd > num(d.per.amount) + 1e-9 ? "ASKS_YOU" : "OK";
}

// ---------------------------------------------------------------- proof card

/** Pocket.canPay's order, on draft rules (no chain needed). */
export function draftCanPay(d: Draft, seller: string, hkd: number, o: { balance?: number; expired?: boolean; revoked?: boolean } = {}): string {
  if (o.revoked) return "POCKET_REVOKED";
  if (o.expired) return "POCKET_EXPIRED";
  if (!d.sellers.includes(seller)) return "SELLER_NOT_ALLOWED";
  if (hkd > num(d.cap)) return "OVER_CAP";
  if (hkd > (o.balance ?? num(d.budget))) return "OVER_BUDGET";
  return "OK";
}

export type Proof = {
  worstCase: string;
  lines: string[];
  neverPayable: string[];
  tests: { label: string; expect: string; got: string; ok: boolean }[];
};

/** What can and cannot happen with these rules, computed, not written by the AI. */
export function proof(d: Draft, sellers: Seller[]): Proof {
  const name = (id: string) => sellers.find((s) => s.id === id)?.name ?? id;
  const allowed = d.sellers.map(name);
  const never = sellers.filter((s) => !d.sellers.includes(s.id)).map((s) => s.name);
  const cap = num(d.cap), budget = num(d.budget);
  const askText = d.askAbove === "never" ? "never asks you" : d.askAbove === "0" ? "asks you before every payment" : `asks you above HK$${fmt(num(d.askAbove))}`;
  const life = d.lifetime === "one-task" ? "ends in 24 hours" : d.lifetime === "until-tonight" ? "ends at 23:59 tonight" : "runs until you revoke it";
  const first = d.sellers[0];
  const out = sellers.find((s) => !d.sellers.includes(s.id));
  const t = (label: string, expect: string, got: string) => ({ label, expect, got, ok: expect === got });
  const tests = [
    ...(first ? [t(`HK$${fmt(Math.min(cap, budget))} to ${name(first)}`, "OK", draftCanPay(d, first, Math.min(cap, budget)))] : []),
    ...(first ? [t(`HK$${fmt(cap + 0.08)} to ${name(first)}`, "OVER_CAP", draftCanPay(d, first, cap + 0.08))] : []),
    ...(out ? [t(`HK$2.40 to ${out.name}`, "SELLER_NOT_ALLOWED", draftCanPay(d, out.id, 2.4))] : []),
    t("HK$0.08 to an unknown address", "SELLER_NOT_ALLOWED", draftCanPay(d, "0xattacker", 0.08)),
    t("Any payment after it ends", "POCKET_EXPIRED", draftCanPay(d, first ?? "x", 0.08, { expired: true })),
    ...(d.per ? [t(`A run past HK$${fmt(num(d.per.amount))} this ${d.per.period}`, "ASKS_YOU", draftRunCheck(d, num(d.per.amount), 0.08))] : []),
  ];
  return {
    worstCase: fmt(budget), // the pocket holds the budget and nothing else: the most a fooled agent can ever lose
    lines: [
      allowed.length ? `Pays only ${allowed.join(" and ")}` : "Can't pay anyone yet: pick a seller",
      `At most HK$${fmt(cap)} per payment, HK$${fmt(budget)} in all`,
      d.per ? `Up to HK$${fmt(num(d.per.amount))} a ${d.per.period} on its own; above that, ChainBrain asks you first` : `Your agent ${askText}`,
      ...(d.limit ? [`Buys only at HK$${fmt(num(d.limit))} or less, refused by the contract above it`] : []),
      `The pocket ${life}`,
    ],
    neverPayable: never,
    tests,
  };
}
