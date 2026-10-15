import { parseAmount, formatAmount } from "../../src/wallet/money";

/** The demo price sheet and pockets per chain, so one test suite runs on both (CHAIN=fisco default | base-sepolia). */
const T = {
  fisco: { cur: "HK$", budget: "40", cap: "15", ask: "8", durian: "2.30", fruit: "2.70", premium: "11.70", harbour: "3.10", tight: "1.50", perItem: "15.00", total: "30.00", one: "3.50", two: "7.00", low: "8.00" },
  "base-sepolia": { cur: "US$", budget: "5", cap: "2", ask: "1", durian: "0.30", fruit: "0.35", premium: "1.50", harbour: "0.40", tight: "0.20", perItem: "2.00", total: "4.00", one: "1.00", two: "2.00", low: "1.00" },
};
export const $ = T[process.env.CHAIN === "base-sepolia" ? "base-sepolia" : "fisco"];
/** atomic units of a sheet amount */
export const atom = (s: string) => parseAmount(s);
/** how the tools print an amount */
export const f = (s: string | bigint) => formatAmount(typeof s === "bigint" ? s : parseAmount(s));
