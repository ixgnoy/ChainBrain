// THE SEAM FOR LINKING. A feed is "a world the console can watch": a snapshot of events, pockets and transactions, a
// way to hear about changes, and the actions a judge can try. The built-in network is `createLocalFeed` (a shared/sim
// World running in this tab, see localFeed.ts). To let one device show what another device's world is doing, add a
// `createRemoteFeed(url)` that implements this same interface: it opens an SSE relay of the other world's events plus
// periodic snapshots, rebuilds `snapshot()` from them, forwards `actions` over the relay (or leaves them out to be
// read-only), and returns it from `makeFeed` in localFeed.ts. Nothing above this file changes.
import type { Config } from "../shared";
import type { WalletEvent } from "../lib/events";
import type { ChainTx, PocketState } from "../console/chain";
import type { Actions, Scene } from "../console/network";

export type FeedSnapshot = {
  events: WalletEvent[];
  pockets: PocketState[];
  /** Transactions that left logs (what a chain reader would find). */
  txs: ChainTx[];
  /** Every transaction including reverted ones (for the in-app detail). */
  allTxs: ChainTx[];
  /** The pocket the story is on right now. */
  follow?: string;
  /** The scene the built-in story is playing now ("1"…"8", "A" = escalation); absent between scenes and while a phone is linked. */
  scene?: string;
  /** A phone is linked (see linkedFeed.ts). */
  linked?: boolean;
  /** Addresses of the linked phone's pockets. */
  phonePockets?: string[];
};

export interface NetworkFeed {
  cfg: Config;
  scenes: Scene[];
  actions: Actions;
  snapshot(): FeedSnapshot;
  /** Called after any change; the consumer throttles and then asks for a fresh snapshot. */
  subscribe(f: () => void): () => void;
  start(): void;
  stop(): void;
}
