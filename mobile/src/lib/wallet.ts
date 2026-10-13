// The owner's main wallet on the phone: a non-custodial key held on the device (see keystore.ts), signing with viem.
// ponytail: in-app key instead of WalletConnect → MetaMask mobile; WalletConnect needs a Reown project ID and native
// modules Expo Go doesn't ship. Upgrade path: a development build with Reown AppKit.
import { createPublicClient, createWalletClient, http, parseEventLogs, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { RPC, loadConfig, transferTypedData, type Authorization, type Seller } from "./shared";

export const pub = () => createPublicClient({ chain: baseSepolia, transport: http(RPC) });

export type PocketView = { address: Address; owner: Address; agent: Address; cap: bigint; askAbove: bigint; expiresAt: bigint; revoked: boolean; balance: bigint; allowed: string[] };

export function ownerWallet(pk: Hex) {
  const account = privateKeyToAccount(pk);
  const w = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });

  async function write(address: Address, abi: any[], functionName: string, args: unknown[] = []) {
    const hash = await w.writeContract({ address, abi, functionName, args, account, chain: baseSepolia });
    const receipt = await pub().waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error(`transaction reverted: ${hash}`);
    return { hash, receipt };
  }
  const pocketWrite = async (p: Address, fn: string, args: unknown[] = []) => write(p, (await loadConfig()).abis.pocket, fn, args);

  return {
    address: account.address,
    async balances() {
      const c = await loadConfig();
      const [usdc, eth] = await Promise.all([
        pub().readContract({ address: c.usdc, abi: c.abis.erc20, functionName: "balanceOf", args: [account.address] }) as Promise<bigint>,
        pub().getBalance({ address: account.address }),
      ]);
      return { usdc, eth };
    },
    async createPocket(a: { agent: Address; cap: bigint; askAbove: bigint; expiresAt: bigint; sellers: Address[] }) {
      const c = await loadConfig();
      const { hash, receipt } = await write(c.factory, c.abis.factory, "create", [a.agent, a.cap, a.askAbove, a.expiresAt, a.sellers]);
      const [ev] = parseEventLogs({ abi: c.abis.factory, logs: receipt.logs, eventName: "PocketCreated" }) as any[];
      return { pocket: ev.args.pocket as Address, tx: hash };
    },
    fund: async (p: Address, amount: bigint) => write((await loadConfig()).usdc, (await loadConfig()).abis.erc20, "transfer", [p, amount]),
    revoke: (p: Address) => pocketWrite(p, "revoke"),
    returnFunds: (p: Address) => pocketWrite(p, "returnFunds"),
    setSeller: (p: Address, s: Address, ok: boolean) => pocketWrite(p, "setSeller", [s, ok]),
    /** Co-sign the exact USDC transfer the wallet tool layer built (payments above the ask-me threshold). */
    signTransfer: (auth: Authorization) => account.signTypedData(transferTypedData(auth)),
  };
}
export type OwnerWallet = ReturnType<typeof ownerWallet>;

export async function readPocket(address: Address): Promise<PocketView> {
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

export const pocketStatus = (p: PocketView, now = Date.now()) => (p.revoked ? "Revoked" : Number(p.expiresAt) * 1000 < now ? "Expired" : "Active");
