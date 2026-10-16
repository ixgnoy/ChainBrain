// Pocket apps' theme: WHAT a pocket is for picks its card face (its layout), WHO spends from it shows by the agent's own mark
// and name. Faces are the design system's four deck faces, nothing new: research desk black, deal watcher powder blue,
// subscriptions white hatch, haggler / one-off vermillion. Partner marks are never recoloured or enlarged (shared/brand).
import type { Layout, PocketAppSpec } from "../../../../shared/sim/pocketApp";
import { agentInfo } from "../../../../shared/sim/agents";

/** Deck slot per layout (tokens.ts `deck`: 0 black, 1 vermillion, 2 powder blue, 3 white hatch). */
export const FACE: Record<Layout, number> = { research: 0, haggle: 1, deal: 2, subscriptions: 3 };
export const LAYOUT_NAME: Record<Layout, string> = { research: "Research desk", deal: "Deal watcher", subscriptions: "Subscriptions", haggle: "Haggler" };

/** A pocket with no composed app (made by hand in the wizard, or on a server) still gets one: a research desk with no routine. */
export function appOf(p: { app?: PocketAppSpec; name: string }): PocketAppSpec {
  return p.app ?? { v: 1, catalogue: "chainbrain.pocket.v1", layout: "research", title: p.name.slice(0, 28), blocks: [{ type: "shelf" }, { type: "budget" }, { type: "sources" }], routine: null };
}

/** "ChainBrain", "Claude", "ChatGPT": the name on every action. */
export const agentName = (id?: string) => agentInfo(id ?? "")?.name ?? "Your agent";
