// Small console pieces shared by every page.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useNetwork, pocketTag, type TxDetail } from "./network";
import { DetailSheet, Pill } from "../seller/ui";
import { Disclosure } from "./kit";
import { splitHash, withTx } from "./route";
import { txEvidence, txSummary } from "./txView";
import { ago } from "./liveRules";
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
  return <button type="button" onClick={() => void navigator.clipboard?.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1400); })} className="relative inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent before:absolute before:-inset-x-2 before:-inset-y-3 before:content-[''] hover:underline">{ok ? <Check className="size-4" /> : <Copy className="size-4" strokeWidth={1.75} />}{ok ? "Copied" : "Copy"}</button>;
}

const STATUS = { success: { tone: "mint", text: "Success" }, pending: { tone: "neutral", text: "Pending" }, reverted: { tone: "negative", text: "Reverted" } } as const;

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
  const st = STATUS[d.status];
  const evidence = txEvidence(d);
  // a field the source does not know yet is left out, never shown as a dash
  const rows: [string, ReactNode][] = [
    ...(d.from ? [["From", who(d.from)] as [string, ReactNode]] : []),
    ...(d.to ? [["To", who(d.to)] as [string, ReactNode]] : []),
    ...(d.pocket ? [["Pocket", nameOf(d.pocket)] as [string, ReactNode]] : []),
    ...(d.submittedBy ? [["Sent by", who(d.submittedBy)] as [string, ReactNode]] : []),
    ...(d.block != null ? [["Block", d.block.toString()] as [string, ReactNode]] : []),
    ...(d.at ? [["Time", <>{new Date(d.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" })} <span className="text-muted">· {ago(d.at)}</span></>] as [string, ReactNode]] : []),
  ];
  return (
    <div>
      <div className="pb-5 pt-3">
        <Pill tone={st.tone}>{st.text}</Pill>
        <div className="num mt-3 text-[28px] font-semibold leading-8">{d.amount != null && d.amount > 0n ? usd(d.amount) : d.label}</div>
        {d.amount != null && d.amount > 0n && <div className="mt-0.5 text-[14px] text-muted">{d.label}</div>}
      </div>
      <h3 className="text-[12px] font-semibold uppercase leading-4 tracking-[0.06em] text-muted">Summary</h3>
      <p className="mt-1.5 text-[15px] leading-6 text-ink">{txSummary(d, who, nameOf)}</p>
      {rows.length > 0 && (
        <dl className="mt-5 divide-y divide-line border-y border-line text-[14px]">
          {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-6 py-3"><dt className="shrink-0 text-muted">{k}</dt><dd className="min-w-0 break-words text-right font-medium">{v}</dd></div>)}
        </dl>
      )}
      {evidence && (
        <>
          <h3 className="mt-6 text-[12px] font-semibold uppercase leading-4 tracking-[0.06em] text-muted">{evidence.title}</h3>
          <p className="mt-1.5 text-[14px] leading-5 text-ink2">{evidence.text}</p>
        </>
      )}
      <Disclosure className="mt-6" summary="Details">
        <div className="rounded-[14px] bg-canvas px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[13px] text-muted">Transaction hash</span><CopyHash text={d.hash} /></div>
          <p className="num mt-1 break-all text-[12px] leading-4 text-ink2" data-testid="tx-hash-full">{d.hash}</p>
          {d.pocket && <p className="num mt-3 break-all text-[12px] leading-4 text-ink2"><span className="text-muted">Pocket </span>{d.pocket}</p>}
        </div>
      </Disclosure>
    </div>
  );
}

/** One transaction sheet for the whole console; any TxHash inside opens it. Its address is shareable: `#live?tx=0x…`. */
export function TxViewerHost({ children, watch }: { children: ReactNode; watch?(pocket: string): void }) {
  const net = useNetwork();
  const [hash, setHash] = useState<string | undefined>(() => splitHash(location.hash).tx);
  useEffect(() => { const on = () => setHash(splitHash(location.hash).tx); addEventListener("hashchange", on); return () => removeEventListener("hashchange", on); }, []);
  const show = (h?: string) => { setHash(h); history.replaceState(null, "", withTx(location.hash || "#live", h)); };
  const d = hash ? net.txDetail(hash) ?? ({ hash, label: "Transaction", status: "pending" } as TxDetail) : undefined;
  const footer = d && (
    <>
      {net.explorer && <a href={net.explorer(d.hash)} target="_blank" rel="noreferrer noopener" className="inline-flex h-11 items-center gap-2 rounded-full border-[1.5px] border-accent px-5 text-[14px] font-semibold text-accent hover:bg-accent-soft">Open in explorer<ExternalLink className="size-4" strokeWidth={1.75} aria-hidden /></a>}
      {watch && d.pocket && <button type="button" onClick={() => { show(undefined); watch(d.pocket); }} className="inline-flex h-11 items-center rounded-full bg-accent px-5 text-[14px] font-semibold text-on-accent hover:bg-accent-press">Watch it in Live</button>}
    </>
  );
  return (
    <ViewTx.Provider value={show}>
      {children}
      <DetailSheet open={!!d} onOpenChange={(o) => !o && show(undefined)} title="Transaction" description="Details of this on-chain transaction" footer={footer}>{d && <TxBody d={d} />}</DetailSheet>
    </ViewTx.Provider>
  );
}

/** Reason code as judges see it: the code, then the sentence. Plain text, no second pill. */
export function Reason({ code }: { code: string }) {
  return <p className="text-[12px] leading-4 [overflow-wrap:anywhere]"><span className="font-semibold text-negative">{code}</span><span className="text-muted"> · {REASONS[code] ?? "Refused"}</span></p>;
}

const VERDICT: Record<ChipKind, string> = { ok: "bg-accent-soft text-accent", refused: "bg-negative-soft text-negative", stepup: "bg-warning-soft text-warning", revoked: "bg-fill text-ink2", info: "bg-fill text-ink2", neutral: "bg-fill text-ink2" };
export function Verdict({ kind, children }: { kind: ChipKind; children: string }) {
  if (!children) return null;
  return <span className={cn("inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[12px] font-semibold", VERDICT[kind])}>{children}</span>;
}

/** Small pill on a refusal, a revert or an ignored order: the wallet doing its job, not a failure. */
export function Expected({ className }: { className?: string }) {
  return <span title="The wallet working as designed" className={cn("inline-flex h-5 shrink-0 items-center rounded-full bg-accent-soft px-2 text-[12px] font-semibold text-accent", className)}>Expected</span>;
}

/** A tiny grey tag for the pockets that live on the linked phone, so they read apart from the network's own. */
export function PhoneTag() {
  return <span className="ml-2 inline-flex h-5 items-center rounded-full bg-fill px-2 align-middle text-[12px] font-semibold text-muted">Phone</span>;
}

export function TestnetChip() {
  const { dev } = useNetwork();
  const text = dev ? "Testnet · local fork · no real money" : "Testnet · Base Sepolia · no real money";
  return <span className="inline-flex h-8 items-center gap-2 rounded-full bg-card px-3.5 text-[12px] font-medium text-ink2"><span className="size-2 rounded-full bg-accent" aria-hidden />{text}</span>;
}

export function pocketStatus(p: PocketState): { label: string; kind: ChipKind } {
  if (p.revoked) return { label: "Revoked", kind: "refused" };
  if (p.expiresAt * 1000 < Date.now()) return { label: "Expired", kind: "revoked" };
  return { label: "Active", kind: "ok" };
}

export const sellerNames = (ids: string[], names: Map<string, string>) => ids.map((i) => names.get(i) ?? i);
export const ownerTag = (a: string) => shortAddr(a);
