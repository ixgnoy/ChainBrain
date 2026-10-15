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

const STATUS = { pass: { tone: "accent", text: "Proven", icon: Check }, pending: { tone: "neutral", text: "Not run yet", icon: Clock }, fail: { tone: "negative", text: "Failed", icon: X } } as const;

function Txs({ r }: { r: EvidenceRow }) {
  if (!r.txs.length) return <span className="text-[13px] text-muted">{r.status === "pass" ? "No transaction (a refusal)" : "–"}</span>;
  return <ul className="space-y-1.5">{r.txs.map((t) => <li key={t.hash} className="flex flex-wrap items-baseline gap-x-2"><span className={cn("text-[12px] font-semibold", t.reverted ? "text-ink" : "text-muted")}>{t.label}</span><TxHash hash={t.hash} /></li>)}</ul>;
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
          <Button variant="outline" data-testid="evidence-export-md" className="h-11 px-5" onClick={md}><FileText className="size-4" strokeWidth={1.75} aria-hidden />Markdown</Button>
          <Button variant="outline" data-testid="evidence-export-csv" className="h-11 px-5" onClick={csv}><Download className="size-4" strokeWidth={1.75} aria-hidden />CSV</Button>
        </div>} />
      <p className="mb-3 text-[14px] text-ink2"><span className="num font-semibold text-ink">{proven} of {rows.length}</span> scenes proven so far.</p>
      <Card className="overflow-hidden" >
        <div data-testid="evidence-table" role="table" aria-label="Evidence per scene">
          <div role="row" aria-hidden className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_minmax(0,1.6fr)_minmax(0,1.3fr)_104px] gap-x-5 border-b border-line px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted lg:grid">
            <span>Scene</span><span>Expected</span><span>Actual</span><span>Transactions</span><span>Status</span>
          </div>
          <div className="divide-y divide-line">
            {rows.map((r) => {
              const st = STATUS[r.status];
              return (
                <div key={r.scene} role="row" data-testid={`evidence-row-${r.scene}`} data-status={r.status} className="grid gap-x-5 gap-y-2 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_minmax(0,1.6fr)_minmax(0,1.3fr)_104px]">
                  <div role="cell" className="flex items-start gap-3">
                    <span aria-hidden className="num grid size-7 shrink-0 place-items-center rounded-full bg-fill text-[13px] font-semibold text-ink2">{r.scene}</span>
                    <div className="min-w-0"><div className="text-[15px] font-semibold leading-5">{r.title}</div><p className="mt-0.5 text-[13px] leading-5 text-muted">{r.proves}</p></div>
                  </div>
                  <div role="cell" className="text-[14px] leading-5 text-ink2"><span className="mb-0.5 block text-[12px] font-semibold uppercase tracking-[0.06em] text-muted lg:hidden">Expected</span>{r.expected}</div>
                  <div role="cell" className={cn("text-[14px] leading-5", r.status === "pending" ? "text-muted" : "text-ink")}><span className="mb-0.5 block text-[12px] font-semibold uppercase tracking-[0.06em] text-muted lg:hidden">Actual</span>{r.actual}</div>
                  <div role="cell"><span className="mb-0.5 block text-[12px] font-semibold uppercase tracking-[0.06em] text-muted lg:hidden">Transactions</span><Txs r={r} /></div>
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
