// Live data when the wallet API answers, built-in demo data when it doesn't. No login: the seller is picked in the rail.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadConfig, store, type Config, type Seller } from "../shared";
import { detectDev } from "../dev";
import { useEvents } from "../useEvents";
import type { WalletEvent } from "../lib/events";
import { DEMO_CONFIG, demoEvents } from "./demo";
import { salesFor, summarise, type SaleRow, type Summary } from "./data";

type Mode = "loading" | "live" | "demo";
type Value = {
  mode: Mode; network: string; cfg: Config; seller: Seller; setSellerId(id: string): void;
  rows: SaleRow[]; summary: Summary; events: WalletEvent[];
};
const Ctx = createContext<Value | null>(null);
const KEY = "seller:id";
const RETRY_MS = 5000;

export function SellerProvider({ children }: { children: ReactNode }) {
  const [cfg, setCfg] = useState<Config>();
  const [mode, setMode] = useState<Mode>("loading");
  const [network, setNetwork] = useState("Base Sepolia test network");
  const [sellerId, setSellerIdState] = useState<string>(() => store.get(KEY, ""));
  const [demo] = useState(() => demoEvents());
  const live = useEvents();

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const attempt = () => {
      loadConfig().then((c) => {
        if (!alive) return;
        setCfg(c); setMode("live");
        void detectDev().then((d) => alive && setNetwork(d ? "Local test network" : "Base Sepolia test network"));
      }).catch(() => {
        if (!alive) return;
        setMode("demo"); setNetwork("Demo data");
        timer = setTimeout(attempt, RETRY_MS); // switch to live as soon as the API is reachable
      });
    };
    attempt();
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, []);

  const value = useMemo<Value | null>(() => {
    const c = mode === "live" && cfg ? cfg : DEMO_CONFIG;
    const seller = c.sellers.find((s) => s.id === sellerId) ?? c.sellers[0];
    if (!seller) return null;
    const events = mode === "live" ? live.events : demo;
    const rows = salesFor(events, seller.id);
    return {
      mode, network, cfg: c, seller, events, rows, summary: summarise(rows),
      setSellerId: (id: string) => { setSellerIdState(id); store.set(KEY, id); },
    };
  }, [mode, cfg, sellerId, network, live.events, demo]);

  if (mode === "loading" || !value) return <div className="grid min-h-dvh place-items-center bg-canvas text-sm text-muted">Loading…</div>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSeller(): Value {
  const v = useContext(Ctx);
  if (!v) throw new Error("SellerProvider missing");
  return v;
}
