// Built-in sample data, shown when the wallet API cannot be reached. Same shapes as GET /api/config and the event stream.
import type { Config } from "../shared";
import type { WalletEvent } from "../lib/events";

export const DEMO_CONFIG: Config = {
  agent: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  factory: "0x0000000000000000000000000000000000000000",
  usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  sellersUrl: "",
  abis: { pocket: [], factory: [], erc20: [] },
  sellers: [
    { id: "datalite", name: "DataLite", category: "Research data", payTo: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", items: [
      { sku: "durian-report", description: "Durian exports to China, 2025 market report", price: "0.30" },
      { sku: "fruit-trade-report", description: "SE Asia fruit trade report 2025", price: "0.35" }] },
    { id: "datapro", name: "DataPro", category: "Research data", payTo: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", items: [
      { sku: "premium-report", description: "Durian exports premium report with 2026 forecast", price: "1.50" }] },
    { id: "harbour-wines", name: "Harbour Wines", category: "Food and drink", payTo: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", items: [
      { sku: "fruit-wine-trade-report", description: "Fruit and wine trade report", price: "0.40" }] },
    { id: "shadyfeed", name: "ShadyFeed", category: "Research data", payTo: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc", items: [
      { sku: "preview", description: "Free durian price preview", price: null }] },
  ],
};

const A = "0x0D2375E4D8016Bd27476B8Ec9410eD8015DD0A71";
const B = "0x8A1f5b3C9e07D4a2b6E1c3F5d7A9b1C3e5F71Ce1";
const C = "0x41c2E7d9B5a3F1e8C6d4B2a0F8e6D4c2B0a85E07";

/** A plausible afternoon of agent purchases, timed relative to `now`. */
export function demoEvents(now = Date.now()): WalletEvent[] {
  const m = (min: number) => now - min * 60_000;
  return [
    { type: "payment", pocket: C, sellerId: "datalite", sku: "fruit-trade-report", amount: "350000", tx: "0x" + "c3".repeat(32), cosigned: false, at: m(300) },
    { type: "payment", pocket: A, sellerId: "datalite", sku: "durian-report", amount: "300000", tx: "0x" + "a1".repeat(32), cosigned: false, at: m(95) },
    { type: "payment", pocket: A, sellerId: "datapro", sku: "premium-report", amount: "1500000", tx: "0x" + "b2".repeat(32), cosigned: true, at: m(92) },
    { type: "refusal", pocket: A, sellerId: "harbour-wines", sku: "fruit-wine-trade-report", amount: "400000", reason: "SELLER_NOT_ALLOWED", at: m(70) },
    { type: "disclosure", pocket: B, sellerId: "shadyfeed", sku: "preview", asked: ["owner_full_name", "owner_email", "wallet_history"], refused: ["DISCLOSURE_REFUSED", "SIGNATURE_TYPE_NOT_ALLOWED"], signRequest: true, at: m(55) },
    { type: "payment", pocket: B, sellerId: "datalite", sku: "durian-report", amount: "300000", tx: "0x" + "d4".repeat(32), cosigned: false, at: m(41) },
    { type: "refusal", pocket: B, sellerId: "datalite", sku: "fruit-trade-report", amount: "350000", reason: "POCKET_REVOKED", at: m(39) },
    { type: "refusal", pocket: C, sellerId: "datapro", sku: "premium-report", amount: "1500000", reason: "OVER_CAP", at: m(12) },
    { type: "payment", pocket: C, sellerId: "datalite", sku: "durian-report", amount: "300000", tx: "0x" + "e5".repeat(32), cosigned: false, at: m(6) },
  ];
}
