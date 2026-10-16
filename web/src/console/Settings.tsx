// Settings: a quiet gear in the header. One section, "Connection": use a custom server instead of the built-in network.
import { useId, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Settings as Gear, X } from "lucide-react";
import { Kbd } from "./kit";
import { DEFAULT_API, cleanUrl, isHttpUrl, savedUrl, setSource, testConnection, useSource, type Probe } from "../source/source";
import { cn } from "../lib/cn";

function Switch({ checked, onChange, label }: { checked: boolean; onChange(v: boolean): void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", checked ? "bg-ink" : "bg-line")}>
      <span className={cn("absolute left-0.5 top-0.5 size-6 rounded-full bg-card transition-transform", checked && "translate-x-5")} />
    </button>
  );
}

export function Settings({ presenter }: { presenter?: () => void }) {
  const src = useSource();
  const [open, setOpen] = useState(false);
  const [on, setOn] = useState(src.kind === "live");
  const [url, setUrl] = useState(src.kind === "live" ? src.url : savedUrl());
  const [probe, setProbe] = useState<Probe | "testing">();
  const field = useId();
  const target = cleanUrl(url) || DEFAULT_API;
  const valid = isHttpUrl(target);

  const reset = (o: boolean) => { setOpen(o); if (o) { setOn(src.kind === "live"); setUrl(src.kind === "live" ? src.url : savedUrl()); setProbe(undefined); } };
  const toggle = (v: boolean) => { setOn(v); setProbe(undefined); if (!v) setSource({ kind: "demo" }); };
  const test = async () => { setProbe("testing"); setProbe(await testConnection(target)); };
  const use = () => { setSource({ kind: "live", url: target }); setOpen(false); };

  return (
    <Dialog.Root open={open} onOpenChange={reset}>
      <Dialog.Trigger aria-label="Settings" className="pressable grid size-11 place-items-center rounded-full bg-card text-ink shadow-[inset_0_0_0_1.5px_var(--color-tile-stroke)] transition-colors hover:bg-tile"><Gear className="size-5" strokeWidth={1.75} /></Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(17,18,21,0.40)]" />
        <Dialog.Content className="sheet-in fixed z-50 bg-card p-5 outline-none max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-[90dvh] max-sm:overflow-y-auto max-sm:rounded-t-[24px] sm:left-1/2 sm:top-[12vh] sm:w-[min(440px,calc(100vw-24px))] sm:-translate-x-1/2 sm:rounded-[24px] sm:p-6 shadow-level3">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-[22px] font-bold leading-7 tracking-[-0.02em]">Settings</Dialog.Title>
            <Dialog.Close aria-label="Close" className="pressable grid size-11 place-items-center rounded-full bg-tile text-ink hover:bg-line"><X className="size-5" strokeWidth={1.75} /></Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Connection settings</Dialog.Description>
          {presenter && (
            <>
              <h3 className="eyebrow mb-2 mt-5 text-muted">Presenting</h3>
              <div className="flex items-center gap-4 tile px-4 py-3.5">
                <div className="min-w-0 flex-1"><div className="text-[15px] font-medium">Presenter mode</div><div className="text-[13px] leading-5 text-muted">Larger Live view, no menus, and the scenes at the bottom.</div></div>
                <button type="button" onClick={() => { setOpen(false); presenter(); }} className="pressable h-11 rounded-full bg-vermillion px-5 text-[14px] font-bold text-on-accent hover:bg-vermillion-press">Start</button>
              </div>
            </>
          )}
          <h3 className="eyebrow mb-2 mt-5 text-muted">Connection</h3>
          <div className="flex items-center gap-4 tile px-4 py-3.5">
            <div className="min-w-0 flex-1"><div className="text-[15px] font-medium">Custom server</div><div className="text-[13px] leading-5 text-muted">Use your own ChainBrain server instead of the built-in network.</div></div>
            <Switch checked={on} onChange={toggle} label="Custom server" />
          </div>
          {on && (
            <div className="mt-3">
              <label htmlFor={field} className="mb-1.5 block text-[14px] font-medium">Server URL</label>
              <input id={field} value={url} onChange={(e) => { setUrl(e.target.value); setProbe(undefined); }} placeholder={DEFAULT_API} inputMode="url" autoCapitalize="off" spellCheck={false}
                className="num h-12 w-full rounded-[16px] bg-tile px-4 text-[15px] outline-none shadow-[inset_0_0_0_1.5px_var(--color-tile-stroke)] placeholder:text-faint focus:bg-card focus:ring-2 focus:ring-ink" />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" disabled={!valid || probe === "testing"} onClick={() => void test()} className="pressable h-12 w-full rounded-full bg-blue px-5 text-[14px] font-bold text-blue-ink hover:bg-blue-press disabled:opacity-40 sm:h-10 sm:w-auto">{probe === "testing" ? "Testing…" : "Test connection"}</button>
                <button type="button" disabled={!valid} onClick={use} className="pressable h-12 w-full rounded-full bg-ink px-5 text-[14px] font-bold text-on-accent hover:bg-accent-press disabled:opacity-40 sm:h-10 sm:w-auto">Use this server</button>
              </div>
              <p role="status" className={cn("mt-3 flex min-h-5 items-center gap-2 text-[14px]", probe && probe !== "testing" ? (probe.ok ? "text-green-ink" : "text-vermillion-ink") : "text-muted")}>
                {!valid ? "Enter a full address, for example http://localhost:8787" : probe && probe !== "testing" ? <>{probe.ok ? <Check className="size-4 shrink-0" strokeWidth={2} aria-hidden /> : <X className="size-4 shrink-0" strokeWidth={2} aria-hidden />}{probe.ok ? `Connected in ${probe.ms} ms` : probe.error}</> : ""}
              </p>
            </div>
          )}
          <p className="mt-5 hidden items-center justify-end gap-1.5 text-[12px] text-muted sm:flex"><Kbd>Esc</Kbd>to close</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
