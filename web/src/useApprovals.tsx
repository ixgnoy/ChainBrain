// Owner approvals (intent card, payment co-sign, agent question). The stream can show stale "pending" items, so the
// list is reconciled with GET /api/pending (polled) and with the 10 minute server wait (see pendingApprovals).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { API } from "./shared";
import { useConsole } from "./console";
import { useEvents } from "./useEvents";
import { pendingApprovals, samePocket, type Approval, type PollResult } from "./lib/events";

type Ctx = { pending: Approval[]; pendingFor(pocket?: string): Approval[]; decide(id: string, body: { approved: boolean; signature?: string }): Promise<{ ok: boolean; error?: string }>; reload(): void };
const C = createContext<Ctx>({ pending: [], pendingFor: () => [], decide: async () => ({ ok: false }), reload: () => {} });
export const useApprovals = () => useContext(C);

const POLL_MS = 4000;

export function ApprovalsProvider({ children }: { children: ReactNode }) {
  const { pockets, readOnly } = useConsole();
  const { events } = useEvents();
  const [poll, setPoll] = useState<PollResult>();
  const [tick, setTick] = useState(0);
  const key = pockets.join(",");

  useEffect(() => {
    setPoll(undefined);
    if (!pockets.length || readOnly) return;
    let live = true;
    const run = async () => {
      const at = Date.now();
      try {
        const lists = await Promise.all(pockets.map((p) => fetch(`${API}/api/pending?pocket=${p}`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))));
        if (live) setPoll({ ids: new Set((lists.flat() as Approval[]).map((a) => a.id)), at });
      } catch { /* keep the previous answer; the age rule still applies */ }
    };
    void run();
    const t = setInterval(() => { if (document.visibilityState !== "hidden") void run(); }, POLL_MS);
    return () => { live = false; clearInterval(t); };
  }, [key, readOnly, tick]);

  const mine = useMemo(() => events.filter((e) => pockets.some((p) => samePocket(p, e.pocket))), [events, pockets]);
  const pending = useMemo(() => (readOnly ? [] : pendingApprovals(mine, poll)), [mine, poll, readOnly]);
  const pendingFor = useCallback((pocket?: string) => pending.filter((a) => samePocket(a.pocket, pocket)), [pending]);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  const reloadRef = useRef(reload); reloadRef.current = reload;

  const decide = useCallback<Ctx["decide"]>(async (id, body) => {
    try {
      const r = await fetch(`${API}/api/approvals/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (r.ok) { reloadRef.current(); return { ok: true }; }
      const j = await r.json().catch(() => ({}));
      if (r.status === 404) reloadRef.current(); // already resolved or timed out
      return { ok: false, error: j.error ?? `HTTP ${r.status}` };
    } catch (e) { return { ok: false, error: (e as Error).message }; }
  }, []);

  const value = useMemo(() => ({ pending, pendingFor, decide, reload }), [pending, pendingFor, decide, reload]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
