import { execFileSync } from "node:child_process";
import type { Address, PublicClient } from "viem";

/**
 * FISCO's web3 RPC refuses senders whose native balance is 0 (gas itself is free). Credit any empty address through the
 * node gateway's /admin/fund (FUND_URL + FUND_TOKEN, private network on Railway), or locally scripts/fisco/fund.sh.
 * Returns the addresses it funded.
 */
export async function fundIfEmpty(pc: PublicClient, addresses: Address[]): Promise<Address[]> {
  const empty: Address[] = [];
  for (const a of addresses) if ((await pc.getBalance({ address: a })) === 0n) empty.push(a);
  if (!empty.length) return [];
  if (!process.env.FUND_URL) { // local dev: the chain runs on this machine, drive its console directly
    execFileSync("bash", [new URL("../../scripts/fisco/fund.sh", import.meta.url).pathname, ...empty], { encoding: "utf8", stdio: "pipe" });
    return empty;
  }
  const r = await fetch(`${process.env.FUND_URL}/admin/fund`, {
    method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${process.env.FUND_TOKEN}` }, body: JSON.stringify({ addresses: empty }),
  });
  if (!r.ok) throw new Error(`fund failed (${r.status}): ${await r.text()}`);
  return empty;
}
