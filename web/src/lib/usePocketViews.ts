import { useEffect, useState } from "react";
import type { Address } from "viem";
import { readPocket, type PocketView } from "../wallet";

/** On-chain state of each pocket, re-read when `refresh` changes. Missing = still loading or unreadable. */
export function usePocketViews(list: Address[], refresh: number): { views: Record<string, PocketView>; failed: Set<string> } {
  const [views, setViews] = useState<Record<string, PocketView>>({});
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const key = list.map((p) => p.toLowerCase()).join(",");
  useEffect(() => {
    let live = true;
    for (const p of list) {
      readPocket(p)
        .then((v) => { if (live) { setViews((x) => ({ ...x, [p.toLowerCase()]: v })); setFailed((f) => { const n = new Set(f); n.delete(p.toLowerCase()); return n; }); } })
        .catch(() => { if (live) setFailed((f) => new Set(f).add(p.toLowerCase())); });
    }
    return () => { live = false; };
  }, [key, refresh]);
  return { views, failed };
}

export const pocketStatus = (p: PocketView): "Revoked" | "Expired" | "Active" => (p.revoked ? "Revoked" : Number(p.expiresAt) * 1000 < Date.now() ? "Expired" : "Active");
