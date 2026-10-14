// Small console pieces shared by every page.
import { ExternalLink } from "lucide-react";
import { useNetwork } from "./useNetwork";
import { REASONS, formatUsd, shortAddr } from "../shared";
import type { ChipKind } from "../lib/trace";
import type { PocketState } from "./chain";
import { cn } from "../lib/cn";

export const usd = (n?: bigint) => (n == null ? "–" : `US$${formatUsd(n)}`);
export const NEVER = 2n ** 256n - 1n;
export const pocketTag = (a: string) => `Pocket ${a.slice(-4).toUpperCase()}`;
export const clock = (ms: number) => new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

/** Short hash; a block-explorer link on the real chain, plain text on the local fork (fork hashes are not on BaseScan). */
export function TxHash({ hash, className }: { hash?: string; className?: string }) {
  const { explorer } = useNetwork();
  if (!hash) return null;
  const short = `${hash.slice(0, 10)}…${hash.slice(-6)}`;
  if (!explorer) return <span className={cn("num text-[13px] text-muted", className)} title={`${hash} (local test chain: not on BaseScan)`}>{short}</span>;
  return <a href={explorer(hash)} target="_blank" rel="noreferrer noopener" className={cn("num inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline", className)}>{short}<ExternalLink className="size-3.5" strokeWidth={1.75} aria-hidden /></a>;
}

/** Reason code as judges see it: the code, then the sentence. */
export function Reason({ code }: { code: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-negative-soft py-1 pl-1 pr-3 text-[13px] text-negative">
      <span className="rounded-full bg-card px-2 py-0.5 text-[12px] font-semibold tracking-[0.01em]">{code}</span>
      <span className="truncate">{REASONS[code] ?? "Refused"}</span>
    </span>
  );
}

const VERDICT: Record<ChipKind, string> = { ok: "bg-accent-soft text-accent", refused: "bg-negative-soft text-negative", stepup: "bg-warning-soft text-warning", revoked: "bg-fill text-ink2", info: "bg-fill text-ink2", neutral: "bg-fill text-ink2" };
export function Verdict({ kind, children }: { kind: ChipKind; children: string }) {
  if (!children) return null;
  return <span className={cn("inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[12px] font-semibold", VERDICT[kind])}>{children}</span>;
}

export function TestnetChip() {
  const { dev, mode } = useNetwork();
  const text = mode === "demo" ? "Demo data · wallet server not reachable" : dev ? "Testnet · local Base Sepolia fork · no real money" : "Testnet · Base Sepolia · no real money";
  return <span className="inline-flex h-8 items-center gap-2 rounded-full bg-card px-3.5 text-[13px] font-medium text-ink2"><span className="size-2 rounded-full bg-accent" aria-hidden />{text}</span>;
}

export function pocketStatus(p: PocketState): { label: string; kind: ChipKind } {
  if (p.revoked) return { label: "Revoked", kind: "refused" };
  if (p.expiresAt * 1000 < Date.now()) return { label: "Expired", kind: "revoked" };
  return { label: "Active", kind: "ok" };
}

export const sellerNames = (ids: string[], names: Map<string, string>) => ids.map((i) => names.get(i) ?? i);
export const ownerTag = (a: string) => shortAddr(a);
