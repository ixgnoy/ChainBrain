// Bank / Compliance derivations. Everything comes from the v2 event trail (in this browser session, last 1000 server
// events at connect) and on-chain reads of the pocket contracts. There is no server route for history.
import { samePocket, approvalStates, reasonsOf, type WalletEvent } from "./events";
import { untrustedOf } from "./trace";
import { cleanText } from "./sanitize";
import { usd, pseudonym } from "./format";
import type { LedgerRow } from "./ledger";

export type Filters = { pocket: string; seller: string; verdict: "all" | "paid" | "refused"; reason?: string; cosigned?: boolean };
export const NO_FILTER: Filters = { pocket: "all", seller: "all", verdict: "all" };

export function applyFilters(rows: LedgerRow[], f: Filters): LedgerRow[] {
  return rows.filter((r) => {
    if (f.pocket !== "all" && !samePocket(r.pocket, f.pocket)) return false;
    if (f.seller !== "all" && r.sellerId !== f.seller) return false;
    if (f.verdict !== "all" && r.outcome !== f.verdict) return false;
    if (f.reason && !r.reasons.includes(f.reason)) return false;
    if (f.cosigned && !r.cosigned) return false;
    return true;
  });
}

export type Kpis = { payments: number; totalPaid: bigint; refusals: number; cosigned: number; revokedPockets: number };
export function kpis(rows: LedgerRow[], revokedPockets: number): Kpis {
  const paid = rows.filter((r) => r.outcome === "paid");
  return {
    payments: paid.length,
    totalPaid: paid.reduce((s, r) => s + (r.amount ?? 0n), 0n),
    refusals: rows.filter((r) => r.outcome === "refused").length,
    cosigned: paid.filter((r) => r.cosigned).length,
    revokedPockets,
  };
}

export function refusalCounts(rows: LedgerRow[]): { reason: string; count: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) if (r.outcome === "refused") for (const c of r.reasons.length ? r.reasons : ["UNSPECIFIED"]) m.set(c, (m.get(c) ?? 0) + 1);
  return [...m.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));
}

export type SecCategory = "injection" | "disclosure" | "signature" | "overreach" | "revoke" | "owner";
export type SecEvent = { key: string; at: number; severity: "high" | "medium" | "low"; category: SecCategory; title: string; detail: string; reasons: string[]; pocket?: string; sellerId?: string };

const OVERREACH = ["SELLER_NOT_ALLOWED", "OVER_CAP", "OVER_BUDGET", "PRICE_ABOVE_INTENT", "INTENT_TOTAL_REACHED", "INTENT_ITEMS_REACHED"];

/** `redactOwnerText` (regulator): drop approval text, which echoes what the owner asked for. */
export function securityEvents(events: WalletEvent[], opts: { redactOwnerText?: boolean } = {}): SecEvent[] {
  const out: SecEvent[] = [];
  events.forEach((e, i) => {
    const key = `${i}-${e.at}-${e.type}`;
    const push = (s: Omit<SecEvent, "key" | "at" | "reasons" | "pocket"> & { reasons?: string[] }) => out.push({ key: `${key}-${out.length}`, at: e.at, pocket: e.pocket, reasons: s.reasons ?? reasonsOf(e), ...s });
    const u = untrustedOf(e);
    if (u?.injection) push({ severity: "high", category: "injection", title: "Instruction-like text in seller content", detail: `Delivered by ${cleanText(u.source ?? "a seller", 40)}; passed to the agent marked as untrusted data, never as instructions.`, reasons: [], sellerId: u.source });
    if (e.type === "disclosure") {
      const asked = (Array.isArray(e.asked) ? e.asked : []).map((d: string) => cleanText(d, 30)).join(", ");
      push({ severity: "medium", category: "disclosure", title: "Data request refused", detail: `${cleanText(e.sellerId, 30)} asked for ${asked || "extra data"} beyond the purchase.`, sellerId: e.sellerId, reasons: reasonsOf(e).filter((c) => c === "DISCLOSURE_REFUSED") });
      if (e.signRequest || reasonsOf(e).includes("SIGNATURE_TYPE_NOT_ALLOWED")) push({ severity: "high", category: "signature", title: "Signature request refused", detail: `${cleanText(e.sellerId, 30)} asked the agent to sign something that is not an in-rule USDC payment.`, sellerId: e.sellerId, reasons: ["SIGNATURE_TYPE_NOT_ALLOWED"] });
    }
    if (e.type === "refusal") {
      const r = typeof e.reason === "string" ? e.reason : "";
      if (r === "POCKET_REVOKED") push({ severity: "low", category: "revoke", title: "Revocation enforced", detail: `${cleanText(e.sellerId, 30)}/${cleanText(e.sku, 30)} refused: the pocket is revoked.`, sellerId: e.sellerId });
      else push({ severity: OVERREACH.includes(r) ? "medium" : "low", category: "overreach", title: "Payment refused", detail: `${cleanText(e.sellerId, 30)}/${cleanText(e.sku, 30)} refused before settlement.`, sellerId: e.sellerId });
    }
  });
  for (const s of approvalStates(events)) {
    if (s.approval.status === "declined" || s.approval.status === "timeout")
      out.push({ key: `ap-${s.approval.id}`, at: s.at, severity: "low", category: "owner", title: s.approval.status === "declined" ? "Owner declined an approval" : "Approval timed out", detail: opts.redactOwnerText ? "Owner text removed in the regulator view." : cleanText(s.approval.text, 140), reasons: [], pocket: s.approval.pocket });
  }
  return out.sort((a, b) => b.at - a.at);
}

// ------------------------------------------------------------------ convention alignment
export type ConventionItem = { id: string; item: string; feature: string; status: "aligned" | "ours"; evidence?: { label: string; filter: Partial<Filters> } };
// Only the items reported in the press for the PCAC convention that map to something v2 really does; our own
// additions are labelled as such. Filing with PCAC is a licensed institution's duty and is not claimed here.
export const CONVENTION: ConventionItem[] = [
  { id: "auth", item: "Define the authorisation boundary", feature: "The pocket contract holds the owner's rules on-chain: seller allowlist, per-payment cap and expiry. The agent cannot widen them.", status: "aligned", evidence: { label: "Out-of-allowlist payments refused", filter: { verdict: "refused", reason: "SELLER_NOT_ALLOWED" } } },
  { id: "sign", item: "Authorisation signed by the user", feature: "The owner signs every pocket they create, and co-signs the exact USDC transfer for any payment above the ask-me amount.", status: "aligned", evidence: { label: "Payments co-signed by the owner", filter: { cosigned: true } } },
  { id: "intent", item: "Verify the user's payment intent", feature: "Each task starts with an intent card built from a fixed template; the owner confirms it and every payment is checked against it.", status: "aligned", evidence: { label: "Payments inside a confirmed task", filter: { verdict: "paid" } } },
  { id: "review", item: "Prudent review of large payments", feature: "A payment above the ask-me amount waits for the owner's approval.", status: "aligned", evidence: { label: "Owner-approved payments", filter: { cosigned: true } } },
  { id: "kill", item: "Shut-off channel", feature: "Revoke stops all agent payments at the contract; Return funds sends the balance back to the owner.", status: "ours", evidence: { label: "Payments refused after revoke", filter: { verdict: "refused", reason: "POCKET_REVOKED" } } },
  { id: "trail", item: "Payment trail", feature: "Each settled payment keeps its tx hash and intent hash, and every export carries a SHA-256.", status: "ours", evidence: { label: "Settled payments with a tx hash", filter: { verdict: "paid" } } },
];
export const CONVENTION_FOOTNOTE = "The industry self-regulatory convention (PCAC 《智能体支付应用自律公约》, issued 24 Aug 2026) is known to us from press reports. This is our self-assessment, not legal advice and not a statement of compliance.";

// ------------------------------------------------------------------ export
export type ExportRow = { time: string; pocket: string; sellerId: string; sku: string; amountUsdc: string; outcome: string; source: string; reasons: string[]; cosigned: string; tx: string; intentHash: string; task: string };

export function exportRows(rows: LedgerRow[], opts: { regulator?: boolean } = {}): ExportRow[] {
  return rows.map((r) => ({
    time: new Date(r.at).toISOString(), pocket: opts.regulator ? pseudonym(r.pocket) : r.pocket, sellerId: r.sellerId, sku: r.sku,
    amountUsdc: r.amount != null ? usd(r.amount) : "", outcome: r.outcome, source: r.source, reasons: r.reasons,
    cosigned: r.outcome === "paid" ? String(!!r.cosigned) : "", tx: r.tx ?? "", intentHash: r.intentHash ?? "",
    task: opts.regulator ? "" : cleanText(r.task ?? "", 300).replace(/\n/g, " / "),
  }));
}

export function exportJson(rows: ExportRow[], meta: { network: string; asOf: number; regulator: boolean }): string {
  return JSON.stringify({ kind: "chainbrain-agent-payments-ledger", network: meta.network, asOf: meta.asOf ? new Date(meta.asOf).toISOString() : null, view: meta.regulator ? "regulator (pseudonymised, read-only)" : "bank risk", rows }, null, 2);
}

const CSV_COLS: (keyof ExportRow)[] = ["time", "pocket", "sellerId", "sku", "amountUsdc", "outcome", "source", "reasons", "cosigned", "tx", "intentHash", "task"];
/** CSV with quoting and spreadsheet-formula neutralisation: seller-controlled cells starting with = + - @ get a leading apostrophe. */
export function exportCsv(rows: ExportRow[], note?: string): string {
  const cell = (v: unknown) => {
    let s = Array.isArray(v) ? v.join(" ") : String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = note ? [`# ${note}`] : [];
  return [...head, CSV_COLS.join(","), ...rows.map((r) => CSV_COLS.map((c) => cell(r[c])).join(","))].join("\n") + "\n";
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
