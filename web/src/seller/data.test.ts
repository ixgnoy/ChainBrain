import { it, expect } from "vitest";
import { salesFor, summarise, sellerReason, buyerTag } from "./data";
import type { WalletEvent } from "../lib/events";

const P1 = "0x0D2375E4D8016Bd27476B8Ec9410eD8015DD0A71";
const P2 = "0xBfDe000000000000000000000000000000001Ce1";
const ev = (e: Partial<WalletEvent>): WalletEvent => ({ type: "trace", at: 1000, ...e }) as WalletEvent;

const events: WalletEvent[] = [
  ev({ type: "payment", pocket: P1, sellerId: "datalite", sku: "durian-report", amount: "300000", tx: "0xaa", at: 1000 }),
  ev({ type: "payment", pocket: P2, sellerId: "datapro", sku: "premium-report", amount: "1500000", cosigned: true, at: 2000 }),
  ev({ type: "refusal", pocket: P1, sellerId: "datalite", sku: "fruit-trade-report", amount: "350000", reason: "POCKET_REVOKED", at: 3000 }),
  ev({ type: "payment", pocket: P2, sellerId: "datalite", sku: "durian-report", amount: "300000", at: 4000 }),
  ev({ type: "disclosure", pocket: P1, sellerId: "shadyfeed", asked: ["owner_email"], refused: ["DISCLOSURE_REFUSED", "SIGNATURE_TYPE_NOT_ALLOWED"], at: 5000 }),
];

it("keeps only this seller's rows, newest first", () => {
  const rows = salesFor(events, "datalite");
  expect(rows.map((r) => r.at)).toEqual([4000, 3000, 1000]);
  expect(rows[1]).toMatchObject({ outcome: "refused", why: "The buyer stopped their agent", reasons: ["POCKET_REVOKED"] });
});

it("counts a refused data request as a refused sale for that seller", () => {
  const rows = salesFor(events, "ShadyFeed");
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ outcome: "refused", why: "You asked for buyer data; the wallet refused" });
});

it("summarises earnings, buyers and the average sale", () => {
  const s = summarise(salesFor(events, "datalite"));
  expect(s).toEqual({ earned: 600000n, paid: 2, refused: 1, buyers: 2, average: 300000n });
  expect(summarise([])).toEqual({ earned: 0n, paid: 0, refused: 0, buyers: 0, average: 0n });
});

it("explains unknown or missing codes generically and tags buyers by pocket", () => {
  expect(sellerReason(["SOMETHING_NEW"])).toBe("Refused by the buyer's wallet");
  expect(sellerReason([])).toBe("Refused by the buyer's wallet");
  expect(buyerTag(P1)).toBe("0A71");
});
