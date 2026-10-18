import type { Address } from "viem";
import { parseHkd, NEVER } from "./shared";

export type Lifetime = "one-task" | "until-tonight" | "ongoing";
export type PresetValues = { label: string; budget: string; sellers: string[]; cap: string; askAbove: string; lifetime: Lifetime };

// Spec "Presets", in HK$ against the wallet server (DataLite HK$2.30, DataPro HK$11.70). askAbove "never" = max uint, "0" = ask every time.
export const PRESETS: Record<"research" | "onePurchase" | "askEveryTime", PresetValues> = {
  research: { label: "Research data", budget: "40", sellers: ["datalite", "datapro"], cap: "15", askAbove: "8", lifetime: "until-tonight" },
  onePurchase: { label: "One purchase", budget: "2.30", sellers: ["datalite"], cap: "2.30", askAbove: "never", lifetime: "one-task" },
  askEveryTime: { label: "Ask every time", budget: "40", sellers: ["datalite", "datapro"], cap: "15", askAbove: "0", lifetime: "ongoing" },
};

/** The built-in network sells per-request data (Exa HK$0.056, CoinGecko HK$0.08, Nansen HK$0.08 to HK$0.40), so its presets
 *  are cents, not dollars. */
export const BUILTIN_PRESETS: typeof PRESETS = {
  research: { label: "Research data", budget: "8", sellers: ["exa", "coingecko", "nansen"], cap: "0.40", askAbove: "0.16", lifetime: "until-tonight" },
  onePurchase: { label: "One purchase", budget: "0.08", sellers: ["exa"], cap: "0.08", askAbove: "never", lifetime: "one-task" },
  askEveryTime: { label: "Ask every time", budget: "8", sellers: ["exa", "coingecko", "nansen"], cap: "0.40", askAbove: "0", lifetime: "ongoing" },
};
/** The presets that fit the sellers this network offers. DataLite is the server's alone (the server now also sells the mocked
 *  Exa, CoinGecko and Nansen, so their presence no longer means the built-in network). */
const onServer = (sellerIds: string[]) => sellerIds.includes("datalite");
export const presetsFor = (sellerIds: string[]) => (onServer(sellerIds) ? PRESETS : BUILTIN_PRESETS);
/** A pocket made for the dead-end scene (8): its cap is below every seller's price. HK$1.50 against the server's reports;
 *  HK$0.08 on the built-in network, where research pockets themselves have cent caps (Research data HK$0.40). */
export const isTightCap = (cap: bigint, sellerIds: string[]) => cap <= (onServer(sellerIds) ? 1_500_000n : 80_000n);

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
    cap: parseHkd(v.cap),
    askAbove: v.askAbove === "never" ? NEVER : parseHkd(v.askAbove),
    expiresAt: expiryFor(v.lifetime, now),
    sellers: v.sellers.map((s) => {
      if (!payTo[s]) throw new Error(`unknown seller ${s}`);
      return payTo[s];
    }),
    budget: parseHkd(v.budget),
  };
}
