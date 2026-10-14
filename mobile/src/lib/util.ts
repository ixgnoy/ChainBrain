import { formatUsd, NEVER } from "./shared";

/** USDC from atomic units, at least 2 decimals. */
export const usd = (n: bigint | undefined | null) => (n == null ? "0.00" : formatUsd(n));
/** Micro-USDC as a JS number, for animation and meters only. */
export const num = (n: bigint) => Number(n > 10n ** 15n ? 0n : n);
/** A count-up frame as money: whole cents while it moves, the exact amount once it lands on `target`. */
export const usdFrame = (shown: number, target: number) => usd(BigInt(shown === target ? Math.round(target) : Math.round(shown / 10_000) * 10_000));
export const isNever = (n: bigint) => n === NEVER;
export const askText = (askAbove: bigint, cap: bigint) => (askAbove === NEVER || askAbove > cap ? "Never" : askAbove === 0n ? "Every payment" : `Above ${usd(askAbove)}`);

export { sameAddr } from "./events";
export const shortAddr = (a?: string) => (a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a ?? "");
export const shortHex = (h: string, a = 8, b = 6) => (h.length > a + b + 2 ? `${h.slice(0, a)}…${h.slice(-b)}` : h);

export function dayLabel(at: number, now = Date.now()): string {
  const d = new Date(at), n = new Date(now);
  const sod = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((sod(n) - sod(d)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: d.getFullYear() === n.getFullYear() ? undefined : "numeric" });
}
export const timeLabel = (at: number) => new Date(at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
export const dateLabel = (unixSec: number) => new Date(unixSec * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
export const money2 = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
