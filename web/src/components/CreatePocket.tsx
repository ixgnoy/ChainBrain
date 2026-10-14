import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button, Field, Sheet, TxLink, inputCls } from "./ui";
import { PRESETS, toPocketArgs, type Lifetime, type PresetValues } from "../presets";
import { createPocket, fund } from "../wallet";
import { useConsole } from "../console";
import { cn } from "../lib/cn";

type Step = "idle" | "create" | "fund" | "done";

/** Preset picker, settings, then Create (owner tx 1) and Fund (owner tx 2). The pocket is saved as soon as it exists on chain. */
export default function CreatePocket({ open, onOpenChange }: { open: boolean; onOpenChange(o: boolean): void }) {
  const { cfg, addPocket } = useConsole();
  const [v, setV] = useState<PresetValues>(PRESETS.research);
  const [step, setStep] = useState<Step>("idle");
  const [err, setErr] = useState("");
  const [txs, setTxs] = useState<{ label: string; hash: string }[]>([]);
  const set = (k: keyof PresetValues, val: unknown) => setV({ ...v, [k]: val });
  if (!cfg) return null;
  const payTo = Object.fromEntries(cfg.sellers.map((s) => [s.id, s.payTo]));
  const categories = [...new Set(cfg.sellers.map((s) => s.category))];
  const busy = step === "create" || step === "fund";

  async function go() {
    if (!cfg) return;
    setErr(""); setTxs([]);
    let pocket: `0x${string}` | undefined;
    try {
      const a = toPocketArgs(v, cfg.agent, payTo);
      setStep("create");
      const made = await createPocket(a);
      pocket = made.pocket;
      addPocket(made.pocket);
      setTxs([{ label: "Created", hash: made.tx }]);
      setStep("fund");
      const f = await fund(made.pocket, a.budget);
      setTxs((x) => [...x, { label: "Funded", hash: f.hash }]);
      setStep("done");
      toast.success("Pocket created and funded");
      setTimeout(() => { onOpenChange(false); setStep("idle"); setTxs([]); }, 900);
    } catch (e) {
      setStep("idle");
      const m = (e as Error).message.split("\n")[0];
      setErr(pocket ? `The pocket exists but funding failed: ${m}. Add funds from the pocket pane.` : m);
    }
  }

  const stepRow = (label: string, state: "todo" | "doing" | "done") => (
    <li className={cn("flex items-center gap-2 text-[13px]", state === "todo" ? "text-t3" : "text-fg")}>
      <span className={cn("grid size-5 place-items-center rounded-full border", state === "done" ? "border-ok/40 bg-ok-bg text-ok-ink" : "border-hair2")}>{state === "done" ? <Check className="size-3" /> : state === "doing" ? <Loader2 className="size-3 spin" /> : null}</span>{label}
    </li>
  );

  return (
    <Sheet open={open} onOpenChange={(o) => !busy && onOpenChange(o)} side="center" title="New pocket" description="Rules are written to a contract on-chain. You sign twice: create, then fund."
      footer={<div className="flex justify-end gap-2"><Button variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="primary" disabled={busy || step === "done"} onClick={() => void go()}>{busy ? "Check your wallet…" : "Create and fund"}</Button></div>}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Presets">
          {Object.values(PRESETS).map((p) => (
            <button key={p.label} type="button" aria-pressed={v.label === p.label} onClick={() => setV(p)}
              className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors", v.label === p.label ? "border-accent bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-accent-ink" : "border-hair2 bg-e2 text-t2 hover:text-fg")}>{p.label}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Budget (US$)" hint="Sent to the pocket"><input className={inputCls} value={v.budget} onChange={(e) => set("budget", e.target.value)} inputMode="decimal" /></Field>
          <Field label="Per-payment cap (US$)"><input className={inputCls} value={v.cap} onChange={(e) => set("cap", e.target.value)} inputMode="decimal" /></Field>
          <Field label="Ask me above (US$)" hint='0 = every time, "never" = never'><input className={inputCls} value={v.askAbove} onChange={(e) => set("askAbove", e.target.value)} /></Field>
          <Field label="Lifetime">
            <select className={inputCls} value={v.lifetime} onChange={(e) => set("lifetime", e.target.value as Lifetime)}>
              <option value="one-task">One task (24 h)</option><option value="until-tonight">Until 23:59 tonight</option><option value="ongoing">Ongoing (1 year)</option>
            </select>
          </Field>
        </div>
        <fieldset>
          <legend className="mb-1 text-xs font-semibold text-t2">Sellers <span className="font-normal text-t3">(categories help you pick; the pocket enforces exactly these)</span></legend>
          {categories.map((c) => (
            <div key={c} className="mt-2"><div className="caps mb-1">{c}</div>
              <div className="space-y-1">{cfg.sellers.filter((s) => s.category === c).map((s) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-hair bg-e2 px-3 py-2 text-sm">
                  <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={v.sellers.includes(s.id)} onChange={(e) => set("sellers", e.target.checked ? [...v.sellers, s.id] : v.sellers.filter((x) => x !== s.id))} />
                  <span className="font-medium">{s.name}</span>
                  <span className="ml-auto text-xs text-t3">{s.items.map((i) => (i.price ? `US$${i.price}` : "free")).join(", ")}</span>
                </label>))}</div></div>
          ))}
        </fieldset>
        {(busy || step === "done" || txs.length > 0) && (
          <ol className="space-y-1.5 rounded-2xl border border-hair bg-e2 p-3" aria-live="polite">
            {stepRow("Create pocket", step === "create" ? "doing" : "done")}
            {stepRow("Fund pocket", step === "fund" ? "doing" : step === "done" ? "done" : "todo")}
            {txs.map((t) => <li key={t.hash} className="flex items-center gap-2 pl-7 text-xs text-t3">{t.label} <TxLink hash={t.hash} /></li>)}
          </ol>
        )}
        {err && <p role="alert" className="text-sm text-refused-ink">{err}</p>}
      </div>
    </Sheet>
  );
}
