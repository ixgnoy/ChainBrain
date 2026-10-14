// The seller's view reads the same network as the rest of the console. No login: the seller is picked in the rail.
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { store, type Config, type Seller } from "../shared";
import type { WalletEvent } from "../lib/events";
import { useNetwork } from "../console/network";
import { salesFor, summarise, type SaleRow, type Summary } from "./data";

type Value = {
  network: string; cfg: Config; seller: Seller; setSellerId(id: string): void;
  rows: SaleRow[]; summary: Summary; events: WalletEvent[];
};
const Ctx = createContext<Value | null>(null);
const KEY = "seller:id";

export function SellerProvider({ children }: { children: ReactNode }) {
  const { cfg, events, chainName } = useNetwork();
  const [sellerId, setSellerIdState] = useState<string>(() => store.get(KEY, ""));
  const value = useMemo<Value | null>(() => {
    const seller = cfg.sellers.find((s) => s.id === sellerId) ?? cfg.sellers[0];
    if (!seller) return null;
    const rows = salesFor(events, seller.id);
    return {
      network: chainName, cfg, seller, events, rows, summary: summarise(rows),
      setSellerId: (id: string) => { setSellerIdState(id); store.set(KEY, id); },
    };
  }, [cfg, events, chainName, sellerId]);

  if (!value) return <div className="py-16 text-center text-sm text-muted">Loading…</div>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSeller(): Value {
  const v = useContext(Ctx);
  if (!v) throw new Error("SellerProvider missing");
  return v;
}
