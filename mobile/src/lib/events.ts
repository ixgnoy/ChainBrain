import { useEffect, useRef, useState } from "react";
import { API } from "./shared";

export type WalletEvent = { type: string; pocket?: string; at: number; [k: string]: any };

/** React Native has no EventSource: poll /api/events.json for this pocket (1.5 s). */
export function usePolledEvents(pocket?: string, everyMs = 1500) {
  const [events, setEvents] = useState<WalletEvent[]>([]);
  const after = useRef(0);
  useEffect(() => {
    setEvents([]);
    after.current = 0;
    if (!pocket) return;
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch(`${API}/api/events.json?pocket=${pocket}&after=${after.current}`);
        const fresh = (await r.json()) as WalletEvent[];
        if (!alive || !fresh.length) return;
        after.current = fresh[fresh.length - 1].at;
        setEvents((xs) => [...xs, ...fresh]);
      } catch { /* API unreachable: keep polling */ }
    };
    void tick();
    const t = setInterval(tick, everyMs);
    return () => { alive = false; clearInterval(t); };
  }, [pocket, everyMs]);
  return events;
}

/** Latest state of each approval (events repeat it on every status change). */
export function approvalsFrom(events: WalletEvent[]) {
  const by = new Map<string, any>();
  for (const e of events) if (e.approval) by.set(e.approval.id, e.approval);
  return [...by.values()];
}
