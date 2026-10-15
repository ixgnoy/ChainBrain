// Evidence: the expected-vs-actual table per scene, built from whatever really ran, with the hashes (each opens the
// in-app explorer) and Markdown / CSV export. Same facts as the presenter's scorecard (shared/sim/proof.ts).
import { useMemo } from "react";
import { Check, Clock, Download, FileText, X } from "lucide-react";
import { evidenceCsv, evidenceMarkdown, evidenceRows, type EvidenceRow } from "@sim/proof";
import { useNetwork } from "./useNetwork";
import { useFacts } from "./Scorecard";
import { TxHash } from "./parts";
import { baseScanLink, downloadText } from "./download";
import { Button, Card, PageTitle, Pill } from "../seller/ui";
import { cn } from "../lib/cn";

// green-soft = proven, grey = not run yet, vermillion-soft = failed
const STATUS = { pass: { tone: "accent", text: "Proven", icon: Check }, pending: { tone: "neutral", text: "Not run yet", icon: Clock }, fail: { tone: "negative", text: "Failed", icon: X } } as const;

function Txs({ r }: { r: EvidenceRow }) {
  if (!r.txs.length) return <span className="text-[13px] text-muted">{r.status === "pass" ? "No transaction (a refusal)" : "–"}</span>;
  return <ul className="space-y-1.5">{r.txs.map((t) => <li key={t.hash} className="flex flex-wrap items-baseline gap-x-2"><span className={cn("text-[12px] font-bold", t.reverted ? "text-vermillion-ink" : "text-muted")}>{t.label}</span><TxHash hash={t.hash} /></li>)}</ul>;
}

export function Evidence() {
  const { chainName, builtin, dev } = useNetwork();
  const { facts, allTxs } = useFacts();
  const rows = useMemo(() => evidenceRows(facts, allTxs), [facts, allTxs]);
  const proven = rows.filter((r) => r.status === "pass").length;
  const link = baseScanLink({ builtin, dev });
  const md = () => downloadText("chainbrain-evidence.md", "text/markdown", evidenceMarkdown(rows, { network: chainName, link }));
  const csv = () => downloadText("chainbrain-evidence.csv", "text/csv", evidenceCsv(rows, { network: chainName }));
  return (
    <div className="fade-up">
      <PageTitle title="Evidence" sub={<>What was expected, what actually happened, and the transactions that prove it. Built from the wallet's own events. <span className="whitespace-nowrap">{chainName}.</span></>}
        action={<div className="flex flex-wrap gap-2">
          <Button variant="primary" data-testid="evidence-export-md" className="h-11 px-5" onClick={md}><FileText className="size-4" strokeWidth={1.75} aria-hidden />Markdown</Button>
          <Button variant="outline" data-testid="evidence-export-csv" className="h-11 px-5" onClick={csv}><Download className="size-4" strokeWidth={1.75} aria-hidden />CSV</Button>
        </div>} />
      <Card className="mb-4 flex flex-wrap items-center gap-x-8 gap-y-3 p-5 sm:p-6">
        <p className="text-[15px] text-ink2"><span className="figure block text-[44px] leading-[48px] text-ink">{proven} of {rows.length}</span><span className="mt-1 block">scenes proven so far.</span></p>
        <div role="presentation" className="hatch hatch-soft h-3.5 min-w-[200px] flex-1 overflow-hidden rounded-full bg-tile shadow-[inset_0_0_0_1px_var(--color-line)]"><div className="bar-grow h-full rounded-full bg-ink transition-[width] duration-500 ease-out" style={{ width: `${rows.length ? Math.round((proven / rows.length) * 100) : 0}%` }} /></div>
      </Card>
      <Card className="overflow-hidden" >
        <div data-testid="evidence-table" role="table" aria-label="Evidence per scene">
          <div role="row" aria-hidden className="eyebrow hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_minmax(0,1.6fr)_minmax(0,1.3fr)_104px] gap-x-5 border-b border-line px-5 py-3.5 text-muted lg:grid">
            <span>Scene</span><span>Expected</span><span>Actual</span><span>Transactions</span><span>Status</span>
          </div>
          <div className="divide-y divide-line">
            {rows.map((r) => {
              const st = STATUS[r.status];
              return (
                <div key={r.scene} role="row" data-testid={`evidence-row-${r.scene}`} data-status={r.status} className="grid gap-x-5 gap-y-2 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_minmax(0,1.6fr)_minmax(0,1.3fr)_104px]">
                  <div role="cell" className="flex items-start gap-3">
                    <span aria-hidden className="num grid size-8 shrink-0 place-items-center rounded-[10px] bg-ink text-[13px] font-extrabold text-on-accent">{r.scene}</span>
                    <div className="min-w-0"><div className="text-[15px] font-bold leading-5 tracking-[-0.01em]">{r.title}</div><p className="mt-0.5 text-[13px] leading-5 text-muted">{r.proves}</p></div>
                  </div>
                  <div role="cell" className="text-[14px] leading-5 text-ink2"><span className="eyebrow mb-0.5 block text-muted lg:hidden">Expected</span>{r.expected}</div>
                  <div role="cell" className={cn("text-[14px] leading-5", r.status === "pending" ? "text-muted" : "text-ink")}><span className="eyebrow mb-0.5 block text-muted lg:hidden">Actual</span>{r.actual}</div>
                  <div role="cell"><span className="eyebrow mb-0.5 block text-muted lg:hidden">Transactions</span><Txs r={r} /></div>
                  <div role="cell"><Pill tone={st.tone}><st.icon className="mr-1 size-3.5" strokeWidth={2.25} aria-hidden />{st.text}</Pill></div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}
