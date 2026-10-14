// Built-in sample data, shown when the wallet API cannot be reached at start (and replaced by live data once it can).
// No React Native imports: Node tests load this file. Everything is relative to `now` so the dates always look current.
import type { Address } from "viem";
import { NEVER, type Config } from "./shared";
import type { WalletEvent } from "./events";
import type { PocketView } from "./wallet";

const A = (n: number) => `0x${n.toString(16).padStart(40, "0")}` as Address;
export const DEMO_OWNER = A(0xd0d0);
const RESEARCH = A(0xa1a1), ONE = A(0xb2b2);
const HOUR = 3_600_000, MIN = 60_000;

export type DemoPocket = PocketView & { name: string; style: "research" | "gifts" | "tight" | "custom"; owned: boolean };
export type DemoTurn = { id: string; pocket: string; text: string; fromAt: number; toAt?: number; reply?: string; done: boolean };

const SELLERS: Config["sellers"] = [
  { id: "datalite", name: "DataLite", category: "Market data", payTo: A(0x1111), items: [{ sku: "durian-report", description: "Durian export report", price: "0.30" }] },
  { id: "datapro", name: "DataPro", category: "Market data", payTo: A(0x2222), items: [{ sku: "durian-pro", description: "Durian export report, full edition", price: "1.50" }] },
  { id: "harbour", name: "Harbour Wines", category: "Wine", payTo: A(0x3333), items: [{ sku: "red-case", description: "Case of red wine", price: "0.20" }] },
];

export function makeDemo(now = Date.now()) {
  const tonight = new Date(now); tonight.setHours(23, 59, 0, 0);
  const cfg: Config = { agent: A(0xa9e7), factory: A(0xfac7), usdc: A(0x05dc), sellersUrl: "", sellers: SELLERS, abis: { pocket: [], factory: [], erc20: [] } };
  const pockets: DemoPocket[] = [
    { address: RESEARCH, owner: DEMO_OWNER, agent: cfg.agent, cap: 2_000_000n, askAbove: 1_000_000n, expiresAt: BigInt(Math.floor(tonight.getTime() / 1000)), revoked: false, balance: 3_200_000n, allowed: ["datalite", "datapro"], name: "Research data", style: "research", owned: true },
    { address: ONE, owner: DEMO_OWNER, agent: cfg.agent, cap: 300_000n, askAbove: NEVER, expiresAt: BigInt(Math.floor((now + 20 * HOUR) / 1000)), revoked: false, balance: 200_000n, allowed: ["datalite"], name: "One purchase", style: "tight", owned: true },
  ];
  const t = (ms: number) => now - ms;
  const intent = (at: number, id: string, text: string) => ({ type: "intent", pocket: RESEARCH, at, approval: { id, pocket: RESEARCH, kind: "intent", status: "approved", text, data: { intentHash: "0xd3m0" } } }) as WalletEvent;
  const events: WalletEvent[] = [
    // earlier today: the first task, DataLite paid by itself
    { type: "trace", pocket: RESEARCH, at: t(4 * HOUR + 12 * MIN), phase: "tool_call", tool: "search_sellers" },
    { type: "trace", pocket: RESEARCH, at: t(4 * HOUR + 12 * MIN - 800), phase: "tool_result", tool: "search_sellers", result: { ok: true, sellers: [{}, {}, {}] } },
    intent(t(4 * HOUR + 10 * MIN), "i1", "Buy: DataLite durian export report\nPrice: up to US$1.00\nDeadline: tonight"),
    { type: "trace", pocket: RESEARCH, at: t(4 * HOUR + 9 * MIN), phase: "tool_call", tool: "get_quote" },
    { type: "trace", pocket: RESEARCH, at: t(4 * HOUR + 9 * MIN - 700), phase: "tool_result", tool: "get_quote", result: { ok: true, sellerId: "datalite", sku: "durian-report", price: "0.30" } },
    { type: "payment", pocket: RESEARCH, at: t(4 * HOUR + 8 * MIN), sellerId: "datalite", sku: "durian-report", amount: "300000", tx: "0xd3a0000000000000000000000000000000000000000000000000000000000001" },
    { type: "trace", pocket: RESEARCH, at: t(4 * HOUR + 7 * MIN), phase: "reply", text: "Done. I bought the DataLite durian export report for US$0.30. It is saved to your pocket history." },
    // a bigger purchase that needed the owner's co-signature
    { type: "approval", pocket: RESEARCH, at: t(2 * HOUR + 30 * MIN), approval: { id: "p1", pocket: RESEARCH, kind: "payment", status: "approved", text: "The full edition has the port-by-port breakdown you asked for.", data: { sellerId: "datapro", sku: "durian-pro", description: "Durian export report, full edition", amount: "1.50" } } },
    { type: "payment", pocket: RESEARCH, at: t(2 * HOUR + 29 * MIN), sellerId: "datapro", sku: "durian-pro", amount: "1500000", cosigned: true, tx: "0xd3a0000000000000000000000000000000000000000000000000000000000002" },
    { type: "trace", pocket: RESEARCH, at: t(2 * HOUR + 28 * MIN), phase: "reply", text: "Bought the DataPro full edition for US$1.50 after you approved it." },
    // a refused purchase
    { type: "refusal", pocket: RESEARCH, at: t(HOUR + 5 * MIN), sellerId: "harbour", sku: "red-case", amount: "200000", reason: "SELLER_NOT_ALLOWED" },
    { type: "trace", pocket: RESEARCH, at: t(HOUR + 4 * MIN), phase: "reply", text: "Harbour Wines is not on your list of sellers, so I did not pay it." },
    // yesterday, the other pocket
    { type: "payment", pocket: ONE, at: t(26 * HOUR), sellerId: "datalite", sku: "durian-report", amount: "300000", tx: "0xd3a0000000000000000000000000000000000000000000000000000000000003" },
  ];
  const turns: DemoTurn[] = [
    { id: "d1", pocket: RESEARCH.toLowerCase(), text: "Buy the DataLite durian report. Max US$1, by tonight.", fromAt: t(4 * HOUR + 13 * MIN), toAt: t(2 * HOUR + 40 * MIN), reply: "Done. I bought the DataLite durian export report for US$0.30. It is saved to your pocket history.", done: true },
    { id: "d2", pocket: RESEARCH.toLowerCase(), text: "Now get the full DataPro edition too.", fromAt: t(2 * HOUR + 40 * MIN), toAt: t(HOUR + 30 * MIN), reply: "Bought the DataPro full edition for US$1.50 after you approved it.", done: true },
    { id: "d3", pocket: RESEARCH.toLowerCase(), text: "Order a case of red wine from Harbour Wines.", fromAt: t(HOUR + 30 * MIN), reply: "Harbour Wines is not on your list of sellers, so I did not pay it. You can add it to this pocket if you want it.", done: true },
  ];
  return { cfg, pockets, events, turns, balances: { usdc: 15_000_000n, eth: 10n ** 18n }, owner: DEMO_OWNER };
}
