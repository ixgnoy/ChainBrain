// One EventSource shared by every pane. The server replays its whole buffer on every (re)connect and sends no ids, so
// raw data strings are de-duplicated (appendEvents). Events for all pockets arrive; panes filter with forPocket().
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { API } from "./shared";
import { appendEvents, type StoredEvent } from "./lib/events";

export type { WalletEvent, StoredEvent } from "./lib/events";
export { approvalsFrom } from "./lib/events";

type EventsValue = { events: StoredEvent[]; connected: boolean };
const Ctx = createContext<EventsValue>({ events: [], connected: false });

export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<StoredEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const seen = useRef(new Set<string>());
  // appendEvents mutates `seen`, so it must not run inside a setState updater (StrictMode double-invokes those).
  const all = useRef<StoredEvent[]>([]);

  useEffect(() => {
    let queue: string[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    const flush = () => {
      timer = undefined;
      const batch = queue; queue = [];
      const next = appendEvents(all.current, batch, seen.current);
      if (next !== all.current) { all.current = next; setEvents(next); }
    };
    const es = new EventSource(`${API}/api/events`);
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false); // EventSource reconnects by itself; the replay is de-duplicated
    es.onmessage = (m) => { queue.push(m.data); timer ??= setTimeout(flush, 40); }; // batch the replay burst into one render
    return () => { es.close(); if (timer) clearTimeout(timer); };
  }, []);

  const value = useMemo(() => ({ events, connected }), [events, connected]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useEvents = () => useContext(Ctx);
