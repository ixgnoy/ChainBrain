// The network built into the app (shared/sim): the same wallet API, tools, agent and pocket rules as the server, running
// on the phone. The app opens on it every launch, already lived in (two pockets, earlier purchases). No React Native
// imports, so Node tests can load it.
//
// In a browser the network is also kept in sessionStorage, so a reload or a crashed tab ("Aw, Snap!") comes back where
// it was instead of wiping a demo halfway. A new tab, or the native app's next launch, still starts fresh.
import type { Hex } from "viem";
import { createWorld, decode, encode, seedOwner, claudeAsksForPremium, errand, firstRun, type World, type SeededPocket, type OwnerTxSeed, type AgentId } from "../../../shared/sim";
import { recoverTransferSigner, type Authorization } from "./typed";

type Seeded = { pockets: SeededPocket[]; ownerTxs: OwnerTxSeed[] };
type Saved = { world: ReturnType<World["dump"]>; seeded: Record<string, Seeded>; ui: Record<string, unknown> };

const KEY = "cb.builtin";
const SAVE_MS = 600;

let world: World | null = null;
let restored = false;
const seeded = new Map<string, Promise<Seeded>>();
const seededDone = new Map<string, Seeded>();
let ui: Record<string, unknown> = {};
let off = false; // Start over: nothing more is saved before the reload

/** sessionStorage when there is one (web); never throws. */
function session(): Storage | null {
  try { return (globalThis as { sessionStorage?: Storage }).sessionStorage ?? null; } catch { return null; }
}
function readSaved(): Saved | null {
  try { const s = session()?.getItem(KEY); return s ? decode<Saved>(s) : null; } catch { return null; }
}

let timer: ReturnType<typeof setTimeout> | null = null;
function saveNow() {
  if (timer) { clearTimeout(timer); timer = null; }
  const s = session();
  if (!s || !world || off) return;
  try { s.setItem(KEY, encode({ world: world.dump(), seeded: Object.fromEntries(seededDone), ui } satisfies Saved)); } catch (e) { console.warn("[builtin-save]", e); /* full or blocked: the demo keeps running, unsaved */ }
}
function saveSoon() { if (session() && !timer && !off) timer = setTimeout(saveNow, SAVE_MS); }

export function builtin(): World {
  if (world) return world;
  const saved = readSaved();
  world = createWorld({
    seed: Math.floor(Math.random() * 2 ** 31),
    revokeWindowMs: 9000,
    // the owner's co-signature is checked exactly like the server does (server/src/index.ts)
    verifyOwnerSig: async (auth, signature, owner) => recoverTransferSigner(auth as Authorization, signature as Hex).toLowerCase() === owner.toLowerCase(),
  });
  if (saved && world.load(saved.world)) {
    restored = true;
    for (const [owner, s] of Object.entries(saved.seeded ?? {})) { seededDone.set(owner, s); seeded.set(owner, Promise.resolve(s)); }
    ui = saved.ui ?? {};
  } else if (saved) session()?.removeItem(KEY); // an older shape: drop it
  if (session()) {
    world.subscribe(saveSoon);
    world.chain.onTx(saveSoon);
    const w = globalThis as { addEventListener?: (t: string, f: () => void) => void; document?: { visibilityState?: string } };
    w.addEventListener?.("pagehide", saveNow);
    w.addEventListener?.("visibilitychange", () => { if (w.document?.visibilityState === "hidden") saveNow(); });
  }
  return world;
}

/** Earlier activity for this owner, created once per launch (or brought back with a saved network). */
export function seedFor(owner: string) {
  const k = owner.toLowerCase();
  if (!seeded.has(k)) seeded.set(k, seedOwner(builtin(), owner as Hex).then((s) => { seededDone.set(k, s); saveSoon(); return s; }));
  return seeded.get(k)!;
}

/** The network came back from this tab's earlier page (a reload or a crash), not from a fresh start. */
export const wasRestored = () => { builtin(); return restored; };

/** App state that belongs with the saved network (chat turns, pocket names): read once at start, written with it. */
export function uiGet<T>(key: string): T | undefined { builtin(); return ui[key] as T | undefined; }
export function uiSet(key: string, value: unknown) { ui[key] = value; saveSoon(); }

/** Settings → Start over: forget this tab's network; the caller reloads. */
export function forgetSaved() { off = true; if (timer) { clearTimeout(timer); timer = null; } session()?.removeItem(KEY); }

/** Outside agents keep working after launch: Claude asks the owner to co-sign a premium report ~12 s in (the intro is
 *  over by then). Once per world, and not again after a reload (the saved network already has it, answered or not).
 *  It waits in the Approvals inbox and expires unanswered after 10 minutes. */
let outsideStarted: World | null = null;
export function startOutsideAgents(pockets: SeededPocket[], delayMs = 12_000) {
  const w = builtin();
  if (outsideStarted === w || restored) return;
  outsideStarted = w;
  const news = pockets.find((p) => p.agent === "claude");
  if (!news) return;
  setTimeout(() => { if (world === w) void claudeAsksForPremium(w, news.address).catch(() => {}); }, delayMs);
}

/** The owner allowed an outside agent and gave it a new pocket (Connect, consent sheet): it connects, reads the pocket, then
 *  starts the task it came for. That task needs the owner twice, in the Approvals inbox: confirm the task, then co-sign the
 *  counterparty check (US$0.05, above the pocket's US$0.02 ask-me limit). Resolves when its run ends. */
export async function startGrantedAgent(id: AgentId, pocket: Hex) {
  const w = builtin();
  w.connect(id);
  await w.act(id, pocket, firstRun());
  await w.sleep(1800);
  return w.act(id, pocket, errand({ what: "A check on the exporter's wallet for this week's market brief", maxPrice: "0.05", maxTotal: "0.05", buys: [["nansen", "counterparties"]], say: "Writing down what I'd like to buy, so you can confirm it before I spend anything." }));
}

/** Tests: start over. */
export function resetBuiltin() { world = null; restored = false; seeded.clear(); seededDone.clear(); ui = {}; off = false; outsideStarted = null; if (timer) { clearTimeout(timer); timer = null; } }
