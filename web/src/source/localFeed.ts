// The built-in network: a shared/sim World (virtual chain with the Pocket.sol rules, wallet tools, scripted agent)
// running in this tab, played by the autopilot's story and background traffic.
import { createWorld, SCENES, type SimTx, type World, type WorldOptions } from "@sim/index";
import { createAutopilot, OWNERS, type Autopilot } from "@sim/autopilot";
import type { Address, Hex } from "viem";
import type { PocketState, ChainTx } from "../console/chain";
import { formatUsd, type Config } from "../shared";
import type { WalletEvent } from "../lib/events";
import type { NetworkFeed, FeedSnapshot } from "./feed";
import { createLinkedFeed } from "./linkedFeed";

const toTx = (t: SimTx): ChainTx => ({ hash: t.hash as Hex, block: t.block, logIndex: t.logIndex, pocket: t.pocket as Address, kind: t.kind, amount: t.amount, counterparty: t.counterparty as Address | undefined, at: t.at, from: t.from as Address, status: t.status, method: t.method, reason: t.reason, args: t.args, label: t.label });

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

// The network's owners label their pockets like anyone would; the chain itself has no names.
const OTHER: Record<string, string> = { [OWNERS.research.toLowerCase()]: "Lab research", [OWNERS.trading.toLowerCase()]: "Trading desk", [OWNERS.small.toLowerCase()]: "Side project" };
function nameOf(owner: string, cap: bigint, presenter: string): string | undefined {
  if (owner.toLowerCase() === presenter.toLowerCase()) return cap <= 200_000n ? "One purchase" : "Research data";
  return OTHER[owner.toLowerCase()];
}

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
      // a judge's own attack: the story waits while it runs (like runScene), and a turn already in flight on that pocket finishes first
      async chat(pocket, text) {
        autopilot.hold();
        try {
          for (let i = 0; i < 100 && world.isBusy(pocket); i++) await new Promise((r) => setTimeout(r, 200));
          const r = await world.chat(pocket as Hex, text);
          return { ok: !r.stopped || r.stopped !== "llm_error", text: r.reply, pocket };
        } catch (e) { return { ok: false, text: (e as Error).message, pocket }; } finally { autopilot.release(); }
      },
      async hijack(pocket, text) {
        autopilot.hold();
        try {
          const j = await world.hijack(pocket as Hex, text);
          const left = formatUsd(BigInt(j.balanceAfter));
          return { ok: j.reverted, tx: j.tx, text: j.reverted ? `Reverted on-chain. The pocket still holds US$${left}.` : "The transfer was NOT refused." };
        } catch (e) { return { ok: false, text: (e as Error).message }; } finally { autopilot.release(); }
      },
    },
    snapshot(): FeedSnapshot {
      const all = world.txs().map(toTx);
      const pockets: PocketState[] = world.chain.pockets().map((p) => ({
        address: p.address as Address, owner: p.owner as Address, agent: p.agent as Address, createdTx: p.createdTx as Hex | undefined, createdBlock: p.createdBlock,
        balance: p.balance, cap: p.cap, askAbove: p.askAbove, expiresAt: Number(p.expiresAt), revoked: p.revoked, allowed: p.allowed,
        name: nameOf(p.owner, p.cap, autopilot.presenter),
      })).sort((a, b) => Number((b.createdBlock ?? 0n) - (a.createdBlock ?? 0n)));
      return { events: world.allEvents().map(scrub), pockets, txs: all.filter((t) => t.status !== "reverted"), allTxs: all, follow: autopilot.active, scene: autopilot.state.scene };
    },
    subscribe(f) { listeners.add(f); return () => void listeners.delete(f); },
    start() {
      offs = [world.subscribe(emit), world.chain.onTx(emit), autopilot.subscribe(emit)];
      autopilot.start();
    },
    stop() { autopilot.stop(); for (const off of offs) off(); offs = []; },
  };
}

/** The feed behind the default (built-in) source: the local network, linked to a phone on this laptop when there is one. */
export const makeFeed = (): NetworkFeed => createLinkedFeed(createLocalFeed());
