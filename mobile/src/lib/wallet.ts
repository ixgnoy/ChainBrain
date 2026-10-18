// The owner's main wallet on the phone: a non-custodial key held on the device (see keystore.ts), signing with viem.
// ponytail: in-app key instead of WalletConnect → MetaMask mobile; WalletConnect needs a Reown project ID and native
// modules Expo Go doesn't ship. Upgrade path: a development build with Reown AppKit.
import { createPublicClient, createWalletClient, decodeFunctionData, defineChain, encodeFunctionData, http, parseEventLogs, type Address, type Chain, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getChain, isBuiltin, rpcUrl } from "./runtime";
import { builtin } from "./builtin";
import { loadConfig, transferTypedData, type Authorization, type Seller } from "./shared";
import { checkTx, checkTypedData, GuardRefused, type GuardContext, type Verdict } from "../../../shared/chain/guard";
import { loginTypedData, type LoginChallenge } from "../../../shared/chain/login";
import { getVisitorToken, newCardAgent } from "./visitor";

/** The FISCO chain as viem sees it. Gas is free, but the RPC wants a legacy tx with gasPrice 0. */
const viemChain = (): Chain => defineChain({ id: getChain()?.id ?? 20200, name: getChain()?.name ?? "FISCO BCOS", nativeCurrency: { name: "FISCO", symbol: "FISCO", decimals: 18 }, rpcUrls: { default: { http: [rpcUrl()] } } });
const feeOverrides = () => ({ gasPrice: 0n, type: "legacy" as const });
export const pub = () => createPublicClient({ chain: viemChain(), transport: http(rpcUrl()) });

export type PocketView = { address: Address; owner: Address; agent: Address; cap: bigint; askAbove: bigint; expiresAt: bigint; revoked: boolean; balance: bigint; allowed: string[]; /** stopped by the Sentinel (or the owner); only the owner unfreezes */ frozen?: boolean };

const cardOwners = new Map<string, string>(); // card -> owner, read once from the chain (a Pocket's owner never changes)

export function ownerWallet(pk: Hex, opts: { /** tests: a fixed guard context instead of the server's config and chain reads */ guard?: () => Promise<GuardContext> } = {}) {
  const account = privateKeyToAccount(pk);
  // built per call: the RPC URL changes when the API URL is overridden or dev mode is detected
  const wallet = () => createWalletClient({ account, chain: viemChain(), transport: http(rpcUrl()) });

  /** What the signing guard needs: this owner, the deployment, and a chain read of a card's owner. */
  async function guardContext(): Promise<GuardContext> {
    if (opts.guard) return opts.guard();
    const c = await loadConfig();
    return {
      owner: account.address, chainId: getChain()?.id ?? 20200, factory: c.factory, token: c.token, decode: decodeFunctionData as any,
      sellerName: (a) => c.sellers.find((s: Seller) => s.payTo.toLowerCase() === a.toLowerCase())?.name,
      isOwnCard: async (a) => {
        const k = a.toLowerCase();
        if (!cardOwners.has(k)) {
          const o = await pub().readContract({ address: a, abi: c.abis.pocket, functionName: "owner" }).catch(() => undefined);
          if (!o) return false; // not a card (no owner())
          cardOwners.set(k, String(o).toLowerCase());
        }
        return cardOwners.get(k) === account.address.toLowerCase();
      },
    };
  }

  async function write(address: Address, abi: any[], functionName: string, args: unknown[] = []) {
    // the signing guard decodes the exact calldata first: anything it can't read or doesn't allow is never signed
    const verdict = await checkTx(await guardContext(), { to: address, data: encodeFunctionData({ abi, functionName, args } as any) });
    if (!verdict.ok) throw new GuardRefused(verdict);
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
      // ChainBrain's own agent: a key derived on the server for this card alone (the shared key only on an older server)
      if (getVisitorToken() && a.agent.toLowerCase() === c.agent.toLowerCase()) {
        const own = await newCardAgent();
        if (own) a = { ...a, agent: own.agent };
      }
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
    /**
     * Co-sign the exact eHKD transfer the wallet tool layer built (payments above the ask-me threshold). `pending` is the
     * approval it answers: the guard signs only that exact authorization, from one of this owner's cards.
     */
    async signTransfer(auth: Authorization, pending: Authorization) {
      const td = transferTypedData(auth);
      const verdict = await checkTypedData(await guardContext(), td as any, pending as any);
      if (!verdict.ok) throw new GuardRefused(verdict);
      return account.signTypedData(td);
    },
    /** Sign the server's Login challenge (sign-up and sign-in): the guard checks it is ChainBrain's, for this key. */
    async signLogin(ch: LoginChallenge) {
      const td = loginTypedData(ch);
      const zero = "0x0000000000000000000000000000000000000000" as Address;
      // a Login needs no deployment: without the server's config the guard still checks the chain, the statement and the key
      const c = await guardContext().catch((): GuardContext => ({ owner: account.address, chainId: getChain()?.id ?? 20200, factory: zero, token: zero, decode: decodeFunctionData as any, isOwnCard: () => false }));
      const verdict = await checkTypedData(c, td as any);
      if (!verdict.ok) throw new GuardRefused(verdict);
      return account.signTypedData(td as any);
    },
    /** The guard's sentence for a co-sign, for the approval screen (what exactly the owner is about to sign). */
    async explainCosign(auth: Authorization): Promise<Verdict> {
      return checkTypedData(await guardContext(), transferTypedData(auth) as any, auth as any);
    },
  };
}
export type OwnerWallet = ReturnType<typeof ownerWallet>;

export async function readPocket(address: Address): Promise<PocketView> {
  if (isBuiltin()) {
    const v = builtin().chain.view(address);
    return { address: v.address, owner: v.owner, agent: v.agent, cap: v.cap, askAbove: v.askAbove, expiresAt: v.expiresAt, revoked: v.revoked, balance: v.balance, allowed: v.allowed, frozen: !!v.frozen };
  }
  const c = await loadConfig();
  const sellers: Seller[] = c.sellers;
  const r = (functionName: string, args: unknown[] = []) => pub().readContract({ address, abi: c.abis.pocket, functionName, args }) as Promise<any>;
  const [owner, agent, cap, askAbove, expiresAt, revoked, balance, flags, frozen] = await Promise.all([
    r("owner"), r("agent"), r("perPaymentCap"), r("askAbove"), r("expiresAt"), r("revoked"),
    pub().readContract({ address: c.token, abi: c.abis.erc20, functionName: "balanceOf", args: [address] }) as Promise<bigint>,
    Promise.all(sellers.map((s) => r("sellerAllowed", [s.payTo]))),
    r("frozen").catch(() => false), // pockets from an older factory have no freeze
  ]);
  return { address, owner, agent, cap, askAbove, expiresAt, revoked, balance, allowed: sellers.filter((_, i) => flags[i]).map((s) => s.id), frozen: !!frozen };
}

export const isOwner = (p: Pick<PocketView, "owner">, me: string) => p.owner.toLowerCase() === me.toLowerCase();
export const pocketStatus = (p: PocketView, now = Date.now()) => (p.revoked ? "Revoked" : Number(p.expiresAt) * 1000 < now ? "Expired" : "Active");
