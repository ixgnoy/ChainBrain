// The Brain tab's graph: ChainBrain in the middle, the agents around it, each agent's pockets further out and the sellers
// those pockets may pay on the outer ring, with what the brain remembers as small satellites of the centre. Every node is a
// real agent, pocket, seller or memory item; every pulse is a real event (a payment, a refusal, a price checked and waited
// on, seller text ignored, a memory update), carried along the edges it touched. Pure: Node tests load it.
import type { WalletEvent } from "./events";
import { liveCards, type LiveKind } from "./live";

export type GNode = { id: string; kind: "brain" | "agent" | "pocket" | "seller" | "memory"; x: number; y: number; label: string; ref?: string; layout?: string };
export type GEdge = { from: string; to: string };
export type PulseTone = "paid" | "refused" | "guard" | "watched" | "learned";
export type Pulse = { key: string; at: number; tone: PulseTone; path: string[]; text: string; agent?: string };

type PocketIn = { address: string; agentId?: string; allowed: string[]; revoked?: boolean; name: string; layout?: string };

const TAU = Math.PI * 2;
/** Rings, as a share of the graph's half width. */
export const RING = { memory: 0.25, agent: 0.42, pocket: 0.66, seller: 0.9 };

const at = (r: number, a: number) => ({ x: 0.5 + 0.5 * r * Math.cos(a), y: 0.5 + 0.5 * r * Math.sin(a) });
const mean = (as: number[]) => Math.atan2(as.reduce((n, a) => n + Math.sin(a), 0), as.reduce((n, a) => n + Math.cos(a), 0));

/** Spreads angles that sit closer than `gap` apart, keeping their order around the circle. */
function spread(items: { id: string; a: number }[], gap: number) {
  const s = [...items].sort((p, q) => p.a - q.a);
  for (let pass = 0; pass < 6; pass++) for (let i = 1; i < s.length; i++) if (s[i].a - s[i - 1].a < gap) s[i].a = s[i - 1].a + gap;
  return s;
}

/** Positions in 0..1 (multiply by the graph's size). `memory` is how many items the brain remembers (shown up to 8). */
export function brainGraph(o: { pockets: PocketIn[]; agentName(id: string): string; sellerName(id: string): string; memory: number }): { nodes: GNode[]; edges: GEdge[] } {
  const live = o.pockets.filter((p) => !p.revoked);
  const nodes: GNode[] = [{ id: "brain", kind: "brain", x: 0.5, y: 0.5, label: "ChainBrain" }];
  const edges: GEdge[] = [];
  // pockets evenly round the ring, grouped by agent so each agent sits over its own
  const byAgent = new Map<string, PocketIn[]>();
  for (const p of live) { const a = p.agentId ?? "chainbrain"; byAgent.set(a, [...(byAgent.get(a) ?? []), p]); }
  const order = [...byAgent.values()].flat();
  const pAngle = new Map<string, number>();
  order.forEach((p, i) => pAngle.set(p.address.toLowerCase(), -Math.PI / 2 + (i + 0.5) * (TAU / Math.max(order.length, 1))));
  for (const [agent, ps] of byAgent) {
    const a = mean(ps.map((p) => pAngle.get(p.address.toLowerCase())!));
    nodes.push({ id: `agent:${agent}`, kind: "agent", ...at(RING.agent, a), label: o.agentName(agent), ref: agent });
    edges.push({ from: "brain", to: `agent:${agent}` });
    for (const p of ps) {
      const k = p.address.toLowerCase();
      nodes.push({ id: `pocket:${k}`, kind: "pocket", ...at(RING.pocket, pAngle.get(k)!), label: p.name, ref: p.address, layout: p.layout });
      edges.push({ from: `agent:${agent}`, to: `pocket:${k}` });
    }
  }
  // each seller sits over the pockets that may pay it
  const users = new Map<string, number[]>();
  for (const p of live) for (const s of p.allowed) users.set(s, [...(users.get(s) ?? []), pAngle.get(p.address.toLowerCase())!]);
  const sellers = spread([...users].map(([id, as]) => ({ id, a: mean(as) })), TAU / Math.max(users.size * 1.15, 9));
  for (const s of sellers) {
    nodes.push({ id: `seller:${s.id}`, kind: "seller", ...at(RING.seller, s.a), label: o.sellerName(s.id), ref: s.id });
    for (const p of live) if (p.allowed.includes(s.id)) edges.push({ from: `pocket:${p.address.toLowerCase()}`, to: `seller:${s.id}` });
  }
  // what it remembers: small satellites close round the centre
  const m = Math.min(o.memory, 8);
  for (let i = 0; i < m; i++) nodes.push({ id: `memory:${i}`, kind: "memory", ...at(RING.memory, -Math.PI / 2 + (i * TAU) / Math.max(m, 1) + 0.4), label: "" });
  return { nodes, edges };
}

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
    out.push({ key: x.key, at: x.at, tone, path: path.filter((p): p is string => !!p), agent,
      text: tone === "paid" ? `${o.agentName(agent)} paid ${o.sellerName(x.sellerId)}${x.amount ? ` ${x.amount}` : ""}` : x.title });
  }
  const since = (o.now ?? Date.now()) - (o.days ?? 14) * 86_400_000;
  for (const e of events) {
    if (e.at < since || e.type !== "trace" || e.phase !== "memory" || !e.pocket) continue;
    const added = Array.isArray(e.applied) ? e.applied.filter((a: { op?: string }) => a?.op === "add").length : 0;
    const agent = o.agentOf(e.pocket) ?? "chainbrain";
    out.push({ key: `mem:${e.at}:${e.pocket}`, at: e.at, tone: "learned", path: [`pocket:${String(e.pocket).toLowerCase()}`, `agent:${agent}`, "brain"], agent,
      text: added ? `Learned ${added} new ${added === 1 ? "thing" : "things"}` : `Memory version ${Number(e.version) || 1}` });
  }
  return out.sort((a, b) => b.at - a.at);
}
