// The agents that can hold pockets on the built-in network: ChainBrain's own agent (the in-app chat) and two outside agents,
// Claude and ChatGPT, connected the way an MCP client would be. Each pocket names exactly one agent key (Pocket.sol
// `agent` is immutable); one agent can hold several pockets, each granted separately by the owner.
// Outside agents use the same wallet tools as the built-in one (get_quote, ask_owner, pay…), so the pocket's rules, Radar
// and the Sentinel decide every outcome for them too. Their plans below only decide what to try next.
import { draft, intent, purchase, summary, type Action, type Outcome, type Scene } from "./script";
import type { Hex } from "./types";

export type AgentId = "chainbrain" | "claude" | "chatgpt";
export type AgentInfo = { id: AgentId; name: string; maker: string; kind: "builtin" | "outside"; address: Hex };
export type AgentStatus = "connected" | "disconnected" | "available";
export type AgentState = AgentInfo & { status: AgentStatus; connectedAt?: number; disconnectedAt?: number };

/** The built-in agent's key (the tool layer holds it, never the model). */
export const SIM_AGENT: Hex = "0xa9e7c41d5b02f3e68c7d91b4e0f2a35c6d7b8e19";
export const CLAUDE_AGENT: Hex = "0xc1a0de5e0b7a4f2c9d3e8b1a6f40c25d7e9a3b61";
export const CHATGPT_AGENT: Hex = "0x0a1c4a7f3e92b8d65c1e0f4a7b29d83c6e5f1a04";

export const AGENTS: AgentInfo[] = [
  { id: "chainbrain", name: "ChainBrain", maker: "Built in", kind: "builtin", address: SIM_AGENT },
  { id: "claude", name: "Claude", maker: "Anthropic", kind: "outside", address: CLAUDE_AGENT },
  { id: "chatgpt", name: "ChatGPT", maker: "OpenAI", kind: "outside", address: CHATGPT_AGENT },
];
const lc = (a?: string) => (a ?? "").toLowerCase();
export const agentInfo = (id: string) => AGENTS.find((a) => a.id === id);
export const agentByAddress = (address?: string) => AGENTS.find((a) => lc(a.address) === lc(address));

/** What the consent sheet lists: the same for every agent, because the pocket contract enforces it, not the agent. */
export const CAN = ["Find sellers on this pocket's list", "Ask sellers for quotes", "Pay inside the pocket's cap and balance", "Ask you before paying above your limit"];
export const CANNOT = ["See your main wallet or its balance", "Touch any other pocket", "Change the pocket's limits or sellers", "Pay a seller that isn't on the list"];

// ---- outside agents' plans (scripted, like the built-in agent's scenes in script.ts)

const done = (outs: Outcome[]) => summary(outs);

/** A small task: draft the intent (the owner confirms it), then buy each item in order. */
/** A small task: draft the intent (the owner confirms it), then buy each item in order. A buy marked `true` is tried even if
 *  the quote says the pocket won't allow it (the contract then refuses it on-chain). `items` leaves room for later buys. */
export function* errand(o: { what: string; maxPrice: string; maxTotal: string; buys: [string, string, boolean?][]; items?: number; search?: boolean; say?: string }): Scene {
  if (!(yield* draft(intent(o.what, o.maxPrice, o.maxTotal, o.items ?? Math.max(o.buys.length, 1)), o.say ?? `Writing the task down for you to confirm: ${o.what.toLowerCase()}.`))) return "The owner didn't confirm the task. Nothing was paid.";
  if (o.search) yield { tool: "search_sellers", input: { category: "Research data" }, say: "Checking which sellers this pocket allows." } as Action;
  const outs: Outcome[] = [];
  for (const [seller, sku, anyway] of o.buys) outs.push(yield* purchase(seller, sku, { payAnyway: !!anyway }));
  return done(outs);
}

/** Buy inside an intent the owner already confirmed on this pocket (no new task). */
export function* buy(seller: string, sku: string, reason?: string): Scene {
  return done([yield* purchase(seller, sku, { reason })]);
}

/** Try a seller the pocket may not allow (the contract decides), then stop: outside agents don't re-plan in our app. */
export function* attempt(seller: string, sku: string): Scene {
  return done([yield* purchase(seller, sku, { payAnyway: true })]);
}

/** A first run right after the owner grants a pocket: look around, then one small purchase. */
export function* firstRun(): Scene {
  yield { tool: "get_pocket", input: {}, say: "Reading the pocket I was given: balance, cap and allowed sellers." } as Action;
  yield { tool: "search_sellers", input: { category: "Research data" }, say: "Checking which sellers this pocket allows." } as Action;
  return "Ready. I'll ask you before paying above the pocket's limit.";
}
