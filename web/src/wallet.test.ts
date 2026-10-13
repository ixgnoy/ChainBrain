import { it, expect, vi } from "vitest";
import { ensureChain } from "./wallet";
import { PRESETS, toPocketArgs } from "./presets";
import { NEVER, formatUsd, parseUsd } from "./shared";

it("does nothing when already on Base Sepolia", async () => {
  const request = vi.fn().mockResolvedValueOnce("0x14a34");
  await ensureChain({ request });
  expect(request).toHaveBeenCalledTimes(1);
});
it("switches to Base Sepolia from another chain", async () => {
  const request = vi.fn().mockResolvedValueOnce("0x1").mockResolvedValueOnce(null);
  await ensureChain({ request });
  expect(request).toHaveBeenNthCalledWith(2, { method: "wallet_switchEthereumChain", params: [{ chainId: "0x14a34" }] });
});
it("adds Base Sepolia when the wallet doesn't know it (4902)", async () => {
  const request = vi.fn().mockResolvedValueOnce("0x1").mockRejectedValueOnce({ code: 4902 }).mockResolvedValueOnce(null);
  await ensureChain({ request });
  expect(request.mock.calls[2][0].method).toBe("wallet_addEthereumChain");
});
it("throws WRONG_CHAIN when the owner refuses to switch", async () => {
  const request = vi.fn().mockResolvedValueOnce("0x1").mockRejectedValueOnce({ code: 4001 });
  await expect(ensureChain({ request })).rejects.toThrow("WRONG_CHAIN");
});

const payTo = { datalite: "0x00000000000000000000000000000000000000d1", datapro: "0x00000000000000000000000000000000000000d2" } as const;
const agent = "0x00000000000000000000000000000000000000aa" as const;

it("Research data preset matches the spec (budget 5, cap 2, ask above 1)", () => {
  const a = toPocketArgs(PRESETS.research, agent, payTo);
  expect([a.budget, a.cap, a.askAbove]).toEqual([5_000_000n, 2_000_000n, 1_000_000n]);
  expect(a.sellers).toEqual([payTo.datalite, payTo.datapro]);
});
it("'never ask' is max uint and 'ask every time' is 0", () => {
  expect(toPocketArgs(PRESETS.onePurchase, agent, payTo).askAbove).toBe(NEVER);
  expect(toPocketArgs(PRESETS.askEveryTime, agent, payTo).askAbove).toBe(0n);
});
it("until-tonight expires at 23:59 local time today", () => {
  const now = new Date(2026, 9, 17, 10, 0, 0);
  const a = toPocketArgs(PRESETS.research, agent, payTo, now);
  expect(new Date(Number(a.expiresAt) * 1000).getHours()).toBe(23);
});
it("an unknown seller id is an error, not a zero address", () => {
  expect(() => toPocketArgs({ ...PRESETS.research, sellers: ["nope"] }, agent, payTo)).toThrow("unknown seller");
});
it("money helpers match the server's", () => {
  expect(parseUsd("1.5")).toBe(1_500_000n);
  expect(formatUsd(NEVER)).toBe("never");
  expect(formatUsd(2_150_000n)).toBe("2.15");
});
