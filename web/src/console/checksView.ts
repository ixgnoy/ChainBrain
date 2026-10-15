// Pure helpers behind the checks path: how a gate is worded, which gates the token travels, how gates group into layers.
import { GATES, PAY_PATH, type Attempt, type Gate, type Layer } from "@sim/checks";

export const LAYER_TITLE: Record<Layer, string> = { agent: "Agent", tools: "Wallet tools", contract: "Pocket contract · ERC-1271", seller: "Seller" };

/** Quiet word for a gate that did not run: "Bypassed" (the attack skipped it) or "Not needed". */
export function gateWord(g: Gate): { word: string; text?: string } {
  switch (g.state) {
    case "pass": return { word: "Passed", text: g.note };
    case "stop": return { word: "Stopped", text: g.note };
    case "fooled": return { word: "Fooled", text: g.note };
    case "skip": {
      const bypass = /^bypassed/i.test(g.note ?? "");
      return { word: bypass ? "Bypassed" : "Not needed", text: bypass ? (g.note ?? "").replace(/^bypassed:?\s*/i, "") || undefined : g.note };
    }
    default: return { word: "Not reached" };
  }
}

/** How many gates the token visits: up to the last one that is not idle (the refusing gate ends the trip). */
export function sequenceLength(gates: Gate[]): number {
  for (let i = gates.length - 1; i >= 0; i--) if (gates[i].state !== "idle") return i + 1;
  return 0;
}

/** The full payment path, nothing reached yet (shown before the first attempt). */
export const idlePath = (): Gate[] => PAY_PATH.map((id) => ({ id, layer: GATES[id].layer, title: GATES[id].title, state: "idle" as const }));

export type GateGroup = { layer: Layer; title: string; gates: Gate[]; offset: number };
/** Consecutive gates of one layer share a panel. `offset` is the index of the group's first gate in the whole path. */
export function groupGates(gates: Gate[]): GateGroup[] {
  const out: GateGroup[] = [];
  gates.forEach((g, i) => {
    const last = out.at(-1);
    if (last && last.layer === g.layer) last.gates.push(g);
    else out.push({ layer: g.layer, title: LAYER_TITLE[g.layer], gates: [g], offset: i });
  });
  return out;
}

export const attemptWord = (a: Attempt): string => (a.verdict === "paid" ? (a.attack ? "Not stopped" : "Paid") : a.verdict === "refused" ? "Refused" : "Blocked");

/** The big sentence: when the AI was fooled its first sentence leads and the rest sits under it. */
export function headlineParts(a: Attempt): { main: string; sub?: string } {
  if (a.aiFooled) {
    const m = /^(.*?[.!?])\s+(.+)$/.exec(a.headline);
    if (m) return { main: m[1], sub: m[2] };
  }
  return { main: a.headline };
}

/** What a gate's token colour should be after `revealed` gates have been visited. */
export function tokenTone(gates: Gate[], revealed: number): "go" | "stop" | "fooled" {
  const seen = gates.slice(0, revealed);
  if (seen.some((g) => g.state === "stop")) return "stop";
  if (seen.some((g) => g.state === "fooled")) return "fooled";
  return "go";
}
