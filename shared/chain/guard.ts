// The signing guard. The owner key on the device signs only what this module can decode and allows:
//   transactions: PocketFactory.create, a Mock e-HKD transfer to one of the owner's own cards, and the Pocket owner
//                 methods (revoke, returnFunds, unfreeze, setCap, setAskAbove, setSeller, setExpiresAt) on the owner's card;
//   typed data:   Login (to this owner), and a TransferWithAuthorization co-sign that is exactly a pending approval's.
// Anything else (an unknown contract or method, a transfer elsewhere, value, an undecodable message) is refused, and every
// verdict carries the plain sentence the approval screen shows. No imports: each app passes its own viem decoder.
import { LOGIN_STATEMENT } from "./login";

type Hex = `0x${string}`;
type Address = `0x${string}`;
export type Decode = (a: { abi: readonly unknown[]; data: Hex }) => { functionName: string; args?: readonly unknown[] };

export type GuardContext = {
  owner: Address;
  chainId: number;
  factory: Address;
  token: Address;
  /** viem's decodeFunctionData */
  decode: Decode;
  /** Is this address one of the owner's cards? (Pocket.owner() on chain, or the device's list) */
  isOwnCard: (a: Address) => boolean | Promise<boolean>;
  /** A seller's name for an address, for the sentence */
  sellerName?: (a: Address) => string | undefined;
};

export type Verdict =
  | { ok: true; kind: string; sentence: string }
  | { ok: false; reason: GuardRefusal; sentence: string };
export type GuardRefusal =
  | "UNDECODABLE" | "UNKNOWN_CONTRACT" | "METHOD_NOT_ALLOWED" | "SENDS_VALUE" | "NOT_YOUR_CARD"
  | "WRONG_CHAIN" | "UNKNOWN_MESSAGE" | "NOT_A_PENDING_APPROVAL" | "NOT_YOU";

const fn = (name: string, inputs: string[]) => ({ type: "function", name, stateMutability: "nonpayable", inputs: inputs.map((type, i) => ({ name: `a${i}`, type })), outputs: [] });
const FACTORY_ABI = [fn("create", ["address", "uint256", "uint256", "uint64", "address[]"])];
const TOKEN_ABI = [fn("transfer", ["address", "uint256"])];
const POCKET_ABI = [fn("revoke", []), fn("returnFunds", []), fn("unfreeze", []), fn("setCap", ["uint256"]), fn("setAskAbove", ["uint256"]), fn("setSeller", ["address", "bool"]), fn("setExpiresAt", ["uint64"])];

const NEVER = 2n ** 256n - 1n;
const same = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
/** HK$ with cents, from 6-decimal atomic units. */
export const hk = (atomic: bigint) => {
  const cents = (atomic + 5_000n) / 10_000n;
  return `HK$${(cents / 100n).toLocaleString("en-US")}.${String(cents % 100n).padStart(2, "0")}`;
};
/** Hong Kong time (UTC+8, no daylight saving), the apps' own clock: "2030-03-18 01:46 HKT". */
const when = (sec: bigint) => new Date(Number(sec) * 1000 + 8 * 3_600_000).toISOString().slice(0, 16).replace("T", " ") + " HKT";
const refuse = (reason: GuardRefusal, sentence: string): Verdict => ({ ok: false, reason, sentence });

function tryDecode(ctx: GuardContext, abi: readonly unknown[], data: Hex) {
  try { return ctx.decode({ abi, data }); } catch { return undefined; }
}

/** Check a transaction before the owner key signs it. */
export async function checkTx(ctx: GuardContext, tx: { to?: Address | null; data?: Hex; value?: bigint }): Promise<Verdict> {
  if (tx.value && tx.value !== 0n) return refuse("SENDS_VALUE", "This transaction sends the chain's native coin. ChainBrain never does that.");
  if (!tx.to || !tx.data || tx.data.length < 10) return refuse("UNDECODABLE", "This transaction can't be read, so it won't be signed.");
  const name = (a: Address) => ctx.sellerName?.(a) ?? short(a);

  if (same(tx.to, ctx.factory)) {
    const d = tryDecode(ctx, FACTORY_ABI, tx.data);
    if (!d || d.functionName !== "create") return refuse("UNDECODABLE", "A call to the card factory that isn't 'create a card'.");
    const [agent, cap, askAbove, expiresAt, sellers] = d.args as [Address, bigint, bigint, bigint, Address[]];
    const ask = askAbove === NEVER ? "never asks you" : askAbove === 0n ? "asks you every time" : `asks you above ${hk(askAbove)}`;
    const shops = sellers.length ? sellers.map(name).join(", ") : "no shops yet";
    return { ok: true, kind: "create", sentence: `Create a card: pays up to ${hk(cap)} each, ${ask}, until ${when(expiresAt)}. Shops: ${shops}. Its agent key is ${short(agent)}.` };
  }

  if (same(tx.to, ctx.token)) {
    const d = tryDecode(ctx, TOKEN_ABI, tx.data);
    if (!d || d.functionName !== "transfer") return refuse("METHOD_NOT_ALLOWED", "Only moving HK$ to one of your own cards is allowed from your main wallet.");
    const [to, value] = d.args as [Address, bigint];
    if (!(await ctx.isOwnCard(to))) return refuse("NOT_YOUR_CARD", `This would send ${hk(value)} to ${short(to)}, which isn't one of your cards.`);
    return { ok: true, kind: "fund", sentence: `Move ${hk(value)} from your main wallet to card ${short(to)}.` };
  }

  if (await ctx.isOwnCard(tx.to)) {
    const d = tryDecode(ctx, POCKET_ABI, tx.data);
    if (!d) return refuse("METHOD_NOT_ALLOWED", "A call to your card that isn't one of the owner's controls.");
    const c = short(tx.to);
    const a = (d.args ?? []) as any[];
    const sentence: Record<string, () => string> = {
      revoke: () => `Revoke card ${c}: its agent can never pay from it again.`,
      returnFunds: () => `Send everything left on card ${c} back to your main wallet.`,
      unfreeze: () => `Unfreeze card ${c}, so its agent can pay again within its rules.`,
      setCap: () => `Set card ${c} to pay at most ${hk(a[0])} each time.`,
      setAskAbove: () => `Set card ${c} to ${a[0] === NEVER ? "never ask you" : a[0] === 0n ? "ask you every time" : `ask you above ${hk(a[0])}`}.`,
      setSeller: () => `${a[1] ? "Allow" : "Block"} ${name(a[0])} on card ${c}.`,
      setExpiresAt: () => `Make card ${c} expire at ${when(a[0])}.`,
    };
    const s = sentence[d.functionName];
    return s ? { ok: true, kind: d.functionName, sentence: s() } : refuse("METHOD_NOT_ALLOWED", "A call to your card that isn't one of the owner's controls.");
  }
  return refuse("UNKNOWN_CONTRACT", `This transaction goes to ${short(tx.to)}, which is neither the card factory, the HK$ token nor one of your cards.`);
}

export type Authorization = { from: Address; to: Address; value: string; validAfter: string; validBefore: string; nonce: Hex };
type TypedData = { domain?: Record<string, unknown>; types?: Record<string, unknown>; primaryType?: string; message?: Record<string, unknown> };

/**
 * Check typed data before the owner key signs it. `pending` is the approval this co-sign answers (from the server's
 * pending list): a TransferWithAuthorization must match it field for field.
 */
export async function checkTypedData(ctx: GuardContext, td: TypedData, pending?: Authorization): Promise<Verdict> {
  const d = td.domain ?? {}, m = td.message ?? {};
  if (Number(d.chainId) !== ctx.chainId) return refuse("WRONG_CHAIN", "This message is for another chain.");
  if (td.primaryType === "Login") {
    if (d.name !== "ChainBrain" || m.statement !== LOGIN_STATEMENT) return refuse("UNKNOWN_MESSAGE", "A sign-in message that isn't ChainBrain's.");
    if (!same(m.owner as string, ctx.owner)) return refuse("NOT_YOU", "A sign-in message for another key.");
    return { ok: true, kind: "login", sentence: "Sign in to ChainBrain. This moves no money and approves no payment." };
  }
  if (td.primaryType === "TransferWithAuthorization") {
    if (!same(d.verifyingContract as string, ctx.token)) return refuse("UNKNOWN_MESSAGE", "A payment authorisation for a token that isn't HK$.");
    const keys = ["from", "to", "value", "validAfter", "validBefore", "nonce"] as const;
    if (!pending || !keys.every((k) => String(m[k]).toLowerCase() === String(pending[k]).toLowerCase()))
      return refuse("NOT_A_PENDING_APPROVAL", "This payment isn't the one waiting for your approval.");
    if (!(await ctx.isOwnCard(m.from as Address))) return refuse("NOT_YOUR_CARD", "This payment comes from a card that isn't yours.");
    const to = m.to as Address;
    return { ok: true, kind: "cosign", sentence: `Approve one payment of ${hk(BigInt(m.value as string))} from card ${short(m.from as string)} to ${ctx.sellerName?.(to) ?? short(to)}, valid until ${when(BigInt(m.validBefore as string))}.` };
  }
  return refuse("UNKNOWN_MESSAGE", "A message ChainBrain doesn't know, so it won't be signed.");
}

/** Thrown by a guarded wallet when the guard says no. */
export class GuardRefused extends Error {
  readonly verdict: Extract<Verdict, { ok: false }>;
  constructor(verdict: Extract<Verdict, { ok: false }>) {
    super(`${verdict.reason}: ${verdict.sentence}`);
    this.name = "GuardRefused";
    this.verdict = verdict;
  }
}
