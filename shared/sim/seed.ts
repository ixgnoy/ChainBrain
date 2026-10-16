// A lived-in starting point: two weeks of real activity, produced by running the same plans through the world on a clock
// set back in time, so balances, hashes, events, charts and activity all agree. Every number the apps show is computed
// from what this seed (and the user) did; nothing is typed in.
//
//   Research data   held by ChainBrain (in-app chat)   since 14 days ago, the pocket of scenes 1-7: cap US$0.05, ask above US$0.02
//   Market news     held by Claude (connected 12 days ago), cap US$0.05, ask above US$0.02
//   Trade quotes    held by ChatGPT (connected 9 days ago), cap US$0.01, never asks
//   One purchase    held by ChainBrain, created 18 minutes ago for the dead-end scene (8): US$0.005
//   Premium reports held by ChainBrain, created 5 minutes ago for the haggler (11): DataPro only, cap US$2 (phone only)
//   Durian watch    held by Claude, a deal watcher (pocket apps): checks Nansen's smart-money flows every morning at 08:00
//                   and buys at US$0.04 or less; every price it was quoted is on its chart
//   Data renewals   held by ChainBrain, subscriptions: renews Exa, CoinGecko and Nansen every Monday, max US$0.30 a month
//
// Every seeded pocket also has its pocket app (layout, blocks, title), composed by the fixed picker from the sentence below,
// exactly as a new pocket made from that sentence would be. Routines run on the seeding clock at their scheduled times.
//
// Sellers are real x402 data providers at their published prices (Exa US$0.007, CoinGecko US$0.01, Nansen US$0.01 or
// US$0.05; catalog.ts), plus the demo's fictional TradeWire, Harbour Wines and ShadyFeed.
//
// History must be published oldest first (event times and block numbers only go up), so it comes in two phases: days
// back (seedOwnerHistory) and today (seedOwnerToday). seedOwner runs both; the console's autopilot interleaves other
// owners' activity between them.
import { CATALOG } from "./catalog";
import { CHATGPT_AGENT, CLAUDE_AGENT, SIM_AGENT, buy, errand, type AgentId } from "./agents";
import type { Scene } from "./script";
import type { Hex } from "./types";
import { NEVER, parseUsd, tonightMs } from "./util";
import { pickApp, type PocketAppSpec } from "./pocketApp";
import { parseSentence } from "./speak";
import { sellers as registry } from "./catalog";
import type { World } from "./world";

export type SeededPocket = { address: Hex; name: string; style: "research" | "gifts" | "tight" | "custom"; agent?: AgentId; /** its pocket app (pocketApp.ts) */ app?: PocketAppSpec };
export type OwnerTxSeed = { pocket: Hex; kind: "create" | "fund"; hash: Hex; amount?: string; at: number };
export type Seeded = { pockets: SeededPocket[]; ownerTxs: OwnerTxSeed[] };

const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const payTo = (...ids: string[]) => CATALOG.filter((s) => ids.includes(s.id)).map((s) => s.payTo);
const tonight = (now: number) => BigInt(Math.floor(tonightMs(now) / 1000));
const inDays = (now: number, d: number) => BigInt(Math.floor((now + d * DAY) / 1000));

/** The owner's sentence for each seeded pocket: its pocket app is what the fixed picker composes from it. */
export const SEED_SENTENCES: Record<string, string> = {
  "Research data": "US$1 for durian research from Exa, CoinGecko or Nansen, at most US$0.05 each, ask me above US$0.02, until tonight",
  "Market news": "Let Claude buy market news from Exa, CoinGecko, Nansen and TradeWire for its briefs, at most US$0.05 each, ask me above US$0.02",
  "Trade quotes": "Let ChatGPT get rates from CoinGecko and news from Exa for shipping quotes, at most US$0.01 each, never ask",
  "One purchase": "Just once: one Exa search for durian news, at most US$0.005, never ask",
  "Premium reports": "Get DataPro's premium report, but negotiate the price down first, at most US$2 each, ask me above US$1",
  "Durian watch": "Let Claude buy Nansen's smart-money flows every morning when the price drops below US$0.04. Max US$0.20 a week.",
  "Data renewals": "Renew Exa durian news, the CoinGecko USDC price and Nansen's smart-money flows every Monday, max US$0.30 a month.",
};
/** A seeded pocket's app, from its sentence (and its own name as the title). */
export function seedApp(name: string): PocketAppSpec | undefined {
  const s = SEED_SENTENCES[name];
  if (!s) return undefined;
  const c = parseSentence(s, registry());
  return pickApp(s, { ...c.draft, name }, registry()).spec;
}
const withApps = (s: Seeded): Seeded => ({ ...s, pockets: s.pockets.map((p) => ({ ...p, app: p.app ?? seedApp(p.name) })) });

/** Replays routine runs whose time came before `beforeAgo` (oldest first), on the seeding clock. */
async function runDue(w: World, now: number, beforeAgo: number) {
  for (let i = 0; i < 400; i++) {
    const due = w.routines().filter((r) => r.status === "active").map((r) => r.nextAt).sort((a, b) => a - b)[0];
    if (due == null || due >= now - beforeAgo) return;
    await w.past(now - due, () => w.tickRoutines());
  }
}

/** The whole seed: two weeks back, then today. Main wallet ends at US$54.80. */
export async function seedOwner(w: World, owner: Hex, o: { startUsdc?: string } = {}): Promise<Seeded> {
  const s = await seedOwnerHistory(w, owner, o);
  const today = await seedOwnerToday(w, owner, s);
  return withApps(await withPremium(w, owner, today));
}

/**
 * The phone's pocket for the haggler (scene 11): DataPro, a fictional seller priced in dollars (the real providers keep
 * their published per-request prices), so it gets its own pocket: cap US$2, asks above US$1, US$3 in it, until tonight.
 * Made a few minutes ago, the newest of the seed. Phone only: the console's story makes its own pocket per scene.
 */
async function withPremium(w: World, owner: Hex, prior: Seeded): Promise<Seeded> {
  const ownerTxs = prior.ownerTxs.slice();
  w.chain.mint(owner, parseUsd("3"), 0n); // on top of the seed's start, so the main wallet ends where it always did
  await asOwner(w, owner, () => runDue(w, w.now(), 5 * MIN)); // routine runs due before it (later ones run live)
  const premium = await w.past(5 * MIN, async () => {
    const t = w.now();
    const { pocket, tx } = w.chain.createPocket(owner, { agent: SIM_AGENT, cap: parseUsd("2"), askAbove: parseUsd("1"), expiresAt: tonight(t), sellers: payTo("datapro") }, t);
    ownerTxs.push({ pocket, kind: "create", hash: tx, at: t });
    const f = w.chain.transfer(owner, pocket, parseUsd("3"), t + 30_000);
    ownerTxs.push({ pocket, kind: "fund", hash: f, amount: "3000000", at: t + 30_000 });
    return pocket;
  });
  return { pockets: [...prior.pockets, { address: premium, name: "Premium reports", style: "custom", agent: "chainbrain" }], ownerTxs };
}

/** Runs `f` with the owner's approvals answered by the world (seeding only), then hands them back to the owner. */
async function asOwner<T>(w: World, owner: Hex, f: () => Promise<T>): Promise<T> {
  w.autoOwner(owner, true);
  try { return await f(); } finally { w.autoOwner(owner, false); } // never answered for them after seeding
}

export async function seedOwnerHistory(w: World, owner: Hex, o: { startUsdc?: string } = {}): Promise<Seeded> {
  const ownerTxs: OwnerTxSeed[] = [];
  const now = w.now();
  w.chain.mint(owner, parseUsd(o.startUsdc ?? "57.005"), 2n * 10n ** 17n);
  const create = (_name: string, agent: Hex, cap: string, ask: string | null, sellers: string[], expiresAt: bigint, fund: string) => {
    const t = w.now();
    const { pocket, tx } = w.chain.createPocket(owner, { agent, cap: parseUsd(cap), askAbove: ask === null ? NEVER : parseUsd(ask), expiresAt, sellers: payTo(...sellers) }, t);
    ownerTxs.push({ pocket, kind: "create", hash: tx, at: t });
    const f = w.chain.transfer(owner, pocket, parseUsd(fund), t + 40_000);
    ownerTxs.push({ pocket, kind: "fund", hash: f, amount: parseUsd(fund).toString(), at: t + 40_000 });
    return pocket;
  };
  const at = async <T>(msAgo: number, f: () => Promise<T>) => { await runDue(w, now, msAgo); return w.past(msAgo, f); };
  // the pocket-app pockets hold more than the main wallet's history had: minted on top, so it still ends at US$54.80
  w.chain.mint(owner, parseUsd("1.00"), 0n);
  const chat = (msAgo: number, pocket: Hex, text: string) => at(msAgo, () => w.chat(pocket, text));
  const act = (msAgo: number, id: AgentId, pocket: Hex, plan: Scene) => at(msAgo, () => w.act(id, pocket, plan));

  return asOwner(w, owner, async () => {
    // Research data: ChainBrain's pocket. Cap US$0.05, ask above US$0.02, Exa, CoinGecko and Nansen, until 23:59 tonight.
    const research = await at(14 * DAY - 2 * HOUR, async () => create("Research data", SIM_AGENT, "0.05", "0.02", ["exa", "coingecko", "nansen"], tonight(now), "1"));
    await chat(14 * DAY - 2 * HOUR - 4 * MIN, research, "Research a durian import deal for me: export news, the USDC price and a check on the exporter's wallet. Under US$0.10, by tonight.");
    await chat(14 * DAY - 2 * HOUR - 6 * MIN, research, "In total. Check the exporter's wallet with Nansen too.");

    // Data renewals: ChainBrain renews three data feeds every Monday at 09:00, at most US$0.30 a month (created two weeks
    // ago, so two Mondays have passed whatever day it is)
    const renewals = await at(13 * DAY + 20 * HOUR, async () => {
      const p = create("Data renewals", SIM_AGENT, "0.30", null, ["exa", "coingecko", "nansen"], inDays(now, 365), "0.60");
      w.setRoutine(p, seedApp("Data renewals")!.routine!);
      return p;
    });

    // Claude connects and gets its own pocket: Market news
    await at(12 * DAY + 5 * HOUR, async () => w.connect("claude"));
    const news = await at(12 * DAY + 5 * HOUR - 3 * MIN, async () => create("Market news", CLAUDE_AGENT, "0.05", "0.02", ["exa", "coingecko", "nansen", "tradewire"], inDays(now, 21), "0.5"));
    await act(12 * DAY + 4 * HOUR, "claude", news, errand({ what: "Durian export headlines for today's market brief", maxPrice: "0.01", maxTotal: "0.01", buys: [["exa", "durian-news"]], search: true }));

    // Durian watch: Claude's deal watcher. Nansen only, cap US$0.04 (its price limit, so the contract refuses anything above
    // it), never asks, US$0.40 in it, ongoing; it checks the price every morning at 08:00 and buys at US$0.04 or less
    const watch = await at(12 * DAY + 2 * HOUR, async () => {
      const p = create("Durian watch", CLAUDE_AGENT, "0.04", null, ["nansen"], inDays(now, 365), "0.40");
      w.setRoutine(p, seedApp("Durian watch")!.routine!);
      return p;
    });

    await chat(11 * DAY + 3 * HOUR, research, "Search Exa for durian export news. Max US$0.01, by tonight.");
    await act(10 * DAY + 6 * HOUR, "claude", news, errand({ what: "SE Asia fruit trade headlines for the weekly brief", maxPrice: "0.01", maxTotal: "0.01", buys: [["exa", "fruit-news"]] }));

    // ChatGPT connects: Trade quotes (small, never asks)
    await at(9 * DAY + 7 * HOUR, async () => w.connect("chatgpt"));
    const quotes = await at(9 * DAY + 7 * HOUR - 4 * MIN, async () => create("Trade quotes", CHATGPT_AGENT, "0.01", null, ["coingecko", "exa"], inDays(now, 14), "0.2"));
    await act(9 * DAY + 6 * HOUR, "chatgpt", quotes, errand({ what: "USDC to HKD rate for a shipping quote", maxPrice: "0.01", maxTotal: "0.01", buys: [["coingecko", "usdc-price"]], search: true }));

    await chat(8 * DAY + 2 * HOUR, research, "Get the USDC price from CoinGecko. Max US$0.01, by tonight.");
    // Claude buys a credit report from TradeWire (above its US$0.02 limit, co-signed): scene 9's Radar alert reaches this pocket
    await act(7 * DAY + 9 * HOUR, "claude", news, errand({ what: "Exporter credit report for the quarterly outlook", maxPrice: "0.05", maxTotal: "0.05", buys: [["tradewire", "credit-report"]] }));

    // a top-up for the research pocket
    await at(6 * DAY + 11 * HOUR, async () => {
      const t = w.now();
      const f = w.chain.transfer(owner, research, parseUsd("0.5"), t);
      ownerTxs.push({ pocket: research, kind: "fund", hash: f, amount: parseUsd("0.5").toString(), at: t });
    });
    // ChatGPT reaches for Nansen's premium check its pocket doesn't allow: the contract refuses it
    await act(6 * DAY + 4 * HOUR, "chatgpt", quotes, errand({ what: "Counterparty check for a client quote", maxPrice: "0.05", maxTotal: "0.05", buys: [["nansen", "counterparties", true]] }));

    await chat(5 * DAY + 5 * HOUR, research, "Buy Harbour Wines' fruit and wine trade report. Max US$0.05, by tonight. Confirmed, go ahead.");
    await act(4 * DAY + 8 * HOUR, "claude", news, errand({ what: "Fruit and wine trade context for the market brief", maxPrice: "0.02", maxTotal: "0.03", buys: [["exa", "durian-news"], ["harbour-wines", "fruit-wine-trade-report", true]] }));
    await chat(3 * DAY + 4 * HOUR, research, "Check the exporter's wallet with Nansen's counterparty data. Max US$0.05, by tonight.");
    await act(2 * DAY + 10 * HOUR, "chatgpt", quotes, errand({ what: "SE Asia fruit trade news for a freight quote", maxPrice: "0.01", maxTotal: "0.01", buys: [["exa", "fruit-news"]] }));
    await act(1 * DAY + 13 * HOUR, "claude", news, errand({ what: "USDC price for the weekly brief", maxPrice: "0.01", maxTotal: "0.01", buys: [["coingecko", "usdc-price"]] }));
    await act(1 * DAY + 5 * HOUR, "chatgpt", quotes, errand({ what: "USDC to HKD rate for a shipping quote", maxPrice: "0.01", maxTotal: "0.01", buys: [["coingecko", "usdc-price"]] }));

    return {
      pockets: [
        { address: research, name: "Research data", style: "research", agent: "chainbrain" },
        { address: news, name: "Market news", style: "custom", agent: "claude" },
        { address: quotes, name: "Trade quotes", style: "custom", agent: "chatgpt" },
        { address: watch, name: "Durian watch", style: "custom", agent: "claude" },
        { address: renewals, name: "Data renewals", style: "custom", agent: "chainbrain" },
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
  const at = async <T>(msAgo: number, f: () => Promise<T>) => { await runDue(w, now, msAgo); return w.past(msAgo, f); };
  return asOwner(w, owner, async () => {
    await at(4 * HOUR + 26 * MIN, () => w.chat(research, "Research a durian import deal for me: export news, the USDC price and a check on the exporter's wallet. Under US$0.10, by tonight."));
    await at(4 * HOUR + 24 * MIN, () => w.chat(research, "In total. Check the exporter's wallet with Nansen too."));
    // Claude's task for today, confirmed by the owner this morning: it buys the news search now and asks for Nansen's check later
    await at(2 * HOUR + 10 * MIN, () => w.act("claude", news, errand({ what: "Durian market note with a check on the exporter's wallet", maxPrice: "0.05", maxTotal: "0.10", items: 3, buys: [["exa", "durian-news"]] })));
    await at(70 * MIN, () => w.chat(research, "Buy Harbour Wines' fruit and wine trade report. Max US$0.05, by tonight. Confirmed, go ahead."));
    await at(40 * MIN, () => w.act("chatgpt", quotes, errand({ what: "Fruit trade news for a freight quote", maxPrice: "0.01", maxTotal: "0.01", buys: [["exa", "fruit-news"]] })));

    // One purchase: the tight pocket for the dead-end scene (US$0.005, cap US$0.005, never ask, Exa only)
    const tight = await at(18 * MIN, async () => {
      const t = w.now();
      const { pocket, tx } = w.chain.createPocket(owner, { agent: SIM_AGENT, cap: parseUsd("0.005"), askAbove: NEVER, expiresAt: BigInt(Math.floor((now + 20 * HOUR) / 1000)), sellers: payTo("exa") }, t);
      ownerTxs.push({ pocket, kind: "create", hash: tx, at: t });
      const f = w.chain.transfer(owner, pocket, parseUsd("0.005"), t + 35_000);
      ownerTxs.push({ pocket, kind: "fund", hash: f, amount: "5000", at: t + 35_000 });
      return pocket;
    });
    return { pockets: [prior.pockets[0], { address: tight, name: "One purchase", style: "tight", agent: "chainbrain" }, ...prior.pockets.slice(1)], ownerTxs };
  });
}

/**
 * Claude's live request after launch: inside the task the owner confirmed this morning, it asks to co-sign Nansen's
 * counterparty check (US$0.05, above Market news' US$0.02 ask-me limit). The owner answers from the ask dock; unanswered,
 * it expires after 10 minutes like any approval. Resolves with Claude's reply.
 */
export function claudeAsksForPremium(w: World, pocket: Hex) {
  return w.act("claude", pocket, buy("nansen", "counterparties", "Nansen's counterparty check shows who the exporter's wallet trades with, the piece my market note is missing. It's US$0.05, above your US$0.02 limit for this pocket, so it needs your signature."));
}
