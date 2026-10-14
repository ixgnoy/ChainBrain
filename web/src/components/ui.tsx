// Small design-system layer: verdict chips, reason-code chip, tx link, buttons, panes, drawer, tooltip, switch.
import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tooltip from "@radix-ui/react-tooltip";
import { animate, useReducedMotion } from "motion/react";
import { CheckCircle2, XCircle, ShieldAlert, Lock, Loader2, X, ExternalLink } from "lucide-react";
import { cn } from "../lib/cn";
import { REASONS, reasonLayer, txUrl } from "../shared";
import { isTxHash, shortHex } from "../lib/format";
import type { ChipKind } from "../lib/trace";
import { useDev } from "../useDev";

export type { ChipKind };

const CHIP: Record<ChipKind, string> = {
  ok: "bg-ok-bg text-ok-ink border-ok/30",
  refused: "bg-refused-bg text-refused-ink border-refused/30",
  stepup: "bg-stepup-bg text-stepup-ink border-stepup/30",
  revoked: "bg-revoked-bg text-revoked-ink border-revoked/35",
  info: "bg-info-bg text-info-ink border-info/30",
  neutral: "bg-e3 text-t2 border-hair2",
};
const ICON = { ok: CheckCircle2, refused: XCircle, stepup: ShieldAlert, revoked: Lock, info: Loader2, neutral: CheckCircle2 } as const;
export const DEFAULT_LABEL: Record<ChipKind, string> = { ok: "Allowed", refused: "Refused", stepup: "Needs you", revoked: "Revoked", info: "Working", neutral: "" };

/** Verdict chip: 24 px pill, icon + label. Refused shakes once on first render; "needs you" pulses its dot until resolved. */
export function Chip({ kind, children, className, dot = false, title }: { kind: ChipKind; children?: ReactNode; className?: string; dot?: boolean; title?: string }) {
  const Icon = ICON[kind];
  return (
    <span title={title} className={cn("inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-xs font-medium leading-none", CHIP[kind], kind === "refused" && "shake-once", className)}>
      {dot || kind === "neutral" ? (
        <span className={cn("size-1.5 rounded-full bg-current", kind === "stepup" && "dot-pulse")} />
      ) : (
        <Icon className={cn("size-3.5", kind === "info" && "spin", kind === "stepup" && "dot-pulse")} strokeWidth={2.2} aria-hidden />
      )}
      {children ?? DEFAULT_LABEL[kind]}
    </span>
  );
}

/** Radix tooltip with the app's glass styling. Wrap the app once in <Tooltip.Provider> (see App). */
export function Tip({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <Tooltip.Root delayDuration={250}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content sideOffset={6} className="glass-strong z-[70] max-w-[280px] rounded-xl px-3 py-2 text-xs leading-4 text-fg">{label}</Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/** Mono reason-code chip; the layer and the human sentence come from REASONS. */
export function ReasonChip({ code, onClick, className }: { code: string; onClick?: () => void; className?: string }) {
  const known = code in REASONS;
  const cls = cn("mono inline-flex h-5 items-center rounded-md border border-hair2 bg-e3 px-1.5 text-[11px] font-medium text-fg", onClick && "cursor-pointer hover:border-accent", className);
  const label = known ? <><span className="font-semibold">{reasonLayer(code)}</span><br />{REASONS[code]}</> : String(code);
  return (
    <Tip label={label}>{onClick ? <button type="button" onClick={onClick} className={cls}>{code}</button> : <span tabIndex={0} className={cls}>{code}</span>}</Tip>
  );
}

/** Tx hash: a BaseScan link on the real server; plain text on the local fork (fork hashes do not exist on Base Sepolia) and while the mode is unknown. */
export function TxLink({ hash, className }: { hash?: string; className?: string }) {
  const dev = useDev();
  if (!hash) return <span className={cn("text-t3", className)}>–</span>;
  const short = isTxHash(hash) ? shortHex(hash, 10, 6) : shortHex(hash, 6, 4);
  if (dev.state === undefined) return <span className={cn("mono text-xs text-t2", className)} title="Checking which server this is">{short}</span>;
  if (dev.state) return <span className={cn("mono text-xs text-t2", className)} title="Local fork transaction: not on Base Sepolia, so there is no BaseScan page">{short} · fork</span>;
  return (
    <a className={cn("mono inline-flex items-center gap-1 text-xs text-accent-ink hover:underline", className)} href={txUrl(hash)} target="_blank" rel="noreferrer noopener">
      {short}<ExternalLink className="size-3" aria-hidden />
    </a>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" | "revoke"; size?: "sm" | "md" };
export function Button({ variant = "secondary", size = "md", className, ...p }: BtnProps) {
  const v = {
    primary: "bg-accent text-on-accent hover:bg-accent-hi active:bg-[var(--accent-press)] border-transparent",
    secondary: "bg-e2 text-fg border-hair2 hover:bg-e3",
    ghost: "bg-transparent text-t2 border-transparent hover:bg-e2 hover:text-fg",
    danger: "bg-refused-bg text-refused-ink border-refused/30 hover:bg-refused/20",
    revoke: "bg-revoked-bg text-revoked-ink border-revoked/35 hover:bg-revoked/20",
  }[variant];
  return <button type="button" {...p} className={cn("inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border font-semibold transition-[background,transform,opacity] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45", size === "md" ? "h-10 px-4 text-sm" : "h-8 px-3 text-xs", v, className)} />;
}

export function Segmented<T extends string>({ value, onChange, options, label, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; title?: string }[]; label: string; className?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-full border border-hair bg-e2 p-0.5", className)}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} title={o.title} onClick={() => onChange(o.value)}
          className={cn("h-7 whitespace-nowrap rounded-full px-3 text-xs font-medium transition-colors", value === o.value ? "bg-e1 text-fg shadow-[inset_0_0_0_1px_var(--hair2)]" : "text-t2 hover:text-fg")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Accessible on/off switch (role=switch). */
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
      className={cn("relative h-6 w-10 shrink-0 rounded-full border transition-colors disabled:opacity-45", checked ? "border-transparent bg-accent" : "border-hair2 bg-e3")}>
      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left] duration-150", checked ? "left-[18px]" : "left-0.5")} />
    </button>
  );
}

/** Content pane: flat e1 with a hairline, header with title and count badge. No glass. */
export function Pane({ title, count, icon, actions, toolbar, children, className, bodyClassName }: { toolbar?: ReactNode; title: string; count?: number | string; icon?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section aria-label={title} className={cn("card flex min-h-0 min-w-0 flex-col overflow-hidden", className)}>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-hair px-4">
        {icon && <span className="text-t2">{icon}</span>}
        <h2 className="display text-[15px]">{title}</h2>
        {count != null && <span className="num rounded-full bg-e3 px-2 py-0.5 text-[11px] font-semibold text-t2">{count}</span>}
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      </header>
      {toolbar && <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-hair px-4 py-2">{toolbar}</div>}
      <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Glass modal (Radix Dialog: focus trap, Esc, aria). `side` = right-hand drawer, `center` = centred sheet. */
export function Sheet({ open, onOpenChange, title, description, children, side = "right", footer, closeLabel = "Close", contentClassName }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; children: ReactNode; side?: "right" | "center"; footer?: ReactNode; closeLabel?: string; contentClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[var(--scrim)]" />
        <Dialog.Content ref={ref} tabIndex={-1} onOpenAutoFocus={(e) => { e.preventDefault(); ref.current?.focus(); }}
          className={cn("glass-strong fixed z-50 flex flex-col rounded-[28px] outline-none",
            side === "right" ? "inset-y-3 right-3 w-[min(520px,calc(100vw-24px))]" : "left-1/2 top-1/2 max-h-[calc(100dvh-24px)] w-[min(520px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2", contentClassName)}>
          <div className="flex items-start gap-3 border-b border-hair p-5">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="display text-lg">{title}</Dialog.Title>
              <Dialog.Description className="text-xs text-t2">{description ?? "Details"}</Dialog.Description>
            </div>
            <Dialog.Close className="grid size-8 place-items-center rounded-full text-t2 hover:bg-e3 hover:text-fg" aria-label={closeLabel}><X className="size-4" /></Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
          {footer && <div className="border-t border-hair p-4">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export const Drawer = Sheet;

/** Animated number (adapted from react-bits CountUp): counts from the previous value to the new one, 2 decimals. */
export function Money({ value, decimals = 2, className, duration = 0.6 }: { value: number; decimals?: number; className?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const fmt = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    if (reduce) { el.textContent = fmt(value); prev.current = value; return; }
    const c = animate(prev.current, value, { duration, ease: [0, 0, 0, 1], onUpdate: (v) => { el.textContent = fmt(v); } });
    prev.current = value;
    return () => c.stop();
  }, [value, decimals, duration, reduce]);
  return <span ref={ref} className={cn("num", className)}>{value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>;
}

export type OrbState = "idle" | "thinking" | "waiting" | "blocked" | "revoked";
/** Agent orb: idle (no glow), thinking (cyan breathing), waiting (amber pulse), blocked (red), revoked (magenta). */
export function AgentOrb({ state = "idle", size = 28 }: { state?: OrbState; size?: number }) {
  const color = { idle: "var(--agent)", thinking: "var(--agent)", waiting: "var(--stepup)", blocked: "var(--refused)", revoked: "var(--revoked)" }[state];
  return (
    <span aria-hidden className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <span className="absolute inset-0 rounded-full opacity-90" style={{ background: `radial-gradient(circle at 30% 28%, #fff 0%, ${color} 38%, color-mix(in srgb, ${color} 35%, #0e1012) 100%)`,
        boxShadow: state === "idle" ? "none" : `0 0 ${size * 0.9}px color-mix(in srgb, ${color} 55%, transparent)`,
        animation: state === "thinking" ? "breathe 1.4s ease-in-out infinite" : state === "waiting" ? "dot-pulse 1.6s ease-in-out infinite" : undefined }} />
    </span>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <defs><linearGradient id="cb-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6E56FF" /><stop offset="1" stopColor="#38E1FF" /></linearGradient></defs>
      <rect width="64" height="64" rx="18" fill="#0E1012" />
      <g fill="none" stroke="url(#cb-g)" strokeWidth="5" strokeLinecap="round">
        <rect x="11" y="24" width="26" height="16" rx="8" transform="rotate(-35 24 32)" />
        <rect x="27" y="24" width="26" height="16" rx="8" transform="rotate(-35 40 32)" />
      </g>
      <circle cx="32" cy="32" r="3.5" fill="#fff" />
    </svg>
  );
}

export function Empty({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return <div className="grid h-full min-h-32 place-items-center p-6 text-center text-sm text-t3"><div className="flex max-w-xs flex-col items-center gap-2">{icon}{children}</div></div>;
}

export const Field = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold text-t2">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-t3">{hint}</span>}
  </label>
);
export const inputCls = "h-10 w-full rounded-[12px] border border-hair2 bg-e2 px-3 text-sm text-fg placeholder:text-t3 outline-none focus:border-accent";
