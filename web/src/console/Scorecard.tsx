// Presenter mode's scorecard: what the judges score (Task 40, Security 30, Interaction 30) ticking live from what really
// ran, read off the same facts the Evidence tab uses (shared/sim/proof.ts). Scoped to the pockets being presented.
import { useEffect, useMemo, useState } from "react";
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
    <span aria-hidden className={cn("grid size-6 shrink-0 place-items-center rounded-full transition-colors duration-200", done ? "bg-accent text-on-accent" : "bg-canvas ring-1 ring-inset ring-line")}>
      {done && <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path className="tick-draw" d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
    </span>
  );
}

function Item({ it }: { it: ScoreItem }) {
  const [open, setOpen] = useState(false);
  const f = it.fact;
  return (
    <li data-testid={`score-item-${it.id}`} data-done={it.done ? "true" : "false"} className="border-b border-line last:border-0">
      <div className="flex items-center gap-3 py-1.5">
        <Tick done={it.done} />
        <span className={cn("min-w-0 flex-1 text-[14px] leading-5 transition-colors", it.done ? "font-medium text-ink" : "text-muted")}>{it.label}</span>
        {it.done && f && <button type="button" aria-expanded={open} aria-label={`Show proof for ${it.label}`} onClick={() => setOpen((o) => !o)} className="relative inline-flex h-8 items-center gap-1 rounded-full px-2 text-[13px] font-semibold text-accent before:absolute before:-inset-y-2 before:inset-x-0 before:content-[''] hover:bg-accent-soft">Proof<ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden /></button>}
      </div>
      {open && f && (
        <div className="fade-up mb-3 ml-9 rounded-[12px] bg-canvas px-3.5 py-3 text-[13px] leading-5 text-ink2">
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
  const [since, setSince] = useState(() => horizon(events, allTxs, scope));
  const [all, setAll] = useState(false);
  const reset = () => { setAll(false); setSince(horizon(events, allTxs, scope)); };
  useEffect(() => { const on = () => reset(); addEventListener("cb:reset-score", on); return () => removeEventListener("cb:reset-score", on); }); // eslint-disable-line react-hooks/exhaustive-deps
  const { facts } = useFacts(all ? 0 : since);
  const groups = scorecard(facts);
  const done = groups.reduce((n, g) => n + g.items.filter((i) => i.done).length, 0);
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  return (
    <section data-testid="scorecard" data-done={done} aria-label="Scorecard" className="flex min-h-0 flex-col overflow-hidden rounded-[20px] bg-card">
      <header className="flex min-h-12 items-center justify-between gap-3 border-b border-line px-4 sm:px-5">
        <h2 className="text-[15px] font-semibold leading-5">Scorecard</h2>
        <div className="flex items-center gap-2 text-[12px] text-muted">
          <span className="num font-semibold text-ink" data-testid="score-total">{done} of {total}</span>
          <button type="button" onClick={reset} className="relative inline-flex h-8 items-center rounded-full px-2 text-[13px] font-semibold text-accent before:absolute before:-inset-y-2 before:inset-x-0 before:content-[''] hover:bg-accent-soft">Reset</button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3 sm:px-5">
        <p className="pt-3 text-[12px] leading-4 text-muted">{all ? "Everything on the pockets being presented." : "Since you opened presenter mode."} <button type="button" onClick={() => setAll((a) => !a)} className="font-semibold text-accent hover:underline">{all ? "Only since opening" : "Show all history"}</button></p>
        {groups.map((g) => {
          const n = g.items.filter((i) => i.done).length;
          return (
            <div key={g.id} className="pt-2.5" data-testid={`score-group-${g.id}`}>
              <div className="flex items-baseline justify-between"><h3 className="text-[12px] font-semibold uppercase leading-4 tracking-[0.06em] text-muted">{g.title} · {g.weight}</h3><span className="num text-[12px] text-muted">{n}/{g.items.length}</span></div>
              <ul>{g.items.map((it) => <Item key={it.id} it={it} />)}</ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
