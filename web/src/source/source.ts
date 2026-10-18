// Where the console gets its network from. Default: the hosted ChainBrain server on the real FISCO chain (VITE_API_URL).
// Settings has a "Demo network" switch for the built-in simulation, and the server URL (kept in localStorage: cb.source,
// cb.apiUrl); a hidden ?server=<url> sets it too (the e2e tests; ?server=builtin is the demo network). Everything below
// this file only sees the `Network` shape, never the choice.
import { useSyncExternalStore } from "react";

export type Source = { kind: "demo" } | { kind: "live"; url: string };

/** The hosted ChainBrain API (Railway), unless the build sets VITE_API_URL. */
export const HOSTED_API = "https://fisco-api-production-85c5.up.railway.app";
export const DEFAULT_API: string = import.meta.env.VITE_API_URL || HOSTED_API;
const K_SOURCE = "cb.source", K_URL = "cb.apiUrl";

const read = (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string | null) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* private mode: not remembered */ } };

export const cleanUrl = (u: string) => u.trim().replace(/\/+$/, "");
export const isHttpUrl = (u: string) => { try { return /^https?:$/.test(new URL(u).protocol); } catch { return false; } };

/** The real chain unless the demo network was switched on in Settings. */
export function loadSource(): Source {
  if (read(K_SOURCE) === "demo") return { kind: "demo" };
  const url = cleanUrl(read(K_URL) ?? "");
  return { kind: "live", url: isHttpUrl(url) ? url : DEFAULT_API };
}

/** Applies ?server= (then removes it from the address bar). Returns true when it changed the source. */
export function applyServerParam(loc: Location = location, hist: History = history): boolean {
  const q = new URLSearchParams(loc.search);
  const v = q.get("server");
  if (v == null) return false;
  q.delete("server");
  const rest = q.toString();
  try { hist.replaceState(null, "", `${loc.pathname}${rest ? `?${rest}` : ""}${loc.hash}`); } catch { /* ignore */ }
  const url = cleanUrl(v);
  if (v === "builtin" || !isHttpUrl(url)) { setSource({ kind: "demo" }); return true; }
  setSource({ kind: "live", url });
  return true;
}

let current: Source | undefined;
const listeners = new Set<() => void>();
const get = (): Source => (current ??= loadSource());

export function setSource(s: Source) {
  const prev = get();
  if (s.kind === "live") { write(K_SOURCE, "live"); write(K_URL, cleanUrl(s.url)); } else write(K_SOURCE, "demo");
  current = s.kind === "live" ? { kind: "live", url: cleanUrl(s.url) } : { kind: "demo" };
  if (prev.kind === current.kind && (prev.kind === "demo" || (prev as any).url === (current as any).url)) return;
  for (const f of listeners) f();
}
/** The last custom server typed in Settings, kept even while the built-in network is in use. */
export const savedUrl = () => cleanUrl(read(K_URL) ?? "");
/** Tests: forget the cached choice and re-read storage. */
export function resetSource() { current = undefined; for (const f of listeners) f(); }

export const useSource = (): Source => useSyncExternalStore((f) => { listeners.add(f); return () => void listeners.delete(f); }, get, get);

/** API base of the live source (used by modules outside React: dev detection, config). */
export const apiBase = (): string => { const s = get(); return s.kind === "live" ? s.url : DEFAULT_API; };

export type Probe = { ok: true; ms: number } | { ok: false; error: string };
/** GET <url>/api/config with a timeout: how long the server took to answer, or why it did not. */
export async function testConnection(url: string, f: typeof fetch = fetch, timeoutMs = 5000, clock: () => number = () => performance.now()): Promise<Probe> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  const t0 = clock();
  try {
    const r = await f(`${cleanUrl(url)}/api/config`, { signal: ctl.signal, headers: { accept: "application/json" } });
    if (!r.ok) return { ok: false, error: `The server answered ${r.status}` };
    const j = await r.json();
    if (!j || typeof j !== "object" || !("factory" in j)) return { ok: false, error: "Not a ChainBrain server" };
    return { ok: true, ms: Math.max(1, Math.round(clock() - t0)) };
  } catch (e) {
    return { ok: false, error: ctl.signal.aborted ? "No answer within 5 seconds" : (e as Error).name === "SyntaxError" ? "Not a ChainBrain server" : "Could not reach the server" };
  } finally { clearTimeout(timer); }
}
