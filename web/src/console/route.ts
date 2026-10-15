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

// ------------------------------------------------------------------ the in-app explorer
export type ExplorerRoute =
  | { kind: "home" }
  | { kind: "tx"; hash: string }
  | { kind: "block"; number: string }
  | { kind: "address"; address: string };
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

/** "explorer", "explorer/tx/0x…", "explorer/block/12", "explorer/address/0x…" (the path part of the hash). Anything else is home. */
export function parseExplorer(path: string): ExplorerRoute {
  const [t, kind, arg] = path.split("/");
  if (t !== "explorer" && t !== "chain") return { kind: "home" };
  if (kind === "tx" && arg && TX_HASH.test(arg)) return { kind: "tx", hash: arg };
  if (kind === "block" && arg && /^\d+$/.test(arg)) return { kind: "block", number: arg };
  if (kind === "address" && arg && ADDRESS.test(arg)) return { kind: "address", address: arg };
  return { kind: "home" };
}
export const explorerHref = {
  home: "#explorer",
  tx: (hash: string) => `#explorer/tx/${hash}`,
  block: (n: string | bigint | number) => `#explorer/block/${n}`,
  address: (a: string) => `#explorer/address/${a}`,
};
/** What a search box got: a transaction hash, an address or a block number (undefined: nothing to open). */
export function searchTarget(q: string): string | undefined {
  const s = q.trim();
  if (TX_HASH.test(s)) return explorerHref.tx(s);
  if (ADDRESS.test(s)) return explorerHref.address(s);
  if (/^\d+$/.test(s)) return explorerHref.block(s);
  return undefined;
}
