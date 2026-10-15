// ChainBrain Radar, the pure part: labels, proportional exposure, risk rules and the copilot narrative. No imports, so the
// server (server/src/radar/*), the built-in network (world.ts) and Node tests all run the same code and give the same answer.
// Addresses are compared lowercased; callers keep whatever casing they like for display.

export const RISKY = ["sanctioned", "drainer", "scam", "darknet", "mixer", "flagged"] as const;
export const BENIGN = ["exchange", "issuer", "verified-seller"] as const;
export type Category = (typeof RISKY)[number] | (typeof BENIGN)[number];
export const isRisky = (c: string): c is (typeof RISKY)[number] => (RISKY as readonly string[]).includes(c);
export const isCategory = (c: string): c is Category => isRisky(c) || (BENIGN as readonly string[]).includes(c);

export type Label = { address: string; category: Category; name: string; source: string; at: number };

/** A label book. A risky label never downgrades: a "flagged" address later found to be a drainer becomes a drainer, not the reverse. */
export function createLabels(now: () => number = () => Date.now()) {
  const book = new Map<string, Label>();
  const rank = (c?: Category) => (c ? (isRisky(c) ? RISKY.length - RISKY.indexOf(c) + 10 : 1) : 0);
  return {
    get: (a: string) => book.get(a.toLowerCase()),
    all: () => [...book.values()],
    add(l: Omit<Label, "at">): Label {
      const prev = book.get(l.address.toLowerCase());
      if (prev && rank(prev.category) >= rank(l.category)) return prev;
      const x: Label = { ...l, at: now() };
      book.set(l.address.toLowerCase(), x);
      return x;
    },
    clear: () => book.clear(),
  };
}
export type Labels = ReturnType<typeof createLabels>;

export type Transfer = { from: string; to: string; value: bigint; tx: string; block: bigint };
export type Direction = "source" | "destination";
/** Where transfers come from: an index of the chain on the server, the in-memory chain in the built-in network. */
export interface TransferSource {
  inbound(a: string): Promise<Transfer[]>;
  outbound(a: string): Promise<Transfer[]>;
}
export type Hit = { share: number; hops: number; path: string[] };
export type Edge = { from: string; to: string; value: string };
export type Exposure = {
  direction: Direction;
  byCategory: Partial<Record<Category, Hit>>;
  /** Share whose origin (or destination) could not be labelled within the hop limit. */
  unknown: number;
  /** A lookup failed or a limit cut the walk short: scores are then a lower bound. */
  incomplete: boolean;
  nodes: number;
  edges: Edge[];
};
export type WalkOpts = { maxHops?: number; fanout?: number; maxNodes?: number; maxEdges?: number };

/**
 * Proportional ("haircut") exposure: the share of the money an address received (source) or sent (destination) that
 * traces to each labelled category. A wallet that got half its funds from a drainer passes half of that on.
 * Hops are reported, not used as the measure: a drainer three hops back is still a drainer.
 */
export async function exposure(src: TransferSource, labels: Pick<Labels, "get">, root: string, direction: Direction, o: WalkOpts = {}): Promise<Exposure> {
  const maxHops = o.maxHops ?? 3, fanout = o.fanout ?? 8, maxNodes = o.maxNodes ?? 60, maxEdges = o.maxEdges ?? 200;
  const out: Exposure = { direction, byCategory: {}, unknown: 0, incomplete: false, nodes: 0, edges: [] };

  const hit = (c: Category, share: number, path: string[]) => {
    const h = out.byCategory[c];
    const hops = path.length - 1;
    if (!h) return void (out.byCategory[c] = { share, hops, path });
    if (share > h.share / 2 && hops < h.hops) h.path = path; // keep the nearest strong path as the example
    h.share += share;
    h.hops = Math.min(h.hops, hops);
  };

  async function walk(a: string, share: number, path: string[], seen: Set<string>): Promise<void> {
    const isRoot = path.length === 1;
    const l = labels.get(a);
    if (l && !isRoot) return hit(l.category, share, path);
    if (path.length - 1 >= maxHops || seen.has(a.toLowerCase())) return void (out.unknown += share);
    if (out.nodes >= maxNodes) return void ((out.unknown += share), (out.incomplete = true));
    out.nodes++;
    let ts: Transfer[];
    try {
      ts = await (direction === "source" ? src.inbound(a) : src.outbound(a));
    } catch {
      out.incomplete = true;
      return void (out.unknown += share);
    }
    if ((ts as { partial?: boolean }).partial) out.incomplete = true;
    const by = new Map<string, { addr: string; v: bigint }>();
    for (const t of ts) {
      const cp = direction === "source" ? t.from : t.to;
      const k = cp.toLowerCase();
      if (k === a.toLowerCase() || t.value <= 0n) continue;
      const x = by.get(k) ?? by.set(k, { addr: cp, v: 0n }).get(k)!;
      x.v += t.value;
    }
    const total = [...by.values()].reduce((x, y) => x + y.v, 0n);
    if (total === 0n) return void (out.unknown += share); // no history in the window: origin unknown
    const ranked = [...by.values()].sort((x, y) => (y.v > x.v ? 1 : y.v < x.v ? -1 : 0));
    const next = new Set(seen).add(a.toLowerCase());
    let used = 0;
    for (const { addr, v } of ranked.slice(0, fanout)) {
      const part = share * (Number((v * 1_000_000n) / total) / 1_000_000);
      used += part;
      if (out.edges.length < maxEdges) out.edges.push(direction === "source" ? { from: addr, to: a, value: v.toString() } : { from: a, to: addr, value: v.toString() });
      await walk(addr, part, [...path, addr], next);
    }
    if (ranked.length > fanout) out.unknown += Math.max(0, share - used); // the long tail of small counterparties
  }

  await walk(root, 1, [root], new Set());
  return out;
}

/** A fixed list of transfers (tests, the built-in network). */
export const memorySource = (ts: Transfer[] | (() => Transfer[])): TransferSource => {
  const all = () => (typeof ts === "function" ? ts() : ts);
  return {
    inbound: async (a) => all().filter((t) => t.to.toLowerCase() === a.toLowerCase()),
    outbound: async (a) => all().filter((t) => t.from.toLowerCase() === a.toLowerCase()),
  };
};

// ---------------------------------------------------------------- rules

export type Rule = { id: string; category: Category; on: "self" | Direction | "both"; minShare: number; score: number; text: string };
export type Verdict = "ok" | "review" | "block";
export type Factor = { rule: string; score: number; category: Category; on: "self" | Direction; share: number; hops: number; path: string[]; text: string };

/**
 * Configurable risk rules: the highest triggered rule sets the score (0–10). Exposure is weighed by share, not by hops.
 * ponytail: thresholds are a first guess; calibrate them on the red-team set before quoting accuracy.
 */
export const DEFAULT_RULES: Rule[] = [
  { id: "self-sanctioned", category: "sanctioned", on: "self", minShare: 0, score: 10, text: "The address itself is sanctioned" },
  { id: "self-drainer", category: "drainer", on: "self", minShare: 0, score: 10, text: "The address itself is a known drainer" },
  { id: "self-scam", category: "scam", on: "self", minShare: 0, score: 10, text: "The address itself is a known scam" },
  { id: "self-darknet", category: "darknet", on: "self", minShare: 0, score: 10, text: "The address itself is a darknet market" },
  { id: "self-mixer", category: "mixer", on: "self", minShare: 0, score: 8, text: "The address itself is a mixer" },
  { id: "self-flagged", category: "flagged", on: "self", minShare: 0, score: 6, text: "ChainBrain pockets flagged this address (injection or data requests)" },
  { id: "sanctioned-any", category: "sanctioned", on: "both", minShare: 0.0001, score: 9, text: "Funds trace to a sanctioned address" },
  { id: "drainer-major", category: "drainer", on: "both", minShare: 0.1, score: 9, text: "10% or more of the funds trace to a drainer" },
  { id: "drainer-any", category: "drainer", on: "both", minShare: 0.0001, score: 6, text: "Some funds trace to a drainer" },
  { id: "scam-major", category: "scam", on: "both", minShare: 0.1, score: 8, text: "10% or more of the funds trace to a scam" },
  { id: "scam-any", category: "scam", on: "both", minShare: 0.0001, score: 6, text: "Some funds trace to a scam" },
  { id: "darknet-any", category: "darknet", on: "both", minShare: 0.0001, score: 8, text: "Funds trace to a darknet market" },
  { id: "mixer-major", category: "mixer", on: "both", minShare: 0.25, score: 7, text: "25% or more of the funds trace to a mixer" },
  { id: "mixer-any", category: "mixer", on: "both", minShare: 0.0001, score: 5, text: "Some funds trace to a mixer" },
  { id: "flagged-any", category: "flagged", on: "both", minShare: 0.0001, score: 3, text: "Funds trace to an address ChainBrain pockets flagged" },
];

export type Thresholds = { review: number; block: number };
export const DEFAULT_THRESHOLDS: Thresholds = { review: 5, block: 8 };
export const verdictOf = (score: number, t: Thresholds = DEFAULT_THRESHOLDS): Verdict => (score >= t.block ? "block" : score >= t.review ? "review" : "ok");

export function score(self: Category | undefined, exp: Exposure[], rules: Rule[] = DEFAULT_RULES, t: Thresholds = DEFAULT_THRESHOLDS): { score: number; verdict: Verdict; factors: Factor[] } {
  const factors: Factor[] = [];
  for (const r of rules) {
    if (r.on === "self") {
      if (self === r.category) factors.push({ rule: r.id, score: r.score, category: r.category, on: "self", share: 1, hops: 0, path: [], text: r.text });
      continue;
    }
    for (const e of exp) {
      if (r.on !== "both" && r.on !== e.direction) continue;
      const h = e.byCategory[r.category];
      if (h && h.share >= r.minShare) factors.push({ rule: r.id, score: r.score, category: r.category, on: e.direction, share: h.share, hops: h.hops, path: h.path, text: r.text });
    }
  }
  // one factor per category and direction: the strongest rule that fired
  const best = new Map<string, Factor>();
  for (const f of factors) {
    const k = `${f.category}:${f.on}`;
    if (!best.has(k) || best.get(k)!.score < f.score) best.set(k, f);
  }
  const list = [...best.values()].sort((a, b) => b.score - a.score || b.share - a.share);
  const s = list[0]?.score ?? 0;
  return { score: s, verdict: verdictOf(s, t), factors: list };
}

// ---------------------------------------------------------------- copilot narrative

const pct = (x: number) => (x >= 0.995 ? "all" : x < 0.01 ? "under 1%" : `${Math.round(x * 100)}%`);
const via = (f: Factor, nameOf: (a: string) => string) => (f.path.length > 2 ? `, via ${f.path.slice(1, -1).map(nameOf).join(" → ")}` : "");

function line(f: Factor, who: string, nameOf: (a: string) => string): string {
  if (f.on === "self") return `${who} is labelled ${f.category}.`;
  const end = nameOf(f.path[f.path.length - 1] ?? "");
  const hops = f.hops === 1 ? "directly" : `${f.hops} hops away`;
  return f.on === "source"
    ? `${pct(f.share)} of the money ${who} received traces back to ${end} (${f.category}), ${hops}${via(f, nameOf)}.`
    : `${pct(f.share)} of the money ${who} sent went on to ${end} (${f.category}), ${hops}${via(f, nameOf)}.`;
}

/**
 * Copilot narrative from a fixed template over typed evidence. No model writes it, and no seller text reaches it, so a
 * hostile counterparty cannot word its own risk summary.
 */
export function narrate(s: { name: string; score: number; verdict: Verdict; factors: Factor[]; incomplete: boolean }, nameOf: (a: string) => string): string {
  const head = `Risk ${s.score}/10 for ${s.name}: ${s.verdict === "block" ? "blocked" : s.verdict === "review" ? "needs your approval" : "no known risk"}.`;
  const body = s.factors.slice(0, 3).map((f) => `${line(f, s.name, nameOf)} Rule: ${f.text.toLowerCase()}.`);
  const tail = s.incomplete ? ["Part of the history could not be read, so this is a lower bound."] : [];
  return [head, ...body, ...tail].join(" ");
}

export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/**
 * The strongest factor as a money trail for the phone: names from where the money started to the counterparty
 * ("Demo drainer → DataPro" for source exposure, "DataPro → Mixer" for destination), plus its share.
 */
export function trailOf(f: Factor | undefined, nameOf: (a: string) => string): { trail?: string[]; share?: number; direction?: "self" | Direction } {
  if (!f) return {};
  const names = f.path.map(nameOf);
  return { trail: f.on === "source" ? names.reverse() : names, share: Number(f.share.toFixed(4)), direction: f.on };
}
