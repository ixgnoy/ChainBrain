import { bus } from "../wallet/events";
import { directory } from "../wallet/directory";
import { labels } from "./labels";
import { radar, screenOrNull } from "./screen";

/**
 * Continuous monitoring: re-screen every counterparty a pocket dealt with, so risk that appears after the first
 * payment (a seller later paid by a drainer) opens an alert. Also turns ChainBrain's own refusals into labels:
 * a seller whose content asked for data or a signature is "flagged" for every pocket (shared: address and reason only).
 */
export function startMonitor(everyMs = Number(process.env.RADAR_MONITOR_MS ?? 30_000)) {
  const off = bus.subscribe((e) => {
    if (e.type !== "disclosure" || typeof e.sellerId !== "string") return;
    const sellerId = e.sellerId;
    void directory().then((list) => {
      const s = list.find((x) => x.id === sellerId);
      if (s?.payTo) labels.add({ address: s.payTo, category: "flagged", name: s.name, source: `chainbrain:${(e.refused as string[] | undefined)?.join("+") ?? "disclosure"}` });
    }).catch(() => {});
  });
  let busy = false;
  const t = setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      for (const a of radar.watched()) await screenOrNull(a);
    } finally {
      busy = false;
    }
  }, everyMs);
  t.unref();
  return () => (off(), clearInterval(t));
}
