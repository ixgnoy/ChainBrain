// The phone's visitor session on a ChainBrain server: one Login signature (checked by the signing guard) signs up or in,
// and the server hands back a token the API calls carry. No React Native imports (Node tests load it); the store keeps
// the token on the device.
import type { Address, Hex } from "viem";
import { fetchTimeout, getApi, normalizeUrl } from "./runtime";
import { VISITOR_HEADER, type LoginChallenge } from "../../../shared/chain/login";

let token: string | null = null;
export const getVisitorToken = () => token;
export const setVisitorToken = (t: string | null) => { token = t; };
/** Headers for the API: the session token when there is one. */
export const visitorHeaders = (): Record<string, string> => (token ? { [VISITOR_HEADER]: token } : {});
/** Where the token is kept on the device: one per server and key. */
export const tokenKey = (base: string, owner: string) => `cb.visitor.${normalizeUrl(base)}.${owner.toLowerCase()}`;

export type SignedUp = { visitorId: string; owner: Address; token: string; created: boolean; funding: { nativeFunded: boolean; mintTx?: Hex; minted?: string; error?: string }; explorer?: string };
type Fetch = (url: string, init?: any) => Promise<{ ok: boolean; status: number; json(): Promise<any> }>;
const post = (f: Fetch, url: string, body: unknown, ms = 60_000) =>
  fetchTimeout(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }, ms, f as any);

/**
 * Sign up (or back in: the same key is the same account). The server funds a new visitor with real transactions before
 * it answers, so this can take a few seconds. `signLogin` must run the signing guard.
 */
export async function signUp(owner: Address, signLogin: (c: LoginChallenge) => Promise<Hex>, base = getApi(), f: Fetch = globalThis.fetch as any): Promise<SignedUp> {
  const r = await post(f, `${normalizeUrl(base)}/v1/challenge`, { owner }, 10_000);
  if (!r.ok) throw new Error(r.status === 404 ? "This server has no visitor accounts (an older build)" : `challenge ${r.status}`);
  const ch = (await r.json()) as LoginChallenge;
  const signature = await signLogin(ch);
  const s = await post(f, `${normalizeUrl(base)}/v1/visitors`, { owner, nonce: ch.nonce, issuedAt: ch.issuedAt, signature });
  const j = await s.json().catch(() => ({}));
  if (!s.ok) throw new Error(j.error === "SIGNUPS_FULL" ? "Too many new accounts this hour. Try again later, or use the demo network." : j.error ?? `sign-up ${s.status}`);
  return j as SignedUp;
}

/** Is this token still good on this server? */
export async function stillSignedIn(t: string, base = getApi(), f: Fetch = globalThis.fetch as any): Promise<boolean> {
  try { return (await fetchTimeout(`${normalizeUrl(base)}/v1/me`, { headers: { [VISITOR_HEADER]: t } }, 8000, f as any)).ok; } catch { return false; }
}

/** A new card's own agent key, derived on the server for this visitor. null when the server has no per-card keys. */
export async function newCardAgent(base = getApi(), f: Fetch = globalThis.fetch as any): Promise<{ cardId: string; agent: Address } | null> {
  if (!token) return null;
  const r = await fetchTimeout(`${normalizeUrl(base)}/v1/cards/agent`, { method: "POST", headers: { "content-type": "application/json", ...visitorHeaders() }, body: "{}" }, 10_000, f as any);
  if (r.status === 503 || r.status === 404) return null; // PER_CARD_KEYS_OFF, or an older server: the shared agent key
  if (!r.ok) throw new Error(`card agent ${r.status}`);
  return r.json();
}
