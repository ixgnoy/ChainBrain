// The one number a judge reads in five seconds: how many attacks were stopped and how much money was lost.
import { useMemo } from "react";
import { ShieldCheck } from "lucide-react";
import { useNetwork } from "./useNetwork";
import { cn } from "../lib/cn";
import { curSign } from "../shared";

export function Protected({ big, className }: { big?: boolean; className?: string }) {
  const { attempts } = useNetwork();
  const { stopped, lost } = useMemo(() => {
    const at = attempts.filter((a) => a.attack);
    const paid = at.filter((a) => a.verdict === "paid");
    const cents = paid.reduce((n, a) => n + Math.round(Number(a.amount ?? 0) * 100), 0);
    return { stopped: at.length - paid.length, lost: `${curSign()}${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}` };
  }, [attempts]);
  return (
    <span data-testid="protected" data-stopped={stopped} data-lost={lost} className={cn("inline-flex items-center gap-2 rounded-full bg-card font-bold tracking-[-0.01em] text-ink shadow-[var(--shadow-level1)]", big ? "h-11 px-4 text-[15px]" : "h-9 px-3.5 text-[13px]", className)}>
      <ShieldCheck className={cn("shrink-0 text-green-ink", big ? "size-5" : "size-4")} strokeWidth={2} aria-hidden />
      <span className="num">{stopped} {stopped === 1 ? "attack" : "attacks"} stopped</span>
      <span aria-hidden className="text-faint">·</span>
      <span className={cn("num", lost === `${curSign()}0.00` ? "text-green-ink" : "text-vermillion-ink")}>{lost} lost</span>
    </span>
  );
}
