import type { Hex } from "./types";

export const NEVER = 2n ** 256n - 1n;
/** The Mock e-HKD on the FISCO chain (contracts/deployments/20200.json); the built-in network models the same token. */
export const EHKD: Hex = "0x0355c0c5Afe2A35369056FBB854903A4aF07781A";

export function parseHkd(s: string): bigint {
  const m = /^(\d+)(?:\.(\d{1,6}))?$/.exec(String(s).trim());
  if (!m) throw new Error(`bad USD amount: ${s}`);
  return BigInt(m[1]) * 1_000_000n + BigInt((m[2] ?? "").padEnd(6, "0") || "0");
}
export function formatHkd(n: bigint): string {
  if (n === NEVER) return "never";
  const frac = (n % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "").padEnd(2, "0");
  return `${n / 1_000_000n}.${frac}`;
}
export const hkd = (n: bigint) => (n === NEVER ? "never" : formatHkd(n));

/** Small seeded PRNG (mulberry32): the same seed tells the same story, so a rehearsed demo plays the same way. */
export function rng(seed = 0x5eed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    between: (lo: number, hi: number) => lo + (hi - lo) * next(),
    int: (lo: number, hi: number) => Math.floor(lo + (hi - lo + 1) * next()),
    pick: <T,>(xs: readonly T[]) => xs[Math.floor(next() * xs.length)],
    hex: (bytes: number): Hex => {
      let s = "0x";
      for (let i = 0; i < bytes; i++) s += Math.floor(next() * 256).toString(16).padStart(2, "0");
      return s as Hex;
    },
    /** The generator's position, so a saved world carries on the same sequence after a reload. */
    get state() { return a; },
    set state(v: number) { a = v >>> 0; },
  };
}
export type Rng = ReturnType<typeof rng>;

/** JSON that keeps bigints, Maps and Sets (a saved built-in network). */
export function encode(v: unknown): string {
  return JSON.stringify(v, function (k, x) {
    const raw = (this as Record<string, unknown>)[k];
    if (typeof raw === "bigint") return { $b: raw.toString() };
    if (raw instanceof Map) return { $m: [...raw.entries()] };
    if (raw instanceof Set) return { $s: [...raw.values()] };
    return x;
  });
}
export function decode<T = unknown>(s: string): T {
  return JSON.parse(s, (_, x) => {
    if (x && typeof x === "object" && !Array.isArray(x)) {
      if (typeof x.$b === "string" && Object.keys(x).length === 1) return BigInt(x.$b);
      if (Array.isArray(x.$m) && Object.keys(x).length === 1) return new Map(x.$m);
      if (Array.isArray(x.$s) && Object.keys(x).length === 1) return new Set(x.$s);
    }
    return x;
  });
}

/** Plain JSON clone with bigints as decimal strings: what a client receives from the real server. */
export const wire = <T,>(v: T): T => JSON.parse(JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x)));

/**
 * "Tonight" as people mean it: 23:59 today on this device's clock, unless that is less than three hours away (late at
 * night), then twelve hours from now. Seeded pockets and the agent's deadlines use the same rule, so they never disagree.
 */
export function tonightMs(now = Date.now()): number {
  const d = new Date(now); d.setHours(23, 59, 0, 0);
  return d.getTime() - now < 3 * 3600_000 ? now + 12 * 3600_000 : d.getTime();
}

export const lower = (a?: string) => (a ?? "").toLowerCase();
export const same = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
