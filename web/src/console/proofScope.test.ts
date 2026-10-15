import { expect, it } from "vitest";
import { PRESENTER } from "@sim/autopilot";
import { horizon, proofPockets } from "./proofScope";

const P = (owner: string, address: string) => ({ owner, address }) as any;
it("scopes to the phone, else the presenter's pockets, else everything", () => {
  const pockets = [P(PRESENTER, "0xa"), P("0xother", "0xb")];
  expect(proofPockets({ linked: true, builtin: true, phonePockets: ["0xz"], pockets })).toEqual(["0xz"]);
  expect(proofPockets({ linked: false, builtin: true, phonePockets: [], pockets })).toEqual(["0xa"]);
  expect(proofPockets({ linked: false, builtin: false, phonePockets: [], pockets })).toBeUndefined();
});
it("the horizon is just past the newest event or transaction in scope", () => {
  const ev = [{ pocket: "0xA", at: 10 }, { pocket: "0xb", at: 99 }];
  expect(horizon(ev, [{ pocket: "0xa" as any, at: 20 }], ["0xa"])).toBe(21);
  expect(horizon([], [])).toBe(0);
});
