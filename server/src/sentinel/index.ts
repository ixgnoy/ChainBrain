import { createWalletClient, http, stringToHex, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { cfg } from "../chains";
import { bus } from "../wallet/events";
import { pocket as P, pocketAbi, pub } from "../wallet/chain";
import { rules, ruleSeverity, gate, stateText, PROBE_REASONS, RANK, type AiAnswer, type Severity, type Signal } from "../../../shared/sim/sentinel";
import { defaultDecide, type Decide } from "./decide";

type Watch = { status: Severity; hold: boolean; clearedAt: number; decisions: { at: number; action: Severity; signals: Signal[]; ai: AiAnswer | null; tx?: Hex; note?: string }[] };
const watches = new Map<string, Watch>();
const watchOf = (p: string) => watches.get(p.toLowerCase()) ?? watches.set(p.toLowerCase(), { status: "ok", hold: false, clearedAt: 0, decisions: [] }).get(p.toLowerCase())!;
const TRIGGERS = new Set(["refusal", "disclosure", "attack", "forced", "payment"]);

/** The guardian key's one call: Pocket.freeze(reason). SENTINEL_PK unset = no on-chain freeze (the Sentinel holds instead). */
export async function freezeOnChain(pocket: Address, reason: string): Promise<Hex> {
  const pk = process.env.SENTINEL_PK as Hex | undefined;
  if (!pk) throw new Error("SENTINEL_PK not set");
  const w = createWalletClient({ account: privateKeyToAccount(pk), chain: cfg().chain, transport: http(cfg().rpc) });
  const hash = await w.writeContract({ address: pocket, abi: pocketAbi, functionName: "freeze", args: [stringToHex(reason, { size: 32 })] } as any);
  const rc = await pub().waitForTransactionReceipt({ hash });
  if (rc.status !== "success") throw new Error(`freeze reverted: ${hash}`);
  return hash;
}

export type SentinelDeps = {
  decide?: Decide;
  freeze?: (pocket: Address, reason: string) => Promise<Hex>;
  /** eHKD that left the pocket with no payment event (the transfer index); omitted = not checked. */
  ghosts?: (pocket: Address, paidTx: Set<string>) => Promise<{ tx: string; to: string; amount: bigint }[]>;
  /** Pocket.frozen on-chain (tests pass a fake). */
  isFrozen?: (pocket: Address) => Promise<boolean>;
};
let isFrozen = (p: Address) => P(p).frozen();

/** Read by the wallet tools: a held pocket needs the owner's co-signature on its next payment. */
export const sentinel = {
  isHeld: (p: string) => watchOf(p).hold,
  /** A co-signed payment settled while held: the owner has looked, so the hold ends. */
  release(p: string) {
    const w = watchOf(p);
    if (!w.hold) return;
    Object.assign(w, { status: "ok", hold: false, clearedAt: Date.now() });
    bus.publish({ type: "sentinel", kind: "clear", pocket: p, by: "cosign" });
  },
  async status(p: Address) {
    await reconcile(p);
    const w = watchOf(p);
    return { status: w.status, hold: w.hold, decisions: w.decisions.slice(-10) };
  },
  reset: () => watches.clear(),
};

/** The owner unfroze on-chain: start counting again from now. */
async function reconcile(p: Address) {
  const w = watchOf(p);
  if (w.status !== "freeze") return;
  const frozen = await isFrozen(p).catch(() => true);
  if (frozen) return;
  Object.assign(w, { status: "ok", hold: false, clearedAt: Date.now() });
  bus.publish({ type: "sentinel", kind: "clear", pocket: p, by: "unfreeze" });
}

/**
 * The Sentinel: on every refusal, data request, chat attack, forced transfer or payment it re-checks the pocket. Fixed rules
 * and the AI layer each give a severity; the stricter wins (the AI can only raise). It acts only on an escalation: watch
 * (feed only), hold (the owner co-signs the next payment), freeze (on-chain, guardian key; falls back to hold without one).
 */
export function startSentinel(deps: SentinelDeps = {}) {
  const decide = deps.decide ?? defaultDecide();
  const freeze = deps.freeze ?? freezeOnChain;
  if (deps.isFrozen) isFrozen = deps.isFrozen;
  const queue = new Map<string, Promise<void>>();

  async function evaluate(pocket: Address) {
    const w = watchOf(pocket);
    await reconcile(pocket);
    const now = Date.now();
    const all = bus.recent().filter((e) => e.pocket?.toLowerCase() === pocket.toLowerCase() && (e.at ?? 0) > w.clearedAt && e.type !== ("sentinel"));
    const evs: { type: string; at: number; [k: string]: any }[] = all.map((e) => ({ ...e, at: e.at ?? now }));
    const paidTx = new Set(evs.filter((e) => e.type === "payment").map((e) => String(e.tx)));
    const ghosts = deps.ghosts ? await deps.ghosts(pocket, paidTx).catch(() => []) : [];
    const signals = rules({ events: evs, now, ghosts });
    if (!signals.length) return;
    const intent = evs.filter((e) => e.type === "intent" && e.approval?.status === "approved").at(-1);
    const state = stateText(signals, {
      task: intent?.approval?.text, refusals: evs.filter((e) => e.type === "refusal").map((e) => String(e.reason)).slice(-6),
      payments: paidTx.size, attacks: evs.filter((e) => e.type === "attack").length,
    });
    const rule = ruleSeverity(signals);
    const ai = await decide(state);
    const g = gate(rule, ai);
    if (RANK[g.action] <= RANK[w.status]) return; // only escalations act
    let action = g.action, tx: Hex | undefined, note: string | undefined;
    if (action === "freeze") {
      tx = await freeze(pocket, signals[0].id).catch((e: unknown) => { note = `on-chain freeze failed (${String((e as Error).message ?? e).slice(0, 80)}); holding instead`; return undefined; });
      if (!tx) action = "hold";
      if (RANK[action] <= RANK[w.status]) return; // already holding: a failed freeze is not news
    }
    if (action === "hold") w.hold = true;
    w.status = action;
    w.decisions.push({ at: now, action, signals, ai, tx, note });
    if (w.decisions.length > 50) w.decisions.shift();
    const probes = evs.filter((e) => e.at > now - 60_000 && e.type === "refusal" && PROBE_REASONS.has(String(e.reason))).length;
    bus.publish({ type: "sentinel", kind: action, pocket, signals, ai, raisedBy: g.raisedBy, probes, state, ...(tx ? { tx } : {}), ...(note ? { note } : {}) });
  }

  const off = bus.subscribe((e) => {
    if (!e.pocket || !TRIGGERS.has(e.type)) return;
    const k = e.pocket.toLowerCase();
    // one evaluation at a time per pocket, in order
    const next = (queue.get(k) ?? Promise.resolve()).then(() => evaluate(e.pocket as Address)).catch(() => {});
    queue.set(k, next);
  });
  const t = setInterval(() => { for (const p of watches.keys()) void reconcile(p as Address).catch(() => {}); }, 15_000);
  t.unref();
  return { stop: () => (off(), clearInterval(t)), idle: () => Promise.all(queue.values()).then(() => {}) };
}
