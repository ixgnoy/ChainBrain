// Live understanding for New pocket app: while the owner types, which words ChainBrain has understood, as spans of the
// sentence (to highlight in place) and as chips (sellers with their marks, the money, the period, the schedule, the agent,
// the price limit, the kind of app). It reads with the same rules as the fixed reader (speak.ts) and the picker
// (pocketApp.ts), so what lights up is what Compose will use. Nothing here decides anything: Compose still reads the whole
// sentence, the proof card is still computed, and the owner still signs. No imports beyond the shared sim files.
import { pickAgent, pickCadence, pickLayout, cadenceText, type Layout } from "./pocketApp";

export type SpanKind = "seller" | "money" | "period" | "schedule" | "agent" | "limit" | "ask" | "app";
export type Span = { start: number; end: number; kind: SpanKind; label: string; sellerId?: string; agentId?: string; layout?: Layout };
export type Understood = { spans: Span[]; chips: Span[]; layout: Layout | null; agent: "chainbrain" | "claude" | "chatgpt" };

type Seller = { id: string; name: string };
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const fmt = (n: string) => (Math.round(Number.parseFloat(n) * 100) / 100).toFixed(2);

/** Every match of `re` in `text` (case-insensitive), as [start, end, groups]. */
function all(text: string, re: RegExp): [number, number, string[]][] {
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
  const out: [number, number, string[]][] = [];
  let m: RegExpExecArray | null;
  while ((m = g.exec(text))) { out.push([m.index, m.index + m[0].length, m.slice(1)]); if (m[0].length === 0) g.lastIndex++; }
  return out;
}

export function understand(text: string, sellers: Seller[]): Understood {
  const spans: Span[] = [];
  const add = (s: Span) => { if (!spans.some((x) => x.start < s.end && s.start < x.end)) spans.push(s); }; // first reading of a word wins
  const t = text;

  // the price limit and the allowance first: their amounts are not the loose "in total or each?" kind
  for (const [a, b, g] of all(t, /\b(?:drops?|falls?|dips?|goes|gets|is)\s+(?:below|under|to)\s+(?:HK|US)?\$\s?(\d+(?:\.\d{1,3})?)/i)) add({ start: a, end: b, kind: "limit", label: `Buys at HK$${fmt(g[0])} or less` });
  for (const [a, b, g] of all(t, /(?:max(?:imum)?\s+|at most\s+|up to\s+|no more than\s+)?(?:HK|US)?\$\s?(\d+(?:\.\d{1,2})?)\s*(?:a|per|each|every)\s+(day|week|month)\b/i)) add({ start: a, end: b, kind: "period", label: `HK$${fmt(g[0])} a ${g[1].toLowerCase()}` });
  for (const [a, b, g] of all(t, /ask (?:me )?(?:above|over|for anything over|if (?:it'?s )?(?:more|over) than)\s+(?:HK|US)?\$\s?(\d+(?:\.\d{1,2})?)/i)) add({ start: a, end: b, kind: "ask", label: `Asks you above HK$${fmt(g[0])}` });
  for (const [a, b] of all(t, /\b(?:never ask|don'?t ask|without asking)\b/i)) add({ start: a, end: b, kind: "ask", label: "Never asks you" });
  for (const [a, b, g] of all(t, /(?:at most|up to|max(?:imum)?|no more than|under)?\s*(?:HK|US)?\$\s?(\d+(?:\.\d{1,2})?)\s*(each|per (?:payment|report|item|purchase))/i)) add({ start: a, end: b, kind: "money", label: `HK$${fmt(g[0])} each` });
  for (const [a, b, g] of all(t, /(?:HK|US)?\$\s?(\d+(?:\.\d{1,2})?)/i)) add({ start: a, end: b, kind: "money", label: `HK$${fmt(g[0])}` });

  // the schedule, in the owner's own words
  const sched = /\b(?:every|each)\s+(?:day|morning|evening|night|weekday|week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\b(?:daily|weekly|monthly|on weekdays)\b/i;
  const at = /\bat\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/i;
  const s = all(t, sched)[0];
  const layoutGuess = pickLayout(t);
  if (s) {
    const c = pickCadence(t, layoutGuess);
    add({ start: s[0], end: s[1], kind: "schedule", label: cadenceText(c) });
    const h = all(t, at)[0];
    if (h) add({ start: h[0], end: h[1], kind: "schedule", label: cadenceText(c) });
  }

  // who spends it
  for (const [a, b] of all(t, /\b(?:claude|chat ?gpt|openai)\b/i)) {
    const id = /claude/i.test(t.slice(a, b)) ? "claude" : "chatgpt";
    add({ start: a, end: b, kind: "agent", label: id === "claude" ? "Claude" : "ChatGPT", agentId: id });
  }

  // sellers, by whole word (Exa must not light up inside "exactly")
  for (const sl of sellers) {
    for (const w of new Set([sl.name, sl.id.replace(/-/g, " ")])) {
      for (const [a, b] of all(t, new RegExp(`\\b${esc(w)}(?:'s)?\\b`, "i"))) add({ start: a, end: b, kind: "seller", label: sl.name, sellerId: sl.id });
    }
  }

  spans.sort((x, y) => x.start - y.start);
  // chips: one per meaning (two mentions of the same seller make one chip), in the order the sentence says them
  const seen = new Set<string>();
  const chips = spans.filter((x) => { const k = `${x.kind}:${x.sellerId ?? x.agentId ?? x.label}`; if (seen.has(k)) return false; seen.add(k); return true; });
  // the kind of app leads, once there is something to build it from (a seller or a schedule): the picker's choice, marked on
  // the words that decided it when there are any (they may also carry the price limit, so it is a chip, not a span)
  const said = spans.some((x) => x.kind === "seller" || x.kind === "schedule");
  if (said) {
    const w = all(t, /\b(?:negotiat\w*|haggle|bargain|one[- ]off|renew\w*|subscri\w*|price watch|drops? below|falls? below|deal)\b/i)[0];
    chips.unshift({ start: w?.[0] ?? 0, end: w?.[1] ?? 0, kind: "app", label: APP_LABEL[layoutGuess], layout: layoutGuess });
  }
  return { spans, chips, layout: said ? layoutGuess : null, agent: pickAgent(t) };
}

export const APP_LABEL: Record<Layout, string> = { research: "Research desk", deal: "Deal watcher", subscriptions: "Subscriptions", haggle: "Haggler" };
