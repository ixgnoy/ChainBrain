// Small building blocks for the console, each adapted from a permissively licensed reference (see THIRD_PARTY.md):
// Empty and Kbd from shadcn/ui, Tracker and the segmented bar from Tremor, the disclosure pattern from shadcn/Radix collapsible (written fresh).
// Restyled to Neo-Kinetic Fintech: flat white cards, 45° hatch for tracks and fills, no glow, no shimmer.
import { useId, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "../lib/cn";

/** Keyboard key cap (shadcn Kbd). */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return <kbd className={cn("pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center rounded-[6px] bg-tile px-1.5 font-sans text-[12px] font-bold text-ink2 shadow-[inset_0_0_0_1px_var(--color-line)]", className)}>{children}</kbd>;
}

/** An empty list or card: a quiet 40 px glyph, a title, one sentence and at most one action (shadcn Empty anatomy). */
export function EmptyState({ icon, title, children, action, className }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div data-slot="empty" className={cn("flex flex-col items-center justify-center gap-4 px-5 py-10 text-center", className)}>
      <div className="flex max-w-[34ch] flex-col items-center gap-1.5">
        {icon && <div className="mb-1.5 grid size-12 place-items-center rounded-[16px] bg-blue-soft text-blue-ink [&_svg]:size-5">{icon}</div>}
        <div className="text-[17px] font-bold leading-6 tracking-[-0.01em]">{title}</div>
        {children && <p className="text-[14px] leading-5 text-muted">{children}</p>}
      </div>
      {action}
    </div>
  );
}

/** Loading placeholder: still blocks, no pulse or shimmer. */
export const Skeleton = ({ className }: { className?: string }) => <div aria-hidden className={cn("rounded-xl bg-tile", className)} />;

/** A row of status blocks, oldest to newest (Tremor Tracker; native tooltips instead of a hover card). */
export function Tracker({ data, label, className }: { data: { key: string; className: string; tip: string }[]; label: string; className?: string }) {
  return (
    <div role="img" aria-label={label} className={cn("flex h-5 items-center gap-[3px]", className)}>
      {data.map((d) => <span key={d.key} title={d.tip} className={cn("h-full w-2.5 shrink-0 rounded-[3px]", d.className)} />)}
    </div>
  );
}

// Spent = ink hatch on white, could still be lost = solid vermillion, the rest of the track stays an empty grey hatch.
const SEG_TONE: Record<string, string> = { spent: "hatch [--hatch:var(--color-ink)] bg-card shadow-[inset_0_0_0_1.5px_var(--color-ink)]", risk: "bg-vermillion", safe: "" };
/** A segmented meter: each slice is a share of the whole (Tremor CategoryBar, labels moved into a legend below). */
export function SegmentBar({ segments, label, barTestId }: { segments: { key: string; share: number }[]; label: string; barTestId?: string }) {
  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((segments.find((s) => s.key === "risk")?.share ?? 0) * 100)} className="hatch hatch-soft flex h-3.5 w-full gap-0.5 overflow-hidden rounded-full bg-tile shadow-[inset_0_0_0_1px_var(--color-line)]">
      {segments.map((s) => <div key={s.key} data-testid={s.key === "risk" ? barTestId : undefined} className={cn("bar-grow h-full transition-[width] duration-500 ease-out first:rounded-l-full last:rounded-r-full", SEG_TONE[s.key] ?? "")} style={{ width: `${Math.round(s.share * 1000) / 10}%` }} />)}
    </div>
  );
}

/** A styled disclosure: chevron that turns, a row that grows open. Replaces the browser's own triangle. */
export function Disclosure({ summary, children, className, defaultOpen = false }: { summary: ReactNode; children: ReactNode; className?: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className={className}>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="relative inline-flex items-center gap-1 text-[13px] font-semibold text-ink2 before:absolute before:-inset-x-2 before:-inset-y-3 before:content-[''] hover:text-ink">
        <ChevronRight className={cn("size-4 transition-transform duration-200", open && "rotate-90")} strokeWidth={1.75} aria-hidden />{summary}
      </button>
      {open && <div id={id} className="fade-up mt-2">{children}</div>}
    </div>
  );
}

/** One card, several figures side by side, divided by hairlines (a KPI strip). Stacks to compact rows on a phone. */
export function KpiStrip({ items, className }: { items: { label: string; value: ReactNode; note?: ReactNode; accent?: boolean; icon?: ReactNode }[]; className?: string }) {
  return (
    <div className={cn("card grid grid-cols-1 divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0", className)}>
      {items.map((k) => (
        <div key={k.label} className="min-w-0 px-5 py-4 sm:min-h-[104px] sm:py-5">
          <div className="eyebrow flex items-center gap-1.5 text-muted">{k.icon}{k.label}</div>
          <div className={cn("figure mt-1.5 text-[28px] leading-9 sm:text-[36px] sm:leading-10", k.accent && "text-vermillion-ink")}>{k.value}</div>
          <div className="mt-0.5 text-[13px] leading-[18px] text-muted">{k.note ?? " "}</div>
        </div>
      ))}
    </div>
  );
}

/** Filter chip: a black pill when selected, white with a hairline otherwise, a count after the label. */
export const chip = (on: boolean) => cn("pressable inline-flex h-11 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-full px-4 text-[14px] font-semibold", on ? "bg-ink text-on-accent" : "bg-card text-ink2 shadow-[inset_0_0_0_1.5px_var(--color-tile-stroke)] hover:bg-tile");
