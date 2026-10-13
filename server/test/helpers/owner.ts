import { bus } from "../../src/wallet/events";
import { approvals, type Approval } from "../../src/wallet/approvals";

/**
 * A scripted owner: confirms intents, signs payment approvals with the owner key, answers questions.
 * Goes through the same HTTP route the app uses, so the owner-signature check is exercised.
 */
export function autoOwner(o: {
  api: { request: (p: string, init?: RequestInit) => Response | Promise<Response> };
  sign: (auth: any) => Promise<`0x${string}`>;
  intent?: "approve" | "decline";
  payment?: "approve" | "decline";
  answer?: string;
  onPaymentApproval?: (a: Approval) => void;
}) {
  const seen = new Set<string>();
  const post = (id: string, body: object) =>
    o.api.request(`/api/approvals/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return bus.subscribe(async (e) => {
    const a = e.approval as Approval | undefined;
    if (!a || a.status !== "pending" || seen.has(a.id)) return;
    seen.add(a.id);
    if (a.kind === "intent") await post(a.id, { approved: (o.intent ?? "approve") === "approve" });
    if (a.kind === "payment") {
      o.onPaymentApproval?.(a);
      if ((o.payment ?? "approve") === "decline") await post(a.id, { approved: false });
      else await post(a.id, { approved: true, signature: await o.sign((a.data as any).auth) });
    }
    if (a.kind === "question" && o.answer) approvals.resolve(a.id, { approved: true, answer: o.answer });
  });
}
