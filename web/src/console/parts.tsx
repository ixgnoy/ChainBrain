// Small console pieces shared by every page.
import { createContext, useContext, useState, type ReactNode } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useNetwork, pocketTag, type TxDetail } from "./network";
import { Avatar, Card, DetailSheet, Pill } from "../seller/ui";
import { REASONS, formatUsd, shortAddr } from "../shared";
import type { ChipKind } from "../lib/trace";
import type { PocketState } from "./chain";
import { cn } from "../lib/cn";

export const usd = (n?: bigint) => (n == null ? "–" : `US$${formatUsd(n)}`);
export const NEVER = 2n ** 256n - 1n;
export { pocketTag };
export const clock = (ms: number) => new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export const useViewTx = () => useContext(ViewTx);
const ViewTx = createContext<(hash: string) => void>(() => {});

/** Short hash. A BaseScan link when the chain is public; otherwise it opens the transaction's detail inside the app. */
export function TxHash({ hash, className, inert }: { hash?: string; className?: string; inert?: boolean }) {
  const { explorer } = useNetwork();
  const view = useContext(ViewTx);
  if (!hash) return null;
  const short = `${hash.slice(0, 10)}…${hash.slice(-6)}`;
  if (inert && !explorer) return <span className={cn("num text-[13px] text-muted", className)}>{short}</span>; // inside a row that opens the detail itself
  if (!explorer) return <button type="button" onClick={() => view(hash)} aria-label={`Transaction ${short}`} className={cn("num relative text-[13px] font-medium text-accent before:absolute before:-inset-x-2 before:-inset-y-3.5 before:content-[''] hover:underline", className)}>{short}</button>;
  return <a href={explorer(hash)} target="_blank" rel="noreferrer noopener" className={cn("num relative inline-flex items-center gap-1 text-[13px] font-medium text-accent before:absolute before:-inset-x-2 before:-inset-y-3.5 before:content-[''] hover:underline", className)}>{short}<ExternalLink className="size-3.5" strokeWidth={1.75} aria-hidden /></a>;
}

function CopyHash({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return <button type="button" onClick={() => void navigator.clipboard?.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1400); })} className="relative inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent before:absolute before:-inset-x-2 before:-inset-y-3 before:content-[''] hover:underline">{ok ? <Check className="size-4" /> : <Copy className="size-4" strokeWidth={1.75} />}{ok ? "Copied" : "Copy"}</button>;
}

function TxBody({ d }: { d: TxDetail }) {
  const { cfg, pockets, nameOf } = useNetwork();
  const who = (a?: string) => {
    if (!a) return "–";
    const l = a.toLowerCase();
    const s = cfg.sellers.find((x) => x.payTo.toLowerCase() === l);
    if (s) return `${s.name} · ${shortAddr(a)}`;
    if (pockets.some((p) => p.address.toLowerCase() === l)) return `${nameOf(a)} · ${shortAddr(a)}`;
    if (l === cfg.agent.toLowerCase()) return `Agent key · ${shortAddr(a)}`;
    if (pockets.some((p) => p.owner.toLowerCase() === l)) return `Owner · ${shortAddr(a)}`;
    return shortAddr(a);
  };
  const ok = d.status === "success", pending = d.status === "pending";
  // a field the source does not know yet is left out, never shown as a dash
  const rows: [string, ReactNode][] = [
    ["Type", d.label],
    ...(d.from ? [["From", who(d.from)] as [string, ReactNode]] : []),
    ...(d.to ? [["To", who(d.to)] as [string, ReactNode]] : []),
    ...(d.submittedBy ? [["Sent by", who(d.submittedBy)] as [string, ReactNode]] : []),
    ...(d.block != null ? [["Block", d.block.toString()] as [string, ReactNode]] : []),
    ...(d.at ? [["Time", new Date(d.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" })] as [string, ReactNode]] : []),
  ];
  return (
    <div>
      <div className="flex flex-col items-center py-6 text-center">
        <Avatar tone={ok || pending ? "accent" : "negative"} size={64}>{ok || pending ? <Check className="size-7" strokeWidth={1.75} /> : <span className="text-[24px]">×</span>}</Avatar>
        <div className="num mt-4 text-[36px] font-bold leading-10">{d.amount != null && d.amount > 0n ? usd(d.amount) : d.label}</div>
        <div className="mt-3"><Pill tone={ok || pending ? "accent" : "negative"}>{pending ? "Pending" : ok ? "Success" : "Reverted by the pocket"}</Pill></div>
        {!ok && !pending && <p className="mx-auto mt-4 max-w-[34ch] text-[15px] text-ink2">The pocket contract refused this transfer, so no money moved.</p>}
      </div>
      <Card className="bg-canvas">
        <dl className="divide-y divide-line text-[15px]">
          {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-6 px-5 py-3.5"><dt className="shrink-0 text-muted">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}
        </dl>
      </Card>
      <div className="mt-4 rounded-[20px] bg-canvas px-5 py-3.5">
        <div className="flex items-center justify-between"><span className="text-[14px] text-muted">Transaction hash</span><CopyHash text={d.hash} /></div>
        <p className="num mt-1 break-all text-[13px] text-ink2" data-testid="tx-hash-full">{d.hash}</p>
      </div>
    </div>
  );
}

/** One transaction sheet for the whole console; any TxHash inside opens it. */
export function TxViewerHost({ children }: { children: ReactNode }) {
  const net = useNetwork();
  const [hash, setHash] = useState<string>();
  const d = hash ? net.txDetail(hash) ?? ({ hash, label: "Transaction", status: "pending" } as TxDetail) : undefined;
  return (
    <ViewTx.Provider value={setHash}>
      {children}
      <DetailSheet open={!!d} onOpenChange={(o) => !o && setHash(undefined)} title="Transaction" description="Details of this on-chain transaction">{d && <TxBody d={d} />}</DetailSheet>
    </ViewTx.Provider>
  );
}

/** Reason code as judges see it: the code, then the sentence. */
export function Reason({ code }: { code: string }) {
  return (
    <span className="inline-flex max-w-full items-start gap-2 rounded-[16px] bg-negative-soft py-1 pl-1 pr-3 text-[13px] leading-5 text-negative">
      <span className="shrink-0 rounded-full bg-card px-2 py-0.5 text-[12px] font-semibold tracking-[0.01em]">{code}</span>
      <span className="min-w-0 break-words py-0.5">{REASONS[code] ?? "Refused"}</span>
    </span>
  );
}

const VERDICT: Record<ChipKind, string> = { ok: "bg-accent-soft text-accent", refused: "bg-negative-soft text-negative", stepup: "bg-warning-soft text-warning", revoked: "bg-fill text-ink2", info: "bg-fill text-ink2", neutral: "bg-fill text-ink2" };
export function Verdict({ kind, children }: { kind: ChipKind; children: string }) {
  if (!children) return null;
  return <span className={cn("inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[12px] font-semibold", VERDICT[kind])}>{children}</span>;
}

/** Small pill on a refusal, a revert or an ignored order: the wallet doing its job, not a failure. */
export function Expected({ className }: { className?: string }) {
  return <span title="The wallet working as designed" className={cn("inline-flex h-5 shrink-0 items-center rounded-full bg-accent-soft px-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-accent", className)}>Expected</span>;
}

/** A tiny grey tag for the pockets that live on the linked phone, so they read apart from the network's own. */
export function PhoneTag() {
  return <span className="ml-2 inline-flex h-5 items-center rounded-full bg-fill px-2 align-middle text-[11px] font-semibold uppercase tracking-[0.04em] text-muted">Phone</span>;
}

export function TestnetChip() {
  const { dev } = useNetwork();
  const text = dev ? "Testnet · local Base Sepolia fork · no real money" : "Testnet · Base Sepolia · no real money";
  return <span className="inline-flex h-8 items-center gap-2 rounded-full bg-card px-3.5 text-[13px] font-medium text-ink2"><span className="size-2 rounded-full bg-accent" aria-hidden />{text}</span>;
}

export function pocketStatus(p: PocketState): { label: string; kind: ChipKind } {
  if (p.revoked) return { label: "Revoked", kind: "refused" };
  if (p.expiresAt * 1000 < Date.now()) return { label: "Expired", kind: "revoked" };
  return { label: "Active", kind: "ok" };
}

export const sellerNames = (ids: string[], names: Map<string, string>) => ids.map((i) => names.get(i) ?? i);
export const ownerTag = (a: string) => shortAddr(a);
