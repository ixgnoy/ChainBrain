// Plain-words copy for the transaction sheet: one summary sentence and, where the rules decided something, the evidence.
import type { TxDetail } from "./network";
import { formatUsd } from "../shared";

const money = (n?: bigint) => (n == null || n === 0n ? "" : `US$${formatUsd(n)}`);

export function txSummary(d: TxDetail, who: (a?: string) => string, name: (a: string) => string): string {
  const amt = money(d.amount);
  const pocket = d.pocket ? name(d.pocket) : "the pocket";
  if (d.status === "reverted") return "The pocket contract refused this transfer, so no money moved.";
  if (d.status === "pending") return "The details of this transaction have not arrived yet.";
  switch (d.label) {
    case "Agent payment": case "Payment": return `${pocket} paid ${who(d.to)}${amt ? ` ${amt}` : ""}.`;
    case "Funded": return `${who(d.from)} added${amt ? ` ${amt}` : " funds"} to ${pocket}.`;
    case "Returned to owner": return `${pocket} returned${amt ? ` ${amt}` : " its balance"} to its owner.`;
    case "Pocket created": return `${pocket} was created with its own budget and rules.`;
    case "Revoked": return `The owner stopped ${pocket}. The agent can no longer spend from it.`;
    case "Rules changed": return `The owner changed the rules of ${pocket}.`;
    default: return d.label;
  }
}

/** What decided this transaction, when the pocket's own rules did. */
export function txEvidence(d: TxDetail): { title: string; text: string } | undefined {
  if (d.status === "reverted") return { title: "Why it was refused", text: "The agent's key may only pay sellers on the pocket's list, within its cap. A transfer past the agent breaks that rule, so the pocket contract reverted it and the balance did not move." };
  if (d.status === "success" && (d.label === "Agent payment" || d.label === "Payment")) return { title: "What the pocket checked", text: "Before releasing the money, the pocket contract checked the seller against its list and the amount against its per-payment cap." };
  return undefined;
}
