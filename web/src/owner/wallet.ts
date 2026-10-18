// The console's owner wallet on the real chain: the browser's key signs owner transactions and the Login, each one
// decoded and allowed by the shared signing guard first. Sign-up gives a visitor token the console's API calls carry.
import { createWalletClient, decodeFunctionData, encodeFunctionData, http, parseEventLogs, type Address, type Hex, type PublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { transferTypedData, type Authorization, type Config } from "../shared";
import { checkTx, checkTypedData, GuardRefused, type GuardContext } from "../../../shared/chain/guard";
import { loginTypedData, VISITOR_HEADER, type LoginChallenge } from "../../../shared/chain/login";

const tokenKey = (api: string, owner: string) => `cb.visitor.${api.replace(/\/+$/, "")}.${owner.toLowerCase()}`;
let token: string | null = null;
export const visitorHeaders = (): Record<string, string> => (token ? { [VISITOR_HEADER]: token } : {});
export const hasSession = () => !!token;

export type Pending = { id: string; pocket: Address; kind: string; text?: string; data?: { auth?: Authorization; amount?: string; sellerId?: string } };
export type SignUp = { visitorId: string; created: boolean; funding: { nativeFunded: boolean; mintTx?: Hex; minted?: string; error?: string } };

export function ownerWallet(pk: Hex, o: { api: string; rpc: string; cfg: Config; client: PublicClient; chainId: number }) {
  const account = privateKeyToAccount(pk);
  const w = createWalletClient({ account, transport: http(o.rpc) });
  const owners = new Map<string, string>();
  const ctx: GuardContext = {
    owner: account.address, chainId: o.chainId, factory: o.cfg.factory, token: o.cfg.token, decode: decodeFunctionData as any,
    sellerName: (a) => o.cfg.sellers.find((s) => s.payTo.toLowerCase() === a.toLowerCase())?.name,
    isOwnCard: async (a) => {
      const k = a.toLowerCase();
      if (!owners.has(k)) {
        const v = await o.client.readContract({ address: a, abi: o.cfg.abis.pocket, functionName: "owner" } as any).catch(() => undefined);
        if (!v) return false;
        owners.set(k, String(v).toLowerCase());
      }
      return owners.get(k) === account.address.toLowerCase();
    },
  };
  const chain = { id: o.chainId, name: "FISCO BCOS", nativeCurrency: { name: "FISCO", symbol: "FISCO", decimals: 18 }, rpcUrls: { default: { http: [o.rpc] } } } as const;

  /** Guard, sign, send (legacy, gas price 0) and wait. Returns the hash, the receipt and the guard's sentence. */
  async function write(address: Address, abi: readonly unknown[], functionName: string, args: unknown[] = []) {
    const verdict = await checkTx(ctx, { to: address, data: encodeFunctionData({ abi, functionName, args } as any) });
    if (!verdict.ok) throw new GuardRefused(verdict);
    const hash = await w.writeContract({ address, abi, functionName, args, account, chain, type: "legacy", gasPrice: 0n } as any);
    const receipt = await o.client.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error(`reverted: ${hash}`);
    return { hash, receipt, sentence: verdict.sentence };
  }

  return {
    address: account.address,
    /** Back in with a saved token, or sign up / in with one Login signature (the server funds a new visitor). */
    async session(): Promise<SignUp | null> {
      const saved = localStorage.getItem(tokenKey(o.api, account.address));
      if (saved && (await fetch(`${o.api}/v1/me`, { headers: { [VISITOR_HEADER]: saved } }).then((r) => r.ok, () => false))) { token = saved; return null; }
      const ch = (await (await fetch(`${o.api}/v1/challenge`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ owner: account.address }) })).json()) as LoginChallenge;
      const td = loginTypedData(ch);
      const verdict = await checkTypedData(ctx, td as any);
      if (!verdict.ok) throw new GuardRefused(verdict);
      const signature = await account.signTypedData(td as any);
      const r = await fetch(`${o.api}/v1/visitors`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ owner: account.address, nonce: ch.nonce, issuedAt: ch.issuedAt, signature }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error === "SIGNUPS_FULL" ? "Too many new accounts this hour: try again later, or use the demo network." : j.error ?? `sign-up ${r.status}`);
      token = j.token;
      try { localStorage.setItem(tokenKey(o.api, account.address), j.token); } catch { /* private window */ }
      return j;
    },
    async balance(): Promise<bigint> {
      return (await o.client.readContract({ address: o.cfg.token, abi: o.cfg.abis.erc20, functionName: "balanceOf", args: [account.address] } as any)) as bigint;
    },
    /** A card with its own agent key (from the server), funded from the main wallet: two transactions. */
    async createCard(a: { cap: bigint; askAbove: bigint; budget: bigint; days: number; sellers: Address[] }) {
      let agent = o.cfg.agent;
      const r = await fetch(`${o.api}/v1/cards/agent`, { method: "POST", headers: { "content-type": "application/json", ...visitorHeaders() }, body: "{}" });
      if (r.ok) agent = (await r.json()).agent; else if (r.status !== 503 && r.status !== 404) throw new Error(`card agent: ${r.status}`);
      const expiresAt = BigInt(Math.floor(Date.now() / 1000) + a.days * 86_400);
      const made = await write(o.cfg.factory, o.cfg.abis.factory, "create", [agent, a.cap, a.askAbove, expiresAt, a.sellers]);
      const [ev] = parseEventLogs({ abi: o.cfg.abis.factory, logs: made.receipt.logs, eventName: "PocketCreated" }) as any[];
      const card = ev.args.pocket as Address;
      const fund = await write(o.cfg.token, o.cfg.abis.erc20, "transfer", [card, a.budget]);
      return { card, agent, createTx: made.hash, fundTx: fund.hash, sentences: [made.sentence, fund.sentence] };
    },
    /** What this card's agent waits for: an intent to confirm, a question, or a payment above the ask-me limit to co-sign. */
    async pending(card: Address): Promise<Pending[]> {
      const r = await fetch(`${o.api}/api/pending?pocket=${card}`);
      return r.ok ? r.json() : [];
    },
    /** Confirm or decline an intent or question (the server checks the token owns the card). */
    async answer(id: string, approved: boolean) {
      const r = await fetch(`${o.api}/api/approvals/${id}`, { method: "POST", headers: { "content-type": "application/json", ...visitorHeaders() }, body: JSON.stringify({ approved }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `HTTP ${r.status}`);
    },
    /** Co-sign the exact payment waiting for approval: the guard signs only that authorization, from this owner's card. */
    async cosign(p: Pending) {
      const auth = p.data?.auth;
      if (!auth) throw new Error("No payment to co-sign");
      const td = { ...transferTypedData(auth), domain: { name: "Mock e-HKD", version: "1", chainId: o.chainId, verifyingContract: o.cfg.token } };
      const verdict = await checkTypedData(ctx, td as any, auth as any);
      if (!verdict.ok) throw new GuardRefused(verdict);
      const signature = await account.signTypedData(td as any);
      const r = await fetch(`${o.api}/api/approvals/${p.id}`, { method: "POST", headers: { "content-type": "application/json", ...visitorHeaders() }, body: JSON.stringify({ approved: true, signature }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `HTTP ${r.status}`);
      return verdict.sentence;
    },
    revoke: (card: Address) => write(card, o.cfg.abis.pocket, "revoke"),
    unfreeze: (card: Address) => write(card, o.cfg.abis.pocket, "unfreeze"),
    returnFunds: (card: Address) => write(card, o.cfg.abis.pocket, "returnFunds"),
  };
}
export type OwnerWallet = ReturnType<typeof ownerWallet>;
