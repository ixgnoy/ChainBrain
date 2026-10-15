// Small console pieces shared by every page.
import { useNetwork, pocketTag } from "./network";
import { explorerHref } from "./route";
import { REASONS, formatUsd, shortAddr } from "../shared";
import type { ChipKind } from "../lib/trace";
import type { PocketState } from "./chain";
import { cn } from "../lib/cn";
import { agentByAddress } from "@sim/agents";
import { CLAUDE_SPARK, OPENAI_BLOSSOM, type Mark } from "../../../shared/brand/marks";

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
  return <a href={explorerHref.tx(hash)} aria-label={`Transaction ${short}`} className={cn("num relative text-[13px] font-semibold text-ink underline decoration-line decoration-2 underline-offset-4 before:absolute before:-inset-x-2 before:-inset-y-3.5 before:content-[''] hover:decoration-vermillion", className)}>{short}</a>;
}

/** An address that opens its explorer page. */
export function AddrLink({ address, label, className }: { address: string; label?: string; className?: string }) {
  return <a href={explorerHref.address(address)} className={cn("num text-ink underline decoration-line decoration-2 underline-offset-4 hover:decoration-vermillion", className)}>{label ?? shortAddr(address)}</a>;
}

/** Reason code as judges see it: the code, then the sentence. Plain text, no second pill. */
export function Reason({ code }: { code: string }) {
  return <p className="text-[12px] leading-4 [overflow-wrap:anywhere]"><span className="font-bold text-vermillion-ink">{code}</span><span className="text-muted"> · {REASONS[code] ?? "Refused"}</span></p>;
}

// green-soft = went through, vermillion-soft = refused or reverted, blue-soft = needs you, grey = everything else.
const VERDICT: Record<ChipKind, string> = { ok: "bg-green-soft text-green-ink", refused: "bg-vermillion-soft text-vermillion-ink", stepup: "bg-blue-soft text-blue-ink", revoked: "bg-tile text-ink2 shadow-[inset_0_0_0_1px_var(--color-tile-stroke)]", info: "bg-tile text-ink2 shadow-[inset_0_0_0_1px_var(--color-tile-stroke)]", neutral: "bg-tile text-ink2 shadow-[inset_0_0_0_1px_var(--color-tile-stroke)]" };
export function Verdict({ kind, children }: { kind: ChipKind; children: string }) {
  if (!children) return null;
  return <span className={cn("inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[12px] font-bold", VERDICT[kind])}>{children}</span>;
}

/** Small pill on a refusal, a revert or an ignored order: the wallet doing its job, not a failure. */
export function Expected({ className }: { className?: string }) {
  return <span title="The wallet working as designed" className={cn("inline-flex h-5 shrink-0 items-center rounded-full bg-green-soft px-2 text-[12px] font-bold text-green-ink", className)}>Expected</span>;
}

/** A tiny grey tag for the pockets that live on the linked phone, so they read apart from the network's own. */
export function PhoneTag() {
  return <span className="ml-2 inline-flex h-5 items-center rounded-full bg-tile px-2 align-middle text-[12px] font-bold text-muted shadow-[inset_0_0_0_1px_var(--color-tile-stroke)]">Phone</span>;
}

export function TestnetChip() {
  const { dev, builtin } = useNetwork();
  const text = builtin || dev ? "Test network" : "Testnet · Base Sepolia";
  // "no real money" joins the label when the header has room (Clash and General Sans run wider than the old face)
  return <span title={`${text} · no real money`} className="inline-flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-ink/[0.07] px-3.5 text-[12px] font-semibold text-ink2"><span className="size-2 shrink-0 rounded-full bg-vermillion" aria-hidden />{text}<span className="hidden xl:inline"> · no real money</span></span>;
}

export function pocketStatus(p: PocketState): { label: string; kind: ChipKind } {
  if (p.revoked) return { label: "Revoked", kind: "refused" };
  if (p.expiresAt * 1000 < Date.now()) return { label: "Expired", kind: "revoked" };
  return { label: "Active", kind: "ok" };
}

export const sellerNames = (ids: string[], names: Map<string, string>) => ids.map((i) => names.get(i) ?? i);
export const ownerTag = (a: string) => shortAddr(a);

// ---- agents: the pocket's immutable agent key names the agent that holds it (built-in network: ChainBrain, Claude,
// ChatGPT; a real server: its one key is ChainBrain's own agent). Marks are the official files in shared/brand, unaltered.

export function agentOfKey(key: string | undefined, serverAgent?: string): { id: string; name: string } | undefined {
  const a = agentByAddress(key);
  if (a) return { id: a.id, name: a.name };
  if (key && serverAgent && key.toLowerCase() === serverAgent.toLowerCase()) return { id: "chainbrain", name: "ChainBrain" };
  return undefined;
}

function MarkSvg({ mark, size }: { mark: Mark; size: number }) {
  return <svg width={size} height={size} viewBox={mark.viewBox} aria-hidden>{mark.paths.map((d, i) => <path key={i} d={d} fill={mark.fill} />)}</svg>;
}

/** A small agent chip: the agent's mark and name; falls back to the short key. */
export function AgentTag({ agentKey, serverAgent, className }: { agentKey: string; serverAgent?: string; className?: string }) {
  const a = agentOfKey(agentKey, serverAgent);
  if (!a) return <span className={cn("num", className)}>{`${agentKey.slice(0, 6)}…${agentKey.slice(-4)}`}</span>;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-fill py-0.5 pl-0.5 pr-2 text-[12px] font-semibold leading-4 text-ink2", className)} title={agentKey}>
      <span className={cn("grid size-5 place-items-center rounded-[6px]", a.id === "chainbrain" ? "bg-ink" : "bg-card ring-1 ring-tile-stroke")}>
        {a.id === "claude" ? <MarkSvg mark={CLAUDE_SPARK} size={13} /> : a.id === "chatgpt" ? <MarkSvg mark={OPENAI_BLOSSOM} size={14} /> : <span className="size-2 rounded-full bg-white" />}
      </span>
      {a.name}
    </span>
  );
}
