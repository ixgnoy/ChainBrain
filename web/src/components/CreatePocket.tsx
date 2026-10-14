import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Stepper, { Step } from "./bits/Stepper";
import { Button, Field, Sheet, TxLink, inputCls } from "./ui";
import { PRESETS, toPocketArgs, type Lifetime, type PresetValues } from "../presets";
import { createPocket, fund } from "../wallet";
import { useConsole } from "../console";
import { NEVER, formatUsd, parseUsd } from "../shared";
import { useInk } from "../lib/palette";
import { cn } from "../lib/cn";

type Phase = "idle" | "create" | "fund" | "done";
const STEPS = ["Rules", "Sellers", "Review"] as const;

const usdOrNull = (s: string) => { try { return parseUsd(s); } catch { return null; } };

/** Three-step wizard (React Bits Stepper): rules, sellers, review. Then Create (owner tx 1) and Fund (owner tx 2).
 *  The pocket is saved as soon as it exists on chain; if funding fails, the retry only funds it. */
export default function CreatePocket({ open, onOpenChange }: { open: boolean; onOpenChange(o: boolean): void }) {
  const { cfg, addPocket, mainBalance } = useConsole();
  const ink = useInk();
  const [v, setV] = useState<PresetValues>(PRESETS.research);
  const [step, setStep] = useState(1);
  const [phase, setPhase] = useState<Phase>("idle");
  const [made, setMade] = useState<`0x${string}`>();
  const [err, setErr] = useState("");
  const [txs, setTxs] = useState<{ label: string; hash: string }[]>([]);
  const set = (k: keyof PresetValues, val: unknown) => setV({ ...v, [k]: val });
  if (!cfg) return null;
  const payTo = Object.fromEntries(cfg.sellers.map((s) => [s.id, s.payTo]));
  const categories = [...new Set(cfg.sellers.map((s) => s.category))];
  const busy = phase === "create" || phase === "fund";

  // Plain-language checks per step, shown next to the fields.
  const budget = usdOrNull(v.budget), cap = usdOrNull(v.cap);
  const ask = v.askAbove.trim().toLowerCase() === "never" ? NEVER : usdOrNull(v.askAbove);
  const ruleIssues = [
    budget === null && "Budget: enter an amount like 5 or 0.50.",
    cap === null && "Per-payment cap: enter an amount like 2 or 0.50.",
    ask === null && 'Ask me above: enter an amount, 0 for every payment, or "never".',
    budget !== null && budget === 0n && "Budget must be more than zero.",
    budget !== null && cap !== null && cap > budget && "The per-payment cap is larger than the budget; the agent could never use it.",
    budget !== null && typeof mainBalance === "bigint" && budget > mainBalance && `Your main wallet holds US$${formatUsd(mainBalance)}, less than this budget.`,
  ].filter(Boolean) as string[];
  const sellerIssues = v.sellers.length ? [] : ["Pick at least one seller."];
  const issues = step === 1 ? ruleIssues : step === 2 ? sellerIssues : [...ruleIssues, ...sellerIssues];

  const close = () => { onOpenChange(false); setStep(1); setPhase("idle"); setTxs([]); setErr(""); setMade(undefined); };

  async function go() {
    if (!cfg) return;
    setErr("");
    let pocket = made;
    try {
      const a = toPocketArgs(v, cfg.agent, payTo);
      if (!pocket) {
        setPhase("create");
        const r = await createPocket(a);
        pocket = r.pocket;
        setMade(r.pocket);
        addPocket(r.pocket);
        setTxs([{ label: "Created", hash: r.tx }]);
      }
      setPhase("fund");
      const f = await fund(pocket, a.budget);
      setTxs((x) => [...x, { label: "Funded", hash: f.hash }]);
      setPhase("done");
      toast.success("Pocket created and funded");
      setTimeout(close, 900);
    } catch (e) {
      setPhase("idle");
      const m = (e as Error).message.split("\n")[0];
      setErr(pocket ? `The pocket exists but funding did not go through (${m}). Try again to fund it, or add funds later from the pocket pane.` : m);
    }
  }

  const stepRow = (label: string, state: "todo" | "doing" | "done") => (
    <li className={cn("flex items-center gap-2 text-[13px]", state === "todo" ? "text-t3" : "text-fg")}>
      <span className={cn("grid size-5 place-items-center rounded-full border", state === "done" ? "border-ok/40 bg-ok-bg text-ok-ink" : "border-hair2")}>{state === "done" ? <Check className="size-3" /> : state === "doing" ? <Loader2 className="size-3 spin" /> : null}</span>{label}
    </li>
  );

  const last = step === STEPS.length;
  const footer = (
    <div className="flex items-center gap-2">
      <span className="mono text-xs text-t3">Step {step} of {STEPS.length}</span>
      <div className="ml-auto flex gap-2">
        {step > 1 && !made ? <Button variant="ghost" disabled={busy} onClick={() => setStep(step - 1)}>Back</Button> : <Button variant="ghost" disabled={busy} onClick={close}>Cancel</Button>}
        {!last ? (
          <Button variant="primary" disabled={issues.length > 0} onClick={() => setStep(step + 1)}>Continue</Button>
        ) : (
          <Button variant="primary" disabled={busy || phase === "done" || issues.length > 0} onClick={() => void go()}>{busy ? "Check your wallet…" : made ? "Fund pocket" : "Create and fund"}</Button>
        )}
      </div>
    </div>
  );

  const sellerName = (id: string) => cfg.sellers.find((s) => s.id === id)?.name ?? id;
  const lifetimeLabel = { "one-task": "One task (24 h)", "until-tonight": "Until 23:59 tonight", ongoing: "Ongoing (1 year)" }[v.lifetime];

  return (
    <Sheet open={open} onOpenChange={(o) => { if (busy) return; if (o) onOpenChange(true); else close(); }} side="center" title="New pocket" description="Rules are written to a contract on-chain. You sign twice: create, then fund." footer={footer}>
      <Stepper step={step} onStepChange={(n) => !made && n < step && setStep(n)} showFooter={false} frame={false} theme={ink.dark ? "dark" : "light"} accentColor={ink.accent} width="100%" transition="slide"
        stepContainerClassName="mb-1" style={{ ["--stepper-tile" as string]: "var(--e1)", ["--stepper-tile-shadow" as string]: "none", ["--stepper-tile-edge" as string]: "var(--hair2)", ["--stepper-ink" as string]: "var(--fg)", ["--stepper-muted" as string]: "var(--t3)", ["--stepper-track" as string]: "var(--hair2)", ["--stepper-inset" as string]: "0px" }}>
        <Step title="Rules">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Presets">
              {Object.values(PRESETS).map((p) => (
                <button key={p.label} type="button" aria-pressed={v.label === p.label} onClick={() => setV(p)}
                  className={cn("cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors", v.label === p.label ? "border-accent bg-accent-soft text-accent-ink" : "border-hair2 bg-e1 text-t2 hover:text-fg")}>{p.label}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Budget (US$)" hint="Sent to the pocket"><input className={inputCls} value={v.budget} onChange={(e) => set("budget", e.target.value)} inputMode="decimal" /></Field>
              <Field label="Per-payment cap (US$)"><input className={inputCls} value={v.cap} onChange={(e) => set("cap", e.target.value)} inputMode="decimal" /></Field>
              <Field label="Ask me above (US$)" hint='0 = every payment, "never" = never ask'><input className={inputCls} value={v.askAbove} onChange={(e) => set("askAbove", e.target.value)} /></Field>
              <Field label="Lifetime">
                <select className={inputCls} value={v.lifetime} onChange={(e) => set("lifetime", e.target.value as Lifetime)}>
                  <option value="one-task">One task (24 h)</option><option value="until-tonight">Until 23:59 tonight</option><option value="ongoing">Ongoing (1 year)</option>
                </select>
              </Field>
            </div>
          </div>
        </Step>
        <Step title="Sellers">
          <fieldset>
            <legend className="mb-1 text-xs font-medium text-t2">Who may the agent pay? <span className="font-normal text-t3">The pocket enforces exactly these.</span></legend>
            {categories.map((c) => (
              <div key={c} className="mt-3"><div className="caps mb-1.5">{c}</div>
                <div className="space-y-1.5">{cfg.sellers.filter((s) => s.category === c).map((s) => (
                  <label key={s.id} className={cn("flex cursor-pointer items-center gap-3 rounded-[8px] border px-3 py-2.5 text-sm transition-colors", v.sellers.includes(s.id) ? "border-accent bg-accent-soft" : "border-hair bg-e1 hover:border-hair2")}>
                    <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={v.sellers.includes(s.id)} onChange={(e) => set("sellers", e.target.checked ? [...v.sellers, s.id] : v.sellers.filter((x) => x !== s.id))} />
                    <span className="font-medium">{s.name}</span>
                    <span className="num ml-auto text-xs text-t3">{s.items.map((i) => (i.price ? `US$${i.price}` : "free")).join(", ")}</span>
                  </label>))}</div></div>
            ))}
          </fieldset>
        </Step>
        <Step title="Review">
          <div className="space-y-3">
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-[10px] border border-hair bg-e1 p-4 text-[13px]">
              <dt className="text-t3">Preset</dt><dd className="font-medium">{v.label}</dd>
              <dt className="text-t3">Budget</dt><dd className="num font-medium">US${v.budget}</dd>
              <dt className="text-t3">Per payment</dt><dd className="num">up to US${v.cap}</dd>
              <dt className="text-t3">Ask me</dt><dd className="num">{ask === NEVER ? "never" : ask === 0n ? "every payment" : `above US$${v.askAbove}`}</dd>
              <dt className="text-t3">Lifetime</dt><dd>{lifetimeLabel}</dd>
              <dt className="text-t3">Sellers</dt><dd>{v.sellers.map(sellerName).join(", ") || "none"}</dd>
              <dt className="text-t3">Agent key</dt><dd className="mono text-xs">{cfg.agent}</dd>
            </dl>
            {(busy || phase === "done" || txs.length > 0) && (
              <ol className="space-y-1.5 rounded-[10px] border border-hair bg-e2 p-3" aria-live="polite">
                {stepRow("Create pocket", phase === "create" ? "doing" : "done")}
                {stepRow("Fund pocket", phase === "fund" ? "doing" : phase === "done" ? "done" : "todo")}
                {txs.map((t) => <li key={t.hash} className="flex items-center gap-2 pl-7 text-xs text-t3">{t.label} <TxLink hash={t.hash} /></li>)}
              </ol>
            )}
          </div>
        </Step>
      </Stepper>
      {issues.length > 0 && <ul className="mt-4 space-y-1 rounded-[8px] border border-stepup/30 bg-stepup-bg px-3 py-2 text-[13px] text-stepup-ink" aria-live="polite">{issues.map((i) => <li key={i}>{i}</li>)}</ul>}
      {err && <p role="alert" className="mt-4 break-words rounded-[8px] border border-refused/30 bg-refused-bg px-3 py-2 text-[13px] text-refused-ink">{err}</p>}
    </Sheet>
  );
}
