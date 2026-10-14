// Settings: a quiet gear in the header. One section, "Connection": use a custom server instead of the built-in network.
import { useId, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Settings as Gear, X } from "lucide-react";
import { DEFAULT_API, cleanUrl, isHttpUrl, savedUrl, setSource, testConnection, useSource, type Probe } from "../source/source";
import { cn } from "../lib/cn";

function Switch({ checked, onChange, label }: { checked: boolean; onChange(v: boolean): void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", checked ? "bg-accent" : "bg-line")}>
      <span className={cn("absolute left-0.5 top-0.5 size-6 rounded-full bg-card transition-transform", checked && "translate-x-5")} />
    </button>
  );
}

export function Settings() {
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
      <Dialog.Trigger aria-label="Settings" className="grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-card hover:text-ink"><Gear className="size-5" strokeWidth={1.75} /></Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(17,19,24,0.24)]" />
        <Dialog.Content className="sheet-in fixed left-1/2 top-[18vh] z-50 w-[min(440px,calc(100vw-24px))] -translate-x-1/2 rounded-[20px] bg-card p-6 outline-none">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-[17px] font-semibold">Settings</Dialog.Title>
            <Dialog.Close aria-label="Close" className="grid size-10 place-items-center rounded-full bg-fill text-ink2 hover:bg-line"><X className="size-5" strokeWidth={1.75} /></Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Connection settings</Dialog.Description>
          <h3 className="mb-2 mt-4 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">Connection</h3>
          <div className="flex items-center gap-4 rounded-[14px] bg-canvas px-4 py-3.5">
            <div className="min-w-0 flex-1"><div className="text-[15px] font-medium">Custom server</div><div className="text-[13px] leading-5 text-muted">Use your own ChainBrain server instead of the built-in network.</div></div>
            <Switch checked={on} onChange={toggle} label="Custom server" />
          </div>
          {on && (
            <div className="mt-3">
              <label htmlFor={field} className="mb-1.5 block text-[14px] font-medium">Server URL</label>
              <input id={field} value={url} onChange={(e) => { setUrl(e.target.value); setProbe(undefined); }} placeholder={DEFAULT_API} inputMode="url" autoCapitalize="off" spellCheck={false}
                className="num h-12 w-full rounded-[12px] bg-fill px-4 text-[15px] outline-none placeholder:text-faint focus:bg-card focus:ring-2 focus:ring-accent" />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" disabled={!valid || probe === "testing"} onClick={() => void test()} className="h-10 rounded-full bg-fill px-5 text-[14px] font-semibold text-ink hover:bg-line disabled:opacity-40">{probe === "testing" ? "Testing…" : "Test connection"}</button>
                <button type="button" disabled={!valid} onClick={use} className="h-10 rounded-full bg-accent px-5 text-[14px] font-semibold text-on-accent hover:bg-accent-press disabled:opacity-40">Use this server</button>
              </div>
              <p role="status" className={cn("mt-3 min-h-5 text-[14px]", probe && probe !== "testing" ? (probe.ok ? "text-positive" : "text-negative") : "text-muted")}>
                {!valid ? "Enter a full address, for example http://localhost:8787" : probe && probe !== "testing" ? (probe.ok ? `Connected in ${probe.ms} ms` : probe.error) : ""}
              </p>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
