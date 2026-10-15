// A lived-in starting point: two weeks of real activity, produced by running the same plans through the world on a clock
// set back in time, so balances, hashes, events, charts and activity all agree. Every number the apps show is computed
// from what this seed (and the user) did; nothing is typed in.
//
//   Research data   held by ChainBrain (in-app chat)   since 14 days ago, the pocket of scenes 1-7
//   Market news     held by Claude (connected 12 days ago), cap US$2, ask above US$0.50
//   Trade quotes    held by ChatGPT (connected 9 days ago), cap US$0.50, never asks
//   One purchase    held by ChainBrain, created 18 minutes ago for the dead-end scene (8)
//
// History must be published oldest first (event times and block numbers only go up), so it comes in two phases: days
// back (seedOwnerHistory) and today (seedOwnerToday). seedOwner runs both; the console's autopilot interleaves other
// owners' activity between them.
import { CATALOG } from "./catalog";
import { CHATGPT_AGENT, CLAUDE_AGENT, SIM_AGENT, buy, errand, type AgentId } from "./agents";
import type { Scene } from "./script";
import type { Hex } from "./types";
import { NEVER, parseUsd, tonightMs } from "./util";
import type { World } from "./world";

export type SeededPocket = { address: Hex; name: string; style: "research" | "gifts" | "tight" | "custom"; agent?: AgentId };
export type OwnerTxSeed = { pocket: Hex; kind: "create" | "fund"; hash: Hex; amount?: string; at: number };
export type Seeded = { pockets: SeededPocket[]; ownerTxs: OwnerTxSeed[] };

const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const payTo = (...ids: string[]) => CATALOG.filter((s) => ids.includes(s.id)).map((s) => s.payTo);
const tonight = (now: number) => BigInt(Math.floor(tonightMs(now) / 1000));
const inDays = (now: number, d: number) => BigInt(Math.floor((now + d * DAY) / 1000));

/** The whole seed: two weeks back, then today. Main wallet ends at US$54.80. */
export async function seedOwner(w: World, owner: Hex, o: { startUsdc?: string } = {}): Promise<Seeded> {
  const s = await seedOwnerHistory(w, owner, o);
  return seedOwnerToday(w, owner, s);
}

/** Runs `f` with the owner's approvals answered by the world (seeding only), then hands them back to the owner. */
async function asOwner<T>(w: World, owner: Hex, f: () => Promise<T>): Promise<T> {
  w.autoOwner(owner, true);
  try { return await f(); } finally { w.autoOwner(owner, false); } // never answered for them after seeding
}

export async function seedOwnerHistory(w: World, owner: Hex, o: { startUsdc?: string } = {}): Promise<Seeded> {
  const ownerTxs: OwnerTxSeed[] = [];
  const now = w.now();
  w.chain.mint(owner, parseUsd(o.startUsdc ?? "81.00"), 2n * 10n ** 17n);
  const create = (_name: string, agent: Hex, cap: string, ask: string | null, sellers: string[], expiresAt: bigint, fund: string) => {
    const t = w.now();
    const { pocket, tx } = w.chain.createPocket(owner, { agent, cap: parseUsd(cap), askAbove: ask === null ? NEVER : parseUsd(ask), expiresAt, sellers: payTo(...sellers) }, t);
    ownerTxs.push({ pocket, kind: "create", hash: tx, at: t });
    const f = w.chain.transfer(owner, pocket, parseUsd(fund), t + 40_000);
    ownerTxs.push({ pocket, kind: "fund", hash: f, amount: parseUsd(fund).toString(), at: t + 40_000 });
    return pocket;
  };
  const at = <T>(msAgo: number, f: () => Promise<T>) => w.past(msAgo, f);
  const chat = (msAgo: number, pocket: Hex, text: string) => at(msAgo, () => w.chat(pocket, text));
  const act = (msAgo: number, id: AgentId, pocket: Hex, plan: Scene) => at(msAgo, () => w.act(id, pocket, plan));

  return asOwner(w, owner, async () => {
    // Research data: ChainBrain's pocket. Cap US$2, ask above US$1, DataLite and DataPro, until 23:59 tonight.
    const research = await at(14 * DAY - 2 * HOUR, async () => create("Research data", SIM_AGENT, "2", "1", ["datalite", "datapro"], tonight(now), "10"));
    await chat(14 * DAY - 2 * HOUR - 4 * MIN, research, "Get me a market report on durian exports, under US$2, by tonight.");
    await chat(14 * DAY - 2 * HOUR - 6 * MIN, research, "Per report. Get the premium one too if it adds a forecast.");

    // Claude connects and gets its own pocket: Market news
    await at(12 * DAY + 5 * HOUR, async () => w.connect("claude"));
    const news = await at(12 * DAY + 5 * HOUR - 3 * MIN, async () => create("Market news", CLAUDE_AGENT, "2", "0.50", ["datalite", "datapro"], inDays(now, 21), "8"));
    await act(12 * DAY + 4 * HOUR, "claude", news, errand({ what: "Durian price note for today's market brief", maxPrice: "1.00", maxTotal: "1.00", buys: [["datalite", "durian-report"]], search: true }));

    await chat(11 * DAY + 3 * HOUR, research, "Buy the DataLite durian report. Max US$1, by tonight.");
    await act(10 * DAY + 6 * HOUR, "claude", news, errand({ what: "SE Asia fruit trade figures for the weekly brief", maxPrice: "1.00", maxTotal: "1.00", buys: [["datalite", "fruit-trade-report"]] }));

    // ChatGPT connects: Trade quotes (small, never asks)
    await at(9 * DAY + 7 * HOUR, async () => w.connect("chatgpt"));
    const quotes = await at(9 * DAY + 7 * HOUR - 4 * MIN, async () => create("Trade quotes", CHATGPT_AGENT, "0.50", null, ["datalite"], inDays(now, 14), "3"));
    await act(9 * DAY + 6 * HOUR, "chatgpt", quotes, errand({ what: "Durian export volumes for a shipping quote", maxPrice: "0.50", maxTotal: "0.50", buys: [["datalite", "durian-report"]], search: true }));

    await chat(8 * DAY + 2 * HOUR, research, "Buy the SE Asia fruit trade report from DataLite. Max US$1, by tonight.");
    await act(7 * DAY + 9 * HOUR, "claude", news, errand({ what: "Durian 2026 forecast for the quarterly outlook", maxPrice: "2.00", maxTotal: "2.00", buys: [["datapro", "premium-report"]] }));

    // a top-up for the research pocket
    await at(6 * DAY + 11 * HOUR, async () => {
      const t = w.now();
      const f = w.chain.transfer(owner, research, parseUsd("5"), t);
      ownerTxs.push({ pocket: research, kind: "fund", hash: f, amount: parseUsd("5").toString(), at: t });
    });
    // ChatGPT reaches for a premium report its pocket doesn't allow: the contract refuses it
    await act(6 * DAY + 4 * HOUR, "chatgpt", quotes, errand({ what: "Premium durian forecast for a client quote", maxPrice: "2.00", maxTotal: "2.00", buys: [["datapro", "premium-report", true]] }));

    await chat(5 * DAY + 5 * HOUR, research, "Buy Harbour Wines' fruit and wine trade report. Max US$1, by tonight. Confirmed, go ahead.");
    await act(4 * DAY + 8 * HOUR, "claude", news, errand({ what: "Fruit and wine trade context for the market brief", maxPrice: "1.00", maxTotal: "1.50", buys: [["datalite", "durian-report"], ["harbour-wines", "fruit-wine-trade-report", true]] }));
    await chat(3 * DAY + 4 * HOUR, research, "Buy the DataLite durian report. Max US$1, by tonight.");
    await act(2 * DAY + 10 * HOUR, "chatgpt", quotes, errand({ what: "SE Asia fruit trade numbers for a freight quote", maxPrice: "0.50", maxTotal: "0.50", buys: [["datalite", "fruit-trade-report"]] }));
    await act(1 * DAY + 13 * HOUR, "claude", news, errand({ what: "Fruit trade update for the weekly brief", maxPrice: "1.00", maxTotal: "1.00", buys: [["datalite", "fruit-trade-report"]] }));
    await act(1 * DAY + 5 * HOUR, "chatgpt", quotes, errand({ what: "Durian export volumes for a shipping quote", maxPrice: "0.50", maxTotal: "0.50", buys: [["datalite", "durian-report"]] }));

    return {
      pockets: [
        { address: research, name: "Research data", style: "research", agent: "chainbrain" },
        { address: news, name: "Market news", style: "custom", agent: "claude" },
        { address: quotes, name: "Trade quotes", style: "custom", agent: "chatgpt" },
      ],
      ownerTxs,
    } satisfies Seeded;
  });
}

export async function seedOwnerToday(w: World, owner: Hex, prior: Seeded): Promise<Seeded> {
  const ownerTxs = prior.ownerTxs.slice();
  const now = w.now();
  const by = (name: string) => prior.pockets.find((p) => p.name === name)!.address;
  const research = by("Research data"), news = by("Market news"), quotes = by("Trade quotes");
  return asOwner(w, owner, async () => {
    await w.past(4 * HOUR + 26 * MIN, () => w.chat(research, "Get me a market report on durian exports, under US$2, by tonight."));
    await w.past(4 * HOUR + 24 * MIN, () => w.chat(research, "Per report. Get the premium one too if it adds a forecast."));
    // Claude's task for today, confirmed by the owner this morning: it buys the cheap note now and asks for the premium one later
    await w.past(2 * HOUR + 10 * MIN, () => w.act("claude", news, errand({ what: "Durian market note with the 2026 forecast", maxPrice: "2.00", maxTotal: "3.50", items: 3, buys: [["datalite", "durian-report"]] })));
    await w.past(70 * MIN, () => w.chat(research, "Buy Harbour Wines' fruit and wine trade report. Max US$1, by tonight. Confirmed, go ahead."));
    await w.past(40 * MIN, () => w.act("chatgpt", quotes, errand({ what: "Fruit trade figures for a freight quote", maxPrice: "0.50", maxTotal: "0.50", buys: [["datalite", "fruit-trade-report"]] })));

    // One purchase: the tight pocket for the dead-end scene (US$0.20, cap US$0.20, never ask, DataLite only)
    const tight = await w.past(18 * MIN, async () => {
      const t = w.now();
      const { pocket, tx } = w.chain.createPocket(owner, { agent: SIM_AGENT, cap: parseUsd("0.20"), askAbove: NEVER, expiresAt: BigInt(Math.floor((now + 20 * HOUR) / 1000)), sellers: payTo("datalite") }, t);
      ownerTxs.push({ pocket, kind: "create", hash: tx, at: t });
      const f = w.chain.transfer(owner, pocket, parseUsd("0.20"), t + 35_000);
      ownerTxs.push({ pocket, kind: "fund", hash: f, amount: "200000", at: t + 35_000 });
      return pocket;
    });
    return { pockets: [prior.pockets[0], { address: tight, name: "One purchase", style: "tight", agent: "chainbrain" }, ...prior.pockets.slice(1)], ownerTxs };
  });
}

/**
 * Claude's live request after launch: inside the task the owner confirmed this morning, it asks to co-sign DataPro's premium
 * report (US$1.50, above Market news' US$0.50 ask-me limit). The owner answers in the Approvals inbox; unanswered, it expires
 * after 10 minutes like any approval. Resolves with Claude's reply.
 */
export function claudeAsksForPremium(w: World, pocket: Hex) {
  return w.act("claude", pocket, buy("datapro", "premium-report", "DataPro's premium report adds the 2026 forecast my market note is missing. It's US$1.50, above your US$0.50 limit for this pocket, so it needs your signature."));
}
