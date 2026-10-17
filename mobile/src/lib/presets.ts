import type { Address } from "viem";
import { parseUsd, NEVER } from "./shared";
import { getChain } from "./runtime";

export type Lifetime = "one-task" | "until-tonight" | "ongoing";
export type PresetValues = { label: string; budget: string; sellers: string[]; cap: string; askAbove: string; lifetime: Lifetime };

// Spec "Presets" (same values as web/src/presets.ts). askAbove "never" = max uint, "0" = ask every time.
export const PRESETS: Record<"research" | "onePurchase" | "askEveryTime", PresetValues> = {
  research: { label: "Research data", budget: "5", sellers: ["datalite", "datapro"], cap: "2", askAbove: "1", lifetime: "until-tonight" },
  onePurchase: { label: "One purchase", budget: "0.30", sellers: ["datalite"], cap: "0.30", askAbove: "never", lifetime: "one-task" },
  askEveryTime: { label: "Ask every time", budget: "5", sellers: ["datalite", "datapro"], cap: "2", askAbove: "0", lifetime: "ongoing" },
};

/** The built-in network sells per-request data (Exa US$0.007, CoinGecko US$0.01, Nansen US$0.01 to US$0.05), so its presets
 *  are cents, not dollars. */
export const BUILTIN_PRESETS: typeof PRESETS = {
  research: { label: "Research data", budget: "1", sellers: ["exa", "coingecko", "nansen"], cap: "0.05", askAbove: "0.02", lifetime: "until-tonight" },
  onePurchase: { label: "One purchase", budget: "0.01", sellers: ["exa"], cap: "0.01", askAbove: "never", lifetime: "one-task" },
  askEveryTime: { label: "Ask every time", budget: "1", sellers: ["exa", "coingecko", "nansen"], cap: "0.05", askAbove: "0", lifetime: "ongoing" },
};
/** The same pockets in HK$ against a FISCO server (Mock e-HKD; DataLite HK$2.30, DataPro HK$11.70). */
export const HKD_PRESETS: typeof PRESETS = {
  research: { label: "Research data", budget: "40", sellers: ["datalite", "datapro"], cap: "15", askAbove: "8", lifetime: "until-tonight" },
  onePurchase: { label: "One purchase", budget: "2.30", sellers: ["datalite"], cap: "2.30", askAbove: "never", lifetime: "one-task" },
  askEveryTime: { label: "Ask every time", budget: "40", sellers: ["datalite", "datapro"], cap: "15", askAbove: "0", lifetime: "ongoing" },
};
const fisco = () => getChain()?.key === "fisco";
/** The presets that fit the sellers this network offers. */
export const presetsFor = (sellerIds: string[]) => (sellerIds.includes("exa") ? BUILTIN_PRESETS : fisco() ? HKD_PRESETS : PRESETS);
/** A pocket made for the dead-end scene (8): its cap is below every seller's price. US$0.20 against the dev stack's dollar
 *  reports; US$0.01 on the built-in network, where research pockets themselves have cent caps (Research data US$0.05). */
export const isTightCap = (cap: bigint, sellerIds: string[]) => cap <= (sellerIds.includes("exa") ? 10_000n : fisco() ? 1_500_000n : 200_000n);

export function expiryFor(l: Lifetime, now = new Date()): bigint {
  const s = Math.floor(now.getTime() / 1000);
  if (l === "ongoing") return BigInt(s + 365 * 86_400);
  if (l === "one-task") return BigInt(s + 86_400);
  const tonight = new Date(now);
  tonight.setHours(23, 59, 0, 0);
  return BigInt(Math.floor(tonight.getTime() / 1000));
}

export function toPocketArgs(v: PresetValues, agent: Address, payTo: Record<string, Address>, now = new Date()) {
  return {
    agent,
    cap: parseUsd(v.cap),
    askAbove: v.askAbove === "never" ? NEVER : parseUsd(v.askAbove),
    expiresAt: expiryFor(v.lifetime, now),
    sellers: v.sellers.map((s) => {
      if (!payTo[s]) throw new Error(`unknown seller ${s}`);
      return payTo[s];
    }),
    budget: parseUsd(v.budget),
  };
}
