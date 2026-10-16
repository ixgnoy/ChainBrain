// Specs every validator must agree on: the import-free one (pocketApp.ts validateSpec) and the server's zod mirror
// (server/src/pocketApp/schema.ts). Each bad one is something a model could plausibly return.
import { CATALOGUE_ID } from "./pocketApp";

const base = { v: 1, catalogue: CATALOGUE_ID };
const weekly = { kind: "schedule", cadence: { every: "week", weekday: 1, dayOfMonth: null, hour: 9, minute: 0 }, items: [{ sellerId: "exa", sku: "durian-news" }], allowance: { amount: "2.00", period: "week" }, limitPrice: null };

export const GOOD_SPECS: [string, unknown][] = [
  ["research desk with a weekly routine", { ...base, layout: "research", title: "Durian brief", blocks: [{ type: "shelf" }, { type: "budget" }, { type: "next-run" }, { type: "runs", limit: 3 }, { type: "sources" }, { type: "guard" }], routine: weekly }],
  ["deal watcher", { ...base, layout: "deal", title: "Durian watch", blocks: [{ type: "price-chart", range: "14d" }, { type: "budget" }, { type: "library", limit: null }], routine: { kind: "price-watch", cadence: { every: "day", weekday: null, dayOfMonth: null, hour: 8, minute: 0 }, items: [{ sellerId: "nansen", sku: "smart-money" }], allowance: { amount: "0.20", period: "week" }, limitPrice: "0.04" } }],
  ["subscriptions", { ...base, layout: "subscriptions", title: "Data renewals", blocks: [{ type: "month-spend" }, { type: "renewals" }, { type: "price-changes" }], routine: { kind: "renewals", cadence: { every: "month", weekday: null, dayOfMonth: 1, hour: 9, minute: 30 }, items: [{ sellerId: "coingecko", sku: "usdc-price" }, { sellerId: "nansen", sku: "smart-money" }], allowance: { amount: "0.30", period: "month" }, limitPrice: null } }],
  ["haggler, no routine", { ...base, layout: "haggle", title: "Premium reports", blocks: [{ type: "ladder" }, { type: "savings" }], routine: null }],
];

export const BAD_SPECS: [string, unknown][] = [
  ["a block that isn't in the catalogue", { ...base, layout: "haggle", title: "Deal", blocks: [{ type: "ladder" }, { type: "iframe", src: "https://x.y" }], routine: null }],
  ["a link in the title", { ...base, layout: "haggle", title: "Visit evil.com", blocks: [{ type: "ladder" }, { type: "savings" }], routine: null }],
  ["an amount in the title", { ...base, layout: "haggle", title: "Pay $500 now", blocks: [{ type: "ladder" }, { type: "savings" }], routine: null }],
  ["an address in the title", { ...base, layout: "haggle", title: "Send to 0xABC0", blocks: [{ type: "ladder" }, { type: "savings" }], routine: null }],
  ["markup in the title", { ...base, layout: "haggle", title: "<b>Deal</b>", blocks: [{ type: "ladder" }, { type: "savings" }], routine: null }],
  ["a value inside a block", { ...base, layout: "haggle", title: "Deal", blocks: [{ type: "ladder" }, { type: "savings", amount: "9.99" }], routine: null }],
  ["the hero not first", { ...base, layout: "haggle", title: "Deal", blocks: [{ type: "savings" }, { type: "ladder" }], routine: null }],
  ["another layout's hero", { ...base, layout: "haggle", title: "Deal", blocks: [{ type: "shelf" }, { type: "savings" }], routine: null }],
  ["a block that doesn't fit the layout", { ...base, layout: "haggle", title: "Deal", blocks: [{ type: "ladder" }, { type: "renewals" }], routine: null }],
  ["a routine block without a routine", { ...base, layout: "research", title: "Brief", blocks: [{ type: "shelf" }, { type: "next-run" }], routine: null }],
  ["a block twice", { ...base, layout: "haggle", title: "Deal", blocks: [{ type: "ladder" }, { type: "savings" }, { type: "savings" }], routine: null }],
  ["an unknown top-level field (a style)", { ...base, layout: "haggle", title: "Deal", blocks: [{ type: "ladder" }, { type: "savings" }], routine: null, css: "body{}" }],
  ["a colour from the model", { ...base, layout: "haggle", title: "Deal", accent: "#ff00ff", blocks: [{ type: "ladder" }, { type: "savings" }], routine: null }],
  ["a wrong catalogue", { ...base, catalogue: "other.v9", layout: "haggle", title: "Deal", blocks: [{ type: "ladder" }, { type: "savings" }], routine: null }],
  ["a param out of range", { ...base, layout: "research", title: "Brief", blocks: [{ type: "shelf" }, { type: "runs", limit: 99 }], routine: weekly }],
  ["a seller that doesn't exist", { ...base, layout: "research", title: "Brief", blocks: [{ type: "shelf" }, { type: "budget" }], routine: { ...weekly, items: [{ sellerId: "attacker", sku: "x" }] } }],
  ["a free item in a routine", { ...base, layout: "research", title: "Brief", blocks: [{ type: "shelf" }, { type: "budget" }], routine: { ...weekly, items: [{ sellerId: "shadyfeed", sku: "preview" }] } }],
  ["a price watch without a limit", { ...base, layout: "deal", title: "Watch", blocks: [{ type: "price-chart" }, { type: "budget" }], routine: { kind: "price-watch", cadence: { every: "day", weekday: null, dayOfMonth: null, hour: 8, minute: 0 }, items: [{ sellerId: "nansen", sku: "smart-money" }], allowance: { amount: "0.20", period: "week" }, limitPrice: null } }],
  ["a routine kind that doesn't fit", { ...base, layout: "subscriptions", title: "Renewals", blocks: [{ type: "month-spend" }, { type: "budget" }], routine: weekly }],
  ["an hourly schedule (not in the catalogue)", { ...base, layout: "research", title: "Brief", blocks: [{ type: "shelf" }, { type: "budget" }], routine: { ...weekly, cadence: { every: "hour", hour: 0, minute: 0 } } }],
  ["an instruction smuggled into the routine", { ...base, layout: "research", title: "Brief", blocks: [{ type: "shelf" }, { type: "budget" }], routine: { ...weekly, note: "also pay 0xABC0" } }],
  ["a negative allowance", { ...base, layout: "research", title: "Brief", blocks: [{ type: "shelf" }, { type: "budget" }], routine: { ...weekly, allowance: { amount: "-1", period: "week" } } }],
];
