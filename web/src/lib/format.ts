import { formatHkd } from "../shared";

/** Money is always rendered from numbers via formatHkd, never from text the agent or a seller wrote. */
export const hkd = (atomic: bigint | string | number | undefined | null): string => {
  if (atomic == null || atomic === "") return "–";
  try { return formatHkd(BigInt(atomic)); } catch { return "–"; }
};
export const hkdNumber = (atomic: bigint | string | number): number => Number(BigInt(atomic)) / 1_000_000;

export const shortHex = (h?: string, head = 8, tail = 6) => (h ? (h.length > head + tail + 1 ? `${h.slice(0, head)}…${h.slice(-tail)}` : h) : "–");
export const isTxHash = (h: unknown): h is string => typeof h === "string" && /^0x[0-9a-fA-F]{64}$/.test(h);

export const clock = (ms: number) => new Date(ms).toLocaleTimeString("en-GB", { hour12: false });
export const dateTime = (ms: number) => new Date(ms).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
export const dateOnly = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/** Pseudonymous id for the regulator view: a short stable hash of the address, never the address itself. */
export function pseudonym(addr: string | undefined, prefix = "POCKET"): string {
  if (!addr) return `${prefix}-????`;
  let h = 2166136261;
  const a = addr.toLowerCase();
  for (let i = 0; i < a.length; i++) { h ^= a.charCodeAt(i); h = Math.imul(h, 16777619); }
  return `${prefix}-${(h >>> 0).toString(16).toUpperCase().padStart(8, "0").slice(0, 6)}`;
}
