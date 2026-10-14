// The owner key lives only on this device: iOS Keychain / Android Keystore via expo-secure-store (bundled in Expo Go).
// Web (laptop rehearsal only) has no SecureStore, so it falls back to localStorage. Testnet keys only.
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import type { Address, Hex } from "viem";

const KEY = "chainbrain.owner_pk";
const POCKETS = "chainbrain.pockets";
const web = Platform.OS === "web";

const get = async (k: string) => (web ? globalThis.localStorage?.getItem(k) ?? null : SecureStore.getItemAsync(k));
const set = async (k: string, v: string) => (web ? globalThis.localStorage?.setItem(k, v) : SecureStore.setItemAsync(k, v));
const del = async (k: string) => (web ? globalThis.localStorage?.removeItem(k) : SecureStore.deleteItemAsync(k));

export const isPrivateKey = (s: string): s is Hex => /^0x[0-9a-fA-F]{64}$/.test(s.trim());

/** The stored key, or null when there is none. Something stored that is not a key throws: it is never overwritten. */
export async function loadKey(): Promise<Hex | null> {
  const v = await get(KEY);
  if (v == null || v === "") return null;
  if (!isPrivateKey(v)) throw new Error("stored key is unreadable");
  return v;
}

export async function saveKey(pk: string) {
  if (!isPrivateKey(pk)) throw new Error("Not a private key (0x + 64 hex characters)");
  await set(KEY, pk.trim());
}

/** New key from the OS CSPRNG (async variant: the sync one may fall back to Math.random in development). */
export async function createKey(): Promise<Hex> {
  const pk = await randomKey();
  if (await get(KEY)) throw new Error("a key already exists"); // never replace a key (it may own pockets with money in them)
  await set(KEY, pk);
  return pk;
}

/** A fresh key that is not stored (used only when the device's key store cannot be read). */
export async function randomKey(): Promise<Hex> {
  const bytes = await Crypto.getRandomBytesAsync(32);
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}` as Hex;
}

export const forgetKey = () => del(KEY);

export async function loadPockets(owner: Address): Promise<Address[]> {
  try { return JSON.parse((await get(`${POCKETS}.${owner.toLowerCase()}`)) ?? "[]"); } catch { return []; }
}
export const savePockets = (owner: Address, list: Address[]) => set(`${POCKETS}.${owner.toLowerCase()}`, JSON.stringify(list));
