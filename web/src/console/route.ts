// The console's address bar: `#live`, `#judges/0xPocket`, `#present`, and an optional shareable `?tx=0x…` that opens one
// transaction's sheet on top of whatever page is showing. Pure, so it is tested.
export const TX_HASH = /^0x[0-9a-fA-F]{64}$/;

/** "#live/0xabc?tx=0x…" -> the page part ("live/0xabc") and the transaction, when it is a real hash. */
export function splitHash(hash: string): { path: string; tx?: string } {
  const [path, query = ""] = hash.replace(/^#/, "").split("?");
  const tx = new URLSearchParams(query).get("tx") ?? undefined;
  return { path, tx: tx && TX_HASH.test(tx) ? tx : undefined };
}

/** The same address with the transaction added (or removed when `tx` is undefined). */
export const withTx = (hash: string, tx?: string): string => {
  const { path } = splitHash(hash);
  return `#${path}${tx ? `?tx=${tx}` : ""}`;
};
