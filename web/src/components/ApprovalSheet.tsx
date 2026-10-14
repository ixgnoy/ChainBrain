import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button, Sheet } from "./ui";
import { signTransfer } from "../wallet";
import { useApprovals } from "../useApprovals";
import { useConsole } from "../console";
import { cleanText } from "../lib/sanitize";
import { shortAddr, type Authorization } from "../shared";
import { shortHex } from "../lib/format";
import type { Approval } from "../lib/events";

const ERRORS: Record<string, string> = {
  OWNER_SIGNATURE_INVALID: "This pocket belongs to a different account than the one you signed with. Switch to the account that created the pocket.",
  NOT_PENDING: "This approval is no longer waiting: it was answered or timed out.",
};

/** Payment above the ask-me threshold: the owner co-signs the exact USDC transfer the wallet built. Accessible dialog: focus trap, Esc dismisses (does not decline). */
export default function ApprovalSheet({ approval, onClose }: { approval?: Approval; onClose(): void }) {
  const { cfg, bump } = useConsole();
  const { decide } = useApprovals();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<"sign" | "decline" | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { setErr(""); setBusy(null); }, [approval?.id]);
  useEffect(() => { if (!approval) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [approval]);

  const d = approval?.data;
  const auth: Authorization | undefined = d?.auth;
  const seller = cfg?.sellers.find((s) => s.id === d?.sellerId);
  const left = auth ? Number(auth.validBefore) - Math.floor(now / 1000) : 0;
  const expired = !!auth && left <= 0;

  async function approve() {
    if (!approval || !auth) return;
    setBusy("sign"); setErr("");
    try {
      const signature = await signTransfer(auth);
      const r = await decide(approval.id, { approved: true, signature });
      if (!r.ok) throw new Error(ERRORS[r.error ?? ""] ?? r.error);
      bump(); onClose();
    } catch (e) { setErr(cleanText((e as Error).message.split("\n")[0], 200)); } finally { setBusy(null); }
  }
  async function decline() {
    if (!approval) return;
    setBusy("decline"); setErr("");
    const r = await decide(approval.id, { approved: false });
    setBusy(null);
    if (!r.ok && r.error !== "NOT_PENDING") setErr(ERRORS[r.error ?? ""] ?? r.error ?? "failed"); else onClose();
  }

  const row = (k: string, v: React.ReactNode) => <div className="flex justify-between gap-4 py-1.5 text-[13px]"><dt className="shrink-0 text-t3">{k}</dt><dd className="mono min-w-0 break-all text-right text-t2">{v}</dd></div>;
  return (
    <Sheet open={!!approval} onOpenChange={(o) => !o && onClose()} side="center" title="Approve payment" description="Above your ask-me amount: the agent cannot pay until you sign." closeLabel="Close, decide later"
      footer={<div className="flex flex-col gap-2">
        {err && <p role="alert" className="text-sm text-refused-ink">{err}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" disabled={!!busy} onClick={() => void decline()}>{busy === "decline" ? "Declining…" : "Decline"}</Button>
          <Button variant="primary" disabled={!!busy || expired || !auth} onClick={() => void approve()}><ShieldCheck className="size-4" />{busy === "sign" ? "Check your wallet…" : "Approve and sign"}</Button>
        </div>
      </div>}>
      {approval && d && (
        <div className="space-y-4">
          <div>
            <div className="display num text-[44px] leading-[48px]">US${cleanText(d.amount, 12)}</div>
            <p className="mt-1 text-[14px]">to <b>{seller?.name ?? cleanText(d.sellerId, 30)}</b> for “{cleanText(d.description, 160)}”</p>
            <p className="mono text-[11px] text-t3">{cleanText(d.sellerId, 30)}/{cleanText(d.sku, 40)}</p>
          </div>
          <section><h3 className="caps mb-1.5">The agent's reason</h3><p className="rounded-2xl bg-e2 px-3.5 py-2.5 text-[14px] leading-6">{cleanText(approval.text, 400)}</p></section>
          <section><h3 className="caps mb-1.5">Task</h3><pre className="mono whitespace-pre-wrap break-words rounded-2xl bg-e2 p-3 text-[12px] leading-5 text-t2">{cleanText(d.intent, 600)}</pre></section>
          <section>
            <h3 className="caps mb-1">What you will sign</h3>
            <p className="text-[13px] text-t2">A USDC “TransferWithAuthorization” message, not a transaction, so no gas. It can be used once, for this payment only.</p>
            {auth && <dl className="mt-1 divide-y divide-hair">
              {row("From (pocket)", shortAddr(auth.from))}
              {row("To", shortAddr(auth.to))}
              {row("Amount", `US$${cleanText(d.amount, 12)} USDC`)}
              {row("Valid until", expired ? "expired" : `${new Date(Number(auth.validBefore) * 1000).toLocaleTimeString("en-GB")} (${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")} left)`)}
              {row("Nonce", shortHex(auth.nonce, 10, 6))}
            </dl>}
            {expired && <p className="mt-2 text-xs text-stepup-ink">The window passed. Decline, and the agent can ask again.</p>}
          </section>
        </div>
      )}
    </Sheet>
  );
}
