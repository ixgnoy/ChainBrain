import { Hono, type Context } from "hono";
import { randomBytes } from "node:crypto";
import { getAddress, isAddress, keccak256, toHex, verifyTypedData, type Address, type Hex } from "viem";
import { cfg } from "./chains";
import { pub, pocketAbi } from "./wallet/chain";
import { fundIfEmpty } from "./fund";
import { write } from "./ledger";
import { parseAmount, formatAmount } from "./wallet/money";
import { table } from "./store";
import { slidingWindow } from "./limits";
import { loginTypedData, VISITOR_HEADER, type LoginChallenge } from "../../shared/chain/login";

/**
 * Visitor accounts. The owner key lives on the visitor's device; the server never sees it. One EIP-712 Login signature
 * over a single-use server nonce proves the key, then:
 *   POST /v1/challenge {owner}                          -> {owner, nonce, issuedAt, chainId}
 *   POST /v1/visitors  {owner, nonce, issuedAt, signature} -> creates the visitor once (native balance + starter HK$, real
 *                                                          transactions with hashes) and returns a session token
 *   POST /v1/login     {owner, nonce, issuedAt, signature} -> a session token for an existing visitor
 *   GET  /v1/me        (x-visitor-token)                  -> the visitor
 * Only keccak256(token) is stored. The id is derived from the owner address, so signing up twice is one account.
 */

export type Visitor = {
  id: string; owner: Address; createdAt: number;
  funding: { nativeFunded: boolean; mintTx?: Hex; minted?: string; error?: string };
  tokens: { hash: Hex; exp: number }[];
};

const visitors = table<Visitor>("visitors");
const TOKEN_TTL = 7 * 86_400_000;
const CHALLENGE_TTL = 5 * 60_000;
const challenges = new Map<string, { owner: string; issuedAt: number }>(); // nonce -> owner
const signups = slidingWindow(3_600_000, () => Number(process.env.VISITORS_PER_HOUR ?? 60));

export const visitorId = (owner: Address) => `v-${keccak256(toHex(owner.toLowerCase())).slice(2, 18)}`;
const hashToken = (t: string) => keccak256(toHex(t));
const starter = () => process.env.VISITOR_STARTER ?? "500";
const mintAbi = [{ type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [] }] as const;

/** Visitor auth is on unless VISITOR_AUTH=off (the dev stack, until both apps sign in). */
export const authOn = () => process.env.VISITOR_AUTH !== "off";

export function visitorByToken(token: string | undefined): Visitor | undefined {
  if (!token) return undefined;
  const h = hashToken(token), now = Date.now();
  return visitors.all().find((v) => v.tokens.some((t) => t.hash === h && t.exp > now));
}

const owners = new Map<string, Address>(); // pocket -> owner (a Pocket's owner never changes)
export async function pocketOwner(pocket: Address): Promise<Address | undefined> {
  const k = pocket.toLowerCase();
  if (!owners.has(k)) {
    const o = await pub().readContract({ address: pocket, abi: pocketAbi, functionName: "owner" }).catch(() => undefined);
    if (!o) return undefined;
    owners.set(k, o as Address);
  }
  return owners.get(k);
}

/**
 * Gate for a visitor-only route: a valid session token and, when `pocket` is given, that the visitor's owner key owns it
 * (Pocket.owner() on chain). Returns an error response, or null to carry on. Off when VISITOR_AUTH=off.
 */
export async function guard(c: Context, pocket?: string): Promise<Response | null> {
  if (!authOn()) return null;
  const v = visitorByToken(c.req.header(VISITOR_HEADER));
  if (!v) return c.json({ error: "VISITOR_TOKEN_REQUIRED" }, 401);
  c.set("visitor" as never, v as never);
  if (pocket !== undefined) {
    if (!isAddress(pocket)) return c.json({ error: "BAD_POCKET" }, 400);
    const owner = await pocketOwner(pocket as Address);
    if (!owner || owner.toLowerCase() !== v.owner.toLowerCase()) return c.json({ error: "NOT_YOUR_CARD" }, 403);
  }
  return null;
}

/** Check a Login signature against a nonce this server issued (single use, 5 minutes). */
async function checkLogin(body: any): Promise<{ owner: Address } | { error: string; status: 400 | 401 }> {
  const { owner, nonce, issuedAt, signature } = body ?? {};
  if (!owner || !isAddress(owner)) return { error: "BAD_ADDRESS", status: 400 };
  if (typeof nonce !== "string" || typeof signature !== "string") return { error: "BAD_REQUEST", status: 400 };
  const ch = challenges.get(nonce);
  challenges.delete(nonce); // single use, even when the signature is wrong
  if (!ch || ch.owner !== owner.toLowerCase() || ch.issuedAt !== Number(issuedAt) || Date.now() - ch.issuedAt > CHALLENGE_TTL)
    return { error: "CHALLENGE_EXPIRED", status: 401 };
  const c: LoginChallenge = { owner: getAddress(owner), nonce: nonce as Hex, issuedAt: ch.issuedAt, chainId: cfg().chain.id };
  const ok = await verifyTypedData({ address: c.owner, ...loginTypedData(c), signature: signature as Hex }).catch(() => false);
  return ok ? { owner: c.owner } : { error: "BAD_SIGNATURE", status: 401 };
}

function issueToken(v: Visitor): string {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  v.tokens = [...v.tokens.filter((t) => t.exp > now).slice(-4), { hash: hashToken(token), exp: now + TOKEN_TTL }];
  visitors.set(v.id, v);
  return token;
}

const view = (v: Visitor) => ({ visitorId: v.id, owner: v.owner, createdAt: v.createdAt, funding: v.funding });

const inflight = new Map<string, Promise<void>>(); // visitor id -> its funding, so two sign-ups never mint twice

/** Native balance (so the key may send) and the starter HK$, as real transactions. A failure is kept and retried next sign-up. */
function fund(v: Visitor): Promise<void> {
  const running = inflight.get(v.id);
  if (running) return running;
  const job = (async () => {
    try {
      const nativeFunded = (await fundIfEmpty(pub(), [v.owner])).length > 0;
      const value = parseAmount(starter());
      const { hash } = await write(process.env.OWNER_PK as Hex, { address: cfg().token, abi: mintAbi, functionName: "mint", args: [v.owner, value] });
      v.funding = { nativeFunded: nativeFunded || v.funding.nativeFunded, mintTx: hash, minted: formatAmount(value) };
    } catch (e) {
      v.funding = { ...v.funding, error: String((e as Error).message).split("\n")[0] };
    }
    visitors.set(v.id, v);
  })().finally(() => inflight.delete(v.id));
  inflight.set(v.id, job);
  return job;
}

export function visitorRoutes() {
  const app = new Hono();

  app.post("/v1/challenge", async (c) => {
    const { owner } = (await c.req.json().catch(() => ({}))) as { owner?: string };
    if (!owner || !isAddress(owner)) return c.json({ error: "BAD_ADDRESS" }, 400);
    if (challenges.size > 10_000) challenges.clear();
    const nonce = toHex(randomBytes(32));
    const issuedAt = Date.now();
    challenges.set(nonce, { owner: owner.toLowerCase(), issuedAt });
    return c.json({ owner: getAddress(owner), nonce, issuedAt, chainId: cfg().chain.id });
  });

  app.post("/v1/visitors", async (c) => {
    const r = await checkLogin(await c.req.json().catch(() => null));
    if ("error" in r) return c.json({ error: r.error }, r.status);
    const id = visitorId(r.owner);
    let v = visitors.get(id);
    const created = !v;
    if (!v) {
      if (!signups.hit("global")) return c.json({ error: "SIGNUPS_FULL", detail: "Too many new accounts this hour. Try again later." }, 429);
      v = { id, owner: r.owner, createdAt: Date.now(), funding: { nativeFunded: false }, tokens: [] };
      visitors.set(id, v);
    }
    if (!v.funding.mintTx) await fund(v);
    const token = issueToken(v);
    const txUrl = cfg().txUrl("");
    return c.json({ ...view(v), created, token, explorer: v.funding.mintTx ? `${txUrl}${v.funding.mintTx}` : undefined }, created ? 201 : 200);
  });

  app.post("/v1/login", async (c) => {
    const r = await checkLogin(await c.req.json().catch(() => null));
    if ("error" in r) return c.json({ error: r.error }, r.status);
    const v = visitors.get(visitorId(r.owner));
    if (!v) return c.json({ error: "NO_SUCH_VISITOR" }, 404);
    return c.json({ ...view(v), token: issueToken(v) });
  });

  app.get("/v1/me", (c) => {
    const v = visitorByToken(c.req.header(VISITOR_HEADER));
    return v ? c.json(view(v)) : c.json({ error: "VISITOR_TOKEN_REQUIRED" }, 401);
  });

  return app;
}

/** Tests: forget every visitor and challenge. */
export function resetVisitors() {
  visitors.reset();
  inflight.clear();
  challenges.clear();
  signups.clear();
  owners.clear();
}
