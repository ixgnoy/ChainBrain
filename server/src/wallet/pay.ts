import { getAddress, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPaymentFromConfig, decodePaymentResponseHeader } from "@x402/fetch";
import { decodePaymentRequiredHeader } from "@x402/core/http";
import { pocket as P } from "./chain";
import { cfg } from "../chains";
import { PocketScheme, CbError, buildAuthorization, type Authorization } from "./scheme";
import { state, type Quote, type QuoteRec } from "./state";
import { bus } from "./events";
import { isReason, type Reason } from "./reasons";

const sellersUrl = () => process.env.SELLERS_URL ?? "http://localhost:4021";
export const agentAccount = () => privateKeyToAccount(process.env.AGENT_PK as Hex);

export async function fetchQuote(sellerId: string, sku: string): Promise<{ kind: "priced"; quote: Quote } | { kind: "free"; status: number; body: string }> {
  const url = `${sellersUrl()}/${sellerId}/${sku}`;
  const r = await fetch(url);
  if (r.status !== 402) return { kind: "free", status: r.status, body: await r.text() };
  const req = (decodePaymentRequiredHeader(r.headers.get("PAYMENT-REQUIRED")!) as any).accepts[0];
  return {
    kind: "priced",
    quote: { quoteId: "", sellerId, sku, url, description: req.description ?? sku, payTo: getAddress(req.payTo), amount: BigInt(req.amount), asset: getAddress(req.asset) },
  };
}

export function track(pocket: Address, q: Quote): QuoteRec {
  const s = state(pocket);
  const rec: QuoteRec = { ...q, quoteId: `q${s.nextQuote++}`, paid: false, list: q.amount, ask: q.amount, rounds: 0 };
  s.quotes.set(rec.quoteId, rec);
  return rec;
}

/** Fixes the authorization once: the owner signs exactly this, and the payment uses exactly this (same nonce). */
export function prepareApproval(pocket: Address, rec: QuoteRec, intentHash: Hex, ttlSec = 600): Authorization {
  rec.auth ??= buildAuthorization(pocket, rec.payTo, rec.amount, intentHash, state(pocket).seq++, ttlSec);
  return rec.auth;
}

const reasonOf = (e: unknown): Reason | undefined => {
  if (e instanceof CbError) return e.reason;
  const m = /\b([A-Z_]{6,})\b/.exec(String(e)); // @x402/fetch wraps scheme errors in its own Error
  return m && isReason(m[1]) ? m[1] : undefined;
};

export type SettleResult = { ok: true; tx: Hex; body: string } | { ok: false; reason: Reason; detail?: string };

export async function settle(pocket: Address, rec: QuoteRec, intentHash: Hex): Promise<SettleResult> {
  if (rec.paid) return { ok: false, reason: "QUOTE_ALREADY_PAID" };
  rec.paid = true; // claimed synchronously, before any await: a concurrent call sees it
  const fail = (reason: Reason, detail?: string): SettleResult => {
    rec.paid = false;
    bus.publish({ type: "refusal", pocket, sellerId: rec.sellerId, sku: rec.sku, amount: rec.amount, reason, detail });
    return { ok: false, reason, detail };
  };
  try {
    const p = P(pocket);
    const info = await p.info();
    if (info.agent.toLowerCase() !== agentAccount().address.toLowerCase()) return fail("NOT_THIS_AGENT");
    const rule = await p.canPay(rec.payTo, rec.amount);
    if (rule !== "OK") return fail(isReason(rule) ? rule : "SETTLEMENT_FAILED", rule);
    if ((await p.needsOwner(rec.amount)) && !rec.ownerSig) return fail("NEEDS_OWNER_APPROVAL");
    if (rec.auth && BigInt(rec.auth.validBefore) <= BigInt(Math.floor(Date.now() / 1000) + 10)) return fail("APPROVAL_EXPIRED");
    const auth = prepareApproval(pocket, rec, intentHash);

    const pay = wrapFetchWithPaymentFromConfig(fetch, {
      schemes: [{ network: cfg().network, client: new PocketScheme({ auth, agent: agentAccount(), ownerSig: rec.ownerSig ?? "0x" }) as any }],
      // @x402/fetch defaults to $1 of known USD tokens only; allow our token, capped atomically at the pocket's cap (the real limit)
      spendControls: { allowedAssets: [{ network: cfg().network, asset: cfg().token, maxAmountPerPayment: info.cap.toString() }] },
    } as any);

    // Network failure: retry once with the identical authorization (same nonce), so it can never pay twice.
    let r: Response;
    try {
      r = await pay(rec.url);
    } catch (e) {
      const why = reasonOf(e);
      if (why) return fail(why, String(e));
      r = await pay(rec.url);
    }
    if (r.status !== 200) {
      const pr = r.headers.get("PAYMENT-REQUIRED");
      return fail("SETTLEMENT_FAILED", pr ? (decodePaymentRequiredHeader(pr) as any).error : `HTTP ${r.status}`);
    }
    const settled = decodePaymentResponseHeader(r.headers.get("PAYMENT-RESPONSE")!) as any;
    const s = state(pocket);
    s.spent += rec.amount;
    s.items += 1;
    bus.publish({ type: "payment", pocket, sellerId: rec.sellerId, sku: rec.sku, amount: rec.amount, tx: settled.transaction, nonce: auth.nonce, intentHash, cosigned: !!rec.ownerSig, ...(rec.amount < rec.list ? { list: rec.list } : {}) });
    return { ok: true, tx: settled.transaction, body: await r.text() };
  } catch (e) {
    return fail(reasonOf(e) ?? "SETTLEMENT_FAILED", String(e));
  }
}
