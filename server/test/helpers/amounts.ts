import { parseAmount, formatAmount } from "../../src/wallet/money";

/** The demo price sheet and pockets per chain, so one test suite runs on both (CHAIN=fisco default | base-sepolia). */
const T = {
  fisco: { cur: "HK$", budget: "40", cap: "15", ask: "8", durian: "2.30", fruit: "2.70", premium: "11.70", harbour: "3.10", tight: "1.50", perItem: "15.00", total: "30.00", one: "3.50", two: "7.00", low: "8.00",
    // DataPro haggle (list premium, floor 8.60): offer, counter, offer, final counter = floor, saved, an offer above list
    hag: { o1: "7.00", c1: "9.35", o2: "7.40", c2: "8.60", saved: "3.10", over: "12.00" } },
  "base-sepolia": { cur: "US$", budget: "5", cap: "2", ask: "1", durian: "0.30", fruit: "0.35", premium: "1.50", harbour: "0.40", tight: "0.20", perItem: "2.00", total: "4.00", one: "1.00", two: "2.00", low: "1.00",
    hag: { o1: "0.90", c1: "1.20", o2: "1.05", c2: "1.10", saved: "0.40", over: "1.60" } },
};
export const $ = T[process.env.CHAIN === "base-sepolia" ? "base-sepolia" : "fisco"];
/** atomic units of a sheet amount */
export const atom = (s: string) => parseAmount(s);
/** how the tools print an amount */
export const f = (s: string | bigint) => formatAmount(typeof s === "bigint" ? s : parseAmount(s));
