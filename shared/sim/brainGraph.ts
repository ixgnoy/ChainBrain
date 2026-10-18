// The Brain graph's layout, shared by the phone's Brain tab and the console's Brain page: ChainBrain in the middle, the
// agents round it, each agent's pockets further out and the sellers those pockets may pay on the outer ring, with what the
// brain remembers as small satellites of the centre. Every node is a real agent, pocket, seller or memory item; edges carry
// the payments that crossed them. Positions are 0..1 (multiply by the drawing's size). Pure.

export type GNode = { id: string; kind: "brain" | "agent" | "pocket" | "seller" | "memory"; x: number; y: number; label: string; ref?: string; layout?: string };
export type GEdge = { from: string; to: string; /** payments along it in the window (pocket → seller edges) */ traffic?: number };
export type PocketIn = { address: string; agentId?: string; allowed: string[]; revoked?: boolean; name: string; layout?: string };

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
export function brainGraph(o: { pockets: PocketIn[]; agentName(id: string): string; sellerName(id: string): string; memory: number; /** payments by "pocket>seller" (lower-case pocket) */ traffic?: Record<string, number> }): { nodes: GNode[]; edges: GEdge[] } {
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
    for (const p of live) if (p.allowed.includes(s.id)) edges.push({ from: `pocket:${p.address.toLowerCase()}`, to: `seller:${s.id}`, traffic: o.traffic?.[`${p.address.toLowerCase()}>${s.id}`] ?? 0 });
  }
  // what it remembers: small satellites close round the centre
  const m = Math.min(o.memory, 8);
  for (let i = 0; i < m; i++) nodes.push({ id: `memory:${i}`, kind: "memory", ...at(RING.memory, -Math.PI / 2 + (i * TAU) / Math.max(m, 1) + 0.4), label: "" });
  return { nodes, edges };
}

/** Payments per pocket → seller edge in the window, the graph's traffic. */
export function trafficOf(events: { type: string; at: number; pocket?: string; sellerId?: string }[], o: { now?: number; days?: number } = {}): Record<string, number> {
  const since = (o.now ?? Date.now()) - (o.days ?? 14) * 86_400_000;
  const out: Record<string, number> = {};
  for (const e of events) if (e.type === "payment" && e.at >= since && e.pocket && e.sellerId) { const k = `${String(e.pocket).toLowerCase()}>${e.sellerId}`; out[k] = (out[k] ?? 0) + 1; }
  return out;
}
