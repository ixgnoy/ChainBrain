import type { Address } from "viem";
import { parseUsd, NEVER } from "./shared";

export type Lifetime = "one-task" | "until-tonight" | "ongoing";
export type PresetValues = { label: string; budget: string; sellers: string[]; cap: string; askAbove: string; lifetime: Lifetime };

// Spec "Presets" (same values as web/src/presets.ts). askAbove "never" = max uint, "0" = ask every time.
export const PRESETS: Record<"research" | "onePurchase" | "askEveryTime", PresetValues> = {
  research: { label: "Research data", budget: "5", sellers: ["datalite", "datapro"], cap: "2", askAbove: "1", lifetime: "until-tonight" },
  onePurchase: { label: "One purchase", budget: "0.30", sellers: ["datalite"], cap: "0.30", askAbove: "never", lifetime: "one-task" },
  askEveryTime: { label: "Ask every time", budget: "5", sellers: ["datalite", "datapro"], cap: "2", askAbove: "0", lifetime: "ongoing" },
};

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
