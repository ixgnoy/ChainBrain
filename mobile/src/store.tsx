// App state: connection (runtime API URL, dev mode), config, owner key and wallet, pockets read from chain, the event stream
// (polled, deduped), pending approvals, chat turns. Business rules live in lib/*; this file wires them to React.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import type { Address, Hex } from "viem";
import { loadConfig, resetConfig, type Config } from "./lib/shared";
import { detectDev, getApi, getDev, getSource, setApiUrl as setRuntimeApi, setDev, setSource as setRuntimeSource, subscribeRuntime, ENV_API, type DevInfo, type Source } from "./lib/runtime";
import { ownerWallet, readPocket, isOwner, type OwnerWallet, type PocketView } from "./lib/wallet";
import { createKey, loadKey, loadPockets, saveKey, savePockets } from "./lib/keystore";
import { builtin, seedFor } from "./lib/builtin";
import { loadMeta, saveMeta, type PocketMeta } from "./lib/pocketNames";
import * as api from "./lib/api";
import {
  approvalsFrom, authExpired, authOf, ledgerFrom, livePending, mergeEvents, nextCursor, replyOf, sameAddr, sliceTurn,
  type Approval, type LedgerRow, type WalletEvent,
} from "./lib/events";
import { getItem, setItem, deleteItem } from "./storage";
import { addOwnerTx, ownerRows, parseOwnerTxs, type OwnerTx } from "./lib/ownerTxs";

export type Turn = { id: string; pocket: string; text: string; fromAt: number; toAt?: number; reply?: string; stopped?: string; error?: string; done: boolean };
export type Pocket = PocketView & { name: string; style: PocketMeta["style"]; owned: boolean };
export type Sheet = { mode: "fund" | "return" | "revoke"; pocket?: string } | null;
export type Rules = { pocket: string; field: "cap" | "ask"; amount?: string; topUp?: bigint } | null;
/** A just-confirmed owner transaction (or two), shown with its hash on the pocket page and in the agent chat until dismissed. */
export type Notice = { title: string; pocket?: string; txs: { label?: string; hash: string }[] } | null;
export type Conn = "connecting" | "online" | "offline";

const API_KEY = "cb.apiUrl";
const SOURCE_KEY = "cb.source";
const POLL_MS = 1500;

type Ctx = {
  // connection
  apiUrl: string; setApiUrl(u: string): Promise<void>; conn: Conn; connError: string; dev: DevInfo | null; retryConnect(): void;
  cfg: Config | null;
  // owner key
  keyState: "loading" | "none" | "ready"; wallet: OwnerWallet | null; importKey(pk: string): Promise<void>; newKey(): Promise<void>;
  /** Where data comes from: the network built into the app (default) or the wallet server at `apiUrl`. */
  source: Source; setSource(s: Source): Promise<void>;
  balances: { usdc: bigint; eth: bigint } | null;
  // pockets
  pockets: Pocket[]; pocketsLoaded: boolean; active?: Pocket; setActive(a: string): void;
  addPocket(a: Address, meta?: PocketMeta): Promise<void>; refreshPockets(): Promise<void>; findPocket(a?: string): Pocket | undefined;
  // events and derived
  ownerTxs: OwnerTx[]; recordTx(t: Omit<OwnerTx, "at">): void;
  events: WalletEvent[]; ledger: LedgerRow[]; pending: Approval[]; sellerName(id?: string): string;
  // chat
  turns: Turn[]; sendChat(text: string, pocket?: string): Promise<void>; chatBusy: boolean; agentState: "idle" | "working" | "waiting" | "paused";
  // approvals
  answer(a: Approval, ok: boolean): Promise<api.ApprovalAnswer>; signApprove(a: Approval): Promise<api.ApprovalAnswer>; answered: Set<string>;
  // ui
  approvalOpen: boolean; setApprovalOpen(b: boolean): void; questionOpen: boolean; setQuestionOpen(b: boolean): void;
  rules: Rules; setRules(r: Rules): void; notice: Notice; setNotice(n: Notice): void;
  receipt: LedgerRow | null; setReceipt(r: LedgerRow | null): void; action: Sheet; setAction(a: Sheet): void; flash: number; fireFlash(): void;
};

const AppCtx = createContext<Ctx | null>(null);
export const useApp = (): Ctx => { const v = useContext(AppCtx); if (!v) throw new Error("AppProvider missing"); return v; };

const id = () => Math.random().toString(36).slice(2, 10);
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [apiUrl, setApiState] = useState(ENV_API);
  const [conn, setConn] = useState<Conn>("connecting");
  const [connError, setConnError] = useState("");
  const [dev, setDevState] = useState<DevInfo | null>(null);
  const [cfg, setCfg] = useState<Config | null>(null);
  const [keyState, setKeyState] = useState<Ctx["keyState"]>("loading");
  const [pk, setPk] = useState<Hex | null>(null);
  const [balances, setBalances] = useState<Ctx["balances"]>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [meta, setMeta] = useState<Record<string, PocketMeta>>({});
  const [views, setViews] = useState<Record<string, PocketView>>({});
  const [pocketsLoaded, setPocketsLoaded] = useState(false);
  const [activeAddr, setActiveAddr] = useState<string>();
  const [events, setEvents] = useState<WalletEvent[]>([]);
  const [pendingIds, setPendingIds] = useState<Set<string> | null>(null);
  const [answered, setAnswered] = useState<Set<string>>(new Set());
  const [turnsBy, setTurnsBy] = useState<Record<string, Turn[]>>({});
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [questionOpen, setQuestionOpen] = useState(false);
  const [receipt, setReceipt] = useState<LedgerRow | null>(null);
  const [action, setAction] = useState<Sheet>(null);
  const [rules, setRules] = useState<Rules>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [ownerTxs, setOwnerTxs] = useState<OwnerTx[]>([]);
  const ownerTxRef = useRef<OwnerTx[]>([]);
  const [flash, setFlash] = useState(0);
  const [retry, setRetry] = useState(0);
  const [source, setSourceState] = useState<Source>(getSource());
  const [sourceReady, setSourceReady] = useState(false);
  const local = source === "builtin"; // nothing from the built-in network is written to the device's storage

  const eventsRef = useRef<WalletEvent[]>([]);
  const seen = useRef(new Set<string>());
  const cursor = useRef(0);
  const addrRef = useRef<Address[]>([]);
  addrRef.current = addresses;

  const wallet = useMemo(() => (pk ? ownerWallet(pk) : null), [pk]);

  // ---- runtime API URL (persisted override) and key
  useEffect(() => {
    const off = subscribeRuntime(() => { setApiState(getApi()); setDevState(getDev()); setSourceState(getSource()); });
    (async () => {
      const saved = await getItem(API_KEY);
      if (saved) setRuntimeApi(saved);
      setApiState(getApi());
      if ((await getItem(SOURCE_KEY)) === "server") setRuntimeSource("server");
      setSourceReady(true);
      // first launch: create the on-device key silently, no setup screen (an existing key is kept; "Import a key" lives in Settings)
      let k: Hex | null = null;
      try { k = await loadKey(); } catch { k = null; }
      if (!k) { try { k = await createKey(); } catch { k = null; } }
      setPk(k);
      setKeyState("ready");
    })();
    return off;
  }, []);
  useEffect(() => { if (keyState === "ready" && !pk) setKeyState("none"); }, [keyState, pk]);
  useEffect(() => { if (pk) setKeyState("ready"); }, [pk]);

  // ---- connect: dev detection, then /api/config. Retries while offline. The built-in network is always there.
  useEffect(() => {
    if (keyState === "loading" || !sourceReady) return;
    let alive = true;
    if (local) {
      setDev(null);
      setCfg(builtin().config() as Config); setConn("online"); setConnError("");
      return () => { alive = false; };
    }
    setConn((c) => (c === "online" ? c : "connecting"));
    (async () => {
      const d = await detectDev(apiUrl);
      if (!alive) return;
      setDev(d);
      try {
        const c = await loadConfig();
        if (!alive) return;
        setCfg(c); setConn("online"); setConnError("");
      } catch (e) {
        if (!alive) return;
        setConn("offline");
        setConnError(`Wallet API not reachable at ${apiUrl}. On a phone use your laptop's LAN address, not localhost.`);
      }
    })();
    return () => { alive = false; };
  }, [apiUrl, keyState, retry, local, sourceReady]);
  useEffect(() => {
    if (conn !== "offline") return;
    const t = setTimeout(() => setRetry((n) => n + 1), 5000);
    return () => clearTimeout(t);
  }, [conn, retry]);

  // ---- pockets for this owner
  useEffect(() => {
    if (!wallet || !sourceReady) { setAddresses([]); setMeta({}); setPocketsLoaded(false); return; }
    let alive = true;
    if (local) {
      // the built-in network starts lived in: two pockets and earlier activity, made by running the same scenes
      seedFor(wallet.address).then(({ pockets: seeded, ownerTxs: txs }) => {
        if (!alive) return;
        const others = builtin().chain.pocketsOf(wallet.address).filter((p) => !seeded.some((x) => sameAddr(x.address, p.address)));
        const list = [...others.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)), ...seeded].map((p) => p.address as Address); // Research data first
        const m: Record<string, PocketMeta> = {};
        for (const p of seeded) m[p.address.toLowerCase()] = { name: p.name, style: p.style };
        ownerTxRef.current = txs.map((t) => ({ kind: t.kind, pocket: t.pocket.toLowerCase(), hash: t.hash, at: t.at, amount: t.amount }));
        setOwnerTxs(ownerTxRef.current);
        setAddresses(list); setMeta((old) => ({ ...m, ...old })); setActiveAddr((a) => a ?? list[0]); setPocketsLoaded(true);
      });
      return () => { alive = false; };
    }
    Promise.all([loadPockets(wallet.address), loadMeta(wallet.address), getItem(`cb.ownerTxs.${wallet.address.toLowerCase()}`)]).then(([list, m, txs]) => {
      if (!alive) return;
      ownerTxRef.current = parseOwnerTxs(txs); setOwnerTxs(ownerTxRef.current);
      setAddresses(list); setMeta(m); setActiveAddr((a) => a ?? list[0]); setPocketsLoaded(true);
    });
    return () => { alive = false; };
  }, [wallet, local, sourceReady]);

  const refreshPockets = useCallback(async () => {
    if (!wallet || !cfg) return;
    const list = addrRef.current;
    const [bal, reads] = await Promise.all([
      wallet.balances().catch(() => null),
      Promise.all(list.map((a) => readPocket(a).catch(() => null))),
    ]);
    if (bal) setBalances(bal);
    setViews((old) => {
      const next = { ...old };
      list.forEach((a, i) => { const v = reads[i]; if (v) next[a.toLowerCase()] = v; });
      return next;
    });
  }, [wallet, cfg]);

  useEffect(() => { void refreshPockets(); }, [refreshPockets, addresses, conn, dev]);
  useEffect(() => { const t = setInterval(() => void refreshPockets(), 10000); return () => clearInterval(t); }, [refreshPockets]);

  // dev stack and an empty phone key: ask /dev/fund for test money once per launch
  const autoFunded = useRef<string>("");
  useEffect(() => {
    if (!dev || !wallet || !balances || balances.usdc > 0n || autoFunded.current === wallet.address) return;
    autoFunded.current = wallet.address;
    api.devFund(wallet.address).then(() => refreshPockets()).catch(() => { autoFunded.current = ""; });
  }, [dev, wallet, balances, refreshPockets]);

  const pockets = useMemo<Pocket[]>(() => addresses.flatMap((a) => {
    const v = views[a.toLowerCase()];
    if (!v || !wallet) return [];
    const m = meta[a.toLowerCase()] ?? { name: `Pocket ${short(a)}`, style: "custom" as const };
    return [{ ...v, name: m.name, style: m.style, owned: isOwner(v, wallet.address) }];
  }), [addresses, views, meta, wallet]);

  const active = pockets.find((p) => sameAddr(p.address, activeAddr)) ?? pockets[0];

  const addPocket = useCallback(async (a: Address, m?: PocketMeta) => {
    if (!wallet) return;
    const next = [a, ...addrRef.current.filter((x) => !sameAddr(x, a))];
    addrRef.current = next;
    setAddresses(next); setActiveAddr(a);
    if (!local) await savePockets(wallet.address, next);
    if (m) { const nm = { ...meta, [a.toLowerCase()]: m }; setMeta(nm); if (!local) await saveMeta(wallet.address, nm); }
    await refreshPockets();
  }, [wallet, meta, refreshPockets, local]);

  // ---- event stream: poll /api/events.json (React Native has no EventSource), then reconcile with /api/pending
  const poll = useCallback(async () => {
    if (!cfg) return;
    try {
      const fresh = await api.fetchEvents(cursor.current);
      const next = mergeEvents(eventsRef.current, fresh, seen.current);
      if (next !== eventsRef.current) { eventsRef.current = next; setEvents(next); cursor.current = nextCursor(next, cursor.current); }
      // events first, pending second: anything seen in events that is still pending server-side must be in this list
      const list = addrRef.current;
      if (list.length) {
        const res = await Promise.all(list.map((a) => api.fetchPending(a).catch(() => null)));
        setPendingIds(res.some((r) => r === null) ? null : new Set(res.flatMap((r) => (r ?? []).map((x) => x.id))));
      } else setPendingIds(new Set());
      setConn("online");
    } catch { /* keep polling; connect effect reports offline when config fails */ }
  }, [cfg]);
  const pollRef = useRef(poll);
  pollRef.current = poll;

  useEffect(() => {
    // new server (API URL changed): forget the old stream
    eventsRef.current = []; seen.current = new Set(); cursor.current = 0; setEvents([]); setPendingIds(null);
  }, [apiUrl, dev?.startedAt, source]);
  useEffect(() => {
    if (!cfg) return;
    let on = AppState.currentState !== "background";
    const sub = AppState.addEventListener("change", (s) => { on = s === "active"; if (on) void pollRef.current(); });
    void pollRef.current();
    const t = setInterval(() => { if (on) void pollRef.current(); }, POLL_MS);
    // the built-in network pushes: read the moment something happens (coalesced to one read per frame or two)
    let soon: ReturnType<typeof setTimeout> | null = null;
    const off = local ? builtin().subscribe(() => { if (!soon) soon = setTimeout(() => { soon = null; void pollRef.current(); }, 32); }) : () => {};
    return () => { clearInterval(t); sub.remove(); off(); if (soon) clearTimeout(soon); };
  }, [cfg, apiUrl, local]);

  // refresh balances when money moved
  const moneyEvents = useMemo(() => events.filter((e) => e.type === "payment" || e.type === "approval").length, [events]);
  useEffect(() => { if (moneyEvents) void refreshPockets(); }, [moneyEvents, refreshPockets]);

  // ---- derived views, restricted to this owner's pockets
  const mine = useMemo(() => new Set(addresses.map((a) => a.toLowerCase())), [addresses]);
  const myEvents = useMemo(() => events.filter((e) => e.pocket && mine.has(e.pocket.toLowerCase())), [events, mine]);
  const ledger = useMemo(() => [...ledgerFrom(myEvents), ...ownerRows(ownerTxs.filter((t) => mine.has(t.pocket.toLowerCase())))].sort((x, y) => x.at - y.at), [myEvents, ownerTxs, mine]);
  const recordTx = useCallback((t: Omit<OwnerTx, "at">) => {
    if (!wallet) return;
    ownerTxRef.current = addOwnerTx(ownerTxRef.current, { ...t, pocket: t.pocket.toLowerCase(), at: Date.now() });
    setOwnerTxs(ownerTxRef.current);
    if (!local) void setItem(`cb.ownerTxs.${wallet.address.toLowerCase()}`, JSON.stringify(ownerTxRef.current));
  }, [wallet, local]);
  const pending = useMemo(() => livePending(myEvents, { pendingIds }).filter((a) => !answered.has(a.id)), [myEvents, pendingIds, answered]);
  const sellerName = useCallback((sid?: string) => cfg?.sellers.find((s) => s.id === sid)?.name ?? sid ?? "Unknown seller", [cfg]);

  // ---- chat
  const turns = useMemo(() => (active ? turnsBy[active.address.toLowerCase()] ?? [] : []), [turnsBy, active]);
  const chatBusy = turns.some((t) => !t.done);
  const patchTurn = (pocket: string, tid: string, patch: Partial<Turn>) =>
    setTurnsBy((m) => ({ ...m, [pocket]: (m[pocket] ?? []).map((t) => (t.id === tid ? { ...t, ...patch } : t)) }));

  const sendChat = useCallback(async (text: string, pocket?: string) => {
    const a = pocket ? pockets.find((p) => sameAddr(p.address, pocket)) : active; const t = text.trim();
    if (!a || !t || turnsBy[a.address.toLowerCase()]?.some((x) => !x.done)) return;
    setActiveAddr(a.address);
    await pollRef.current();
    const key = a.address.toLowerCase();
    const fromAt = eventsRef.current.at(-1)?.at ?? 0;
    const turn: Turn = { id: id(), pocket: key, text: t, fromAt, done: false };
    setTurnsBy((m) => {
      const prev = m[key] ?? [];
      return { ...m, [key]: [...prev.map((x, i) => (i === prev.length - 1 && x.toAt == null ? { ...x, toAt: fromAt } : x)), turn] };
    });
    try {
      const r = await api.chat(a.address, t);
      await pollRef.current();
      patchTurn(key, turn.id, { reply: r.reply, stopped: r.stopped, done: true });
    } catch (e) {
      await pollRef.current();
      const late = replyOf(sliceTurn(eventsRef.current, fromAt));
      patchTurn(key, turn.id, late ? { reply: late, done: true } : { error: "Lost the connection while the agent was working. It may still finish: check Activity.", done: true });
    }
    void refreshPockets();
  }, [active, pockets, turnsBy, refreshPockets]);

  const agentState: Ctx["agentState"] = chatBusy ? (pending.length ? "waiting" : "working") : pending.length ? "waiting" : pockets.length > 0 && pockets.every((p) => p.revoked) ? "paused" : "idle";

  // ---- approvals
  const answer = useCallback(async (a: Approval, ok: boolean) => {
    const r = await api.answerApproval(a.id, { approved: ok });
    if (r.ok || r.error === "NOT_PENDING") setAnswered((s) => new Set(s).add(a.id));
    void pollRef.current();
    return r;
  }, []);

  /** Co-sign the exact USDC TransferWithAuthorization the wallet tool layer built, then POST it. */
  const signApprove = useCallback(async (a: Approval): Promise<api.ApprovalAnswer> => {
    if (!wallet) return { ok: false, error: "NO_KEY" };
    const auth = authOf(a);
    if (!auth) return { ok: false, error: "NO_AUTH" };
    if (authExpired(auth)) return { ok: false, error: "AUTH_EXPIRED" };
    const view = views[a.pocket.toLowerCase()];
    if (view && !isOwner(view, wallet.address)) return { ok: false, error: "NOT_OWNER" };
    let signature: Hex;
    try { signature = await wallet.signTransfer(auth); } catch { return { ok: false, error: "SIGN_FAILED" }; }
    const r = await api.answerApproval(a.id, { approved: true, signature });
    if (r.ok || r.error === "NOT_PENDING") setAnswered((s) => new Set(s).add(a.id));
    void pollRef.current();
    return r;
  }, [wallet, views]);

  // auto-open the approval sheet when something new needs the owner
  const lastOpened = useRef<string>("");
  const ask = pending.find((a) => a.kind !== "question");
  useEffect(() => {
    if (ask && ask.id !== lastOpened.current) { lastOpened.current = ask.id; setApprovalOpen(true); }
    if (!ask) setApprovalOpen(false);
  }, [ask?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- key management and API override
  const importKey = useCallback(async (k: string) => { await saveKey(k); setPk(k.trim() as Hex); }, []);
  const newKey = useCallback(async () => { setPk(await createKey()); }, []);
  const setSource = useCallback(async (s: Source) => {
    if (s === "server") await setItem(SOURCE_KEY, "server"); else await deleteItem(SOURCE_KEY);
    resetConfig(); setCfg(null); setConn("connecting"); setPocketsLoaded(false); setBalances(null); setViews({}); setAnswered(new Set()); setTurnsBy({});
    setRuntimeSource(s);
    setRetry((n) => n + 1);
  }, []);
  const setApiUrl = useCallback(async (u: string) => {
    if (u.trim()) await setItem(API_KEY, u.trim().replace(/\/+$/, "")); else await deleteItem(API_KEY);
    resetConfig(); setCfg(null); setConn("connecting");
    setRuntimeApi(u);
    setRetry((n) => n + 1);
  }, []);

  const value: Ctx = {
    apiUrl, setApiUrl, conn, connError, dev, retryConnect: () => setRetry((n) => n + 1), cfg, source, setSource,
    keyState, wallet, importKey, newKey, balances,
    pockets, pocketsLoaded, active, setActive: setActiveAddr, addPocket, refreshPockets,
    findPocket: (a) => pockets.find((p) => sameAddr(p.address, a)),
    ownerTxs, recordTx, events: myEvents, ledger, pending, sellerName,
    turns, sendChat, chatBusy, agentState,
    answer, signApprove, answered,
    approvalOpen, setApprovalOpen, questionOpen, setQuestionOpen, rules, setRules, notice, setNotice, receipt, setReceipt, action, setAction, flash, fireFlash: () => setFlash((n) => n + 1),
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export { approvalsFrom };
