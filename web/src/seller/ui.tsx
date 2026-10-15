// Seller dashboard kit (Neo-Kinetic): white 24-radius cards on the slate canvas, black and vermillion pill buttons, hairline list rows.
import type { ButtonHTMLAttributes, ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronDown, Inbox, X } from "lucide-react";
import { EmptyState } from "../console/kit";
import { cn } from "../lib/cn";
import { formatUsd } from "../shared";

export const money = (n?: bigint) => (n == null ? "–" : `US$${formatUsd(n)}`);
/** Rounded to whole cents, for derived figures such as averages. */
export const moneyCents = (n: bigint) => money(((n + 5_000n) / 10_000n) * 10_000n);
export const when = (ms: number) => {
  const d = new Date(ms), today = new Date();
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return d.toDateString() === today.toDateString() ? time : `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, ${time}`;
};

/** The one active-tab look on every page: a black pill with a white label, inactive ones white with a hairline stroke. */
export const tabPill = (on: boolean) => cn("pressable inline-flex h-11 shrink-0 items-center rounded-full px-5 text-[15px] font-semibold", on ? "bg-ink text-on-accent" : "bg-card text-ink2 shadow-[inset_0_0_0_1.5px_var(--color-tile-stroke)] hover:bg-tile");

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("card", className)}>{children}</div>;
}

export function PageTitle({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="title-serif text-[34px] leading-[40px] sm:text-[44px] sm:leading-[48px]">{title}</h1>
        {sub && <p className="mt-2 max-w-[68ch] text-[15px] leading-6 text-muted-canvas">{sub}</p>}
      </div>
      {action}
    </header>
  );
}

/** Heading of a block inside a page (sans: the serif is kept for the page title). */
export function SubTitle({ title, sub }: { title: string; sub?: ReactNode }) {
  return <header className="mb-4"><h2 className="text-[22px] font-bold leading-7 tracking-[-0.02em]">{title}</h2>{sub && <p className="mt-1 text-[15px] text-muted-canvas">{sub}</p>}</header>;
}

export function Section({ title, right, children, className }: { title: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("mt-10", className)}>
      <div className="mb-3 flex items-baseline justify-between gap-4"><h2 className="text-[22px] font-bold leading-7 tracking-[-0.02em]">{title}</h2>{right}</div>
      {children}
    </section>
  );
}

// success = green-soft, refused / reverted = vermillion-soft, needs-you = blue-soft, everything else a quiet grey tile.
const TONES = { accent: "bg-green-soft text-green-ink", neutral: "bg-tile text-ink2 shadow-[inset_0_0_0_1px_var(--color-tile-stroke)]", negative: "bg-vermillion-soft text-vermillion-ink", warning: "bg-blue-soft text-blue-ink", mint: "bg-green-soft text-green-ink", peach: "bg-vermillion-soft text-vermillion-ink", lilac: "bg-blue-soft text-blue-ink" } as const;
export type Tone = keyof typeof TONES;

export function Avatar({ children, tone = "neutral", size = 48 }: { children: ReactNode; tone?: Tone; size?: number }) {
  return <span aria-hidden className={cn("grid shrink-0 place-items-center text-[15px] font-bold", TONES[tone])} style={{ width: size, height: size, borderRadius: Math.round(size * 0.3) }}>{children}</span>;
}

export function Pill({ children, tone = "accent", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={cn("inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[12px] font-bold", TONES[tone], className)}>{children}</span>;
}

export function Row({ avatar, title, sub, amount, amountClass, status, onClick, label }: {
  avatar: ReactNode; title: ReactNode; sub?: ReactNode; amount?: ReactNode; amountClass?: string; status?: ReactNode; onClick?: () => void; label?: string;
}) {
  const body = (
    <>
      {avatar}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-semibold leading-[22px] tracking-[-0.01em]">{title}</span>
        {sub && <span className="mt-0.5 line-clamp-2 block text-[14px] leading-5 text-muted">{sub}</span>}
      </span>
      {(amount != null || status) && (
        <span className="shrink-0 text-right">
          {amount != null && <span className={cn("num block text-[16px] font-bold leading-[22px] tracking-[-0.01em]", amountClass)}>{amount}</span>}
          {status && <span className="mt-0.5 block whitespace-nowrap text-[14px] leading-5 text-muted">{status}</span>}
        </span>
      )}
    </>
  );
  const cls = "flex w-full items-center gap-4 px-5 py-4 text-left";
  return onClick
    ? <button type="button" onClick={onClick} aria-label={label} className={cn(cls, "transition-colors hover:bg-tile first:rounded-t-[24px] last:rounded-b-[24px]")}>{body}</button>
    : <div className={cls}>{body}</div>;
}

export function RoundAction({ icon, label, onClick, soft, active }: { icon: ReactNode; label: string; onClick?: () => void; soft?: boolean; active?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="pressable group flex w-[88px] flex-col items-center gap-2" aria-current={active ? "page" : undefined}>
      <span className={cn("grid size-16 place-items-center rounded-[16px] transition-colors [&_svg]:size-6", soft ? "bg-blue text-blue-ink group-hover:bg-blue-press" : "bg-ink text-on-accent group-hover:bg-accent-press")}>{icon}</span>
      <span className="text-[14px] font-medium text-ink">{label}</span>
    </button>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "hot" | "outline" | "soft" | "ghost" };
export function Button({ variant = "primary", className, ...p }: BtnProps) {
  const v = {
    primary: "bg-ink text-on-accent hover:bg-accent-press",
    hot: "bg-vermillion text-on-accent hover:bg-vermillion-press",
    outline: "bg-card text-ink shadow-[inset_0_0_0_1.5px_var(--color-tile-stroke)] hover:bg-tile",
    soft: "bg-blue text-blue-ink hover:bg-blue-press",
    ghost: "text-ink hover:bg-tile",
  }[variant];
  return <button type="button" {...p} className={cn("pressable inline-flex h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 text-[15px] font-bold tracking-[-0.01em] disabled:pointer-events-none disabled:opacity-40", v, className)} />;
}

export function Stat({ label, value, note, className }: { label: string; value: ReactNode; note?: ReactNode; className?: string }) {
  return (
    <Card className={cn("min-w-0 p-4 sm:p-6", className)}>
      <div className="eyebrow text-muted">{label}</div>
      <div className="figure mt-2 text-[22px] leading-7 sm:text-[32px] sm:leading-9">{value}</div>
      {note && <div className="mt-1 hidden text-[14px] text-muted sm:block">{note}</div>}
    </Card>
  );
}

/** An empty list or card. A bare sentence becomes the description under a quiet glyph; pass `title` for a headline of its own. */
export function Empty({ children, title, icon, action }: { children?: ReactNode; title?: string; icon?: ReactNode; action?: ReactNode }) {
  return <EmptyState icon={icon ?? <Inbox strokeWidth={1.75} />} title={title ?? (typeof children === "string" ? children : "Nothing here yet")} action={action}>{title ? children : undefined}</EmptyState>;
}

/** Detail panel (shadcn Sheet, side right; Radix Dialog gives the focus trap and Esc). A bottom sheet on a phone. */
export function DetailSheet({ open, onOpenChange, title, description = "Details of this sale", children, footer }: { open: boolean; onOpenChange(o: boolean): void; title: string; description?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(17,18,21,0.40)]" />
        <Dialog.Content className="sheet-in fixed z-50 flex flex-col overflow-hidden bg-card outline-none max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-[6dvh] max-sm:rounded-t-[24px] sm:inset-y-0 sm:right-0 sm:w-[min(480px,100vw)] sm:rounded-l-[24px] shadow-level3">
          <div className="flex items-center justify-between px-5 pb-1 pt-4 sm:px-6">
            <Dialog.Title className="text-[18px] font-bold tracking-[-0.01em]">{title}</Dialog.Title>
            <Dialog.Close aria-label="Close" className="pressable grid size-11 place-items-center rounded-full bg-tile text-ink hover:bg-line"><X className="size-5" strokeWidth={1.75} /></Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">{description}</Dialog.Description>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 sm:px-6">{children}</div>
          {footer && <div className="flex flex-wrap gap-2 border-t border-line px-5 py-3 sm:px-6">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** A native select wearing the pill look (the OS control stays underneath for keyboards and screen readers). */
export function PillSelect({ label, value, onChange, children, shown, className, tone = "card" }: { label: string; value: string; onChange(v: string): void; children: ReactNode; shown: ReactNode; className?: string; tone?: "card" | "fill" }) {
  return (
    <label className={cn("relative flex h-12 min-w-0 items-center gap-2 rounded-full pl-5 pr-11 text-[15px] font-semibold shadow-[inset_0_0_0_1.5px_var(--color-tile-stroke)] transition-colors focus-within:outline-2 focus-within:outline-accent", tone === "card" ? "bg-card hover:bg-tile" : "bg-tile hover:bg-fill", className)}>
      <span className="min-w-0 truncate">{shown}</span>
      <ChevronDown className="pointer-events-none absolute right-4 size-4 text-muted" aria-hidden />
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0">{children}</select>
    </label>
  );
}

/** Splits a "US$12.34" string so the currency symbol can sit at 75% inside a `.figure`. The text content stays identical. */
export function Fig({ text }: { text: string }) {
  return text.startsWith("US$") ? <><span className="cur">US$</span>{text.slice(3)}</> : <>{text}</>;
}
