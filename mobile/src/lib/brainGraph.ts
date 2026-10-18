// The Brain tab's graph: ChainBrain in the middle, the agents around it, each agent's pockets further out and the sellers
// those pockets may pay on the outer ring, with what the brain remembers as small satellites of the centre. Every node is a
// real agent, pocket, seller or memory item; every pulse is a real event (a payment, a refusal, a price checked and waited
// on, seller text ignored, a memory update), carried along the edges it touched. Pure: Node tests load it.
import type { WalletEvent } from "./events";
import { liveCards, type LiveKind } from "./live";

export { RING, brainGraph, trafficOf, type GNode, type GEdge } from "../../../shared/sim/brainGraph";

export type PulseTone = "paid" | "refused" | "guard" | "watched" | "learned";
export type Pulse = { key: string; at: number; tone: PulseTone; path: string[]; text: string; agent?: string;
  /** what it came from, so its decision trace can be rebuilt (lib/brainTrace.ts) */ pocket?: string; sellerId?: string; tx?: string; kind: LiveKind | "memory" };

const TONE: Record<LiveKind, PulseTone> = { paid: "paid", cosigned: "paid", refused: "refused", ignored: "guard", attack: "guard", freeze: "refused", watched: "watched", run: "watched" };

/** The events the graph carries, newest first: the Live view's decisions plus the brain's memory updates. */
export function pulsesOf(events: WalletEvent[], o: { agentOf(pocket?: string): string | undefined; sellerName(id?: string): string; agentName(id?: string): string; now?: number; days?: number }): Pulse[] {
  const out: Pulse[] = [];
  for (const x of liveCards(events, o)) {
    const agent = x.agent ?? "chainbrain";
    const pocket = x.pocket ? `pocket:${x.pocket.toLowerCase()}` : undefined;
    const seller = x.sellerId ? `seller:${x.sellerId}` : undefined;
    const tone = TONE[x.kind];
    // a payment travels out to the seller; a refusal and a guard stop at the pocket; seller text comes in from the seller
    const path = tone === "guard" ? [seller, pocket, "brain"] : tone === "refused" ? ["brain", `agent:${agent}`, pocket] : ["brain", `agent:${agent}`, pocket, seller];
    out.push({ key: x.key, at: x.at, tone, path: path.filter((p): p is string => !!p), agent, pocket: x.pocket, sellerId: x.sellerId, tx: x.tx, kind: x.kind,
      text: tone === "paid" ? `${o.agentName(agent)} paid ${o.sellerName(x.sellerId)}${x.amount ? ` ${x.amount}` : ""}` : x.title });
  }
  const since = (o.now ?? Date.now()) - (o.days ?? 14) * 86_400_000;
  for (const e of events) {
    if (e.at < since || e.type !== "trace" || e.phase !== "memory" || !e.pocket) continue;
    const added = Array.isArray(e.applied) ? e.applied.filter((a: { op?: string }) => a?.op === "add").length : 0;
    const agent = o.agentOf(e.pocket) ?? "chainbrain";
    out.push({ key: `mem:${e.at}:${e.pocket}`, at: e.at, tone: "learned", path: [`pocket:${String(e.pocket).toLowerCase()}`, `agent:${agent}`, "brain"], agent, pocket: String(e.pocket), kind: "memory",
      text: added ? `Learned ${added} new ${added === 1 ? "thing" : "things"}` : `Memory version ${Number(e.version) || 1}` });
  }
  return out.sort((a, b) => b.at - a.at);
}
