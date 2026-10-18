// Pocket apps: every pocket gets its own screen, picked from a fixed block catalogue by WHAT the pocket is for (its layout)
// and themed by WHO spends from it (the agent's own mark and name; the card colour comes from the layout). The AI only
// returns a small JSON spec {v, catalogue, layout, title, blocks[], routine}; this file validates it and our own components
// render it. The AI never writes UI code, a block never carries a value (the renderer reads every number from the ledger),
// and no seller text can enter a spec: the composer only ever sees the owner's sentence.
//
// The routine is the pocket's standing order, stored as typed fields (never free-text memory): a cadence, the items to buy,
// and an allowance per period. The allowance follows MetaMask's ERC20PeriodTransferEnforcer: spend within the current
// period counts against it, nothing carries over, a new period starts from zero. Our periods are calendar ones in Hong Kong
// time (UTC+8, no daylight saving): a day from 00:00, a week from Monday 00:00, a month from the 1st.
//
// No imports, so the phone (Metro), the console (Vite), the server and Node tests share it.

export const CATALOGUE_ID = "chainbrain.pocket.v1";
export type Layout = "research" | "deal" | "subscriptions" | "haggle";
export const LAYOUTS: readonly Layout[] = ["research", "deal", "subscriptions", "haggle"];
export type Period = "day" | "week" | "month";
export const PERIODS: readonly Period[] = ["day", "week", "month"];
/** Pocket.setPeriodLimit's kind for each period (0 = no allowance). */
export const PERIOD_KIND: Record<Period, number> = { day: 1, week: 2, month: 3 };

/** When a routine runs. `weekday` 1 = Monday … 7 = Sunday (ISO); hours and minutes in Hong Kong time. */
export type Cadence = { every: "day" | "weekday" | "week" | "month"; weekday?: number | null; dayOfMonth?: number | null; hour: number; minute: number };
export type RoutineItem = { sellerId: string; sku: string };
export type RoutineKind = "schedule" | "price-watch" | "renewals";
export type RoutineSpec = {
  kind: RoutineKind;
  cadence: Cadence;
  /** What each run buys (seller-registry ids; names and descriptions are read from the registry when shown). */
  items: RoutineItem[];
  /** At most this much per period; a run that would pass it asks the owner (the cheque). HK$ string, e.g. "0.40". */
  allowance: { amount: string; period: Period };
  /** Price watch: buy only at or below this (also the pocket's per-payment cap, so the contract enforces it). */
  limitPrice?: string | null;
};
/** A routine as the network keeps it. */
export type Routine = RoutineSpec & { id: string; pocket: string; createdAt: number; nextAt: number; runs: number; lastRunAt?: number; status: "active" | "paused" };

// ---------------------------------------------------------------- the block catalogue

type Param = { kind: "enum"; values: readonly string[]; default: string } | { kind: "int"; min: number; max: number; default: number };
export type BlockDef = { layouts: readonly Layout[]; hero?: boolean; routine?: boolean; params: Record<string, Param>; description: string; example: object };
const ALL = LAYOUTS;
const SCHEDULED: readonly Layout[] = ["research", "deal", "subscriptions"];

/** Every block a pocket app can show. A block names what it shows; the numbers come from the ledger, never the spec. */
export const BLOCKS = {
  shelf: { layouts: ["research"], hero: true, params: {}, description: "Hero for a research desk: the reports this pocket bought, stacked newest first, with how many and what they cost.", example: { type: "shelf" } },
  "price-chart": { layouts: ["deal"], hero: true, params: { range: { kind: "enum", values: ["7d", "14d"], default: "14d" } }, description: "Hero for a deal watcher: every price the seller quoted, the owner's limit as a line, and each buy marked on it.", example: { type: "price-chart", range: "14d" } },
  "month-spend": { layouts: ["subscriptions"], hero: true, params: {}, description: "Hero for subscriptions: this month's spend split by seller, with the next renewals as ticks.", example: { type: "month-spend" } },
  ladder: { layouts: ["haggle"], hero: true, params: {}, description: "Hero for a haggler or one-off: each offer and counter-offer stepping down to the price paid.", example: { type: "ladder" } },
  budget: { layouts: ALL, params: {}, description: "The budget meter: this period's spend against the routine's allowance (or the balance against what was put in), with the limit marked.", example: { type: "budget" } },
  "next-run": { layouts: SCHEDULED, routine: true, params: {}, description: "When the routine runs next and the following runs, with a control to run the next one now.", example: { type: "next-run" } },
  runs: { layouts: SCHEDULED, routine: true, params: { limit: { kind: "int", min: 2, max: 6, default: 3 } }, description: "The routine's recent runs: what each paid, and any it had to ask about.", example: { type: "runs", limit: 3 } },
  library: { layouts: ["research", "deal"], params: { limit: { kind: "int", min: 3, max: 8, default: 4 } }, description: "What this pocket bought, newest first, each with its receipt.", example: { type: "library", limit: 4 } },
  sources: { layouts: ALL, params: {}, description: "The sellers this pocket pays, with each one's share of the spend.", example: { type: "sources" } },
  renewals: { layouts: ["subscriptions"], routine: true, params: {}, description: "Each renewal by its next date, with what it cost last time.", example: { type: "renewals" } },
  "price-changes": { layouts: ["subscriptions", "deal"], params: {}, description: "Prices that moved between the seller's quotes, rises first.", example: { type: "price-changes" } },
  savings: { layouts: ["haggle"], params: {}, description: "What the agent saved against the seller's first price.", example: { type: "savings" } },
  guard: { layouts: SCHEDULED, routine: true, params: {}, description: "What this routine will never do: the fixed sellers, the cap, the allowance and the schedule.", example: { type: "guard" } },
} as const satisfies Record<string, BlockDef>;
export type BlockType = keyof typeof BLOCKS;
export const BLOCK_TYPES = Object.keys(BLOCKS) as BlockType[];
export type Block = { type: BlockType; range?: "7d" | "14d"; limit?: number };

export type PocketAppSpec = { v: 1; catalogue: typeof CATALOGUE_ID; layout: Layout; title: string; blocks: Block[]; routine: RoutineSpec | null };

const HERO: Record<Layout, BlockType> = { research: "shelf", deal: "price-chart", subscriptions: "month-spend", haggle: "ladder" };
export const heroOf = (l: Layout) => HERO[l];
/** The picker's block order per layout (and the fallback when a model's spec fails). */
export const DEFAULT_BLOCKS: Record<Layout, BlockType[]> = {
  research: ["shelf", "budget", "next-run", "runs", "sources", "guard"],
  deal: ["price-chart", "budget", "next-run", "library", "price-changes", "guard"],
  subscriptions: ["month-spend", "renewals", "budget", "price-changes", "sources", "guard"],
  haggle: ["ladder", "savings", "budget", "sources"],
};
export const ROUTINE_KIND: Record<Layout, RoutineKind | null> = { research: "schedule", deal: "price-watch", subscriptions: "renewals", haggle: null };

// ---------------------------------------------------------------- validation

export type Registry = { id: string; name: string; items: { sku: string; price: string | null }[] }[];
export type Checked<T> = { ok: true; value: T } | { ok: false; errors: string[] };
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const AMOUNT = /^\d{1,4}(?:\.\d{1,6})?$/;
const hkdNum = (s: string) => Number.parseFloat(s);

/** A label from the owner's sentence (or a model's reading of it): letters, digits and plain punctuation only, 28 characters
 *  at most. Anything that could be a link, an address, an amount or markup is refused rather than cleaned. */
export function cleanLabel(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.replace(/\s+/g, " ").trim();
  if (!s || s.length > 28) return null;
  if (/https?:|www\.|\.(?:com|io|net|org|xyz)\b|0x[0-9a-f]{3,}|[$<>{}[\]`\\@#=|*_~^]/i.test(s)) return null;
  if (!/^[\p{L}\p{N} .,'&+\-/%()]+$/u.test(s)) return null;
  return s;
}

export function validateRoutine(raw: unknown, registry: Registry, layout?: Layout): Checked<RoutineSpec> {
  const e: string[] = [];
  if (!isObj(raw)) return { ok: false, errors: ["routine: not an object"] };
  const extra = Object.keys(raw).filter((k) => !["kind", "cadence", "items", "allowance", "limitPrice"].includes(k));
  if (extra.length) e.push(`routine: unknown fields ${extra.join(", ")}`);
  const kind = raw.kind as RoutineKind;
  if (!["schedule", "price-watch", "renewals"].includes(kind)) e.push("routine.kind");
  if (layout && ROUTINE_KIND[layout] !== kind) e.push(`routine.kind ${String(kind)} does not fit layout ${layout}`);
  const c = raw.cadence;
  if (!isObj(c)) e.push("routine.cadence");
  else {
    const extraC = Object.keys(c).filter((k) => !["every", "weekday", "dayOfMonth", "hour", "minute"].includes(k));
    if (extraC.length) e.push(`routine.cadence: unknown fields ${extraC.join(", ")}`);
    if (!["day", "weekday", "week", "month"].includes(String(c.every))) e.push("routine.cadence.every");
    if (!Number.isInteger(c.hour) || (c.hour as number) < 0 || (c.hour as number) > 23) e.push("routine.cadence.hour");
    if (!Number.isInteger(c.minute) || (c.minute as number) < 0 || (c.minute as number) > 59) e.push("routine.cadence.minute");
    if (c.every === "week" && !(Number.isInteger(c.weekday) && (c.weekday as number) >= 1 && (c.weekday as number) <= 7)) e.push("routine.cadence.weekday");
    if (c.every === "month" && !(Number.isInteger(c.dayOfMonth) && (c.dayOfMonth as number) >= 1 && (c.dayOfMonth as number) <= 28)) e.push("routine.cadence.dayOfMonth");
  }
  const items = raw.items;
  if (!Array.isArray(items) || items.length < 1 || items.length > 4) e.push("routine.items: 1 to 4");
  else for (const it of items) {
    if (!isObj(it) || Object.keys(it).some((k) => k !== "sellerId" && k !== "sku")) { e.push("routine.items: {sellerId, sku} only"); continue; }
    const s = registry.find((x) => x.id === it.sellerId);
    const item = s?.items.find((x) => x.sku === it.sku);
    if (!item) e.push(`routine.items: ${String(it.sellerId)}/${String(it.sku)} is not a known item`);
    else if (item.price === null) e.push(`routine.items: ${String(it.sku)} is free (a routine only buys)`);
  }
  if (kind === "price-watch" && Array.isArray(items) && items.length !== 1) e.push("routine.items: a price watch buys one item");
  const a = raw.allowance;
  if (!isObj(a) || typeof a.amount !== "string" || !AMOUNT.test(a.amount) || hkdNum(a.amount) <= 0 || !PERIODS.includes(a.period as Period)) e.push("routine.allowance");
  if (kind === "price-watch") {
    if (typeof raw.limitPrice !== "string" || !AMOUNT.test(raw.limitPrice) || hkdNum(raw.limitPrice) <= 0) e.push("routine.limitPrice: a price watch needs its limit");
  } else if (raw.limitPrice != null) e.push("routine.limitPrice: only a price watch has one");
  if (e.length) return { ok: false, errors: e };
  const cc = c as Record<string, number | string>;
  return {
    ok: true,
    value: {
      kind,
      cadence: { every: cc.every as Cadence["every"], hour: cc.hour as number, minute: cc.minute as number, weekday: cc.every === "week" ? (cc.weekday as number) : null, dayOfMonth: cc.every === "month" ? (cc.dayOfMonth as number) : null },
      items: (items as RoutineItem[]).map((i) => ({ sellerId: i.sellerId, sku: i.sku })),
      allowance: { amount: (a as { amount: string }).amount, period: (a as { period: Period }).period },
      limitPrice: kind === "price-watch" ? (raw.limitPrice as string) : null,
    },
  };
}

/** The whole spec, strictly: unknown fields, unknown blocks, a missing hero, a block that doesn't fit the layout, a bad
 *  label or routine all fail it (the caller then falls back to the fixed picker's spec). */
export function validateSpec(raw: unknown, registry: Registry): Checked<PocketAppSpec> {
  const e: string[] = [];
  if (!isObj(raw)) return { ok: false, errors: ["spec: not an object"] };
  const extra = Object.keys(raw).filter((k) => !["v", "catalogue", "layout", "title", "blocks", "routine"].includes(k));
  if (extra.length) e.push(`spec: unknown fields ${extra.join(", ")}`);
  if (raw.v !== 1) e.push("spec.v must be 1");
  if (raw.catalogue !== CATALOGUE_ID) e.push(`spec.catalogue must be ${CATALOGUE_ID}`);
  const layout = raw.layout as Layout;
  if (!LAYOUTS.includes(layout)) e.push("spec.layout");
  const title = cleanLabel(raw.title);
  if (!title) e.push("spec.title: 1-28 plain characters, no links, addresses, amounts or markup");
  let routine: RoutineSpec | null = null;
  if (raw.routine != null) {
    const r = validateRoutine(raw.routine, registry, LAYOUTS.includes(layout) ? layout : undefined);
    if (r.ok) routine = r.value; else e.push(...r.errors);
  } else if (LAYOUTS.includes(layout) && layout !== "haggle" && raw.routine !== null) e.push("spec.routine: null or a routine");
  const blocks: Block[] = [];
  if (!Array.isArray(raw.blocks) || raw.blocks.length < 2 || raw.blocks.length > 8) e.push("spec.blocks: 2 to 8");
  else {
    const seen = new Set<string>();
    raw.blocks.forEach((b, i) => {
      if (!isObj(b) || typeof b.type !== "string" || !(b.type in BLOCKS)) { e.push(`blocks[${i}]: unknown block`); return; }
      const t = b.type as BlockType;
      const def: BlockDef = BLOCKS[t];
      if (seen.has(t)) e.push(`blocks[${i}]: ${t} twice`);
      seen.add(t);
      if (LAYOUTS.includes(layout) && !def.layouts.includes(layout)) e.push(`blocks[${i}]: ${t} does not fit ${layout}`);
      if (def.routine && raw.routine == null) e.push(`blocks[${i}]: ${t} needs a routine`);
      if (i === 0 && !def.hero) e.push("blocks[0] must be the layout's hero");
      if (i > 0 && def.hero) e.push(`blocks[${i}]: only one hero, first`);
      const out: Block = { type: t };
      for (const k of Object.keys(b)) {
        if (k === "type") continue;
        const p = (def.params as Record<string, Param>)[k];
        if (!p) { e.push(`blocks[${i}].${k}: unknown`); continue; }
        const v = b[k];
        if (v === null) continue; // nullable means "use the default"
        if (p.kind === "enum" ? !p.values.includes(v as string) : !(Number.isInteger(v) && (v as number) >= p.min && (v as number) <= p.max)) e.push(`blocks[${i}].${k}`);
        else (out as Record<string, unknown>)[k] = v;
      }
      blocks.push(out);
    });
    if (LAYOUTS.includes(layout) && blocks[0] && blocks[0].type !== HERO[layout]) e.push(`blocks[0] must be ${HERO[layout]} for ${layout}`);
  }
  if (e.length) return { ok: false, errors: e };
  return { ok: true, value: { v: 1, catalogue: CATALOGUE_ID, layout, title: title!, blocks, routine } };
}

/** A block's parameter, or its default. */
export function param<K extends "range" | "limit">(b: Block, k: K): NonNullable<Block[K]> {
  const def = (BLOCKS[b.type].params as Record<string, Param>)[k];
  return (b[k] ?? def?.default) as NonNullable<Block[K]>;
}

/** The model's instructions, generated from the catalogue (json-render's idea): the blocks, what each shows, an example. */
export function catalogPrompt(registry: Registry): string {
  const blocks = BLOCK_TYPES.map((t) => {
    const d: BlockDef = BLOCKS[t];
    const ps = Object.entries(d.params).map(([k, p]) => `${k}: ${p.kind === "enum" ? p.values.join(" | ") : `${p.min}-${p.max}`}`).join(", ");
    return `- ${t}${d.hero ? " (hero)" : ""}: ${d.description} Layouts: ${d.layouts.join(", ")}.${d.routine ? " Needs a routine." : ""}${ps ? ` Params: ${ps}.` : ""}`;
  }).join("\n");
  const items = registry.flatMap((s) => s.items.filter((i) => i.price !== null).map((i) => `${s.id}/${i.sku} (HK$${i.price})`)).join(", ");
  return [
    `Compose a pocket app spec (${CATALOGUE_ID}) for the owner's sentence. Use only these blocks:`,
    blocks,
    `Layouts and their hero: ${LAYOUTS.map((l) => `${l} -> ${HERO[l]}`).join(", ")}. The first block is the hero; 2 to 8 blocks; each block once.`,
    `Routine kinds: research -> schedule, deal -> price-watch (one item, limitPrice required), subscriptions -> renewals, haggle -> no routine (null).`,
    `Items you may use (seller/sku): ${items}. Only sellers the owner named.`,
    "title: up to 28 plain characters taken from the owner's words. No links, addresses, amounts or markup anywhere.",
    "Cadence hours are Hong Kong time. weekday 1 = Monday. Amounts are HK$ strings (Mock e-HKD) like \"0.40\".",
  ].join("\n");
}

// ---------------------------------------------------------------- periods and schedules (Hong Kong time)

const TZ = 8 * 3600_000;
const DAY = 86_400_000;
const parts = (ms: number) => { const d = new Date(ms + TZ); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), wd: d.getUTCDay() || 7 }; };
const dayStart = (ms: number) => Math.floor((ms + TZ) / DAY) * DAY - TZ;

/** The calendar period `ms` falls in: [start, end). */
export function periodWindow(period: Period, ms: number): { start: number; end: number } {
  if (period === "day") { const s = dayStart(ms); return { start: s, end: s + DAY }; }
  if (period === "week") { const s = dayStart(ms) - (parts(ms).wd - 1) * DAY; return { start: s, end: s + 7 * DAY }; }
  const p = parts(ms);
  return { start: Date.UTC(p.y, p.m, 1) - TZ, end: Date.UTC(p.y, p.m + 1, 1) - TZ };
}

/** What is left of the allowance this period (ERC20PeriodTransferEnforcer: no carry-over), in eHKD units (6 decimals). */
export function available(allowance: bigint, payments: { at: number; amount: bigint }[], period: Period, now: number): { spent: bigint; left: bigint; window: { start: number; end: number } } {
  const w = periodWindow(period, now);
  const spent = payments.filter((p) => p.at >= w.start && p.at < w.end).reduce((n, p) => n + p.amount, 0n);
  return { spent, left: spent >= allowance ? 0n : allowance - spent, window: w };
}

/** The first run strictly after `after`. */
export function nextRun(c: Cadence, after: number): number {
  for (let i = 0; i < 62; i++) {
    const day = dayStart(after) + i * DAY;
    const at = day + c.hour * 3600_000 + c.minute * 60_000;
    if (at <= after) continue;
    const p = parts(at);
    if (c.every === "day" || (c.every === "weekday" && p.wd <= 5) || (c.every === "week" && p.wd === c.weekday) || (c.every === "month" && p.d === c.dayOfMonth)) return at;
  }
  return after + DAY;
}
export function nextRuns(c: Cadence, after: number, n: number): number[] {
  const out: number[] = [];
  let t = after;
  for (let i = 0; i < n; i++) { t = nextRun(c, t); out.push(t); }
  return out;
}

const WD = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const two = (n: number) => String(n).padStart(2, "0");
const ord = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;
/** "Every Monday at 09:00", "Every day at 08:00", "On the 1st of each month at 09:00". */
export function cadenceText(c: Cadence): string {
  const t = `${two(c.hour)}:${two(c.minute)}`;
  if (c.every === "day") return `Every day at ${t}`;
  if (c.every === "weekday") return `Every weekday at ${t}`;
  if (c.every === "week") return `Every ${WD[c.weekday ?? 1]} at ${t}`;
  return `On the ${ord(c.dayOfMonth ?? 1)} of each month at ${t}`;
}
export const periodWord = (p: Period) => p;

// ---------------------------------------------------------------- the deterministic picker (built-in network, and the fallback)

export type AgentChoice = "chainbrain" | "claude" | "chatgpt";
/** Which sellers' items a sentence asks for, by plain words (a routine buys only items of sellers the owner named). */
const SKU_WORDS: { sellerId: string; sku: string; re: RegExp }[] = [
  { sellerId: "exa", sku: "fruit-news", re: /fruit trade|se asia/ },
  { sellerId: "exa", sku: "durian-news", re: /news|headline|search|exa/ },
  { sellerId: "coingecko", sku: "eth-price", re: /ehkd|price|rate|coingecko/ },
  { sellerId: "nansen", sku: "smart-money", re: /smart.?money|flows?/ },
  { sellerId: "nansen", sku: "counterparties", re: /counterpart|exporter'?s wallet|wallet check/ },
  { sellerId: "nansen", sku: "wallet-balances", re: /balances?/ },
  { sellerId: "datapro", sku: "premium-report", re: /premium|report|forecast/ },
  { sellerId: "tradewire", sku: "credit-report", re: /credit/ },
  { sellerId: "harbour-wines", sku: "fruit-wine-trade-report", re: /wine/ },
];

export function pickLayout(sentence: string): Layout {
  const t = sentence.toLowerCase();
  if (/negotiat|haggle|bargain|talk (?:them|the price) down|one[- ]off|just once|single purchase/.test(t)) return "haggle";
  if (/(?:drops?|falls?|dips?|goes|gets|is) (?:below|under|to)|price watch|watch (?:the )?price|when (?:it'?s|the price is) (?:cheap|below|under)|deal/.test(t)) return "deal";
  if (/subscri|renew|keep (?:my )?.*(?:going|topped)|each month|every month|monthly/.test(t)) return "subscriptions";
  return "research";
}
export function pickAgent(sentence: string): AgentChoice {
  const t = sentence.toLowerCase();
  if (/\bclaude\b/.test(t)) return "claude";
  if (/\bchat ?gpt\b|\bopenai\b|\bgpt\b/.test(t)) return "chatgpt";
  return "chainbrain";
}
const DAYS: [RegExp, number][] = [[/monday/, 1], [/tuesday/, 2], [/wednesday/, 3], [/thursday/, 4], [/friday/, 5], [/saturday/, 6], [/sunday/, 7]];
export function pickCadence(sentence: string, layout: Layout): Cadence {
  const t = sentence.toLowerCase();
  const at = /\bat (\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/.exec(t);
  let hour = /morning/.test(t) ? 8 : /evening|night/.test(t) ? 19 : /noon|lunch/.test(t) ? 12 : 9, minute = 0;
  if (at) {
    let h = Number(at[1]);
    if (at[3] === "pm" && h < 12) h += 12;
    if (at[3] === "am" && h === 12) h = 0;
    hour = h; minute = Number(at[2] ?? 0);
  }
  hour = Math.min(23, Math.max(0, hour)); minute = Math.min(59, Math.max(0, minute));
  const day = DAYS.find(([re]) => re.test(t));
  if (day && /every|each|on/.test(t)) return { every: "week", weekday: day[1], dayOfMonth: null, hour, minute };
  if (/weekday|working day|business day/.test(t)) return { every: "weekday", weekday: null, dayOfMonth: null, hour, minute };
  if (/every (?:day|morning|evening|night)|daily|each (?:day|morning)/.test(t)) return { every: "day", weekday: null, dayOfMonth: null, hour, minute };
  if (/every month|each month|monthly/.test(t)) return { every: "month", weekday: null, dayOfMonth: Math.min(28, Number(/\b(\d{1,2})(?:st|nd|rd|th)\b/.exec(t)?.[1] ?? 1)) || 1, hour, minute };
  if (/every week|each week|weekly/.test(t)) return { every: "week", weekday: 1, dayOfMonth: null, hour, minute };
  // no schedule said: a price watch checks every morning, renewals every Monday, a research desk every Monday
  return layout === "deal" ? { every: "day", weekday: null, dayOfMonth: null, hour, minute } : { every: "week", weekday: 1, dayOfMonth: null, hour, minute };
}
export function pickItems(sentence: string, sellers: string[], layout: Layout): RoutineItem[] {
  const t = sentence.toLowerCase();
  const out: RoutineItem[] = [];
  for (const s of sellers) {
    const words = SKU_WORDS.filter((w) => w.sellerId === s);
    const hit = words.find((w) => w.re.test(t)) ?? words.at(-1);
    if (hit && !out.some((o) => o.sku === hit.sku)) out.push({ sellerId: s, sku: hit.sku });
  }
  return layout === "deal" ? out.slice(0, 1) : out.slice(0, 4);
}

/** The title: the owner's own words for what it is for, or the layout's name. */
export function pickTitle(sentence: string, layout: Layout, name?: string): string {
  const fromName = cleanLabel(name);
  if (fromName) return fromName;
  const t = sentence.toLowerCase();
  const topic = /\b(durian|fruit|ehkd|market|exporter|wine)\b/.exec(t)?.[1];
  const base = layout === "research" ? "brief" : layout === "deal" ? "watch" : layout === "subscriptions" ? "subscriptions" : "deal";
  const word = topic ? topic.replace(/^\w/, (x) => x.toUpperCase()).replace("Ehkd", "eHKD") : layout === "research" ? "Research" : layout === "deal" ? "Price" : layout === "subscriptions" ? "Data" : "One-off";
  return cleanLabel(`${word} ${base}`) ?? "Pocket";
}

/** What the fixed picker composes from a sentence and the rules Speak your rules read from it. */
export function pickApp(sentence: string, rules: { sellers: string[]; per?: { amount: string; period: Period } | null; limit?: string | null; budget: string; name?: string }, registry: Registry): { spec: PocketAppSpec; agent: AgentChoice } {
  const layout = pickLayout(sentence);
  const kind = ROUTINE_KIND[layout];
  const items = kind ? pickItems(sentence, rules.sellers, layout) : [];
  const per = rules.per ?? { amount: rules.budget, period: layout === "deal" ? "week" : "month" };
  const routine: RoutineSpec | null = kind && items.length && (rules.per || /\bevery\b|\bdaily\b|\bweekly\b|\bmonthly\b|\brenew|\beach (?:day|week|month|morning|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\bwhen (?:the |its )?price\b/i.test(sentence))
    ? { kind, cadence: pickCadence(sentence, layout), items, allowance: { amount: per.amount, period: per.period }, limitPrice: kind === "price-watch" ? rules.limit ?? null : null }
    : null;
  const watchOk = !routine || routine.kind !== "price-watch" || !!routine.limitPrice;
  const r = routine && watchOk ? routine : null;
  const blocks = DEFAULT_BLOCKS[layout].filter((b) => !(BLOCKS[b] as BlockDef).routine || r).map((type) => ({ type }) as Block);
  const raw = { v: 1, catalogue: CATALOGUE_ID, layout, title: pickTitle(sentence, layout, rules.name), blocks, routine: r };
  const v = validateSpec(raw, registry);
  // the picker's own output always validates; if a registry lacks an item, drop the routine rather than fail
  const spec = v.ok ? v.value : (validateSpec({ ...raw, routine: null, blocks: blocks.filter((b) => !(BLOCKS[b.type] as BlockDef).routine) }, registry) as { ok: true; value: PocketAppSpec }).value;
  return { spec, agent: pickAgent(sentence) };
}

/** Two readings of the same sentence (a model's and the picker's): the screen comes from the first that validates, and the
 *  routine can only get stricter: the lower spend rate, the lower price limit, only items both readings chose. */
export function stricterRoutine(a: RoutineSpec, b: RoutineSpec): { routine: RoutineSpec; disagreements: string[] } {
  const d: string[] = [];
  const days: Record<Period, number> = { day: 1, week: 7, month: 30 };
  const rate = (r: RoutineSpec) => hkdNum(r.allowance.amount) / days[r.allowance.period];
  const allowance = rate(a) < rate(b) || (rate(a) === rate(b) && days[a.allowance.period] <= days[b.allowance.period]) ? a.allowance : b.allowance;
  if (JSON.stringify(a.allowance) !== JSON.stringify(b.allowance)) d.push("Allowance: used the lower spend rate");
  const items = a.items.filter((x) => b.items.some((y) => y.sellerId === x.sellerId && y.sku === x.sku));
  if (items.length !== a.items.length || items.length !== b.items.length) d.push("Items: kept only those both readings chose");
  let limitPrice = a.limitPrice ?? null;
  if (a.limitPrice && b.limitPrice) { limitPrice = hkdNum(a.limitPrice) <= hkdNum(b.limitPrice) ? a.limitPrice : b.limitPrice; if (a.limitPrice !== b.limitPrice) d.push("Price limit: used the lower reading"); }
  const per = (c: Cadence) => (c.every === "day" ? 1 : c.every === "weekday" ? 1.4 : c.every === "week" ? 7 : 30);
  const cadence = per(a.cadence) >= per(b.cadence) ? a.cadence : b.cadence; // runs less often
  if (JSON.stringify(a.cadence) !== JSON.stringify(b.cadence)) d.push("Schedule: used the one that runs less often");
  return { routine: { ...a, allowance, items: items.length ? items : a.items.filter(() => false), limitPrice, cadence }, disagreements: d };
}

// ---- usage: how often a pocket spends, the category its card's colour says (phone and console alike)
export type Usage = "daily" | "weekly" | "monthly" | "once" | "asked";
/** Scheduled pockets first: they move money without being asked. */
export const USAGE_ORDER: Usage[] = ["daily", "weekly", "monthly", "once", "asked"];
export const USAGE_LABEL: Record<Usage, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly", once: "One-time", asked: "When asked" };
/** From the pocket's app: its routine's cadence when it has one, a haggler buys once, anything else spends only when asked. */
export function usageOf(spec?: { layout: Layout; routine?: RoutineSpec | null } | null): Usage {
  if (!spec) return "asked";
  const c = spec.routine?.cadence;
  if (c) return c.every === "day" || c.every === "weekday" ? "daily" : c.every === "week" ? "weekly" : "monthly";
  return spec.layout === "haggle" ? "once" : "asked";
}
const WDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hhmm = (h: number, m: number) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
/** The chip on a card: "Daily 08:00", "Weekdays 08:00", "Weekly · Mon", "Monthly · 1st", "One-time", "When asked". */
export function usageChip(spec?: { layout: Layout; routine?: RoutineSpec | null } | null): string {
  const c = spec?.routine?.cadence;
  if (!c) return USAGE_LABEL[usageOf(spec)];
  if (c.every === "day") return `Daily ${hhmm(c.hour, c.minute)}`;
  if (c.every === "weekday") return `Weekdays ${hhmm(c.hour, c.minute)}`;
  if (c.every === "week") return `Weekly · ${WDAY[c.weekday ?? 1]}`;
  const d = c.dayOfMonth ?? 1;
  return `Monthly · ${d}${d % 10 === 1 && d !== 11 ? "st" : d % 10 === 2 && d !== 12 ? "nd" : d % 10 === 3 && d !== 13 ? "rd" : "th"}`;
}
