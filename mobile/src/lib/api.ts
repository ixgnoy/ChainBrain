// Wallet API client (real v2 routes only). No React Native imports.
import type { Address } from "viem";
import { fetchTimeout, getApi, isBuiltin, normalizeUrl } from "./runtime";
import type { Approval, WalletEvent } from "./events";
import { builtin } from "./builtin";
import { SCENES } from "../../../shared/sim";

const json = { "content-type": "application/json" };

export async function fetchEvents(after: number, pocket?: string): Promise<WalletEvent[]> {
  if (isBuiltin()) return builtin().events(after, pocket) as WalletEvent[];
  const q = `after=${after}${pocket ? `&pocket=${pocket}` : ""}`;
  const r = await fetchTimeout(`${getApi()}/api/events.json?${q}`, {}, 8000);
  if (!r.ok) throw new Error(`events ${r.status}`);
  const j = await r.json();
  return Array.isArray(j) ? j : [];
}

export async function fetchPending(pocket: string): Promise<Approval[]> {
  if (isBuiltin()) return builtin().pending(pocket) as Approval[];
  const r = await fetchTimeout(`${getApi()}/api/pending?pocket=${pocket}`, {}, 8000);
  if (!r.ok) throw new Error(`pending ${r.status}`);
  const j = await r.json();
  return Array.isArray(j) ? j : [];
}

export type ApprovalAnswer = { ok: true } | { ok: false; error: string };
/** POST /api/approvals/:id. 404 NOT_PENDING (already answered or timed out) and 400 OWNER_SIGNATURE_INVALID are returned, not thrown. */
export async function answerApproval(id: string, body: { approved: boolean; signature?: string; answer?: string }): Promise<ApprovalAnswer> {
  if (isBuiltin()) return builtin().answer(id, body);
  try {
    const r = await fetchTimeout(`${getApi()}/api/approvals/${id}`, { method: "POST", headers: json, body: JSON.stringify(body) }, 15000);
    if (r.ok) return { ok: true };
    let error = `HTTP ${r.status}`;
    try { const j = await r.json(); if (j?.error) error = String(j.error); } catch { /* plain text error */ }
    return { ok: false, error };
  } catch (e) {
    return { ok: false, error: "NETWORK" };
  }
}

/** POST /api/chat. The request stays open for the whole agent turn (approval waits up to 10 min): no timeout here on purpose. */
export async function chat(pocket: Address, text: string): Promise<{ reply: string; stopped?: string }> {
  if (isBuiltin()) return builtin().chat(pocket, text);
  const r = await fetch(`${getApi()}/api/chat`, { method: "POST", headers: json, body: JSON.stringify({ pocket, text }) });
  const raw = await r.text();
  let j: any;
  try { j = JSON.parse(raw); } catch { throw new Error(r.ok ? "Bad reply from the server" : `Server error ${r.status}`); }
  return { reply: String(j.reply ?? j.error ?? "(no reply)"), stopped: j.stopped };
}

/** Test connection: reaches /api/config and tells whether it is the dev stack. */
export async function ping(base = getApi()): Promise<{ ms: number; agent?: string; sellers: number }> {
  const t0 = Date.now();
  const r = await fetchTimeout(`${normalizeUrl(base)}/api/config`, {}, 6000);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = await r.json();
  return { ms: Date.now() - t0, agent: j.agent, sellers: Array.isArray(j.sellers) ? j.sellers.length : 0 };
}

export type Scene = { id: string; title: string; text: string; chip?: string; followChip?: string; preset: string | null; note?: string; followUp?: string | null };
export async function devScenes(): Promise<Scene[]> {
  if (isBuiltin()) return SCENES.filter((s) => s.where !== "compose"); // scene 12's sentence makes a pocket app, not a chat task
  const r = await fetchTimeout(`${getApi()}/dev/scenes`, {}, 5000);
  if (!r.ok) return [];
  const j = await r.json();
  return Array.isArray(j) ? j.filter((s) => s && typeof s.text === "string") : [];
}

/** Dev stack only: 1 ETH + 20 USDC on the local fork for this address. */
export async function devFund(address: string): Promise<{ eth: string; usdc: string }> {
  if (isBuiltin()) return builtin().fundTestMoney(address as Address);
  const r = await fetchTimeout(`${getApi()}/dev/fund`, { method: "POST", headers: json, body: JSON.stringify({ address }) }, 15000);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/** GET /api/memory: the brain's current memory snapshot for one pocket, plus its audit log (versions, what changed). */
export async function fetchMemory(pocket: string): Promise<{ snapshot: import("./brain").MemorySnapshot; log: { version: number; at: number; applied: { op: string; id: string; text?: string }[]; rejected: { why: string }[] }[] } | null> {
  if (isBuiltin()) return builtin().memory(pocket) as any;
  const r = await fetchTimeout(`${getApi()}/api/memory?pocket=${pocket}`, {}, 8000).catch(() => null);
  if (!r || !r.ok) return null; // a server without memory (older build): the card says so
  return r.json();
}

/** POST /api/memory/forget: the owner removes one memory item; the brain writes a new version without it. */
export async function forgetMemory(pocket: string, id: string): Promise<boolean> {
  if (isBuiltin()) return builtin().forgetMemory(pocket, id);
  const r = await fetchTimeout(`${getApi()}/api/memory/forget`, { method: "POST", headers: json, body: JSON.stringify({ pocket, id }) }, 8000).catch(() => null);
  return !!r?.ok;
}

/** POST /api/rules/compile: one sentence -> proposed rules, open questions and a computed proof card. Never creates a pocket. */
export async function compileRules(sentence: string): Promise<import("../../../shared/sim/speak").Compiled & { proof: import("../../../shared/sim/speak").Proof }> {
  if (isBuiltin()) return builtin().compileRules(sentence) as any;
  const r = await fetchTimeout(`${getApi()}/api/rules/compile`, { method: "POST", headers: json, body: JSON.stringify({ sentence }) }, 30000);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// ---- pocket apps (shared/sim/pocketApp.ts)
type Composed = import("../../../shared/sim/speak").Compiled & {
  proof: import("../../../shared/sim/speak").Proof; spec: import("../../../shared/sim/pocketApp").PocketAppSpec;
  agent: import("../../../shared/sim/pocketApp").AgentChoice; specBy: "picker" | "claude";
};
/** POST /api/pocket-app/compose: one sentence -> the rules, the proof card, the pocket app spec and the agent. Creates nothing. */
export async function composeApp(sentence: string): Promise<Composed> {
  if (isBuiltin()) return builtin().composeApp(sentence) as Composed;
  const r = await fetchTimeout(`${getApi()}/api/pocket-app/compose`, { method: "POST", headers: json, body: JSON.stringify({ sentence }) }, 30000);
  if (!r.ok) throw new Error(`compose ${r.status}`);
  return (await r.json()) as Composed;
}
type Routine = import("../../../shared/sim/pocketApp").Routine;
type RoutineSpec = import("../../../shared/sim/pocketApp").RoutineSpec;
/** Routines run on the built-in network; a wallet server keeps none yet, so these answer null / false there. */
export const routineOf = (pocket: string): Routine | null => (isBuiltin() ? builtin().routine(pocket) : null);
export const setRoutine = (pocket: Address, spec: RoutineSpec): Routine | null => (isBuiltin() ? builtin().setRoutine(pocket, spec) : null);
export async function runRoutineNow(pocket: Address) {
  if (!isBuiltin()) return { ok: false as const, reason: "NOT_ON_THIS_NETWORK" };
  return builtin().runRoutineNow(pocket);
}
export const pauseRoutine = (pocket: string, paused: boolean) => (isBuiltin() ? builtin().pauseRoutine(pocket, paused) : false);
