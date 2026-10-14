// Mirrors the phone's built-in network to the web console on the laptop (devstack/src/relay.ts), so a co-sign on the
// phone shows up live on the big screen, and the console's judge actions (plant text in a seller, force a transfer)
// run against the phone's pockets. Quiet when no laptop answers: it backs off and tries again later. No React Native
// imports.
import { wire } from "../../../shared/sim";
import { builtin } from "./builtin";
import { fetchTimeout, getApi, isBuiltin } from "./runtime";

// Whether a console on the laptop is receiving this phone (last successful push), for a quiet line in Settings.
let lastOk = 0;
const watchers = new Set<() => void>();
export const relayLinked = () => Date.now() - lastOk < 8000;
export const onRelay = (f: () => void) => { watchers.add(f); return () => void watchers.delete(f); };
const ping = (ok: boolean) => { const was = relayLinked(); if (ok) lastOk = Date.now(); else lastOk = 0; if (was !== relayLinked()) watchers.forEach((f) => f()); };

type Cmd = { id: number; type: "plant" | "force" | "say"; sellerId?: string; text?: string | null; pocket?: string; preset?: string | null };
/** The console's Play button: the phone types this to its agent (the owner still confirms and co-signs on the phone). */
export type Say = (text: string, preset?: string | null) => Promise<{ ok: boolean; text: string; pocket?: string }>;

export function startRelay(owner: string, names: () => Record<string, string>, say?: Say) {
  const w = builtin();
  const device = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  let sentAt = 0, cmdAfter = 0, lastPush = 0, fails = 0, waitUntil = 0, dirty = true, stopped = false;
  let results: { id: number; result: unknown }[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  const offs = [w.subscribe(() => { dirty = true; }), w.chain.onTx(() => { dirty = true; })];

  async function run(c: Cmd) {
    try {
      if (c.type === "plant" && c.sellerId) {
        w.inject(c.sellerId, c.text ?? null);
        return { ok: true, text: c.text == null ? "Cleared." : `Planted in ${w.sellerName(c.sellerId)}'s next response. Used once, then cleared.` };
      }
      if (c.type === "force" && c.pocket) {
        const j = await w.forceTransfer(c.pocket as `0x${string}`);
        return { ok: j.reverted, tx: j.tx, balanceAfter: j.balanceAfter, reverted: j.reverted };
      }
      if (c.type === "say" && c.text && say) return await say(c.text, c.preset);
      return { ok: false, text: "Unknown command" };
    } catch (e) { return { ok: false, text: (e as Error).message }; }
  }

  async function tick() {
    if (stopped) return;
    const now = Date.now();
    if (isBuiltin() && now >= waitUntil && (dirty || results.length || now - lastPush > 3000)) {
      dirty = false;
      const events = w.events(sentAt);
      const pockets = w.chain.pocketsOf(owner);
      const mine = new Set(pockets.map((p) => p.address.toLowerCase()));
      const snapshot = wire({
        owner, names: names(), balances: w.balances(owner),
        pockets, txs: w.txs().filter((t) => mine.has(t.pocket.toLowerCase())),
      });
      const done = results;
      try {
        const r = await fetchTimeout(`${getApi()}/dev/relay/push`, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ device, from: sentAt, events, snapshot, results: done, cmdAfter }),
        }, 3000);
        if (!r.ok) throw new Error(`relay ${r.status}`);
        const j = await r.json();
        if (j.resync) { sentAt = 0; dirty = true; timer = setTimeout(tick, 50); return; }
        if (events.length) sentAt = events[events.length - 1].at;
        results = results.filter((x) => !done.includes(x));
        lastPush = now; fails = 0; ping(true);
        for (const c of (j.commands ?? []) as Cmd[]) {
          if (c.id <= cmdAfter) continue;
          cmdAfter = c.id;
          void run(c).then((result) => { results.push({ id: c.id, result }); dirty = true; });
        }
      } catch {
        fails += 1; dirty = true; ping(false);
        waitUntil = now + Math.min(30_000, 2000 * 2 ** Math.min(fails - 1, 4)); // 2, 4, 8, 16, 30 s
      }
    }
    timer = setTimeout(tick, 300);
  }
  void tick();
  return () => { stopped = true; if (timer) clearTimeout(timer); offs.forEach((f) => f()); };
}
