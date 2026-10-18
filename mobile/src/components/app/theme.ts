// Pocket apps' theme: HOW OFTEN a pocket spends picks its card face (its usage: daily powder blue, weekly or monthly sage,
// one-time wheat, when asked white hatch), WHO spends from it shows by the agent's own mark and name. Partner marks are
// never recoloured or enlarged (shared/brand).
import type { Layout, PocketAppSpec, Usage } from "../../../../shared/sim/pocketApp";
import { agentInfo } from "../../../../shared/sim/agents";

/** Deck slot per usage (tokens.ts `deck`: 0 sage, 1 wheat, 2 powder blue, 3 white hatch). */
export const USAGE_FACE: Record<Usage, number> = { daily: 2, weekly: 0, monthly: 0, once: 1, asked: 3 };
/** A layout's usual usage, for a card whose routine isn't known yet (the compose examples, the canvas's first guess). */
export const FACE: Record<Layout, number> = { research: USAGE_FACE.asked, haggle: USAGE_FACE.once, deal: USAGE_FACE.daily, subscriptions: USAGE_FACE.weekly };
export const LAYOUT_NAME: Record<Layout, string> = { research: "Research desk", deal: "Deal watcher", subscriptions: "Subscriptions", haggle: "Haggler" };

/** A pocket with no composed app (made by hand in the wizard, or on a server) still gets one: a research desk with no routine. */
export function appOf(p: { app?: PocketAppSpec; name: string }): PocketAppSpec {
  return p.app ?? { v: 1, catalogue: "chainbrain.pocket.v1", layout: "research", title: p.name.slice(0, 28), blocks: [{ type: "shelf" }, { type: "budget" }, { type: "sources" }], routine: null };
}

/** "ChainBrain", "Claude", "ChatGPT": the name on every action. */
export const agentName = (id?: string) => agentInfo(id ?? "")?.name ?? "Your agent";
