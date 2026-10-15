// The network as a real server shows it: config, the event stream (every pocket) and the chain (pockets, rules,
// on-chain history). Read-only. The dev stack adds /dev routes (local fork, forced transfer, scene list).
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { formatUsd, loadConfig, type Config } from "../shared";
import { detectDev } from "../dev";
import { EventsProvider, useEvents } from "../useEvents";
import { setSource } from "../source/source";
import { networkLabel } from "@sim/explorer";
import { clientFor, loadHistory, loadPockets, scanFrom, type ChainTx, type PocketState } from "./chain";
import { NetworkCtx, lookupTx, pocketLookups, type Actions, type Network, type Scene } from "./network";

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

  // the chain read lists transactions that left logs; a reverted one (forced transfer, escalation) is known from its event
  const allTxs = useMemo(() => withReverted(txs, live.events), [txs, live.events]);
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
    // the chat route exists on every ChainBrain server: an attack sentence goes to the agent like the owner's own message
    actions.chat = async (pocket, text) => {
      try {
        const r = await fetch(`${url}/api/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pocket, text }) });
        if (!r.ok) return { ok: false, text: `The server answered ${r.status}.`, pocket };
        const j = await r.json();
        setTick((x) => x + 1);
        return { ok: true, text: String(j.reply ?? ""), pocket };
      } catch { return { ok: false, text: "Could not reach the server.", pocket }; }
    };
    // "assume the AI is fooled" is what /dev/force-transfer does on the real chain: the agent's own key signs, the pocket reverts
    if (actions.forceTransfer) actions.hijack = (pocket) => actions.forceTransfer!(pocket);
    const txDetail: Network["txDetail"] = (hash) => lookupTx(hash, txs, live.events, pockets, (id) => cfg.sellers.find((x) => x.id === id)?.payTo);
    return {
      dev, builtin: false, chainName: networkLabel({ builtin: false, dev }), cfg, events: live.events, pockets, txs, allTxs, chainError,
      explorer: dev ? undefined : (h: string) => `https://sepolia.basescan.org/tx/${h}`,
      scenes, txDetail, actions, linked: false, ...pocketLookups(pockets, [], live.events), refresh: () => setTick((x) => x + 1),
    };
  }, [cfg, dev, url, live.events, pockets, txs, allTxs, chainError, scenes]);

  if (!value) return <Connecting url={url} failed={failed} retry={() => setTries((x) => x + 1)} />;
  return <NetworkCtx.Provider value={value}>{children}</NetworkCtx.Provider>;
}

/** Reverted transactions are not in the chain's logs; the wallet's own events carry their hashes. */
export function withReverted(txs: ChainTx[], events: { type: string; pocket?: string; at: number; [k: string]: any }[]): ChainTx[] {
  const have = new Set(txs.map((t) => t.hash.toLowerCase()));
  const extra: ChainTx[] = [];
  const add = (t: Partial<ChainTx> & { hash?: string }) => {
    if (!t.hash || have.has(t.hash.toLowerCase())) return;
    have.add(t.hash.toLowerCase());
    extra.push({ block: 0n, logIndex: 0, kind: "out", status: "reverted", ...t } as ChainTx);
  };
  for (const e of events) {
    if (e.type === "forced" && e.reverted) add({ hash: e.tx, pocket: e.pocket as any, at: e.at, amount: BigInt(e.amount ?? 0), counterparty: e.to, reason: e.reason ?? "SELLER_NOT_ALLOWED", method: "transfer" });
    if (e.type === "attack" && e.attack === "escalation") for (const t of e.txs ?? []) if (t.reverted) add({ hash: t.tx, pocket: e.pocket as any, kind: "rules", at: e.at, reason: e.reason ?? "NOT_OWNER", label: t.call });
  }
  return extra.length ? [...txs, ...extra] : txs;
}
