// Seller dashboard kit: white borderless cards on grey, one accent, round actions, Ryt-style list rows.
import type { ButtonHTMLAttributes, ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronDown, X } from "lucide-react";
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

/** The one active-tab look on every page (same as the phone): soft teal pill with teal text. */
export const tabPill = (on: boolean) => cn("inline-flex h-11 shrink-0 items-center rounded-full px-5 text-[15px] font-medium transition-colors", on ? "bg-accent-soft text-accent" : "bg-card text-ink2 hover:bg-fill");

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-[20px] bg-card", className)}>{children}</div>;
}

export function PageTitle({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="title-serif text-[40px] leading-[46px]">{title}</h1>
        {sub && <p className="mt-2 text-[15px] text-muted">{sub}</p>}
      </div>
      {action}
    </header>
  );
}

/** Heading of a block inside a page (sans: the serif is kept for the page title). */
export function SubTitle({ title, sub }: { title: string; sub?: ReactNode }) {
  return <header className="mb-4"><h2 className="text-[20px] font-semibold leading-7">{title}</h2>{sub && <p className="mt-1 text-[15px] text-muted">{sub}</p>}</header>;
}

export function Section({ title, right, children, className }: { title: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("mt-10", className)}>
      <div className="mb-3 flex items-baseline justify-between gap-4"><h2 className="text-[20px] font-semibold leading-7">{title}</h2>{right}</div>
      {children}
    </section>
  );
}

const TONES = { accent: "bg-accent-soft text-accent", neutral: "bg-fill text-ink2", negative: "bg-negative-soft text-negative", warning: "bg-warning-soft text-warning", mint: "bg-mint text-mint-ink", peach: "bg-peach text-peach-ink", lilac: "bg-lilac text-lilac-ink" } as const;
export type Tone = keyof typeof TONES;

export function Avatar({ children, tone = "neutral", size = 48 }: { children: ReactNode; tone?: Tone; size?: number }) {
  return <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-full text-[15px] font-semibold", TONES[tone])} style={{ width: size, height: size }}>{children}</span>;
}

export function Pill({ children, tone = "accent", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={cn("inline-flex h-7 items-center whitespace-nowrap rounded-full px-3 text-[13px] font-medium", TONES[tone], className)}>{children}</span>;
}

export function Row({ avatar, title, sub, amount, amountClass, status, onClick, label }: {
  avatar: ReactNode; title: ReactNode; sub?: ReactNode; amount?: ReactNode; amountClass?: string; status?: ReactNode; onClick?: () => void; label?: string;
}) {
  const body = (
    <>
      {avatar}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-medium leading-[22px]">{title}</span>
        {sub && <span className="mt-0.5 line-clamp-2 block text-[14px] leading-5 text-muted">{sub}</span>}
      </span>
      {(amount != null || status) && (
        <span className="shrink-0 text-right">
          {amount != null && <span className={cn("num block text-[16px] font-semibold leading-[22px]", amountClass)}>{amount}</span>}
          {status && <span className="mt-0.5 block whitespace-nowrap text-[14px] leading-5 text-muted">{status}</span>}
        </span>
      )}
    </>
  );
  const cls = "flex w-full items-center gap-4 px-5 py-4 text-left";
  return onClick
    ? <button type="button" onClick={onClick} aria-label={label} className={cn(cls, "transition-colors hover:bg-canvas first:rounded-t-[20px] last:rounded-b-[20px]")}>{body}</button>
    : <div className={cls}>{body}</div>;
}

export function RoundAction({ icon, label, onClick, soft, active }: { icon: ReactNode; label: string; onClick?: () => void; soft?: boolean; active?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="group flex w-[88px] flex-col items-center gap-2" aria-current={active ? "page" : undefined}>
      <span className={cn("grid size-16 place-items-center rounded-full transition-colors [&_svg]:size-6", soft ? "bg-accent-soft text-accent group-hover:bg-[#d4ecdf]" : "bg-accent text-on-accent group-hover:bg-accent-press")}>{icon}</span>
      <span className="text-[14px] font-medium text-ink">{label}</span>
    </button>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "soft" | "ghost" };
export function Button({ variant = "primary", className, ...p }: BtnProps) {
  const v = {
    primary: "bg-accent text-on-accent hover:bg-accent-press",
    outline: "border-[1.5px] border-accent text-accent hover:bg-accent-soft",
    soft: "bg-fill text-ink hover:bg-line",
    ghost: "text-accent hover:bg-accent-soft",
  }[variant];
  return <button type="button" {...p} className={cn("inline-flex h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 text-[15px] font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40", v, className)} />;
}

export function Stat({ label, value, note, className }: { label: string; value: ReactNode; note?: ReactNode; className?: string }) {
  return (
    <Card className={cn("min-w-0 p-4 sm:p-6", className)}>
      <div className="text-[13px] leading-[18px] text-muted sm:text-[14px]">{label}</div>
      <div className="num mt-2 text-[20px] font-semibold leading-7 sm:text-[28px] sm:leading-9">{value}</div>
      {note && <div className="mt-1 hidden text-[14px] text-muted sm:block">{note}</div>}
    </Card>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="px-5 py-10 text-center text-[15px] text-muted">{children}</div>;
}

/** Right-hand detail panel (Radix Dialog: focus trap, Esc). */
export function DetailSheet({ open, onOpenChange, title, description = "Details of this sale", children }: { open: boolean; onOpenChange(o: boolean): void; title: string; description?: string; children: ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(17,19,24,0.24)]" />
        <Dialog.Content className="sheet-in fixed inset-y-3 right-3 z-50 flex w-[min(460px,calc(100vw-24px))] flex-col overflow-hidden rounded-[20px] bg-card shadow-[0_8px_24px_rgba(17,19,24,0.08)] outline-none">
          <div className="flex items-center justify-between px-6 pb-2 pt-5">
            <Dialog.Title className="text-[17px] font-semibold">{title}</Dialog.Title>
            <Dialog.Close aria-label="Close" className="grid size-10 place-items-center rounded-full bg-fill text-ink2 hover:bg-line"><X className="size-5" strokeWidth={1.75} /></Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">{description}</Dialog.Description>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** A native select wearing the pill look (the OS control stays underneath for keyboards and screen readers). */
export function PillSelect({ label, value, onChange, children, shown, className, tone = "card" }: { label: string; value: string; onChange(v: string): void; children: ReactNode; shown: ReactNode; className?: string; tone?: "card" | "fill" }) {
  return (
    <label className={cn("relative flex h-12 min-w-0 items-center gap-2 rounded-full pl-5 pr-11 text-[15px] font-semibold transition-colors focus-within:outline-2 focus-within:outline-accent", tone === "card" ? "bg-card hover:bg-fill" : "bg-fill hover:bg-line", className)}>
      <span className="min-w-0 truncate">{shown}</span>
      <ChevronDown className="pointer-events-none absolute right-4 size-4 text-muted" aria-hidden />
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0">{children}</select>
    </label>
  );
}
