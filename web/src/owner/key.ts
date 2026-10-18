// The console's owner key, made in this browser and never sent anywhere. Two ways to keep it:
//   passkey: where the browser's passkeys support the WebAuthn PRF extension (and really return its output), the key is
//            encrypted with AES-GCM under a key derived from the passkey's PRF output; unlocking needs the passkey.
//   browser: otherwise it is kept in this browser's storage, and the console asks once to copy it somewhere safe
//            (YINGLONG's "key" method).
// Test money only either way.
import { privateKeyToAccount } from "viem/accounts";
import type { Address, Hex } from "viem";

const K = "cb.owner.v1";
export type StoredKey =
  | { method: "browser"; pk: Hex; address: Address; backedUp: boolean }
  | { method: "passkey"; address: Address; credId: string; salt: string; iv: string; ct: string };

const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b as ArrayBuffer))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = (s: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const hex = (b: Uint8Array) => `0x${Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("")}` as Hex;
const unhex = (h: Hex): Uint8Array<ArrayBuffer> => Uint8Array.from(h.slice(2).match(/../g)!.map((x) => parseInt(x, 16)));
const rand = (n: number): Uint8Array<ArrayBuffer> => crypto.getRandomValues(new Uint8Array(new ArrayBuffer(n)));

export function loadStored(): StoredKey | null {
  try { const v = JSON.parse(localStorage.getItem(K) ?? "null"); return v && (v.method === "browser" || v.method === "passkey") ? v : null; } catch { return null; }
}
const save = (k: StoredKey) => { try { localStorage.setItem(K, JSON.stringify(k)); } catch { /* private window: lives for this tab only */ } };
export const forgetStored = () => { try { localStorage.removeItem(K); } catch { /* nothing to forget */ } };

export const newPrivateKey = (): Hex => {
  for (;;) { const k = hex(rand(32)); try { privateKeyToAccount(k); return k; } catch { /* out of range: draw again */ } }
};

/** A key kept in this browser (asks for a one-time backup). */
export function createBrowserKey(pk: Hex = newPrivateKey()): StoredKey & { method: "browser" } {
  const k = { method: "browser" as const, pk, address: privateKeyToAccount(pk).address, backedUp: false };
  save(k);
  return k;
}
export function markBackedUp() { const k = loadStored(); if (k?.method === "browser") save({ ...k, backedUp: true }); }

/** Does this browser offer passkeys at all? (PRF support is only known for sure once a passkey answers.) */
export async function passkeysAvailable(): Promise<boolean> {
  const P = (globalThis as any).PublicKeyCredential;
  if (!P || !navigator.credentials) return false;
  try {
    const caps = await P.getClientCapabilities?.();
    if (caps && caps["extension:prf"] === false) return false;
    return await P.isUserVerifyingPlatformAuthenticatorAvailable?.() ?? true;
  } catch { return true; }
}

async function aesKey(prf: ArrayBuffer): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", prf, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: new TextEncoder().encode("chainbrain"), info: new TextEncoder().encode("owner-key-v1") }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
const prfOf = (cred: any): ArrayBuffer | undefined => cred?.getClientExtensionResults?.()?.prf?.results?.first;

async function assert(credId: Uint8Array<ArrayBuffer>, salt: Uint8Array<ArrayBuffer>): Promise<ArrayBuffer | undefined> {
  const cred: any = await navigator.credentials.get({ publicKey: {
    challenge: rand(32), allowCredentials: [{ type: "public-key", id: credId }], userVerification: "required",
    extensions: { prf: { eval: { first: salt } } } as any,
  } });
  return prfOf(cred);
}

/**
 * A new key wrapped by a new passkey. Returns null when the passkey can't give PRF output (then use createBrowserKey):
 * some authenticators say "enabled" at creation and still return nothing, so the output itself is what counts.
 */
export async function createPasskeyKey(pk: Hex = newPrivateKey()): Promise<(StoredKey & { method: "passkey" }) | null> {
  const salt = rand(32);
  const cred: any = await navigator.credentials.create({ publicKey: {
    rp: { name: "ChainBrain" }, user: { id: rand(16), name: "chainbrain-owner", displayName: "ChainBrain owner key" }, challenge: rand(32),
    pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
    authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
    extensions: { prf: { eval: { first: salt } } } as any,
  } });
  if (!cred) return null;
  const credId = new Uint8Array(cred.rawId as ArrayBuffer);
  const ext = cred.getClientExtensionResults?.()?.prf;
  let out = prfOf(cred);
  if (!out && ext?.enabled) out = await assert(credId, salt).catch(() => undefined);
  if (!out) return null;
  const iv = rand(12);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(out), unhex(pk));
  const k = { method: "passkey" as const, address: privateKeyToAccount(pk).address, credId: b64(credId), salt: b64(salt), iv: b64(iv), ct: b64(ct) };
  save(k);
  return k;
}

/** The private key: at once for a browser key; with the passkey (a user gesture) for a wrapped one. */
export async function unlock(k: StoredKey): Promise<Hex> {
  if (k.method === "browser") return k.pk;
  const out = await assert(unb64(k.credId), unb64(k.salt));
  if (!out) throw new Error("The passkey did not unlock the key");
  const pk = hex(new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(k.iv) }, await aesKey(out), unb64(k.ct))));
  if (privateKeyToAccount(pk).address.toLowerCase() !== k.address.toLowerCase()) throw new Error("The passkey unlocked a different key");
  return pk;
}
