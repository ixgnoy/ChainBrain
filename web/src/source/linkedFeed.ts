// The built-in network, linked to a phone when one is running on this laptop's relay (devstack/src/relay.ts). The phone
// pushes its own built-in network (pockets, transactions, the agent's events); while it is there the console shows the
// phone's pockets first and follows them, the local story waits, and the judges' plant / force-transfer go to the phone.
// With no phone (or no relay), this is exactly the local feed.
import type { Address, Hex } from "viem";
import type { ChainTx, PocketState } from "../console/chain";
import { eventPocket, type WalletEvent } from "../lib/events";
import type { FeedSnapshot, NetworkFeed } from "./feed";
import type { LocalFeed } from "./localFeed";
import { DEFAULT_API } from "./source";

type Wire = Record<string, any>;
type Phone = { events: WalletEvent[]; pockets: PocketState[]; txs: ChainTx[]; names: Record<string, string>; lastSeen: number };

const big = (v: unknown) => { try { return v == null ? undefined : BigInt(v as string); } catch { return undefined; } };
const toPocket = (p: Wire): PocketState => ({
  address: p.address as Address, owner: p.owner as Address, agent: p.agent as Address, createdTx: p.createdTx as Hex | undefined,
  createdBlock: big(p.createdBlock), balance: big(p.balance) ?? 0n, cap: big(p.cap) ?? 0n, askAbove: big(p.askAbove) ?? 0n,
  expiresAt: Number(p.expiresAt), revoked: !!p.revoked, allowed: Array.isArray(p.allowed) ? p.allowed : [],
});
const toTx = (t: Wire): ChainTx => ({
  hash: t.hash as Hex, block: big(t.block) ?? 0n, logIndex: Number(t.logIndex ?? 0), pocket: t.pocket as Address, kind: t.kind, amount: big(t.amount),
  counterparty: t.counterparty as Address | undefined, at: Number(t.at), from: t.from as Address, status: t.status,
});

/** The pocket the phone is working on right now: whichever has the newest event or transaction. */
export function latestPocket(events: WalletEvent[], txs: ChainTx[], pockets: PocketState[]): string | undefined {
  let best: string | undefined, at = -1;
  for (const e of events) { const p = eventPocket(e); if (p && e.at >= at) { best = p; at = e.at; } }
  for (const t of txs) if (t.pocket && (t.at ?? 0) > at && t.status !== "reverted") { best = t.pocket; at = t.at ?? 0; }
  return best ?? pockets[0]?.address;
}

export type LinkedFeed = NetworkFeed & { linked(): boolean; phoneNames(): Record<string, string> };

export function createLinkedFeed(local: LocalFeed, base = DEFAULT_API): LinkedFeed {
  const listeners = new Set<() => void>();
  const emit = () => { for (const f of listeners) f(); };
  let phone: Phone | null = null;
  let es: EventSource | null = null;
  let probe: ReturnType<typeof setTimeout> | undefined;
  let held = false, stopped = true, gen = 0, offLocal = () => {};
  const waiting = new Map<number, (r: any) => void>();
  const relay = `${base.replace(/\/+$/, "")}/dev/relay`;

  const setLinked = (on: boolean) => {
    if (on && !held) { held = true; local.autopilot.hold(); }
    if (!on && held) { held = false; local.autopilot.release(); }
  };
  const applySnapshot = (s: Wire | null | undefined, lastSeen = Date.now()) => {
    if (!s) return;
    phone ??= { events: [], pockets: [], txs: [], names: {}, lastSeen };
    const names: Record<string, string> = s.names ?? {};
    phone.pockets = (s.pockets ?? []).map((p: Wire) => ({ ...toPocket(p), name: names[String(p.address).toLowerCase()] }));
    phone.txs = (s.txs ?? []).map(toTx);
    phone.names = s.names ?? {};
    phone.lastSeen = lastSeen;
  };
  const onMessage = (raw: string) => {
    let m: Wire;
    try { m = JSON.parse(raw); } catch { return; }
    if (m.kind === "hello") {
      phone = null;
      if (m.linked && m.snapshot) { applySnapshot(m.snapshot, m.lastSeen); phone!.events = m.events ?? []; }
    } else if (m.kind === "reset") phone = { events: [], pockets: [], txs: [], names: {}, lastSeen: Date.now() }; // a new phone session: nothing of the old one stays, and its first events must not be lost
    else if (m.kind === "events" && phone) phone.events = [...phone.events, ...(m.events ?? [])].slice(-3000);
    else if (m.kind === "snapshot") { const ev = phone?.events ?? []; applySnapshot(m.snapshot, m.lastSeen); phone!.events = ev; }
    else if (m.kind === "result") { waiting.get(m.id)?.(m.result); waiting.delete(m.id); return; }
    else if (m.kind === "beat" && !m.linked) phone = null;
    setLinked(!!phone);
    emit();
  };
  const close = () => { es?.close(); es = null; };
  // Look for a relay quietly every few seconds; open the stream only once a phone is there.
  const look = async () => {
    if (stopped || es) return;
    const mine = gen; // a stop/start (React StrictMode) while the request is out must not open a second stream
    try {
      const r = await fetch(`${relay}/state`);
      const linked = r.ok && (await r.json()).linked;
      if (mine !== gen || stopped || es) return;
      if (linked) {
        es = new EventSource(`${relay}/stream`);
        es.onmessage = (e) => onMessage(e.data);
        es.onerror = () => { close(); phone = null; setLinked(false); emit(); probe = setTimeout(look, 4000); };
        return;
      }
    } catch { /* no relay on this laptop */ }
    if (mine === gen && !stopped) probe = setTimeout(look, 6000);
  };
  const command = async (body: object, ms = 12_000): Promise<any> => {
    const r = await fetch(`${relay}/command`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(r.status === 409 ? "The phone is not connected" : `Relay answered ${r.status}`);
    const { id } = await r.json();
    return new Promise((res, rej) => {
      waiting.set(id, res);
      setTimeout(() => { if (waiting.delete(id)) rej(new Error("The phone did not answer")); }, ms);
    });
  };
  const isPhonePocket = (p: string) => !!phone?.pockets.some((x) => x.address.toLowerCase() === p.toLowerCase());

  return {
    cfg: local.cfg, scenes: local.scenes,
    linked: () => !!phone,
    phoneNames: () => phone?.names ?? {},
    actions: {
      async plant(sellerId, text) {
        if (!phone) return local.actions.plant!(sellerId, text);
        try { const r = await command({ type: "plant", sellerId, text }); return { ok: !!r?.ok, text: r?.text ?? "Planted on the phone's network." }; }
        catch (e) { return { ok: false, text: (e as Error).message }; }
      },
      async forceTransfer(pocket) {
        if (!isPhonePocket(pocket)) return local.actions.forceTransfer!(pocket);
        try {
          const r = await command({ type: "force", pocket });
          const left = r?.balanceAfter ? (Number(BigInt(r.balanceAfter)) / 1e6).toFixed(2) : undefined;
          return { ok: !!r?.reverted, tx: r?.tx, text: r?.reverted ? `Reverted on-chain. The pocket still holds US$${left}.` : "The transfer was NOT refused." };
        } catch (e) { return { ok: false, text: (e as Error).message }; }
      },
      runScene: local.actions.runScene,
      async say(text, preset) {
        if (!phone) throw new Error("The phone is not connected");
        const r = await command({ type: "say", text, ...(preset ? { preset } : {}) }, 20_000);
        return { ok: !!r?.ok, text: String(r?.text ?? ""), pocket: r?.pocket };
      },
    },
    snapshot(): FeedSnapshot {
      const s = local.snapshot();
      if (!phone) return s;
      const byAt = <T extends { at?: number }>(a: T, b: T) => (a.at ?? 0) - (b.at ?? 0);
      return {
        events: [...s.events, ...phone.events].sort(byAt),
        pockets: [...phone.pockets, ...s.pockets.filter((p) => !phone!.pockets.some((x) => x.address.toLowerCase() === p.address.toLowerCase()))],
        txs: [...s.txs, ...phone.txs.filter((t) => t.status !== "reverted")].sort(byAt),
        allTxs: [...s.allTxs, ...phone.txs].sort(byAt),
        follow: latestPocket(phone.events, phone.txs, phone.pockets) ?? s.follow,
        linked: true,
        phonePockets: phone.pockets.map((p) => p.address),
      };
    },
    subscribe(f) { listeners.add(f); return () => void listeners.delete(f); },
    start() {
      stopped = false;
      offLocal = local.subscribe(emit);
      local.start();
      void look();
    },
    stop() {
      stopped = true; gen++; offLocal(); local.stop(); close();
      if (probe) clearTimeout(probe);
      setLinked(false);
    },
  };
}
