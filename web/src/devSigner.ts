// "Dev signer": an EIP-1193 provider that forwards to the dev stack's /dev/rpc (anvil). Anvil's account 0 is unlocked,
// so eth_sendTransaction and eth_signTypedData_v4 work for it without a key in the browser.
import type { Address } from "viem";

export type Provider = { request(a: { method: string; params?: unknown[] }): Promise<any> };

export function createDevProvider(rpcUrl: string, owner: Address, f: typeof fetch = fetch): Provider {
  let id = 1;
  return {
    async request({ method, params = [] }) {
      switch (method) {
        case "eth_accounts":
        case "eth_requestAccounts":
          return [owner];
        case "wallet_switchEthereumChain":
        case "wallet_addEthereumChain":
          return null; // the fork already is Base Sepolia (chain id 84532)
        case "eth_sendTransaction":
          params = [{ ...(params[0] as object), from: owner }, ...params.slice(1)];
          break;
      }
      const res = await f(rpcUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: id++, method, params }) });
      if (!res.ok) throw new Error(`dev rpc HTTP ${res.status}`);
      const j = await res.json();
      if (j.error) throw Object.assign(new Error(j.error.message ?? "rpc error"), { code: j.error.code, data: j.error.data });
      return j.result;
    },
  };
}
