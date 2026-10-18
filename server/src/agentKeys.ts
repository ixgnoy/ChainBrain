import { Hono } from "hono";
import { concat, keccak256, toHex, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { table } from "./store";
import { visitorByToken, visitorId } from "./visitors";
import { VISITOR_HEADER } from "../../shared/chain/login";

/**
 * One agent key per card, derived on use and never stored: key = keccak256(AGENT_MASTER_KEY ‖ cardId) mod n, with
 * cardId = "<visitorId>#<n>" (YINGLONG's pattern, Apache-2.0, see THIRD_PARTY.md). The device asks for a card's agent
 * address before it signs factory.create, so the owner's card names an agent only this server can sign for.
 * The table maps agent address -> cardId only to skip a search; if it is lost, the owner's visitor id rebuilds it.
 * The old shared AGENT_PK still signs for pockets created before this (the evidence pockets).
 */

const N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n; // secp256k1 order
const SEARCH = 64; // cards per visitor tried when the table has lost an entry

type Card = { agent: Address; cardId: string; visitorId: string; n: number; at: number };
const cards = table<Card>("agent-cards");
const counters = table<number>("agent-counters");
const found = new Map<string, Hex>(); // agent address -> key, this process only

let warned = false;
const master = (): Hex | undefined => {
  const m = process.env.AGENT_MASTER_KEY;
  if (m && /^0x[0-9a-fA-F]{64}$/.test(m)) return m as Hex;
  if (m && !warned) { warned = true; console.warn("AGENT_MASTER_KEY must be 0x + 64 hex characters (32 bytes): per-card agent keys are OFF"); }
  return undefined;
};
export const perCardKeysOn = () => !!master();

export function deriveAgentKey(masterKey: Hex, cardId: string): Hex {
  let k = BigInt(keccak256(concat([masterKey, toHex(cardId)]))) % N;
  if (k === 0n) k = 1n;
  return toHex(k, { size: 32 });
}

const addrOf = (pk: Hex) => privateKeyToAccount(pk).address;

/** A new card's agent for this visitor: allocates the next card number. Throws without AGENT_MASTER_KEY. */
export function newCardAgent(vid: string): { cardId: string; agent: Address } {
  const m = master();
  if (!m) throw new Error("AGENT_MASTER_KEY not set");
  const n = counters.get(vid) ?? 0;
  counters.set(vid, n + 1);
  const cardId = `${vid}#${n}`;
  const pk = deriveAgentKey(m, cardId);
  const agent = addrOf(pk);
  cards.set(agent.toLowerCase(), { agent, cardId, visitorId: vid, n, at: Date.now() });
  found.set(agent.toLowerCase(), pk);
  return { cardId, agent };
}

/**
 * The key this server signs with for a card whose on-chain agent is `agent` and owner is `owner`, or undefined if it
 * can't (NOT_THIS_AGENT). A derived key only counts when it was issued to the owner's own visitor: a card can't borrow
 * another visitor's agent.
 */
export function agentKeyFor(agent: Address, owner: Address): Hex | undefined {
  const a = agent.toLowerCase();
  const legacy = process.env.AGENT_PK as Hex | undefined;
  if (legacy && addrOf(legacy).toLowerCase() === a) return legacy;
  const m = master();
  if (!m) return undefined;
  const vid = visitorId(owner);
  const rec = cards.get(a);
  if (rec) {
    if (rec.visitorId !== vid) return undefined;
    return found.get(a) ?? found.set(a, deriveAgentKey(m, rec.cardId)).get(a);
  }
  for (let n = 0; n < SEARCH; n++) { // the table lost it: rebuild from the owner's visitor id
    const cardId = `${vid}#${n}`;
    const pk = deriveAgentKey(m, cardId);
    if (addrOf(pk).toLowerCase() === a) {
      cards.set(a, { agent: addrOf(pk), cardId, visitorId: vid, n, at: Date.now() });
      if ((counters.get(vid) ?? 0) <= n) counters.set(vid, n + 1);
      found.set(a, pk);
      return pk;
    }
  }
  return undefined;
}

/** Explorer labels: agent address -> card id. */
export const agentLabels = (): Record<string, string> => Object.fromEntries(cards.all().map((c) => [c.agent.toLowerCase(), c.cardId]));

/** POST /v1/cards/agent (visitor token): the agent address for the visitor's next card, to put in factory.create. */
export function agentRoutes() {
  const app = new Hono();
  app.post("/v1/cards/agent", async (c) => {
    if (!perCardKeysOn()) return c.json({ error: "PER_CARD_KEYS_OFF", detail: "AGENT_MASTER_KEY is not set on this server" }, 503);
    const v = visitorByToken(c.req.header(VISITOR_HEADER));
    if (!v) return c.json({ error: "VISITOR_TOKEN_REQUIRED" }, 401); // even with VISITOR_AUTH=off: a card needs an owner
    return c.json(newCardAgent(v.id));
  });
  return app;
}

/** Tests: forget the table and the cache. */
export function resetAgentKeys() { cards.reset(); counters.reset(); found.clear(); }
