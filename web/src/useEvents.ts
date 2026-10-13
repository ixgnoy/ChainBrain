import { useEffect, useState } from "react";
import { API } from "./shared";

export type WalletEvent = { type: string; pocket?: string; at: number; [k: string]: any };

/** Live wallet events for one pocket (trace, intents, approvals, payments, refusals, disclosures, questions). */
export function useEvents(pocket?: string) {
  const [events, setEvents] = useState<WalletEvent[]>([]);
  useEffect(() => {
    setEvents([]);
    if (!pocket) return;
    const es = new EventSource(`${API}/api/events?pocket=${pocket}`);
    es.onmessage = (m) => setEvents((xs) => [...xs, JSON.parse(m.data)]);
    return () => es.close();
  }, [pocket]);
  return events;
}

/** The latest state of each approval (events repeat it on every status change). */
export function approvalsFrom(events: WalletEvent[]) {
  const by = new Map<string, any>();
  for (const e of events) if (e.approval) by.set(e.approval.id, e.approval);
  return [...by.values()];
}
