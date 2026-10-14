// The built-in network: a shared/sim World (virtual chain with the Pocket.sol rules, wallet tools, scripted agent)
// running in this tab, played by the autopilot's story and background traffic.
import { createWorld, SCENES, type SimTx, type World, type WorldOptions } from "@sim/index";
import { createAutopilot, type Autopilot } from "@sim/autopilot";
import type { Address, Hex } from "viem";
import type { PocketState, ChainTx } from "../console/chain";
import { formatUsd, type Config } from "../shared";
import type { WalletEvent } from "../lib/events";
import type { NetworkFeed, FeedSnapshot } from "./feed";

const toTx = (t: SimTx): ChainTx => ({ hash: t.hash as Hex, block: t.block, logIndex: t.logIndex, pocket: t.pocket as Address, kind: t.kind, amount: t.amount, counterparty: t.counterparty as Address | undefined, at: t.at, from: t.from as Address, status: t.status });

// The sample reports carry a "figures are invented" footnote; the console shows seller content as it arrives, without it.
const NOTE = /\\n_Demo data:[^\n]*?_(?=\\n|")/g;
const clean = new WeakMap<object, WalletEvent>();
const scrub = (e: WalletEvent): WalletEvent => {
  const hit = clean.get(e);
  if (hit) return hit;
  const j = JSON.stringify(e);
  const c: WalletEvent = j.includes("Demo data") ? JSON.parse(j.replace(NOTE, "")) : e;
  clean.set(e, c);
  return c;
};

export type LocalFeed = NetworkFeed & { world: World; autopilot: Autopilot };

export function createLocalFeed(o: WorldOptions & { background?: boolean; pauseMs?: number } = {}): LocalFeed {
  const { background, pauseMs, ...worldOpts } = o;
  const world = createWorld(worldOpts);
  const autopilot = createAutopilot(world, { background, pauseMs });
  const listeners = new Set<() => void>();
  const emit = () => { for (const f of listeners) f(); };
  let offs: (() => void)[] = [];

  return {
    world, autopilot,
    cfg: world.config() as unknown as Config,
    scenes: SCENES.map((s) => ({ id: s.id, title: s.title, text: s.text, followUp: s.followUp, note: s.note, preset: s.preset })),
    actions: {
      async plant(sellerId, text) {
        world.inject(sellerId, text);
        const name = world.sellerName(sellerId);
        return { ok: true, text: text == null ? "Cleared." : `Planted in ${name}'s next response. Used once, then cleared.` };
      },
      async forceTransfer(pocket) {
        const j = await world.forceTransfer(pocket as Hex);
        const left = formatUsd(BigInt(j.balanceAfter));
        return { ok: j.reverted, tx: j.tx, text: j.reverted ? `Reverted on-chain. The pocket still holds US$${left}.` : "The transfer was NOT refused." };
      },
      async runScene(id) { return autopilot.runScene(id); },
    },
    snapshot(): FeedSnapshot {
      const all = world.txs().map(toTx);
      const pockets: PocketState[] = world.chain.pockets().map((p) => ({
        address: p.address as Address, owner: p.owner as Address, agent: p.agent as Address, createdTx: p.createdTx as Hex | undefined, createdBlock: p.createdBlock,
        balance: p.balance, cap: p.cap, askAbove: p.askAbove, expiresAt: Number(p.expiresAt), revoked: p.revoked, allowed: p.allowed,
      })).sort((a, b) => Number((b.createdBlock ?? 0n) - (a.createdBlock ?? 0n)));
      return { events: world.allEvents().map(scrub), pockets, txs: all.filter((t) => t.status !== "reverted"), allTxs: all, follow: autopilot.active };
    },
    subscribe(f) { listeners.add(f); return () => void listeners.delete(f); },
    start() {
      offs = [world.subscribe(emit), world.chain.onTx(emit), autopilot.subscribe(emit)];
      autopilot.start();
    },
    stop() { autopilot.stop(); for (const off of offs) off(); offs = []; },
  };
}

/** The feed behind the default (built-in) source. A remote feed (see feed.ts) would be chosen here. */
export const makeFeed = (): NetworkFeed => createLocalFeed();
