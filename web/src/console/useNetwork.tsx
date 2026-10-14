// The whole ChainBrain network for the console: config, the live event stream (every pocket), and the chain (pockets,
// rules, on-chain history). Live when the wallet API answers; built-in demo data otherwise. No login.
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { API, loadConfig, type Config } from "../shared";
import { detectDev } from "../dev";
import { useEvents } from "../useEvents";
import type { WalletEvent } from "../lib/events";
import { DEMO_CONFIG, demoEvents } from "../seller/demo";
import { clientFor, loadHistory, loadPockets, scanFrom, type ChainTx, type PocketState } from "./chain";

type Mode = "loading" | "live" | "demo";
export type Network = {
  mode: Mode; dev: boolean; cfg: Config; events: WalletEvent[];
  pockets: PocketState[]; txs: ChainTx[]; chainError?: string;
  explorer?: (hash: string) => string; scenes: { id: string; title: string; text: string; note: string; preset: string | null }[];
  refresh(): void;
};
const Ctx = createContext<Network | null>(null);
const PUBLIC_RPC = import.meta.env.VITE_RPC_URL ?? "https://sepolia.base.org";

export function NetworkProvider({ children }: { children: ReactNode }) {
  const live = useEvents();
  const [mode, setMode] = useState<Mode>("loading");
  const [cfg, setCfg] = useState<Config>();
  const [dev, setDev] = useState(false);
  const [scenes, setScenes] = useState<Network["scenes"]>([]);
  const [pockets, setPockets] = useState<PocketState[]>([]);
  const [txs, setTxs] = useState<ChainTx[]>([]);
  const [chainError, setChainError] = useState<string>();
  const [tick, setTick] = useState(0);
  const demo = useMemo(() => demoEvents(), []);

  // config, retried every 5 s while unreachable (demo data meanwhile)
  useEffect(() => {
    let alive = true, timer: ReturnType<typeof setTimeout> | undefined;
    const attempt = () => loadConfig().then(async (c) => {
      if (!alive) return;
      const d = await detectDev();
      setDev(!!d); setCfg(c); setMode("live");
      if (d) fetch(`${API}/dev/scenes`).then((r) => r.json()).then((s) => alive && Array.isArray(s) && setScenes(s)).catch(() => {});
    }).catch(() => { if (!alive) return; setMode("demo"); timer = setTimeout(attempt, 5000); });
    attempt();
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, []);

  // chain reads: on start, every 8 s, and shortly after new payment / refusal events
  const lastCount = useRef(0);
  useEffect(() => {
    const n = live.events.filter((e) => e.type === "payment" || e.type === "refusal" || e.type === "forced").length;
    if (n !== lastCount.current) { lastCount.current = n; const t = setTimeout(() => setTick((x) => x + 1), 1200); return () => clearTimeout(t); }
  }, [live.events]);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 8000); return () => clearInterval(t); }, []);
  const fromRef = useRef<bigint | undefined>(undefined);
  useEffect(() => {
    if (mode !== "live" || !cfg) return;
    let alive = true;
    const client = clientFor(dev ? `${API}/dev/rpc` : PUBLIC_RPC);
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
  }, [mode, cfg, dev, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<Network | null>(() => {
    if (mode === "loading") return null;
    const isLive = mode === "live" && !!cfg;
    return {
      mode, dev, cfg: isLive ? cfg! : DEMO_CONFIG, events: isLive ? live.events : demo,
      pockets: isLive ? pockets : [], txs: isLive ? txs : [], chainError: isLive ? chainError : undefined,
      explorer: isLive && !dev ? (h: string) => `https://sepolia.basescan.org/tx/${h}` : undefined,
      scenes, refresh: () => setTick((x) => x + 1),
    };
  }, [mode, dev, cfg, live.events, demo, pockets, txs, chainError, scenes]);

  if (!value) return <div className="grid min-h-dvh place-items-center bg-canvas text-sm text-muted">Loading…</div>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNetwork(): Network {
  const v = useContext(Ctx);
  if (!v) throw new Error("NetworkProvider missing");
  return v;
}
