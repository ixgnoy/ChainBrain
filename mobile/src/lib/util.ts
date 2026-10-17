import { formatHkd, NEVER } from "./shared";
import { curSign } from "./runtime";
import type { PocketView } from "./wallet";

/** eHKD from atomic units, at least 2 decimals. */
export const hkd = (n: bigint | undefined | null) => (n == null ? "0.00" : formatHkd(n));
/** Micro-eHKD as a JS number, for animation and meters only. */
export const num = (n: bigint) => Number(n > 10n ** 15n ? 0n : n);
/** A count-up frame as money: whole cents while it moves, the exact amount once it lands on `target`. */
export const hkdFrame = (shown: number, target: number) => hkd(BigInt(shown === target ? Math.round(target) : Math.round(shown / 10_000) * 10_000));
export const isNever = (n: bigint) => n === NEVER;
export const askText = (askAbove: bigint, cap: bigint) => (askAbove === NEVER || askAbove > cap ? "Never" : askAbove === 0n ? "Every payment" : `Above ${hkd(askAbove)}`);

export { sameAddr } from "./events";
/** A pocket is its own contract: "0x…a57a" (never card-style digits). */
export const contractTail = (a: string) => `0x…${a.slice(-4).toLowerCase()}`;
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

/** "HK$3.20" from atomic eHKD units. */
export const money = (n: bigint | undefined | null) => `${curSign()}${hkd(n)}`;
/** "14 Oct, 1:32 PM". */
export const stamp = (at: number) => {
  const d = new Date(at);
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
};

/** Did a pocket read change anything the owner sees? Every field the contract exposes counts, frozen included: a Sentinel
 *  freeze (or the owner's unfreeze) moves no money, so nothing else would change. */
export const sameView = (a: PocketView | undefined, b: PocketView) => !!a && a.balance === b.balance && a.cap === b.cap && a.askAbove === b.askAbove && a.expiresAt === b.expiresAt
  && a.revoked === b.revoked && !!a.frozen === !!b.frozen && a.owner === b.owner && a.agent === b.agent
  && a.allowed.length === b.allowed.length && a.allowed.every((x, i) => x === b.allowed[i]);
