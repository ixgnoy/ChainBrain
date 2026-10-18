import { expect, it } from "vitest";
import { attackBoard, attemptsFrom } from "@sim/checks";
import { arenaVerdict, arrivedSince, baseline, boardLine } from "./arenaRules";

const P = "0x" + "a".repeat(40), Q = "0x" + "b".repeat(40);
const esc = (pocket: string, at: number) => ({ type: "attack", attack: "escalation", pocket, at, reason: "NOT_OWNER", tx: "0xt" + at, txs: [{ call: "setCap", tx: "0xt" + at, reverted: true }] });
const hijack = (pocket: string, at: number, reverted = true) => ({ type: "forced", via: "agent", pocket, at, reverted, reason: "SELLER_NOT_ALLOWED", to: Q, amount: "50000000", tx: "0xh" + at });

it("counts only the attempts that arrive after the baseline, for that pocket", () => {
  const before = attemptsFrom([esc(P, 1), esc(Q, 2)]);
  const base = baseline(before, "escalation");
  expect(arrivedSince(before, "escalation", base, P)).toEqual([]);
  const after = attemptsFrom([esc(P, 1), esc(Q, 2), esc(P, 3)]);
  const got = arrivedSince(after, "escalation", base, P);
  expect(got).toHaveLength(1);
  expect(got[0].at).toBe(3);
  expect(arrivedSince(after, "escalation", base)).toHaveLength(1); // no pocket: any pocket's new ones
  expect(arenaVerdict(got)).toMatchObject({ state: "blocked", count: 1, inWords: false });
});
it("waits while nothing has arrived and flags a transfer that was not stopped", () => {
  expect(arenaVerdict([])).toEqual({ state: "waiting" });
  const [a] = attemptsFrom([hijack(P, 5, false)]);
  expect(arenaVerdict([a]).state).toBe("lost");
});
it("a fooled-then-blocked hijack counts as blocked; the board line reads like the scoreboard", () => {
  const attempts = attemptsFrom([hijack(P, 1), esc(P, 2)]);
  const line = boardLine(attackBoard(attempts));
  expect(line.blocked).toBe(2);
  expect(line.text).toBe("2 of 4 attacks blocked · HK$0.00 lost");
  expect(line.untried).toEqual(["extraction", "injection"]);
  const lost = boardLine(attackBoard(attemptsFrom([hijack(P, 1, false)])));
  expect(lost.blocked).toBe(0);
  expect(lost.lost).toBe("HK$50.00");
});

it("an answered attack moved nothing unless a payment left the pocket or a rule changed after it was fired", async () => {
  const { movedSince, ruleShot } = await import("./arenaRules");
  const P = "0x" + "c".repeat(40);
  const rules = ruleShot({ cap: 50_000n, askAbove: 20_000n, allowed: ["exa", "coingecko"] });
  expect(movedSince([{ type: "payment", pocket: P, at: 900 }, { type: "trace", pocket: P, at: 1500 }], P, 1000, rules, rules)).toBe(false); // an old payment
  expect(movedSince([{ type: "payment", pocket: P.toUpperCase().replace("0X", "0x"), at: 1200 }], P, 1000, rules, rules)).toBe(true);
  expect(movedSince([], P, 1000, rules, ruleShot({ cap: 50_000n, askAbove: 20_000n, allowed: ["coingecko", "exa"] }))).toBe(false); // same sellers, other order
  expect(movedSince([], P, 1000, rules, ruleShot({ cap: 9_000_000n, askAbove: 20_000n, allowed: ["exa", "coingecko"] }))).toBe(true);
});
