import { Hono } from "hono";
import { encodeFunctionData, toHex, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { cfg } from "./chains";
import { bus } from "./wallet/events";
import { pocket as P, pub } from "./wallet/chain";
import { buildAuthorization, envelope, transferTypedData } from "./wallet/scheme";
import { agentKeyFor } from "./agentKeys";
import { sendRaw } from "./ledger";
import { fundIfEmpty } from "./fund";
import { guard } from "./visitors";
import { ipOf, slidingWindow } from "./limits";
import { askedFor, attackOf } from "./agent/scripted";

/**
 * The attack arena on the real chain (YINGLONG's "straight to the blockchain"). Assume the AI was fully fooled:
 *   POST /api/arena/straight {pocket}   the card's OWN derived agent key signs "send HK$50 to the attacker" and it is
 *                                       submitted raw (no simulation), so the chain itself refuses: a real reverted hash,
 *                                       the reason code from Pocket.canPay, and the decoded revert. Owner's token only,
 *                                       ARENA_PER_IP_DAY (20) per IP per day.
 * publishAttack: a chat sentence that is an attack becomes an `attack` event; for privilege escalation the card's agent
 * key really calls setCap / setSeller and the chain reverts it (NOT_OWNER).
 */
export const ATTACKER: Address = "0x000000000000000000000000000000000000ABC0";
const perIp = slidingWindow(86_400_000, () => Number(process.env.ARENA_PER_IP_DAY ?? 20));
const TWA = [{ type: "function", name: "transferWithAuthorization", stateMutability: "nonpayable",
  inputs: [{ type: "address" }, { type: "address" }, { type: "uint256" }, { type: "uint256" }, { type: "uint256" }, { type: "bytes32" }, { type: "bytes" }], outputs: [] }] as const;
const OWNER_ONLY = [
  { type: "function", name: "setCap", stateMutability: "nonpayable", inputs: [{ type: "uint256" }], outputs: [] },
  { type: "function", name: "setSeller", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "bool" }], outputs: [] },
] as const;
/** Who submits the agent-signed transfer: any funded server key (it only carries the agent's signature; gas is free). */
const submitter = () => (process.env.TICK_PK || process.env.FACILITATOR_PK) as Hex;

async function cardAgent(pocket: Address) {
  const info = await P(pocket).info();
  const pk = agentKeyFor(info.agent, info.owner);
  return { info, pk };
}

/** The fooled agent's transfer, signed by the card's own agent key, straight to the token. Never throws for a revert. */
export async function straightToChain(pocket: Address, amount = 50_000_000n) {
  const { info, pk } = await cardAgent(pocket);
  if (!pk) return { error: "NOT_THIS_AGENT" as const };
  const reason = await P(pocket).canPay(ATTACKER, amount).catch(() => ""); // what the card's rules say, read just before
  const auth = buildAuthorization(pocket, ATTACKER, amount, toHex(crypto.getRandomValues(new Uint8Array(32))), 0n);
  const sig = envelope(auth, await privateKeyToAccount(pk).signTypedData(transferTypedData(auth)), "0x");
  const data = encodeFunctionData({ abi: TWA, functionName: "transferWithAuthorization", args: [auth.from, auth.to, BigInt(auth.value), BigInt(auth.validAfter), BigInt(auth.validBefore), auth.nonce, sig] });
  const before = info.balance;
  const r = await sendRaw(submitter(), { to: cfg().token, data, gas: 300_000n });
  const after = (await P(pocket).info()).balance;
  const reverted = r.receipt.status !== "success";
  const out = {
    tx: r.hash, reverted, to: ATTACKER, amount: amount.toString(), balanceBefore: before.toString(), balanceAfter: after.toString(),
    ...(reverted && reason && reason !== "OK" ? { reason } : {}), ...(r.revert ? { revert: r.revert.message, revertName: r.revert.name, revertSource: r.revertSource } : {}),
    signedBy: info.agent, explorer: cfg().txUrl(r.hash),
  };
  bus.publish({ type: "forced", pocket, ...out });
  return out;
}

/** A chat sentence that is an attack: publish it, and for escalation let the card's agent key try the owner's controls. */
export async function publishAttack(pocket: Address, text: string): Promise<void> {
  const attack = attackOf(text);
  if (!attack) return;
  const base = { type: "attack" as const, pocket, attack, text: text.slice(0, 280), verdict: "refused", by: "agent" };
  if (attack === "extraction") { bus.publish({ ...base, reason: "DISCLOSURE_REFUSED", asked: askedFor(text), revealed: [] }); return; }
  if (attack === "induced") { bus.publish({ ...base, reason: "NOT_A_PURCHASE" }); return; }
  const { info, pk } = await cardAgent(pocket);
  const t = text.toLowerCase();
  const m = /\b(?:hk|us)\$\s?(\d+(?:\.\d{1,2})?)|\$(\d+(?:\.\d{1,2})?)|\b(\d+(?:\.\d{1,2})?)\s?(?:ehkd|dollars?)\b/.exec(t);
  const hkd = m?.[1] ?? m?.[2] ?? m?.[3] ?? "800";
  const tries: { call: string; data: Hex }[] = [];
  if (!/\bseller\b/.test(t) || /cap|limit/.test(t)) tries.push({ call: `setCap(HK$${hkd})`, data: encodeFunctionData({ abi: OWNER_ONLY, functionName: "setCap", args: [BigInt(Math.round(Number(hkd) * 1e6))] }) });
  if (/\bseller\b|allow ?list|white ?list/.test(t)) tries.push({ call: `setSeller(${ATTACKER.slice(0, 6)}…${ATTACKER.slice(-4)}, true)`, data: encodeFunctionData({ abi: OWNER_ONLY, functionName: "setSeller", args: [ATTACKER, true] }) });
  const txs: { call: string; tx?: string; reverted: boolean; revert?: string }[] = [];
  if (pk) {
    const agent = privateKeyToAccount(pk).address;
    await fundIfEmpty(pub(), [agent]).catch(() => []); // FISCO: a sender needs a native balance (gas itself is free)
    for (const x of tries) {
      try {
        const r = await sendRaw(pk, { to: pocket, data: x.data, gas: 100_000n }); // raw: the chain's refusal is the evidence
        txs.push({ call: x.call, tx: r.hash, reverted: r.receipt.status !== "success", revert: r.revert?.message });
      } catch { txs.push({ call: x.call, reverted: true }); }
    }
  }
  bus.publish({ ...base, type: "attack", reason: "NOT_OWNER", tx: txs[0]?.tx, txs, from: info.agent });
}

export function arenaRoutes() {
  const app = new Hono();
  app.post("/api/arena/straight", async (c) => {
    const { pocket } = (await c.req.json().catch(() => ({}))) as { pocket?: string };
    const denied = await guard(c, pocket ?? ""); // only a card's owner attacks it
    if (denied) return denied;
    if (!perIp.hit(ipOf(c))) return c.json({ error: "ARENA_LIMIT", detail: "20 attacks per day from one address" }, 429);
    const r = await straightToChain(pocket as Address);
    return "error" in r ? c.json(r, 409) : c.json(r);
  });
  return app;
}
