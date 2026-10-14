// A lived-in starting point: the owner's wallet already holds test USDC and two pockets, and the agent did real work
// earlier today (bought, asked for a co-signature, was refused and re-planned). Everything is produced by running the
// same scenes through the world on a clock set back in time, so balances, hashes, events and activity all agree.
import { CATALOG } from "./catalog";
import type { Hex } from "./types";
import { NEVER, parseUsd } from "./util";
import { SIM_AGENT, type World } from "./world";

export type SeededPocket = { address: Hex; name: string; style: "research" | "gifts" | "tight" | "custom" };
export type OwnerTxSeed = { pocket: Hex; kind: "create" | "fund"; hash: Hex; amount?: string; at: number };

const MIN = 60_000, HOUR = 60 * MIN;
const payTo = (...ids: string[]) => CATALOG.filter((s) => ids.includes(s.id)).map((s) => s.payTo);
const tonight = (now: number) => { const d = new Date(now); d.setHours(23, 59, 0, 0); return BigInt(Math.floor(d.getTime() / 1000)); };

export async function seedOwner(w: World, owner: Hex, o: { startUsdc?: string } = {}): Promise<{ pockets: SeededPocket[]; ownerTxs: OwnerTxSeed[] }> {
  const ownerTxs: OwnerTxSeed[] = [];
  w.chain.mint(owner, parseUsd(o.startUsdc ?? "60.00"), 2n * 10n ** 17n);
  w.autoOwner(owner, true);
  const now = w.now();

  // Research data: US$5, cap US$2, ask above US$1, DataLite and DataPro, until 23:59 tonight
  const research = await w.past(4 * HOUR + 30 * MIN, async () => {
    const t = w.now();
    const { pocket, tx } = w.chain.createPocket(owner, { agent: SIM_AGENT, cap: parseUsd("2"), askAbove: parseUsd("1"), expiresAt: tonight(now), sellers: payTo("datalite", "datapro") }, t);
    ownerTxs.push({ pocket, kind: "create", hash: tx, at: t });
    const f = w.chain.transfer(owner, pocket, parseUsd("5"), t + 40_000);
    ownerTxs.push({ pocket, kind: "fund", hash: f, amount: "5000000", at: t + 40_000 });
    return pocket;
  });
  await w.past(4 * HOUR + 26 * MIN, () => w.chat(research, "Get me a market report on durian exports, under US$2, by tonight."));
  await w.past(4 * HOUR + 24 * MIN, () => w.chat(research, "Per report. Get the premium one too if it adds a forecast."));
  await w.past(70 * MIN, () => w.chat(research, "Buy Harbour Wines' fruit and wine trade report. Max US$1, by tonight. Confirmed, go ahead."));

  // One purchase: the tight pocket for the dead-end scene (US$0.20, cap US$0.20, never ask, DataLite only)
  const tight = await w.past(18 * MIN, async () => {
    const t = w.now();
    const { pocket, tx } = w.chain.createPocket(owner, { agent: SIM_AGENT, cap: parseUsd("0.20"), askAbove: NEVER, expiresAt: BigInt(Math.floor((now + 20 * HOUR) / 1000)), sellers: payTo("datalite") }, t);
    ownerTxs.push({ pocket, kind: "create", hash: tx, at: t });
    const f = w.chain.transfer(owner, pocket, parseUsd("0.20"), t + 35_000);
    ownerTxs.push({ pocket, kind: "fund", hash: f, amount: "200000", at: t + 35_000 });
    return pocket;
  });

  w.autoOwner(owner, false);
  return {
    pockets: [{ address: research, name: "Research data", style: "research" }, { address: tight, name: "One purchase", style: "tight" }],
    ownerTxs,
  };
}
