// App state: connection (runtime API URL, dev mode), config, owner key and wallet, pockets read from chain, the event stream
// (polled, deduped), pending approvals, chat turns. Business rules live in lib/*; this file wires them to React.
import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import type { Address, Hex } from "viem";
import { loadConfig, resetConfig, type Config } from "./lib/shared";
import { detectDev, isHttpUrl, getApi, getDev, getSource, setApiUrl as setRuntimeApi, setDev, setSource as setRuntimeSource, subscribeRuntime, ENV_API, type DevInfo, type Source } from "./lib/runtime";
import { ownerWallet, readPocket, isOwner, type OwnerWallet, type PocketView } from "./lib/wallet";
import { createKey, loadKey, loadPockets, randomKey, saveKey, savePockets } from "./lib/keystore";
import { builtin, seedFor, startOutsideAgents, uiGet, uiSet, wasRestored } from "./lib/builtin";
import { agentIdOf, agentViews, type AgentId, type AgentView } from "./lib/agents";
import { startRelay, type Say } from "./lib/relay";
import { createAutoplay, type AutoplayHost, type HostState } from "./lib/autoplay";
import { onAutoplay, autoplayRunning } from "./lib/autoplayTargets";
import { notifyAsk, onAskOpened } from "./lib/notify";
import { cleanText } from "./lib/sanitize";
import { agentInfo } from "../../shared/sim/agents";
import { router } from "expo-router";
import { notify } from "./lib/toast";
import { haptic } from "./haptics";
import { sameView, hkd } from "./lib/util";
import { loadMeta, saveMeta, type PocketMeta } from "./lib/pocketNames";
import { isTightCap } from "./lib/presets";
import * as api from "./lib/api";
import {
  approvalsFrom, authExpired, authMismatch, authOf, ledgerFrom, livePending, mergeEvents, nextCursor, replyOf, sameAddr, sliceTurn,
  type Approval, type LedgerRow, type WalletEvent,
} from "./lib/events";
import { getItem, setItem, deleteItem } from "./storage";
import { addOwnerTx, ownerRows, parseOwnerTxs, type OwnerTx } from "./lib/ownerTxs";
import { curSign, getChain } from "./lib/runtime";
import { setVisitorToken, signUp, stillSignedIn, tokenKey } from "./lib/visitor";

export type Turn = { id: string; pocket: string; text: string; fromAt: number; toAt?: number; /** the last event when the turn finished: anything later happened after it */ endAt?: number; reply?: string; stopped?: string; error?: string; done: boolean };
export type Pocket = PocketView & { name: string; style: PocketMeta["style"]; owned: boolean; /** the agent that holds it (immutable agent key) */ agentId?: AgentId; /** its pocket app, when it has one */ app?: PocketMeta["app"] };
export type Sheet = { mode: "fund" | "return" | "revoke"; pocket?: string } | null;
export type Rules = { pocket: string; field: "cap" | "ask"; amount?: string; topUp?: bigint } | null;
/** A just-confirmed owner transaction (or two), shown with its hash on the pocket page and in the agent chat until dismissed. */
export type Notice = { title: string; pocket?: string; txs: { label?: string; hash: string }[] } | null;
export type Conn = "connecting" | "online" | "offline";
export type Visitor = { state: "none" | "signing" | "ready" | "error"; id?: string; error?: string };

const API_KEY = "cb.apiUrl";
/** "builtin" when the owner turned on the demo network in Settings; anything else is the real chain (the default). */
const SOURCE_KEY = "cb.source";
const POLL_MS = 1500;

type Ctx = {
  // connection
  apiUrl: string; setApiUrl(u: string): Promise<void>; conn: Conn; connError: string; dev: DevInfo | null; retryConnect(): void;
  cfg: Config | null;
  // owner key
  keyState: "loading" | "none" | "ready"; wallet: OwnerWallet | null; importKey(pk: string): Promise<void>; newKey(): Promise<void>;
  /** Where data comes from: the ChainBrain server at `apiUrl` on the real chain (default) or the demo network (Settings). */
  source: Source; setSource(s: Source): Promise<void>;
  /** This key's visitor account on the server: signed up (or back in) with one guarded Login signature after connecting. */
  visitor: Visitor;
  /** The owner key, for the one-time backup in Settings. */
  exportKey(): Hex | null;
  balances: { ehkd: bigint; eth: bigint } | null;
  // pockets
  pockets: Pocket[]; pocketsLoaded: boolean; active?: Pocket; setActive(a: string): void;
  addPocket(a: Address, meta?: PocketMeta, o?: { activate?: boolean }): Promise<void>; refreshPockets(): Promise<void>; findPocket(a?: string): Pocket | undefined;
  // events and derived
  ownerTxs: OwnerTx[]; recordTx(t: Omit<OwnerTx, "at">): void;
  events: WalletEvent[]; ledger: LedgerRow[]; pending: Approval[]; sellerName(id?: string): string;
  // agents (built-in network: ChainBrain, Claude, ChatGPT; a real server: the built-in agent only)
  agents: AgentView[]; agentOf(pocket?: string): AgentId | undefined; connectAgent(id: AgentId): void; disconnectAgent(id: AgentId): void;
  /** The approval the sheet shows (the inbox picks one; new asks from the built-in agent open it by themselves). */
  approvalFocus: string | null; openApproval(id: string): void;
  // chat
  turns: Turn[]; sendChat(text: string, pocket?: string): Promise<void>; chatBusy: boolean; agentState: "idle" | "working" | "waiting" | "paused";
  // approvals
  answer(a: Approval, ok: boolean): Promise<api.ApprovalAnswer>; signApprove(a: Approval): Promise<api.ApprovalAnswer>; answered: Set<string>;
  // ui
  approvalOpen: boolean; setApprovalOpen(b: boolean): void; pickerOpen: boolean; setPickerOpen(b: boolean): void; questionOpen: boolean; setQuestionOpen(b: boolean): void;
  rules: Rules; setRules(r: Rules): void; notice: Notice; setNotice(n: Notice): void;
  receipt: LedgerRow | null; setReceipt(r: LedgerRow | null): void; action: Sheet; setAction(a: Sheet): void; flash: number; fireFlash(): void;
  /** Hidden video auto-play (long-press the Agent header): plays the wizard and scenes 1-8 through the real screens. */
  autoplay: { running: boolean; toggle(): void; stop(): void };
  /** The in-app explorer sheet for one transaction hash (built-in network and local fork), or null. */
  explorerTx: string | null; setExplorerTx(h: string | null): void;
};

let latest: Ctx | null = null;
const listeners = new Set<() => void>();
const subscribe = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
// The store as an external store: `useApp()` re-renders its component on every change, like a context would, except inside
// a paused region (a tab that is out of view, see PauseApp): there it keeps the value it last read, so the hidden tab skips
// the re-render, and reads the latest the moment the pause lifts. Freezing hidden tabs instead (react-native-screens'
// freezeOnBlur, React Suspense underneath) hid Activity's rows mid-animation and jammed the JS thread for seconds.
const Paused = createContext(false);
export function PauseApp({ paused, children }: { paused: boolean; children: React.ReactNode }) {
  return <Paused.Provider value={paused}>{children}</Paused.Provider>;
}
export function useApp(): Ctx {
  const paused = useContext(Paused);
  const held = useRef<Ctx | null>(null);
  return useSyncExternalStore(subscribe, () => {
    if (!latest) throw new Error("AppProvider missing");
    if (!paused || !held.current) held.current = latest;
    return held.current;
  });
}

// A narrow subscription for components that are expensive to re-render (cards, rows): `useApp()` re-renders on every store
// change (a new event, a new pending ask), `useAppSelect(s => s.active)` only when what it picks changes. The selector must
// return something the store already holds (a field, a memoised list, a primitive), never a new object, or it would never
// settle.
export function useAppSelect<T>(pick: (s: Ctx) => T): T {
  // deliberately not paused: what it picks changes rarely, and reading the pause would redraw every row of a tab each time
  // that tab is shown or hidden
  return useSyncExternalStore(subscribe, () => { if (!latest) throw new Error("AppProvider missing"); return pick(latest); });
}

const id = () => Math.random().toString(36).slice(2, 10);
const sameIds = (a: Set<string> | null, b: Set<string> | null) => a === b || (!!a && !!b && a.size === b.size && [...a].every((x) => b.has(x)));
/** Turns that were still running when the page went away: the agent did not survive the reload, so say so. */
const interrupted = (by: Record<string, Turn[]>) => Object.fromEntries(Object.entries(by).map(([k, ts]) => [k, ts.map((t) => (t.done ? t : {
  ...t, done: true, stopped: "reload", reply: t.reply ?? "The page reloaded while I was working, so I stopped here. Nothing else will be paid for this message.",
}))]));
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
  // names of pockets made on the built-in network this session (never written to storage): kept apart from the server's, so a
  // trip to a server and back neither loses them nor brings the server's names along
  const builtinMeta = useRef<Record<string, PocketMeta>>({});
  const [views, setViews] = useState<Record<string, PocketView>>({});
  const [pocketsLoaded, setPocketsLoaded] = useState(false);
  const [activeAddr, setActiveAddr] = useState<string>();
  const [events, setEvents] = useState<WalletEvent[]>([]);
  const [pendingIds, setPendingIds] = useState<Set<string> | null>(null);
  const [answered, setAnswered] = useState<Set<string>>(new Set());
  const [turnsBy, setTurnsBy] = useState<Record<string, Turn[]>>({});
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
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
      // the real chain unless the owner chose the demo network in Settings (that choice is kept)
      if ((await getItem(SOURCE_KEY)) === "builtin") setRuntimeSource("builtin");
      setSourceReady(true);
      // first launch: create the on-device key silently, no setup screen (an existing key is kept; "Import a key" lives in Settings)
      let k: Hex | null = null;
      // never overwrite: a key store that cannot be read gets a key for this session only, the stored one stays untouched
      let unreadable = false;
      try { k = await loadKey(); } catch { unreadable = true; }
      if (!k && !unreadable) { try { k = await createKey(); } catch { unreadable = true; } }
      if (!k && unreadable) { try { k = await randomKey(); } catch { k = null; } }
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
        setConnError(`Can't reach the ChainBrain network at ${apiUrl.replace(/^https?:\/\//, "")}.`);
      }
    })();
    return () => { alive = false; };
  }, [apiUrl, keyState, retry, local, sourceReady]);
  useEffect(() => {
    if (conn !== "offline") return;
    const t = setTimeout(() => setRetry((n) => n + 1), 5000);
    return () => clearTimeout(t);
  }, [conn, retry]);

  // ---- visitor account: once connected to a server, sign up or back in (one Login signature, checked by the signing guard).
  // A new account is funded by the server with real transactions; the notice shows the hash.
  const [visitor, setVisitor] = useState<Visitor>({ state: "none" });
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    if (local || conn !== "online" || !wallet || !cfg) { setVisitorToken(null); setVisitor({ state: "none" }); return; }
    let alive = true;
    (async () => {
      const k = tokenKey(apiUrl, wallet.address);
      const saved = await getItem(k);
      if (saved && (await stillSignedIn(saved))) { if (alive) { autoFunded.current = wallet.address; setVisitorToken(saved); setVisitor({ state: "ready" }); } return; }
      if (!alive) return;
      setVisitor({ state: "signing" });
      try {
        const r = await signUp(wallet.address, (ch) => wallet.signLogin(ch));
        if (!alive) return;
        // sign-up funded this wallet: the faucet must not claim again on a balance read from before the mint
        if (!r.funding.error) autoFunded.current = wallet.address;
        setVisitorToken(r.token); await setItem(k, r.token);
        setVisitor({ state: r.funding.error ? "error" : "ready", id: r.visitorId, error: r.funding.error ? `Signed in, but funding failed: ${r.funding.error}` : undefined });
        if (r.created && r.funding.mintTx) setNotice({ title: `Your wallet is ready: ${curSign()}${r.funding.minted} arrived`, txs: [{ label: `${curSign()}${r.funding.minted} to your main wallet`, hash: r.funding.mintTx }] });
        void refreshRef.current();
      } catch (e) {
        if (alive) setVisitor({ state: "error", error: (e as Error).message });
      }
    })();
    return () => { alive = false; };
  }, [local, conn, wallet, cfg, apiUrl]);

  // ---- pockets for this owner
  useEffect(() => {
    if (!wallet || !sourceReady) { setAddresses([]); setMeta({}); setPocketsLoaded(false); return; }
    let alive = true;
    if (local) {
      // the built-in network starts lived in: two pockets and earlier activity, made by running the same scenes
      seedFor(wallet.address).then(({ pockets: seeded, ownerTxs: txs }) => {
        if (!alive) return;
        const w = builtin();
        const others = w.chain.pocketsOf(wallet.address).filter((p) => !seeded.some((x) => sameAddr(x.address, p.address)));
        const born = (a: string) => w.chain.view(a as Address).createdAt ?? 0;
        // newest first (the card faces follow creation order); the chat starts on Research data, the scenes' pocket
        const list = [...others, ...seeded].sort((a, b) => born(b.address) - born(a.address)).map((p) => p.address as Address);
        const m: Record<string, PocketMeta> = {};
        for (const p of seeded) m[p.address.toLowerCase()] = { name: p.name, style: p.style, ...(p.app ? { app: p.app } : {}) };
        // a reload of this tab: the network came back, so do its names, chat and owner transactions (lib/builtin.ts)
        const back = wasRestored();
        ownerTxRef.current = (back && uiGet<OwnerTx[]>("ownerTxs")) || txs.map((t) => ({ kind: t.kind, pocket: t.pocket.toLowerCase(), hash: t.hash, at: t.at, amount: t.amount }));
        setOwnerTxs(ownerTxRef.current);
        if (back) setTurnsBy((old) => (Object.keys(old).length ? old : interrupted(uiGet<Record<string, Turn[]>>("turns") ?? {})));
        const saved = back ? uiGet<string>("active") : undefined;
        // names: the seeded ones, then this tab's saved ones (a reload), then any given since; never a server's (builtinMeta)
        setAddresses(list); setMeta({ ...m, ...(back ? uiGet<Record<string, PocketMeta>>("meta") ?? {} : {}), ...builtinMeta.current });
        setActiveAddr((a) => a ?? (saved && list.some((x) => sameAddr(x, saved)) ? saved : seeded[0]?.address ?? list[0])); setPocketsLoaded(true);
        startOutsideAgents(seeded); // Claude asks for a co-signature a little after launch (lands in the Approvals inbox)
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
    // keep the same objects when nothing changed: a new object re-renders every screen (and Hermes in dev is slow)
    if (bal) setBalances((old) => (old && old.ehkd === bal.ehkd && old.eth === bal.eth ? old : bal));
    setViews((old) => {
      let changed = false;
      const next = { ...old };
      list.forEach((a, i) => { const v = reads[i]; const k = a.toLowerCase(); if (v && !sameView(old[k], v)) { next[k] = v; changed = true; } });
      return changed ? next : old;
    });
  }, [wallet, cfg]);

  refreshRef.current = refreshPockets;
  useEffect(() => { void refreshPockets(); }, [refreshPockets, addresses, conn, dev]);
  // routines run when their time comes while the app is open (built-in network; lib/builtin.ts)
  useEffect(() => { if (!local) return; const t = setInterval(() => void builtin().tickRoutines().catch(() => {}), 20_000); return () => clearInterval(t); }, [local]);
  useEffect(() => { const t = setInterval(() => void refreshPockets(), 10000); return () => clearInterval(t); }, [refreshPockets]);

  // dev stack (or a FISCO server's faucet) and an empty phone key: ask for test money once per launch
  const autoFunded = useRef<string>("");
  useEffect(() => {
    if (!(dev || getChain()?.key === "fisco") || !wallet || !balances || balances.ehkd > 0n || autoFunded.current === wallet.address) return;
    // sign-up funds a new visitor; the faucet only steps in once sign-up is done and the wallet is still empty
    if (visitor.state === "signing" || visitor.state === "none") return;
    autoFunded.current = wallet.address;
    api.devFund(wallet.address).then(() => refreshPockets()).catch(() => { autoFunded.current = ""; });
  }, [dev, wallet, balances, refreshPockets, visitor.state]);

  const pockets = useMemo<Pocket[]>(() => addresses.flatMap((a) => {
    const v = views[a.toLowerCase()];
    if (!v || !wallet) return [];
    const m = meta[a.toLowerCase()] ?? { name: `Card ${short(a)}`, style: "custom" as const };
    return [{ ...v, name: m.name, style: m.style, owned: isOwner(v, wallet.address), agentId: agentIdOf(v, cfg?.agent), ...(m.app ? { app: m.app } : {}) }];
  }), [addresses, views, meta, wallet, cfg]);

  const active = pockets.find((p) => sameAddr(p.address, activeAddr)) ?? pockets[0];
  // the address list arrives before each pocket's contract read: until a read lands, the owner has pockets we can't show
  // yet, which is "loading", not "no pockets"
  const pocketsReady = pocketsLoaded && (addresses.length === 0 || pockets.length > 0);

  const addPocket = useCallback(async (a: Address, m?: PocketMeta, o: { activate?: boolean } = {}) => {
    if (!wallet) return;
    const next = [a, ...addrRef.current.filter((x) => !sameAddr(x, a))];
    addrRef.current = next;
    setAddresses(next); if (o.activate !== false) setActiveAddr(a); // a pocket for an outside agent never becomes the chat's pocket
    if (!local) await savePockets(wallet.address, next);
    if (m) {
      const nm = { ...meta, [a.toLowerCase()]: m }; setMeta(nm);
      if (local) builtinMeta.current = { ...builtinMeta.current, [a.toLowerCase()]: m }; else await saveMeta(wallet.address, nm);
    }
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
        const ids = res.some((r) => r === null) ? null : new Set(res.flatMap((r) => (r ?? []).map((x) => x.id)));
        setPendingIds((old) => (sameIds(old, ids) ? old : ids));
      } else setPendingIds((old) => (old && old.size === 0 ? old : new Set()));
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

  // refresh balances when money moved, and the pocket's state when the Sentinel froze or cleared it
  const moneyEvents = useMemo(() => events.filter((e) => e.type === "payment" || e.type === "approval" || e.type === "sentinel").length, [events]);
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
  // the built-in network mirrors itself to the console on the laptop when one is reachable (lib/relay.ts)
  const sayRef = useRef<Say>(async () => ({ ok: false, text: "Not ready" }));
  const metaRef = useRef(meta);
  metaRef.current = meta;
  useEffect(() => {
    if (!local || !wallet || !pocketsLoaded) return;
    return startRelay(wallet.address, () => Object.fromEntries(Object.entries(metaRef.current).map(([a, m]) => [a, m.name])), (text, preset) => sayRef.current(text, preset));
  }, [local, wallet, pocketsLoaded]);

  // a forced transfer the pocket refused on-chain (scene 5, set off from the console): tell the owner the moment it happens
  const forcedSeen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const f = myEvents.filter((e) => e.type === "forced");
    if (!forcedSeen.current) { if (events.length) forcedSeen.current = new Set(f.map((e) => String(e.tx))); return; }
    for (const e of f) {
      if (forcedSeen.current.has(String(e.tx))) continue;
      forcedSeen.current.add(String(e.tx));
      const name = meta[String(e.pocket).toLowerCase()]?.name ?? "your card";
      if (e.reverted) { let a = 0n; try { a = BigInt(e.amount ?? 0); } catch { /* shown without an amount */ } notify(a > 0n ? `Blocked a ${curSign()}${hkd(a)} transfer` : `Blocked a transfer out of ${name}`); haptic.warning(); }
    }
  }, [myEvents, events.length, meta]);
  const pending = useMemo(() => livePending(myEvents, { pendingIds }).filter((a) => !answered.has(a.id)), [myEvents, pendingIds, answered]);
  const sellerName = useCallback((sid?: string) => cfg?.sellers.find((s) => s.id === sid)?.name ?? sid ?? "Unknown seller", [cfg]);

  // the built-in network in a browser tab keeps the app's side too, so a reload comes back to the same chat
  useEffect(() => { if (local && pocketsLoaded) uiSet("turns", turnsBy); }, [local, pocketsLoaded, turnsBy]);
  useEffect(() => { if (local && pocketsLoaded) uiSet("meta", meta); }, [local, pocketsLoaded, meta]);
  useEffect(() => { if (local && pocketsLoaded) uiSet("ownerTxs", ownerTxs); }, [local, pocketsLoaded, ownerTxs]);
  useEffect(() => { if (local && pocketsLoaded && activeAddr) uiSet("active", activeAddr); }, [local, pocketsLoaded, activeAddr]);

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
      patchTurn(key, turn.id, { reply: r.reply, stopped: r.stopped, done: true, endAt: eventsRef.current.at(-1)?.at });
    } catch (e) {
      await pollRef.current();
      const late = replyOf(sliceTurn(eventsRef.current, fromAt));
      patchTurn(key, turn.id, late ? { reply: late, done: true, endAt: eventsRef.current.at(-1)?.at } : { error: "Lost the connection while the agent was working. It may still finish: check Activity.", done: true });
    }
    void refreshPockets();
  }, [active, pockets, turnsBy, refreshPockets]);

  // the console's Play button (via the relay): pick the pocket the scene needs, open the chat, type the sentence
  sayRef.current = async (text, preset) => {
    // ChainBrain's own pockets only: Claude's and ChatGPT's pockets name another agent key, so the chat's agent cannot pay from them
    const live = pockets.filter((p) => p.owned && !p.revoked && p.balance > 0n && (p.agentId ?? "chainbrain") === "chainbrain");
    const ids = (cfg?.sellers ?? []).map((s) => s.id);
    const tight = (p: Pocket) => isTightCap(p.cap, ids);
    const target = preset === "one-purchase" ? live.find(tight) : live.find((p) => sameAddr(p.address, activeAddr) && !tight(p)) ?? live.find((p) => !tight(p));
    if (!target) return { ok: false, text: "No card on the phone fits this scene" };
    if (turnsBy[target.address.toLowerCase()]?.some((t) => !t.done)) return { ok: false, text: "The agent is still busy on the phone" };
    setActiveAddr(target.address);
    try { router.navigate("/agent"); } catch { /* not mounted yet */ }
    void sendChat(text, target.address);
    return { ok: true, text: `Playing on the phone in ${target.name}`, pocket: target.address };
  };

  const agentState: Ctx["agentState"] = chatBusy ? (pending.length ? "waiting" : "working") : pending.length ? "waiting" : pockets.length > 0 && pockets.every((p) => p.revoked) ? "paused" : "idle";

  // ---- approvals
  const answer = useCallback(async (a: Approval, ok: boolean) => {
    const r = await api.answerApproval(a.id, { approved: ok });
    if (r.ok || r.error === "NOT_PENDING") setAnswered((s) => new Set(s).add(a.id));
    void pollRef.current();
    return r;
  }, []);

  /** Co-sign the exact eHKD TransferWithAuthorization the wallet tool layer built, then POST it. */
  const signApprove = useCallback(async (a: Approval): Promise<api.ApprovalAnswer> => {
    if (!wallet) return { ok: false, error: "NO_KEY" };
    const auth = authOf(a);
    if (!auth) return { ok: false, error: "NO_AUTH" };
    if (authExpired(auth)) return { ok: false, error: "AUTH_EXPIRED" };
    const wrong = authMismatch(a, auth, cfg?.sellers ?? []);
    if (wrong) return { ok: false, error: wrong };
    const view = views[a.pocket.toLowerCase()];
    if (view && !isOwner(view, wallet.address)) return { ok: false, error: "NOT_OWNER" };
    let signature: Hex;
    try { signature = await wallet.signTransfer(auth, auth); } catch (e) { return { ok: false, error: (e as Error)?.name === "GuardRefused" ? "GUARD_REFUSED" : "SIGN_FAILED" }; }
    const r = await api.answerApproval(a.id, { approved: true, signature });
    if (r.ok || r.error === "NOT_PENDING") setAnswered((s) => new Set(s).add(a.id));
    void pollRef.current();
    return r;
  }, [wallet, views, cfg]);

  // auto-open the approval sheet when something new needs the owner
  const lastOpened = useRef<string>("");
  // only the in-app agent's asks open the sheet by themselves; an outside agent's wait in the Approvals inbox (the bell)
  const [approvalFocus, setApprovalFocus] = useState<string | null>(null);
  const ask = pending.find((a) => a.kind !== "question" && (a.agent ?? "chainbrain") === "chainbrain");
  useEffect(() => {
    if (ask && ask.id !== lastOpened.current) { lastOpened.current = ask.id; setApprovalFocus(ask.id); setApprovalOpen(true); }
  }, [ask?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const focused = pending.some((a) => a.id === approvalFocus);
  useEffect(() => { if (approvalOpen && !focused && !ask) setApprovalOpen(false); }, [focused, ask?.id, approvalOpen]);
  const openApproval = useCallback((id: string) => { setApprovalFocus(id); setApprovalOpen(true); }, []);
  // an outside agent's new ask while ChainBrain is in the background: a local notification (opt-in), which opens the cheque
  const notified = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const a of pending) {
      const agent = a.agent ?? "chainbrain";
      if (agent === "chainbrain" || a.kind === "question" || notified.current.has(a.id)) continue;
      notified.current.add(a.id);
      const name = agentInfo(agent)?.name ?? "An agent";
      const title = a.kind === "payment" ? `${name} asks to pay${a.data?.amount ? ` ${curSign()}${cleanText(String(a.data.amount), 10)}` : ""}` : `${name} has a task for you`;
      const body = a.kind === "payment" ? `To ${cleanText(sellerName(a.data?.sellerId), 40)}. It needs your co-signature.` : cleanText(a.text ?? "Confirm it before it starts.", 120);
      void notifyAsk(a.id, title, body);
    }
  }, [pending]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => onAskOpened(openApproval), [openApproval]);

  // ---- agents
  const agentTick = useMemo(() => events.filter((e) => e.type === "agent").length, [events]);
  const agents = useMemo(() => agentViews({
    pockets, events: myEvents, ledger, pending, serverAgent: cfg?.agent, states: local ? builtin().agents() : undefined,
  }), [pockets, myEvents, ledger, pending, cfg, local, agentTick]); // eslint-disable-line react-hooks/exhaustive-deps
  const agentOf = useCallback((p?: string) => pockets.find((x) => sameAddr(x.address, p))?.agentId, [pockets]);
  const connectAgent = useCallback((id: AgentId) => { if (local) builtin().connect(id); }, [local]);
  const disconnectAgent = useCallback((id: AgentId) => { if (local) builtin().disconnect(id); haptic.warning(); }, [local]);

  // ---- hidden auto-play: reads the store through refs so the driver always sees the latest state
  const hostState = useRef<HostState>({ pending: [], busy: false, pocketCount: 0, lastPaymentAt: 0, ownerTxCount: 0 });
  hostState.current = {
    pending: pending.filter((a) => !active || sameAddr(a.pocket, active.address)).map((a) => ({ id: a.id, kind: a.kind })),
    busy: chatBusy, activeName: active?.name, activeAddress: active?.address, pocketCount: pockets.length,
    lastPaymentAt: myEvents.reduce((m, e) => (e.type === "payment" && e.at > m ? e.at : m), 0),
    ownerTxCount: ownerTxs.length,
    outside: pending.filter((a) => (a.agent ?? "chainbrain") !== "chainbrain").map((a) => ({ id: a.id, kind: a.kind, agent: a.agent })),
    routineRuns: active ? myEvents.filter((e) => e.type === "routine" && e.kind === "run" && sameAddr(e.pocket, active.address)).length : 0,
  };
  const hostSubs = useRef(new Set<() => void>());
  useEffect(() => { hostSubs.current.forEach((f) => f()); });
  const autoplayRef = useRef<ReturnType<typeof createAutoplay> | null>(null);
  if (!autoplayRef.current) {
    const host: AutoplayHost = {
      navigate: (path) => { try { router.navigate(path); } catch { /* not mounted yet */ } },
      state: () => hostState.current,
      subscribe: (f) => { hostSubs.current.add(f); return () => void hostSubs.current.delete(f); },
      forceTransfer: async (p) => {
        if (getSource() !== "builtin") { console.warn("auto-play: the forced transfer runs from the console on a server (Judges tab)"); return; }
        await builtin().forceTransfer(p as Address);
      },
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      inject: (sellerId, text) => { if (getSource() === "builtin") builtin().inject(sellerId, text); },
    };
    autoplayRef.current = createAutoplay(host);
  }
  const [autoplayOn, setAutoplayOn] = useState(false);
  useEffect(() => onAutoplay(() => setAutoplayOn(autoplayRunning())), []);
  const autoplay = useMemo(() => ({
    running: autoplayOn,
    toggle: () => { const a = autoplayRef.current!; haptic.medium(); if (a.running) a.stop(); else a.start(); },
    stop: () => autoplayRef.current?.stop(),
  }), [autoplayOn]);
  const [explorerTx, setExplorerTx] = useState<string | null>(null);

  // ---- key management and API override
  const importKey = useCallback(async (k: string) => { await saveKey(k); setPk(k.trim() as Hex); }, []);
  const newKey = useCallback(async () => { setPk(await createKey()); }, []);
  const setSource = useCallback(async (s: Source) => {
    resetConfig(); setCfg(null); setConn("connecting"); setPocketsLoaded(false); setBalances(null); setViews({}); setAnswered(new Set()); setTurnsBy({});
    // nothing from the other network may linger on screen (a stale notice could link its hash to the server explorer)
    setNotice(null); setReceipt(null); setAction(null); setRules(null); setApprovalOpen(false); setQuestionOpen(false); setPickerOpen(false); forcedSeen.current = null;
    setExplorerTx(null); autoplayRef.current?.stop();
    if (s === "builtin") await setItem(SOURCE_KEY, "builtin"); else await deleteItem(SOURCE_KEY);
    setRuntimeSource(s);
    setRetry((n) => n + 1);
  }, []);
  const setApiUrl = useCallback(async (u: string) => {
    if (u.trim() && !isHttpUrl(u)) return; // the Settings form says why
    if (u.trim()) await setItem(API_KEY, u.trim().replace(/\/+$/, "")); else await deleteItem(API_KEY);
    resetConfig(); setCfg(null); setConn("connecting");
    setRuntimeApi(u);
    setRetry((n) => n + 1);
  }, []);

  const value: Ctx = {
    apiUrl, setApiUrl, conn, connError, dev, retryConnect: () => setRetry((n) => n + 1), cfg, source, setSource, visitor, exportKey: () => pk,
    keyState, wallet, importKey, newKey, balances,
    pockets, pocketsLoaded: pocketsReady, active, setActive: setActiveAddr, addPocket, refreshPockets,
    findPocket: (a) => pockets.find((p) => sameAddr(p.address, a)),
    ownerTxs, recordTx, events: myEvents, ledger, pending, sellerName,
    agents, agentOf, connectAgent, disconnectAgent, approvalFocus, openApproval,
    turns, sendChat, chatBusy, agentState,
    answer, signApprove, answered,
    approvalOpen, setApprovalOpen, pickerOpen, setPickerOpen, questionOpen, setQuestionOpen, rules, setRules, notice, setNotice, receipt, setReceipt, action, setAction, flash, fireFlash: () => setFlash((n) => n + 1),
    autoplay, explorerTx, setExplorerTx,
  };
  latest = value; // children rendering in this same pass read the new value; subscribers re-check after the commit
  useLayoutEffect(() => { listeners.forEach((f) => f()); });
  return <>{children}</>;
}

export { approvalsFrom };
