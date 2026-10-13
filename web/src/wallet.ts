// The owner's main wallet (MetaMask or any EIP-1193 browser wallet). Every write and signature checks the chain first.
import { createPublicClient, createWalletClient, custom, parseEventLogs, type Address, type Hex } from "viem";
import { baseSepolia } from "viem/chains";
import { loadConfig, transferTypedData, type Authorization, type Seller } from "./shared";

type Provider = { request(a: { method: string; params?: unknown[] }): Promise<any> };
const eth = (): Provider => {
  const p = (window as any).ethereum;
  if (!p) throw new Error("NO_WALLET: install MetaMask (or another browser wallet)");
  return p;
};

const BASE_SEPOLIA_HEX = "0x14a34";

export async function ensureChain(p: Provider = eth()) {
  if ((await p.request({ method: "eth_chainId" })) === BASE_SEPOLIA_HEX) return;
  try {
    await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BASE_SEPOLIA_HEX }] });
  } catch (e: any) {
    if (e?.code !== 4902) throw new Error("WRONG_CHAIN: switch your wallet to Base Sepolia");
    await p.request({
      method: "wallet_addEthereumChain",
      params: [{ chainId: BASE_SEPOLIA_HEX, chainName: "Base Sepolia", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: ["https://sepolia.base.org"], blockExplorerUrls: ["https://sepolia.basescan.org"] }],
    }).catch(() => { throw new Error("WRONG_CHAIN: switch your wallet to Base Sepolia"); });
  }
}

const pub = () => createPublicClient({ chain: baseSepolia, transport: custom(eth()) });

async function wallet() {
  await ensureChain();
  const [account] = (await eth().request({ method: "eth_requestAccounts" })) as Address[];
  return createWalletClient({ account, chain: baseSepolia, transport: custom(eth()) });
}

export const connect = async () => (await wallet()).account.address;

async function write(address: Address, abi: any[], functionName: string, args: unknown[] = []) {
  const w = await wallet();
  const hash = await w.writeContract({ address, abi, functionName, args, account: w.account, chain: baseSepolia });
  const receipt = await pub().waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`transaction reverted: ${hash}`);
  return { hash, receipt };
}

export async function usdcBalance(a: Address): Promise<bigint> {
  const c = await loadConfig();
  return (await pub().readContract({ address: c.usdc, abi: c.abis.erc20, functionName: "balanceOf", args: [a] })) as bigint;
}

export type PocketView = { address: Address; owner: Address; agent: Address; cap: bigint; askAbove: bigint; expiresAt: bigint; revoked: boolean; balance: bigint; allowed: string[] };

export async function readPocket(address: Address): Promise<PocketView> {
  const c = await loadConfig();
  const sellers: Seller[] = c.sellers;
  const r = (functionName: string, args: unknown[] = []) => pub().readContract({ address, abi: c.abis.pocket, functionName, args }) as Promise<any>;
  const [owner, agent, cap, askAbove, expiresAt, revoked, balance, flags] = await Promise.all([
    r("owner"), r("agent"), r("perPaymentCap"), r("askAbove"), r("expiresAt"), r("revoked"), usdcBalance(address),
    Promise.all(sellers.map((s) => r("sellerAllowed", [s.payTo]))),
  ]);
  return { address, owner, agent, cap, askAbove, expiresAt, revoked, balance, allowed: sellers.filter((_, i) => flags[i]).map((s) => s.id) };
}

export async function createPocket(a: { agent: Address; cap: bigint; askAbove: bigint; expiresAt: bigint; sellers: Address[] }) {
  const c = await loadConfig();
  const { hash, receipt } = await write(c.factory, c.abis.factory, "create", [a.agent, a.cap, a.askAbove, a.expiresAt, a.sellers]);
  const [ev] = parseEventLogs({ abi: c.abis.factory, logs: receipt.logs, eventName: "PocketCreated" }) as any[];
  return { pocket: ev.args.pocket as Address, tx: hash };
}

export async function fund(pocket: Address, amount: bigint) {
  const c = await loadConfig();
  return write(c.usdc, c.abis.erc20, "transfer", [pocket, amount]);
}

const pocketWrite = async (pocket: Address, fn: string, args: unknown[] = []) => write(pocket, (await loadConfig()).abis.pocket, fn, args);
export const revoke = (p: Address) => pocketWrite(p, "revoke");
export const returnFunds = (p: Address) => pocketWrite(p, "returnFunds");
export const setSeller = (p: Address, s: Address, ok: boolean) => pocketWrite(p, "setSeller", [s, ok]);
export const setCap = (p: Address, v: bigint) => pocketWrite(p, "setCap", [v]);
export const setAskAbove = (p: Address, v: bigint) => pocketWrite(p, "setAskAbove", [v]);

/** Owner co-signs the exact USDC transfer the tool layer built (payments above the ask-me threshold). */
export async function signTransfer(auth: Authorization): Promise<Hex> {
  const w = await wallet();
  return w.signTypedData({ account: w.account, ...transferTypedData(auth) });
}
