// Pockets have no name on chain: the phone keeps a label and a card style per pocket address (local only).
import type { Address } from "viem";
import type { PocketAppSpec } from "../../../shared/sim/pocketApp";
import { getItem, setItem } from "../storage";

/** `app`: the pocket's app (layout, blocks, title, routine), composed once when it was made (shared/sim/pocketApp.ts). */
export type PocketMeta = { name: string; style: "research" | "gifts" | "tight" | "custom"; app?: PocketAppSpec };
const key = (owner: string) => `cb.pocketMeta.${owner.toLowerCase()}`;

export async function loadMeta(owner: Address): Promise<Record<string, PocketMeta>> {
  try { return JSON.parse((await getItem(key(owner))) ?? "{}"); } catch { return {}; }
}
export const saveMeta = (owner: Address, m: Record<string, PocketMeta>) => setItem(key(owner), JSON.stringify(m));

export const styleForPreset = (label: string): PocketMeta["style"] => (label === "Research data" ? "research" : label === "One purchase" ? "tight" : label === "Ask every time" ? "gifts" : "custom");
