// Small console pieces shared by every page.
import { useNetwork, pocketTag } from "./network";
import { explorerHref } from "./route";
import { REASONS, formatUsd, shortAddr } from "../shared";
import type { ChipKind } from "../lib/trace";
import type { PocketState } from "./chain";
import { cn } from "../lib/cn";

export const usd = (n?: bigint) => (n == null ? "–" : `US$${formatUsd(n)}`);
export const NEVER = 2n ** 256n - 1n;
export { pocketTag };
export const clock = (ms: number) => new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

/** Opens a transaction in the in-app explorer. */
export const useViewTx = () => viewTx;
const viewTx = (hash: string) => { location.hash = `explorer/tx/${hash}`; };

/** Short hash. Every hash in the console opens the in-app explorer (a real link, so it can be shared or opened in a new tab). */
export function TxHash({ hash, className, inert }: { hash?: string; className?: string; inert?: boolean }) {
  if (!hash) return null;
  const short = `${hash.slice(0, 10)}…${hash.slice(-6)}`;
  if (inert) return <span className={cn("num text-[13px] text-muted", className)}>{short}</span>; // inside a row that opens the explorer itself
  return <a href={explorerHref.tx(hash)} aria-label={`Transaction ${short}`} className={cn("num relative text-[13px] font-medium text-accent before:absolute before:-inset-x-2 before:-inset-y-3.5 before:content-[''] hover:underline", className)}>{short}</a>;
}

/** An address that opens its explorer page. */
export function AddrLink({ address, label, className }: { address: string; label?: string; className?: string }) {
  return <a href={explorerHref.address(address)} className={cn("num text-accent hover:underline", className)}>{label ?? shortAddr(address)}</a>;
}

/** Reason code as judges see it: the code, then the sentence. Plain text, no second pill. */
export function Reason({ code }: { code: string }) {
  return <p className="text-[12px] leading-4 [overflow-wrap:anywhere]"><span className="font-semibold text-ink">{code}</span><span className="text-muted"> · {REASONS[code] ?? "Refused"}</span></p>;
}

const VERDICT: Record<ChipKind, string> = { ok: "bg-accent-soft text-accent", refused: "bg-ink text-on-accent", stepup: "bg-warning-soft text-warning", revoked: "bg-fill text-ink2", info: "bg-fill text-ink2", neutral: "bg-fill text-ink2" };
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
  const { dev, builtin } = useNetwork();
  const text = builtin || dev ? "Test network · no real money" : "Testnet · Base Sepolia · no real money";
  return <span className="inline-flex h-8 items-center gap-2 rounded-full bg-card px-3.5 text-[12px] font-medium text-ink2"><span className="size-2 rounded-full bg-accent" aria-hidden />{text}</span>;
}

export function pocketStatus(p: PocketState): { label: string; kind: ChipKind } {
  if (p.revoked) return { label: "Revoked", kind: "refused" };
  if (p.expiresAt * 1000 < Date.now()) return { label: "Expired", kind: "revoked" };
  return { label: "Active", kind: "ok" };
}

export const sellerNames = (ids: string[], names: Map<string, string>) => ids.map((i) => names.get(i) ?? i);
export const ownerTag = (a: string) => shortAddr(a);
