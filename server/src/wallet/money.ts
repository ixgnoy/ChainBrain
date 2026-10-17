/** Mock e-HKD has 6 decimals. Amounts are bigint atomic units everywhere; strings only at the edges. */
export function parseAmount(s: string): bigint {
  const m = /^(\d+)(?:\.(\d{1,6}))?$/.exec(String(s).trim());
  if (!m) throw new Error(`bad amount: ${s}`);
  return BigInt(m[1]) * 1_000_000n + BigInt((m[2] ?? "").padEnd(6, "0") || "0");
}

export function formatAmount(n: bigint): string {
  const frac = (n % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "").padEnd(2, "0");
  return `${n / 1_000_000n}.${frac}`;
}
