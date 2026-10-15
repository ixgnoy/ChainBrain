// Presenter mode's scorecard: what the judges score (Task 40, Security 30, Interaction 30) ticking live from what really
// ran, read off the same facts the Evidence tab uses (shared/sim/proof.ts). Scoped to the pockets being presented.
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { factsFrom, scorecard, type ScoreItem } from "@sim/proof";
import { useNetwork } from "./useNetwork";
import { TxHash } from "./parts";
import { horizon, proofPockets } from "./proofScope";
import { cn } from "../lib/cn";

/** Facts for the pockets being shown (shared by the scorecard and the evidence table). */
export function useFacts(since?: number) {
  const { events, allTxs, builtin, linked, phonePockets, pockets, cfg } = useNetwork();
  const scope = useMemo(() => proofPockets({ linked, builtin, phonePockets, pockets }), [linked, builtin, phonePockets, pockets]);
  const facts = useMemo(() => factsFrom(events, allTxs, { sellerName: (id) => cfg.sellers.find((s) => s.id === id)?.name ?? id, pockets: scope, since }), [events, allTxs, scope, since, cfg]);
  return { facts, scope, events, allTxs };
}

function Tick({ done }: { done: boolean }) {
  return (
    <span aria-hidden className={cn("grid size-6 shrink-0 place-items-center rounded-full transition-colors duration-200", done ? "bg-ink text-on-accent" : "bg-card ring-1 ring-inset ring-line")}>
      {done && <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path className="tick-draw" d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
    </span>
  );
}

function Item({ it }: { it: ScoreItem }) {
  const [open, setOpen] = useState(false);
  const f = it.fact;
  return (
    <li data-testid={`score-item-${it.id}`} data-done={it.done ? "true" : "false"} className="border-t border-line first:border-0">
      <div className="flex items-center gap-3 py-2">
        <Tick done={it.done} />
        <span className={cn("min-w-0 flex-1 text-[14px] leading-5 transition-colors", it.done ? "font-semibold text-ink" : "text-muted")}>{it.label}</span>
        {it.done && f && <button type="button" aria-expanded={open} aria-label={`Show proof for ${it.label}`} onClick={() => setOpen((o) => !o)} className="relative inline-flex h-8 items-center gap-1 rounded-full bg-card px-2.5 text-[13px] font-bold text-ink before:absolute before:-inset-y-2 before:inset-x-0 before:content-[''] hover:bg-blue-soft">Proof<ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden /></button>}
      </div>
      {open && f && (
        <div className="fade-up mb-3 ml-9 rounded-[12px] bg-card px-3.5 py-3 text-[13px] leading-5 text-ink2">
          <p>{f.detail}</p>
          {f.txs.length > 0 && <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">{f.txs.map((h) => <TxHash key={h} hash={h} />)}</p>}
        </div>
      )}
    </li>
  );
}

export function Scorecard({ pocket }: { pocket?: string }) {
  void pocket;
  const { events, allTxs, builtin, linked, phonePockets, pockets } = useNetwork();
  const scope = useMemo(() => proofPockets({ linked, builtin, phonePockets, pockets }), [linked, builtin, phonePockets, pockets]);
  // "since opening" is fixed once, at the first moment the pockets being presented are known (a linked phone's may arrive late)
  const [since, setSince] = useState<number>();
  const ready = scope === undefined || scope.length > 0;
  useEffect(() => { if (since === undefined && ready) setSince(horizon(events, allTxs, scope)); }, [since, ready, events, allTxs, scope]);
  const [all, setAll] = useState(false);
  const reset = () => { setAll(false); setSince(horizon(events, allTxs, scope)); };
  const resetRef = useRef(reset);
  resetRef.current = reset;
  useEffect(() => { const on = () => resetRef.current(); addEventListener("cb:reset-score", on); return () => removeEventListener("cb:reset-score", on); }, []);
  const { facts } = useFacts(all ? 0 : since ?? Number.MAX_SAFE_INTEGER);
  const groups = scorecard(facts);
  const done = groups.reduce((n, g) => n + g.items.filter((i) => i.done).length, 0);
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  return (
    <section data-testid="scorecard" data-done={done} aria-label="Scorecard" className="card flex min-h-0 flex-col overflow-hidden">
      <header className="px-4 pb-3 pt-4 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[22px] font-bold leading-7 tracking-[-0.02em]">Scorecard</h2>
          <button type="button" onClick={reset} className="pressable relative inline-flex h-9 items-center rounded-full bg-tile px-3.5 text-[13px] font-bold text-ink shadow-[inset_0_0_0_1px_var(--color-tile-stroke)] before:absolute before:-inset-y-1 before:inset-x-0 before:content-[''] hover:bg-line">Reset</button>
        </div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <span className="figure text-[40px] leading-[44px]" data-testid="score-total">{done} of {total}</span>
          <span className="eyebrow pb-1.5 text-muted">proven</span>
        </div>
        <div role="presentation" className="hatch hatch-soft mt-2.5 h-2.5 overflow-hidden rounded-full bg-tile shadow-[inset_0_0_0_1px_var(--color-line)]"><div className="bar-grow h-full rounded-full bg-ink transition-[width] duration-500 ease-out" style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }} /></div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 sm:px-4">
        <p className="px-1 pb-1 text-[12px] leading-4 text-muted">{all ? "Everything on the pockets being presented." : "Since you opened presenter mode."} <button type="button" onClick={() => setAll((a) => !a)} className="font-bold text-ink underline decoration-line decoration-2 underline-offset-4 hover:decoration-vermillion">{all ? "Only since opening" : "Show all history"}</button></p>
        {groups.map((g) => {
          const n = g.items.filter((i) => i.done).length;
          return (
            <div key={g.id} className="tile mt-2 px-3.5 py-3" data-testid={`score-group-${g.id}`}>
              <div className="flex items-baseline justify-between"><h3 className="eyebrow text-muted">{g.title} · {g.weight}</h3><span className="num text-[13px] font-bold text-ink">{n}/{g.items.length}</span></div>
              <ul>{g.items.map((it) => <Item key={it.id} it={it} />)}</ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
