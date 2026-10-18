// The owner's main wallet on the phone: a non-custodial key held on the device (see keystore.ts), signing with viem.
// ponytail: in-app key instead of WalletConnect → MetaMask mobile; WalletConnect needs a Reown project ID and native
// modules Expo Go doesn't ship. Upgrade path: a development build with Reown AppKit.
import { createPublicClient, createWalletClient, defineChain, http, parseEventLogs, type Address, type Chain, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getChain, isBuiltin, rpcUrl } from "./runtime";
import { builtin } from "./builtin";
import { loadConfig, transferTypedData, type Authorization, type Seller } from "./shared";

/** The FISCO chain as viem sees it. Gas is free, but the RPC wants a legacy tx with gasPrice 0. */
const viemChain = (): Chain => defineChain({ id: getChain()?.id ?? 20200, name: getChain()?.name ?? "FISCO BCOS", nativeCurrency: { name: "FISCO", symbol: "FISCO", decimals: 18 }, rpcUrls: { default: { http: [rpcUrl()] } } });
const feeOverrides = () => ({ gasPrice: 0n, type: "legacy" as const });
export const pub = () => createPublicClient({ chain: viemChain(), transport: http(rpcUrl()) });

export type PocketView = {
  address: Address; owner: Address; agent: Address; cap: bigint; askAbove: bigint; expiresAt: bigint; revoked: boolean; balance: bigint; allowed: string[];
  /** stopped by the Sentinel (or the owner); only the owner unfreezes */ frozen?: boolean;
  /** Pocket.periodKind (0 none, 1 day, 2 week, 3 month), periodLimit and spentThisPeriod(): the allowance the pocket enforces */
  periodKind?: number; periodLimit?: bigint; spentThisPeriod?: bigint;
};

export function ownerWallet(pk: Hex) {
  const account = privateKeyToAccount(pk);
  // built per call: the RPC URL changes when the API URL is overridden or dev mode is detected
  const wallet = () => createWalletClient({ account, chain: viemChain(), transport: http(rpcUrl()) });

  async function write(address: Address, abi: any[], functionName: string, args: unknown[] = []) {
    const hash = await wallet().writeContract({ address, abi, functionName, args, account, chain: viemChain(), ...feeOverrides() } as any);
    const receipt = await pub().waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error(`transaction reverted: ${hash}`);
    return { hash, receipt };
  }
  const pocketWrite = async (p: Address, fn: string, args: unknown[] = []) => write(p, (await loadConfig()).abis.pocket, fn, args);
  // the built-in network: the same owner calls, confirmed after a block like the real chain
  const me = account.address;
  const sim = <T,>(f: (w: ReturnType<typeof builtin>) => T) => { const w = builtin(); return w.ownerTx(() => f(w)); };
  const simTx = async (f: (w: ReturnType<typeof builtin>) => Hex) => ({ hash: await sim(f), receipt: null });

  return {
    address: account.address,
    async balances() {
      if (isBuiltin()) return builtin().balances(me);
      const c = await loadConfig();
      const [ehkd, eth] = await Promise.all([
        pub().readContract({ address: c.token, abi: c.abis.erc20, functionName: "balanceOf", args: [account.address] }) as Promise<bigint>,
        pub().getBalance({ address: account.address }),
      ]);
      return { ehkd, eth };
    },
    async createPocket(a: { agent: Address; cap: bigint; askAbove: bigint; expiresAt: bigint; sellers: Address[] }) {
      if (isBuiltin()) return sim((w) => w.chain.createPocket(me, a)) as Promise<{ pocket: Address; tx: Hex }>;
      const c = await loadConfig();
      const { hash, receipt } = await write(c.factory, c.abis.factory, "create", [a.agent, a.cap, a.askAbove, a.expiresAt, a.sellers]);
      const [ev] = parseEventLogs({ abi: c.abis.factory, logs: receipt.logs, eventName: "PocketCreated" }) as any[];
      return { pocket: ev.args.pocket as Address, tx: hash };
    },
    fund: async (p: Address, amount: bigint) => isBuiltin() ? simTx((w) => w.chain.transfer(me, p, amount)) : write((await loadConfig()).token, (await loadConfig()).abis.erc20, "transfer", [p, amount]),
    revoke: (p: Address) => isBuiltin() ? simTx((w) => w.chain.revoke(me, p)) : pocketWrite(p, "revoke"),
    /** Pocket.unfreeze: only the owner's key can lift a Sentinel freeze. */
    unfreeze: (p: Address) => isBuiltin() ? simTx((w) => w.chain.unfreeze(me, p)) : pocketWrite(p, "unfreeze"),
    returnFunds: (p: Address) => isBuiltin() ? simTx((w) => w.chain.returnFunds(me, p)) : pocketWrite(p, "returnFunds"),
    setSeller: (p: Address, s: Address, ok: boolean) => isBuiltin() ? simTx((w) => w.chain.setSeller(me, p, s, ok)) : pocketWrite(p, "setSeller", [s, ok]),
    /** Owner-signed rule edits: per-payment cap and ask-me threshold (NEVER = never ask, 0 = ask every time). */
    setCap: (p: Address, cap: bigint) => isBuiltin() ? simTx((w) => w.chain.setCap(me, p, cap)) : pocketWrite(p, "setCap", [cap]),
    setAskAbove: (p: Address, x: bigint) => isBuiltin() ? simTx((w) => w.chain.setAskAbove(me, p, x)) : pocketWrite(p, "setAskAbove", [x]),
    /** The allowance the pocket itself enforces: kind 1 day, 2 week, 3 month (Hong Kong calendar), 0 = none. Past it, a payment needs your co-sign. */
    setPeriodLimit: (p: Address, kind: number, limit: bigint) => isBuiltin() ? simTx((w) => w.chain.setPeriodLimit(me, p, kind, limit)) : pocketWrite(p, "setPeriodLimit", [kind, limit]),
    /** A seller's own per-payment cap, in place of the pocket's cap (0 = the pocket's cap applies). */
    setSellerCap: (p: Address, s: Address, cap: bigint) => isBuiltin() ? simTx((w) => w.chain.setSellerCap(me, p, s, cap)) : pocketWrite(p, "setSellerCap", [s, cap]),
    /** Co-sign the exact eHKD transfer the wallet tool layer built (payments above the ask-me threshold). */
    signTransfer: (auth: Authorization) => account.signTypedData(transferTypedData(auth)),
  };
}
export type OwnerWallet = ReturnType<typeof ownerWallet>;

export async function readPocket(address: Address): Promise<PocketView> {
  if (isBuiltin()) {
    const v = builtin().chain.view(address);
    return { address: v.address, owner: v.owner, agent: v.agent, cap: v.cap, askAbove: v.askAbove, expiresAt: v.expiresAt, revoked: v.revoked, balance: v.balance, allowed: v.allowed, frozen: !!v.frozen,
      periodKind: v.periodKind ?? 0, periodLimit: v.periodLimit ?? 0n, spentThisPeriod: v.spentThisPeriod ?? 0n };
  }
  const c = await loadConfig();
  const sellers: Seller[] = c.sellers;
  const r = (functionName: string, args: unknown[] = []) => pub().readContract({ address, abi: c.abis.pocket, functionName, args }) as Promise<any>;
  const [owner, agent, cap, askAbove, expiresAt, revoked, balance, flags, frozen, periodKind, periodLimit, spentThisPeriod] = await Promise.all([
    r("owner"), r("agent"), r("perPaymentCap"), r("askAbove"), r("expiresAt"), r("revoked"),
    pub().readContract({ address: c.token, abi: c.abis.erc20, functionName: "balanceOf", args: [address] }) as Promise<bigint>,
    Promise.all(sellers.map((s) => r("sellerAllowed", [s.payTo]))),
    r("frozen").catch(() => false), // pockets from an older factory have no freeze
    r("periodKind").catch(() => 0), r("periodLimit").catch(() => 0n), r("spentThisPeriod").catch(() => 0n), // nor an allowance
  ]);
  return { address, owner, agent, cap, askAbove, expiresAt, revoked, balance, allowed: sellers.filter((_, i) => flags[i]).map((s) => s.id), frozen: !!frozen,
    periodKind: Number(periodKind), periodLimit: BigInt(periodLimit), spentThisPeriod: BigInt(spentThisPeriod) };
}

export const isOwner = (p: Pick<PocketView, "owner">, me: string) => p.owner.toLowerCase() === me.toLowerCase();
export const pocketStatus = (p: PocketView, now = Date.now()) => (p.revoked ? "Revoked" : Number(p.expiresAt) * 1000 < now ? "Expired" : "Active");
