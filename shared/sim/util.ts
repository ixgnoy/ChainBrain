import type { Hex } from "./types";

export const NEVER = 2n ** 256n - 1n;
export const USDC: Hex = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

export function parseUsd(s: string): bigint {
  const m = /^(\d+)(?:\.(\d{1,6}))?$/.exec(String(s).trim());
  if (!m) throw new Error(`bad USD amount: ${s}`);
  return BigInt(m[1]) * 1_000_000n + BigInt((m[2] ?? "").padEnd(6, "0") || "0");
}
export function formatUsd(n: bigint): string {
  if (n === NEVER) return "never";
  const frac = (n % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "").padEnd(2, "0");
  return `${n / 1_000_000n}.${frac}`;
}
export const usd = (n: bigint) => (n === NEVER ? "never" : formatUsd(n));

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
  };
}
export type Rng = ReturnType<typeof rng>;

/** Plain JSON clone with bigints as decimal strings: what a client receives from the real server. */
export const wire = <T,>(v: T): T => JSON.parse(JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x)));

export const lower = (a?: string) => (a ?? "").toLowerCase();
export const same = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
