// The built-in network: turns a NetworkFeed (source/feed.ts) into the `Network` every screen reads.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { makeFeed } from "../source/localFeed";
import type { NetworkFeed } from "../source/feed";
import { networkLabel } from "@sim/explorer";
import { Skeleton } from "./kit";
import { NetworkCtx, lookupTx, pocketLookups, type Network } from "./network";

export function FeedNetwork({ children, make = makeFeed }: { children: ReactNode; make?: () => NetworkFeed }) {
  const [feed] = useState(make); // not started yet: a second instance made by StrictMode is simply dropped
  const [snap, setSnap] = useState(() => feed.snapshot());
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const off = feed.subscribe(() => { // many events arrive in bursts: one render per ~80 ms
      timer.current ??= setTimeout(() => { timer.current = undefined; setSnap(feed.snapshot()); }, 80);
    });
    feed.start();
    return () => { off(); feed.stop(); if (timer.current) { clearTimeout(timer.current); timer.current = undefined; } };
  }, [feed]);

  const value = useMemo<Network>(() => ({
    dev: false, builtin: true, chainName: networkLabel({ builtin: true }), cfg: feed.cfg, events: snap.events, pockets: snap.pockets, txs: snap.txs, allTxs: snap.allTxs,
    explorer: undefined, scenes: feed.scenes, follow: snap.follow, storyScene: snap.scene, actions: feed.actions,
    linked: !!snap.linked, ...pocketLookups(snap.pockets, snap.phonePockets, snap.events),
    txDetail: (hash) => lookupTx(hash, snap.allTxs, snap.events, snap.pockets, (id) => feed.cfg.sellers.find((s) => s.id === id)?.payTo),
    refresh: () => setSnap(feed.snapshot()),
  }), [feed, snap]);
  if (!snap.pockets.length) return <div role="status" aria-label="Loading" className="mx-auto max-w-[1680px] space-y-3 px-4 py-6 sm:px-8"><Skeleton className="h-12 w-64" /><Skeleton className="h-12" /><div className="grid gap-3 xl:grid-cols-3"><Skeleton className="h-72" /><Skeleton className="h-72" /><Skeleton className="h-72" /></div></div>;
  return <NetworkCtx.Provider value={value}>{children}</NetworkCtx.Provider>;
}
