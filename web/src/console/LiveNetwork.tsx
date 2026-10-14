// The network as a real server shows it: config, the event stream (every pocket) and the chain (pockets, rules,
// on-chain history). Read-only. The dev stack adds /dev routes (local fork, forced transfer, scene list).
import type { Address } from "viem";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { formatUsd, loadConfig, type Config } from "../shared";
import { detectDev } from "../dev";
import { EventsProvider, useEvents } from "../useEvents";
import { setSource } from "../source/source";
import { clientFor, loadHistory, loadPockets, scanFrom, type ChainTx, type PocketState } from "./chain";
import { NetworkCtx, describeTx, type Actions, type Network, type Scene } from "./network";

const PUBLIC_RPC = import.meta.env.VITE_RPC_URL ?? "https://sepolia.base.org";

export function LiveNetwork({ url, children }: { url: string; children: ReactNode }) {
  return <EventsProvider api={url}><Inner url={url}>{children}</Inner></EventsProvider>;
}

function Connecting({ url, failed, retry }: { url: string; failed: boolean; retry(): void }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-6 text-center">
      <div>
        <p className="text-[15px] text-ink2">{failed ? "Can't reach the server" : "Connecting…"}</p>
        <p className="num mt-1 break-all text-[13px] text-muted">{url}</p>
        {failed && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={retry} className="h-10 rounded-full bg-fill px-5 text-[14px] font-semibold text-ink hover:bg-line">Try again</button>
            <button type="button" onClick={() => setSource({ kind: "demo" })} className="h-10 rounded-full px-5 text-[14px] font-semibold text-accent hover:bg-accent-soft">Use the built-in network</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Inner({ url, children }: { url: string; children: ReactNode }) {
  const live = useEvents();
  const [cfg, setCfg] = useState<Config>();
  const [failed, setFailed] = useState(false);
  const [tries, setTries] = useState(0);
  const [dev, setDev] = useState(false);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [pockets, setPockets] = useState<PocketState[]>([]);
  const [txs, setTxs] = useState<ChainTx[]>([]);
  const [chainError, setChainError] = useState<string>();
  const [tick, setTick] = useState(0);

  // config, retried every 5 s while unreachable
  useEffect(() => {
    let alive = true, timer: ReturnType<typeof setTimeout> | undefined;
    const attempt = () => loadConfig(url).then(async (c) => {
      if (!alive) return;
      const d = await detectDev(url);
      if (!alive) return;
      setDev(!!d); setCfg(c); setFailed(false);
      if (d) fetch(`${url}/dev/scenes`).then((r) => r.json()).then((s) => alive && Array.isArray(s) && setScenes(s)).catch(() => {});
    }).catch(() => { if (!alive) return; setFailed(true); timer = setTimeout(attempt, 5000); });
    attempt();
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, [url, tries]);

  // chain reads: on start, every 8 s, and shortly after new payment / refusal events
  const lastCount = useRef(0);
  useEffect(() => {
    const n = live.events.filter((e) => e.type === "payment" || e.type === "refusal" || e.type === "forced").length;
    if (n !== lastCount.current) { lastCount.current = n; const t = setTimeout(() => setTick((x) => x + 1), 1200); return () => clearTimeout(t); }
  }, [live.events]);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 8000); return () => clearInterval(t); }, []);
  const fromRef = useRef<bigint | undefined>(undefined);
  useEffect(() => {
    if (!cfg) return;
    let alive = true;
    const client = clientFor(dev ? `${url}/dev/rpc` : PUBLIC_RPC);
    (async () => {
      try {
        fromRef.current ??= await scanFrom(client, dev);
        const seen = [...new Set(live.events.map((e) => e.pocket).filter((p): p is string => typeof p === "string" && /^0x[0-9a-fA-F]{40}$/.test(p)))];
        const ps = await loadPockets(client, cfg, fromRef.current, seen);
        const hist = await loadHistory(client, cfg, ps, fromRef.current);
        if (alive) { setPockets(ps); setTxs(hist); setChainError(undefined); }
      } catch (e) { if (alive) setChainError((e as Error).message.split("\n")[0]); }
    })();
    return () => { alive = false; };
  }, [cfg, dev, url, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<Network | null>(() => {
    if (!cfg) return null;
    const actions: Actions = {};
    if (cfg.sellersUrl) {
      actions.plant = async (sellerId, text) => {
        try {
          const r = await fetch(text == null ? `${cfg.sellersUrl}/admin/inject/${sellerId}` : `${cfg.sellersUrl}/admin/inject`, { method: text == null ? "DELETE" : "POST", headers: { "content-type": "application/json" }, body: text == null ? undefined : JSON.stringify({ sellerId, text }) });
          const name = cfg.sellers.find((s) => s.id === sellerId)?.name;
          return { ok: r.ok, text: r.ok ? (text == null ? "Cleared." : `Planted in ${name}'s next response. Used once, then cleared.`) : `The seller server answered ${r.status}.` };
        } catch { return { ok: false, text: "Could not reach the seller server." }; }
      };
    }
    if (dev) {
      actions.forceTransfer = async (pocket) => {
        try {
          const r = await fetch(`${url}/dev/force-transfer`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pocket }) });
          const j = await r.json();
          if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
          setTick((x) => x + 1);
          return { ok: !!j.reverted, tx: j.tx, text: j.reverted ? `Reverted on-chain. The pocket still holds US$${formatUsd(BigInt(j.balanceAfter))}.` : "The transfer was NOT refused." };
        } catch (e) { return { ok: false, text: `Could not run it: ${(e as Error).message}` }; }
      };
    }
    const txDetail: Network["txDetail"] = (hash) => {
      const t = txs.find((x) => x.hash.toLowerCase() === hash.toLowerCase());
      if (t) return { ...describeTx(t, pockets.find((p) => p.address.toLowerCase() === t.pocket.toLowerCase())?.owner), at: t.at ?? live.events.find((e) => e.type === "payment" && e.tx === t.hash)?.at };
      const f = live.events.find((e) => e.type === "forced" && e.tx?.toLowerCase() === hash.toLowerCase());
      return f ? { hash: f.tx, label: f.reverted ? "Blocked transfer" : "Forced transfer", status: f.reverted ? "reverted" : "success", amount: BigInt(f.amount ?? 0), pocket: f.pocket as Address, from: f.pocket, to: f.to, at: f.at } : undefined;
    };
    return {
      dev, chainName: dev ? "Local test network" : "Base Sepolia test network", cfg, events: live.events, pockets, txs, chainError,
      explorer: dev ? undefined : (h: string) => `https://sepolia.basescan.org/tx/${h}`,
      scenes, txDetail, actions, refresh: () => setTick((x) => x + 1),
    };
  }, [cfg, dev, url, live.events, pockets, txs, chainError, scenes]);

  if (!value) return <Connecting url={url} failed={failed} retry={() => setTries((x) => x + 1)} />;
  return <NetworkCtx.Provider value={value}>{children}</NetworkCtx.Provider>;
}
