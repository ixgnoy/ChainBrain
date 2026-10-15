import type { Address, Hex } from "viem";
import { pocket as P, pub, USDC } from "./chain";
import { agentAccount, prepareApproval } from "./pay";
import { envelope, transferTypedData } from "./scheme";
import { isReason } from "./reasons";
import type { QuoteRec } from "./state";

/** The prediction made before a payment, and later checked against what happened. */
export type Prediction = { outcome: "pays" | "refused"; reason?: string; by: "eth_call" | "rules"; balanceAfter?: string; detail?: string };

const TWA = [{
  type: "function", name: "transferWithAuthorization", stateMutability: "nonpayable",
  inputs: [
    { name: "from", type: "address" }, { name: "to", type: "address" }, { name: "value", type: "uint256" }, { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" }, { name: "nonce", type: "bytes32" }, { name: "signature", type: "bytes" },
  ], outputs: [],
}] as const;

/**
 * Self-model pre-flight: simulate the exact USDC transfer this payment would submit (the same authorization, the agent's
 * signature and the owner's co-signature if any) with eth_call against the current chain. USDC asks the pocket's
 * isValidSignature, so the pocket's own rules decide the prediction, not a guess. The rules' reason names a refusal.
 * Nothing is sent; the signature stays in this process.
 */
export async function preflight(pocket: Address, rec: QuoteRec, intentHash: Hex): Promise<Prediction> {
  const p = P(pocket);
  const [rule, needs, info] = await Promise.all([p.canPay(rec.payTo, rec.amount), p.needsOwner(rec.amount), p.info()]);
  const ruleReason = rule !== "OK" ? rule : needs && !rec.ownerSig ? "NEEDS_OWNER_APPROVAL" : undefined;
  const balanceAfter = (info.balance - rec.amount).toString();
  try {
    const auth = prepareApproval(pocket, rec, intentHash); // the same authorization (and nonce) the payment will use
    const agentSig = await agentAccount().signTypedData(transferTypedData(auth));
    await pub().simulateContract({
      address: USDC, abi: TWA, functionName: "transferWithAuthorization",
      args: [auth.from, auth.to, BigInt(auth.value), BigInt(auth.validAfter), BigInt(auth.validBefore), auth.nonce, envelope(auth, agentSig, rec.ownerSig ?? "0x")],
      account: (process.env.PREFLIGHT_FROM ?? "0x000000000000000000000000000000000000dEaD") as Address,
    });
    return ruleReason ? { outcome: "refused", reason: ruleReason, by: "rules", detail: "rules and the simulation disagree" } : { outcome: "pays", by: "eth_call", balanceAfter };
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    if (/HTTP request failed|fetch failed|ECONNREFUSED|timeout/i.test(msg)) return ruleReason ? { outcome: "refused", reason: ruleReason, by: "rules" } : { outcome: "pays", by: "rules", balanceAfter };
    // the simulated transfer reverted: the pocket (or USDC) said no; the rules say which rule
    return { outcome: "refused", reason: ruleReason && isReason(ruleReason) ? ruleReason : "SETTLEMENT_FAILED", by: "eth_call", detail: (/reverted[^\n]*/.exec(msg)?.[0] ?? "").slice(0, 160) };
  }
}

export const sameOutcome = (pre: Prediction, ok: boolean, reason?: string) => (pre.outcome === "pays") === ok && (ok || !pre.reason || pre.reason === reason);
