import { getAddress, type Address } from "viem";
import { randomUUID } from "node:crypto";
import { bus } from "../wallet/events";
import { labels, type Label } from "./labels";
import { exposure, type Exposure, type TransferSource, type WalkOpts } from "./exposure";
import { score, DEFAULT_RULES, type Factor, type Rule, type Verdict } from "./rules";
import { narrate } from "./copilot";

export type Screening = {
  address: Address;
  name: string;
  label?: Label;
  score: number;
  verdict: Verdict;
  factors: Factor[];
  source: Exposure;
  destination: Exposure;
  incomplete: boolean;
  narrative: string;
  at: number;
};

export type Alert = {
  id: string;
  address: Address;
  name: string;
  from: { score: number; verdict: Verdict } | null;
  to: { score: number; verdict: Verdict };
  factors: Factor[];
  narrative: string;
  status: "open" | "closed";
  at: number;
};

const names = new Map<string, string>();
const last = new Map<string, Screening>();
const alerts: Alert[] = [];
/** Which pockets dealt with which counterparty: they get that counterparty's alerts in their own feed. */
const watchers = new Map<string, Set<string>>();

let src: TransferSource | undefined;
let rules: Rule[] = DEFAULT_RULES;
let walk: WalkOpts = { maxHops: Number(process.env.RADAR_MAX_HOPS ?? 3) };

export const radar = {
  use(o: { source?: TransferSource; rules?: Rule[]; walk?: WalkOpts }) {
    if (o.source) src = o.source;
    if (o.rules) rules = o.rules;
    if (o.walk) walk = { ...walk, ...o.walk };
  },
  name(a: string, n: string) {
    names.set(a.toLowerCase(), n);
  },
  nameOf: (a: string) => names.get(a.toLowerCase()) ?? labels.get(a)?.name ?? `${a.slice(0, 6)}…${a.slice(-4)}`,
  watch(pocket: string, a: string) {
    const k = a.toLowerCase();
    if (!watchers.has(k)) watchers.set(k, new Set());
    watchers.get(k)!.add(pocket.toLowerCase());
  },
  watched: () => [...watchers.keys()].map((a) => getAddress(a)),
  rules: () => rules,
  alerts: () => alerts.slice().reverse(),
  last: (a: string) => last.get(a.toLowerCase()),
  reset() {
    last.clear();
    alerts.length = 0;
    watchers.clear();
  },
};

async function source(): Promise<TransferSource> {
  src ??= (await import("./chainSource")).chainSource;
  return src;
}

/**
 * Screen one counterparty: its own label, where its money came from and where it went, scored by the rules.
 * A worse verdict than last time opens an alert (the case queue) and tells every pocket that dealt with it.
 */
export async function screen(address: string): Promise<Screening> {
  const a = getAddress(address);
  const s = await source();
  const [srcExp, dstExp] = await Promise.all([exposure(s, a, "source", walk), exposure(s, a, "destination", walk)]);
  const label = labels.get(a);
  const r = score(label?.category, [srcExp, dstExp], rules);
  const out: Screening = {
    address: a, name: radar.nameOf(a), label, ...r, source: srcExp, destination: dstExp,
    incomplete: srcExp.incomplete || dstExp.incomplete, narrative: "", at: Date.now(),
  };
  out.narrative = narrate(out, radar.nameOf);

  const prev = last.get(a.toLowerCase());
  last.set(a.toLowerCase(), out);
  if (out.verdict !== "ok" && (!prev || out.score > prev.score)) {
    const al: Alert = {
      id: randomUUID(), address: a, name: out.name, from: prev ? { score: prev.score, verdict: prev.verdict } : null,
      to: { score: out.score, verdict: out.verdict }, factors: out.factors, narrative: out.narrative, status: "open", at: Date.now(),
    };
    alerts.push(al);
    if (alerts.length > 500) alerts.shift();
    const ev = { type: "radar" as const, kind: "alert", alert: al };
    bus.publish(ev);
    for (const p of watchers.get(a.toLowerCase()) ?? []) bus.publish({ ...ev, pocket: p });
  }
  return out;
}

/** The short form other tools and agents see: no paths, no graph. */
export const brief = (x: Screening) => ({
  counterparty: x.name, address: x.address, score: x.score, verdict: x.verdict,
  reasons: x.factors.slice(0, 3).map((f) => f.text), partial: x.incomplete || undefined,
});

const TIMEOUT_MS = Number(process.env.RADAR_TIMEOUT_MS ?? 8_000);

/** Screen with a time limit. On failure it returns null: the pocket's own rules still apply, so Radar can only add refusals. */
export async function screenOrNull(address: string): Promise<Screening | null> {
  let t: NodeJS.Timeout | undefined;
  const timeout = new Promise<null>((r) => (t = setTimeout(() => r(null), TIMEOUT_MS)));
  try {
    return await Promise.race([screen(address), timeout]);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
