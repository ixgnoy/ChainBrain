// The in-app explorer's view of a transaction, a block and an address. Pure. The built-in network's hashes are not on
// any public chain, so both apps show them here instead of a block explorer; the event logs are the ones the real
// contracts emit (PocketFactory.PocketCreated, eHKD Transfer and AuthorizationUsed, Pocket.Revoked and RulesChanged).

/** A transaction as either app holds it (shared/sim SimTx, web ChainTx). */
export type ExplorerInput = {
  hash: string; block?: bigint | string | number; at?: number; from?: string; kind: string; pocket?: string; counterparty?: string;
  amount?: bigint | string; status?: "success" | "reverted"; method?: string; reason?: string; args?: Record<string, string>; label?: string;
  /** EIP-3009 nonce of a payment, when known (payment events carry it). */
  nonce?: string;
};

export type Field = { name: string; value: string; kind: "address" | "amount" | "text" | "hash" };
export type ExplorerLog = { index: number; contract: string; contractName: string; event: string; fields: Field[] };
export type ExplorerTx = {
  hash: string; status: "success" | "reverted"; block?: string; position?: number; at?: number;
  from?: string; to?: string; toName: string; value?: string; method: string; args: Field[]; logs: ExplorerLog[];
  /** The on-chain error a reverted tx carries ("NOT_OWNER", or eHKD's "EHKD: invalid signature"). */
  revert?: string;
  /** For a refused pocket payment: the pocket rule that failed (Pocket.canPay), which isValidSignature only reports as INVALID. */
  rule?: string;
  /** @deprecated same as `rule ?? revert`. */
  reason?: string;
  pocket?: string; summary: string; kind: string;
};
export type ExplorerCtx = { ehkd: string; factory: string; nameOf?: (address: string) => string | undefined };

const lc = (a?: string) => (a ?? "").toLowerCase();
export const hkdText = (v?: bigint | string): string | undefined => {
  if (v == null || v === "") return undefined;
  let n: bigint;
  try { n = BigInt(String(v)); } catch { return undefined; }
  const frac = (n % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "").padEnd(2, "0");
  return `${n / 1_000_000n}.${frac}`;
};
const METHOD_OF: Record<string, string> = { create: "createPocket", fund: "transfer", payment: "transferWithAuthorization", out: "transfer", return: "returnFunds", revoke: "revoke", rules: "setRules" };

/** Plain-words summary, in the voice of the rest of the app. */
function summarize(t: ExplorerInput, name: (a?: string) => string): string {
  const amt = hkdText(t.amount);
  if (t.status === "reverted") {
    if (t.reason === "NOT_OWNER") return `A key that is not the owner's tried to change ${name(t.pocket)}'s rules. The pocket reverted it (NOT_OWNER).`;
    return `A transfer of HK$${amt ?? "?"} out of ${name(t.pocket)} to ${name(t.counterparty)} was refused by the pocket contract${t.reason && t.reason !== "REVERTED" ? `: its rule check says ${t.reason}` : ""}. No money moved.`;
  }
  switch (t.kind) {
    case "create": return `${name(t.from)} created ${name(t.pocket)} with its own budget and rules.`;
    case "fund": return `${name(t.from)} moved HK$${amt} into ${name(t.pocket)}.`;
    case "payment": return `${name(t.pocket)} paid ${name(t.counterparty)} HK$${amt}${t.args?.cosigned === "true" ? ", co-signed by the owner" : ""}.`;
    case "return": return `${name(t.pocket)} returned HK$${amt} to its owner.`;
    case "revoke": return `The owner stopped ${name(t.pocket)}. The agent can no longer spend from it.`;
    case "rules": return `The owner changed ${name(t.pocket)}'s rules${t.label ? ` (${t.label.toLowerCase()})` : ""}.`;
    default: return `${name(t.from)} sent HK$${amt ?? "?"} to ${name(t.counterparty)}.`;
  }
}

export function explainTx(t: ExplorerInput, ctx: ExplorerCtx, all: ExplorerInput[] = []): ExplorerTx {
  const status = t.status ?? "success";
  const name = (a?: string) => {
    if (!a) return "someone";
    if (lc(a) === lc(ctx.ehkd)) return "eHKD";
    if (lc(a) === lc(ctx.factory)) return "PocketFactory";
    return ctx.nameOf?.(a) ?? `${a.slice(0, 6)}…${a.slice(-4)}`;
  };
  const method = t.method ?? METHOD_OF[t.kind] ?? t.kind;
  // the contract the transaction called
  const to = t.kind === "create" ? ctx.factory : method === "transfer" || method === "transferWithAuthorization" ? ctx.ehkd : t.pocket;
  const toName = lc(to) === lc(ctx.ehkd) ? "eHKD (MockEHKD)" : lc(to) === lc(ctx.factory) ? "PocketFactory" : `Pocket${t.pocket && ctx.nameOf?.(t.pocket) ? ` · ${ctx.nameOf(t.pocket)}` : ""}`;
  const a = t.args ?? {};
  const args: Field[] = Object.entries(a).filter(([k]) => k !== "cosigned").map(([k, v]) => ({
    name: k, value: v,
    kind: /^0x[0-9a-fA-F]{40}$/.test(v) ? "address" : /^(value|cap|askAbove)$/.test(k) ? "amount" : "text",
  }));
  const logs: ExplorerLog[] = [];
  const log = (contract: string, contractName: string, event: string, fields: Field[]) => logs.push({ index: logs.length, contract, contractName, event, fields });
  if (status === "success") {
    if (t.kind === "create") log(ctx.factory, "PocketFactory", "PocketCreated", [{ name: "pocket", value: t.pocket ?? "", kind: "address" }, { name: "owner", value: t.from ?? "", kind: "address" }, ...(a.agent ? [{ name: "agent", value: a.agent, kind: "address" as const }] : [])]);
    if (t.kind === "fund") log(ctx.ehkd, "eHKD", "Transfer", [{ name: "from", value: t.from ?? "", kind: "address" }, { name: "to", value: t.pocket ?? "", kind: "address" }, { name: "value", value: String(t.amount ?? ""), kind: "amount" }]);
    if (t.kind === "payment") {
      log(ctx.ehkd, "eHKD", "AuthorizationUsed", [{ name: "authorizer", value: t.pocket ?? "", kind: "address" }, ...(t.nonce ? [{ name: "nonce", value: t.nonce, kind: "hash" as const }] : [])]);
      log(ctx.ehkd, "eHKD", "Transfer", [{ name: "from", value: t.pocket ?? "", kind: "address" }, { name: "to", value: t.counterparty ?? "", kind: "address" }, { name: "value", value: String(t.amount ?? ""), kind: "amount" }]);
    }
    if (t.kind === "return") log(ctx.ehkd, "eHKD", "Transfer", [{ name: "from", value: t.pocket ?? "", kind: "address" }, { name: "to", value: t.counterparty ?? "", kind: "address" }, { name: "value", value: String(t.amount ?? ""), kind: "amount" }]);
    if (t.kind === "out") log(ctx.ehkd, "eHKD", "Transfer", [{ name: "from", value: t.from ?? "", kind: "address" }, { name: "to", value: t.counterparty ?? "", kind: "address" }, { name: "value", value: String(t.amount ?? ""), kind: "amount" }]);
    if (t.kind === "revoke") log(t.pocket ?? "", "Pocket", "Revoked", []);
    if (t.kind === "rules") log(t.pocket ?? "", "Pocket", "RulesChanged", []);
  }
  const blockStr = t.block == null ? undefined : String(t.block);
  const sameBlock = blockStr ? all.filter((x) => String(x.block) === blockStr) : [];
  return {
    hash: t.hash, status, block: blockStr, position: sameBlock.length ? Math.max(0, sameBlock.findIndex((x) => lc(x.hash) === lc(t.hash))) : undefined, at: t.at,
    from: t.from, to, toName, value: t.kind === "payment" || t.kind === "fund" || t.kind === "return" || t.kind === "out" ? hkdText(t.amount) : undefined,
    method, args, logs, ...revertOf(t, method, status), pocket: t.pocket, kind: t.kind,
    summary: summarize({ ...t, status }, name),
  };
}

/** What a revert says on-chain, kept apart from the pocket rule behind it (Pocket.isValidSignature returns only INVALID). */
function revertOf(t: ExplorerInput, method: string, status: string): { revert?: string; rule?: string; reason?: string } {
  if (status !== "reverted") return {};
  if (method === "transferWithAuthorization") {
    const rule = t.reason && t.reason !== "REVERTED" ? t.reason : undefined;
    return { revert: "EHKD: invalid signature", rule, reason: rule ?? "EHKD: invalid signature" };
  }
  const revert = t.reason ?? "execution reverted";
  return { revert, reason: revert };
}

export type ExplorerBlock = { number: string; at?: number; txs: ExplorerInput[] };
/** Blocks that carry transactions, newest first. */
export function blocksFrom(txs: ExplorerInput[], limit = 50): ExplorerBlock[] {
  const by = new Map<string, ExplorerBlock>();
  for (const t of txs) {
    if (t.block == null) continue;
    const k = String(t.block);
    const b = by.get(k) ?? { number: k, at: t.at, txs: [] };
    b.txs.push(t); b.at = Math.min(b.at ?? t.at ?? 0, t.at ?? b.at ?? 0);
    by.set(k, b);
  }
  return [...by.values()].sort((x, y) => (BigInt(y.number) > BigInt(x.number) ? 1 : -1)).slice(0, limit);
}

/** Every transaction touching an address (as sender, pocket or counterparty), newest first. */
export function txsOfAddress(address: string, txs: ExplorerInput[]): ExplorerInput[] {
  const a = lc(address);
  return txs.filter((t) => lc(t.from) === a || lc(t.pocket) === a || lc(t.counterparty) === a).sort((x, y) => (y.at ?? 0) - (x.at ?? 0));
}

/** "Test network" for the built-in chain and a local fork; the chain's own name only for a public chain. */
export const networkLabel = (o: { builtin: boolean; dev?: boolean; chainName?: string }) => (o.builtin || o.dev ? "Test network" : o.chainName ?? "FISCO BCOS");
