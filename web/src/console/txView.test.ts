import { expect, it } from "vitest";
import { txEvidence, txSummary } from "./txView";
import type { TxDetail } from "./network";

const base = { hash: "0x1", pocket: "0xp", status: "success" } as unknown as TxDetail;
const who = (a?: string) => (a === "0xs" ? "DataLite" : a ?? "–");
const name = () => "Research data";

it("summarises each kind of transaction in a sentence", () => {
  expect(txSummary({ ...base, label: "Agent payment", to: "0xs", amount: 300_000n }, who, name)).toBe("Research data paid DataLite US$0.30.");
  expect(txSummary({ ...base, label: "Funded", from: "0xs", amount: 5_000_000n }, who, name)).toBe("DataLite added US$5.00 to Research data.");
  expect(txSummary({ ...base, label: "Blocked transfer", status: "reverted" }, who, name)).toMatch(/no money moved/);
  expect(txSummary({ ...base, label: "Transaction", status: "pending" }, who, name)).toMatch(/not arrived/);
});

it("gives evidence only where the pocket's rules decided", () => {
  expect(txEvidence({ ...base, label: "Blocked transfer", status: "reverted" })?.title).toBe("Why it was refused");
  expect(txEvidence({ ...base, label: "Agent payment" })?.title).toBe("What the pocket checked");
  expect(txEvidence({ ...base, label: "Funded" })).toBeUndefined();
});
