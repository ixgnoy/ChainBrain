// The owner's main wallet on the phone: a non-custodial key held on the device (see keystore.ts), signing with viem.
// ponytail: in-app key instead of WalletConnect → MetaMask mobile; WalletConnect needs a Reown project ID and native
// modules Expo Go doesn't ship. Upgrade path: a development build with Reown AppKit.
import { createPublicClient, createWalletClient, http, parseEventLogs, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { isBuiltin, rpcUrl } from "./runtime";
import { builtin } from "./builtin";
import { loadConfig, transferTypedData, type Authorization, type Seller } from "./shared";

export const pub = () => createPublicClient({ chain: baseSepolia, transport: http(rpcUrl()) });

export type PocketView = { address: Address; owner: Address; agent: Address; cap: bigint; askAbove: bigint; expiresAt: bigint; revoked: boolean; balance: bigint; allowed: string[] };

export function ownerWallet(pk: Hex) {
  const account = privateKeyToAccount(pk);
  // built per call: the RPC URL changes when the API URL is overridden or dev mode is detected
  const wallet = () => createWalletClient({ account, chain: baseSepolia, transport: http(rpcUrl()) });

  async function write(address: Address, abi: any[], functionName: string, args: unknown[] = []) {
    const hash = await wallet().writeContract({ address, abi, functionName, args, account, chain: baseSepolia });
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
      const [usdc, eth] = await Promise.all([
        pub().readContract({ address: c.usdc, abi: c.abis.erc20, functionName: "balanceOf", args: [account.address] }) as Promise<bigint>,
        pub().getBalance({ address: account.address }),
      ]);
      return { usdc, eth };
    },
    async createPocket(a: { agent: Address; cap: bigint; askAbove: bigint; expiresAt: bigint; sellers: Address[] }) {
      if (isBuiltin()) return sim((w) => w.chain.createPocket(me, a)) as Promise<{ pocket: Address; tx: Hex }>;
      const c = await loadConfig();
      const { hash, receipt } = await write(c.factory, c.abis.factory, "create", [a.agent, a.cap, a.askAbove, a.expiresAt, a.sellers]);
      const [ev] = parseEventLogs({ abi: c.abis.factory, logs: receipt.logs, eventName: "PocketCreated" }) as any[];
      return { pocket: ev.args.pocket as Address, tx: hash };
    },
    fund: async (p: Address, amount: bigint) => isBuiltin() ? simTx((w) => w.chain.transfer(me, p, amount)) : write((await loadConfig()).usdc, (await loadConfig()).abis.erc20, "transfer", [p, amount]),
    revoke: (p: Address) => isBuiltin() ? simTx((w) => w.chain.revoke(me, p)) : pocketWrite(p, "revoke"),
    returnFunds: (p: Address) => isBuiltin() ? simTx((w) => w.chain.returnFunds(me, p)) : pocketWrite(p, "returnFunds"),
    setSeller: (p: Address, s: Address, ok: boolean) => isBuiltin() ? simTx((w) => w.chain.setSeller(me, p, s, ok)) : pocketWrite(p, "setSeller", [s, ok]),
    /** Owner-signed rule edits: per-payment cap and ask-me threshold (NEVER = never ask, 0 = ask every time). */
    setCap: (p: Address, cap: bigint) => isBuiltin() ? simTx((w) => w.chain.setCap(me, p, cap)) : pocketWrite(p, "setCap", [cap]),
    setAskAbove: (p: Address, x: bigint) => isBuiltin() ? simTx((w) => w.chain.setAskAbove(me, p, x)) : pocketWrite(p, "setAskAbove", [x]),
    /** Co-sign the exact USDC transfer the wallet tool layer built (payments above the ask-me threshold). */
    signTransfer: (auth: Authorization) => account.signTypedData(transferTypedData(auth)),
  };
}
export type OwnerWallet = ReturnType<typeof ownerWallet>;

export async function readPocket(address: Address): Promise<PocketView> {
  if (isBuiltin()) {
    const v = builtin().chain.view(address);
    return { address: v.address, owner: v.owner, agent: v.agent, cap: v.cap, askAbove: v.askAbove, expiresAt: v.expiresAt, revoked: v.revoked, balance: v.balance, allowed: v.allowed };
  }
  const c = await loadConfig();
  const sellers: Seller[] = c.sellers;
  const r = (functionName: string, args: unknown[] = []) => pub().readContract({ address, abi: c.abis.pocket, functionName, args }) as Promise<any>;
  const [owner, agent, cap, askAbove, expiresAt, revoked, balance, flags] = await Promise.all([
    r("owner"), r("agent"), r("perPaymentCap"), r("askAbove"), r("expiresAt"), r("revoked"),
    pub().readContract({ address: c.usdc, abi: c.abis.erc20, functionName: "balanceOf", args: [address] }) as Promise<bigint>,
    Promise.all(sellers.map((s) => r("sellerAllowed", [s.payTo]))),
  ]);
  return { address, owner, agent, cap, askAbove, expiresAt, revoked, balance, allowed: sellers.filter((_, i) => flags[i]).map((s) => s.id) };
}

export const isOwner = (p: Pick<PocketView, "owner">, me: string) => p.owner.toLowerCase() === me.toLowerCase();
export const pocketStatus = (p: PocketView, now = Date.now()) => (p.revoked ? "Revoked" : Number(p.expiresAt) * 1000 < now ? "Expired" : "Active");
