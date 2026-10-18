// How ChainBrain protects every payment, in the words the phone and the console show. Each line is what the layer really
// does in this codebase: Radar (radar.ts, server/src/radar) screens the seller, pre-flight (server/src/wallet/preflight.ts)
// simulates the exact transfer, the card's contract (contracts/src/Pocket.sol) refuses anything outside the owner's rules,
// and the Sentinel (sentinel.ts) freezes the card on-chain when it spots an attack. AI only tightens: none of these can
// loosen a rule or move money.

export const PROTECT_HEADLINE = "Your AI can be fooled. ChainBrain protects you.";
export const PROTECT_SUB = "Every payment is checked by Radar, a pre-flight test and your card's own contract, while the Sentinel watches for attacks.";

export type LayerKey = "radar" | "preflight" | "contract" | "sentinel";
export type Layer = { key: LayerKey; name: string; line: string };

/** The four layers, in the order a payment meets them. */
export const LAYERS: Layer[] = [
  { key: "radar", name: "Radar", line: "Screens every seller before it's paid" },
  { key: "preflight", name: "Pre-flight", line: "Tests each payment before it's sent" },
  { key: "contract", name: "Card contract", line: "Refuses anything outside your rules" },
  { key: "sentinel", name: "Sentinel", line: "Freezes the card when it spots an attack" },
];

const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

/** One line for a card: who it may pay, and that ChainBrain checks every payment. */
export function protectedLine(sellers: string[], off = false): string {
  if (off) return "This card is switched off: it can't pay anyone.";
  if (!sellers.length) return "No seller is allowed yet, so this card can't pay anyone.";
  return `It can pay only ${list(sellers)}, and ChainBrain checks every payment first.`;
}

const CONTRACT_REASONS = new Set(["SELLER_NOT_ALLOWED", "OVER_CAP", "OVER_BUDGET", "POCKET_REVOKED", "POCKET_FROZEN", "POCKET_EXPIRED", "NEEDS_OWNER_APPROVAL"]);
type Ev = { type: string; kind?: string; reason?: unknown; reverted?: boolean; matched?: boolean; [k: string]: unknown };

/** What each layer has actually done, from the events (all of them, or one card's): one short line per layer. */
export function layerCounts(events: Ev[]): Record<LayerKey, string> {
  const screens = events.filter((e) => e.type === "radar" && e.kind === "screen").length;
  const radarStops = events.filter((e) => e.type === "refusal" && /^COUNTERPARTY_/.test(String(e.reason))).length;
  const pre = events.filter((e) => e.type === "preflight" && e.kind === "result");
  const right = pre.filter((e) => e.matched).length;
  const contract = events.filter((e) => (e.type === "refusal" && CONTRACT_REASONS.has(String(e.reason))) || (e.type === "forced" && e.reverted)).length;
  const freezes = events.filter((e) => e.type === "sentinel" && (e.kind === "freeze" || e.kind === "hold")).length;
  const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
  return {
    radar: screens ? `${n(screens, "screen", "screens")}${radarStops ? ` · ${radarStops} stopped` : ""}` : "Ready",
    preflight: pre.length ? `${right} of ${pre.length} predicted` : "Ready",
    contract: contract ? `${n(contract, "attempt", "attempts")} refused` : "Nothing refused yet",
    sentinel: freezes ? `${n(freezes, "freeze", "freezes")} or holds` : "Watching",
  };
}
