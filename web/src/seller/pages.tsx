import { useMemo, useState } from "react";
import { ArrowDownLeft, Ban, Tag, Copy, Check } from "lucide-react";
import { useSeller } from "./useSeller";
import { buyerTag, type SaleRow } from "./data";
import { Avatar, Button, Card, DetailSheet, Empty, Fig, Pill, Row, Section, SubTitle, money, moneyCents, tabPill, when } from "./ui";
import { REASONS, shortAddr, tokenSymbol, chainLabel } from "../shared";
import { cleanText } from "../lib/sanitize";
import { cn } from "../lib/cn";
import { Disclosure, KpiStrip } from "../console/kit";
import { curSign } from "../shared";

export type Page = "overview" | "sales" | "catalogue";
const ICON = { strokeWidth: 1.75 };

function useItemName() {
  const { seller } = useSeller();
  return (sku: string) => seller.items.find((i) => i.sku === sku)?.description ?? (sku ? sku.replace(/-/g, " ") : "Agent purchase");
}

const isDataRequest = (r: SaleRow) => r.reasons.includes("DISCLOSURE_REFUSED") || r.reasons.includes("SIGNATURE_TYPE_NOT_ALLOWED");
function useRowTitle() {
  const name = useItemName();
  return (r: SaleRow) => (isDataRequest(r) ? "Request for buyer data" : cleanText(name(r.sku), 80));
}

function SaleRowItem({ r, onOpen }: { r: SaleRow; onOpen(r: SaleRow): void }) {
  const title = useRowTitle();
  const paid = r.outcome === "paid";
  return (
    <Row onClick={() => onOpen(r)} label={`${paid ? "Paid" : "Refused"} ${title(r)} ${r.amount != null ? money(r.amount) : ""}`.trim()}
      avatar={<Avatar tone={paid ? "accent" : "negative"}>{paid ? <ArrowDownLeft className="size-5" {...ICON} /> : <Ban className="size-5" {...ICON} />}</Avatar>}
      title={title(r)} sub={paid ? `Buyer ${buyerTag(r.pocket)} · ${when(r.at)}` : `${r.why} · ${when(r.at)}`}
      amount={r.amount == null ? undefined : paid ? `+${money(r.amount)}` : money(r.amount)} amountClass={paid ? "text-green-ink" : "text-faint line-through decoration-1"}
      status={paid ? (r.cosigned ? "Owner approved" : undefined) : "Refused"} />
  );
}

function SaleDetail({ r, onClose }: { r?: SaleRow; onClose(): void }) {
  const title = useRowTitle();
  return (
    <DetailSheet open={!!r} onOpenChange={(o) => !o && onClose()} title={r?.outcome === "paid" ? "Payment received" : "Refused attempt"}>
      {r && (
        <div>
          <div className="flex flex-col items-center py-6 text-center">
            <Avatar tone={r.outcome === "paid" ? "accent" : "negative"} size={64}>{r.outcome === "paid" ? <ArrowDownLeft className="size-7" {...ICON} /> : <Ban className="size-7" {...ICON} />}</Avatar>
            <div className={cn("figure mt-4 text-[44px] leading-[48px]", r.outcome === "refused" && "text-faint")}>{r.amount == null ? title(r) : <>{r.outcome === "paid" ? "+" : ""}<Fig text={money(r.amount)} /></>}</div>
            <div className="mt-3"><Pill tone={r.outcome === "paid" ? "accent" : "negative"}>{r.outcome === "paid" ? `Paid in ${tokenSymbol()}` : "Not paid"}</Pill></div>
            {r.why && <p className="mx-auto mt-4 max-w-[34ch] text-[15px] text-ink2">{r.why}</p>}
          </div>
          <Card className="bg-tile">
            <dl className="divide-y divide-line text-[15px]">
              {[["Item", title(r)], ["Buyer", `Agent pocket ${buyerTag(r.pocket)}`], ["Time", when(r.at)], ...(r.outcome === "paid" ? [["Approval", r.cosigned ? "The owner approved it in their app" : "Inside the buyer's rules, no approval needed"]] : [])].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 px-5 py-3.5"><dt className="text-muted">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
              ))}
            </dl>
          </Card>
          <Disclosure className="mt-4" summary="Technical details">
            <dl className="tile space-y-2 px-4 py-3 text-[14px] text-ink2">
              <div><dt className="text-muted">Pocket</dt><dd className="num break-all">{r.pocket || "–"}</dd></div>
              {r.tx && <div><dt className="text-muted">Transaction</dt><dd className="num break-all">{r.tx}</dd></div>}
              {r.reasons.map((c) => <div key={c}><dt className="text-muted">Reason code</dt><dd>{c} · {REASONS[c] ?? ""}</dd></div>)}
            </dl>
          </Disclosure>
        </div>
      )}
    </DetailSheet>
  );
}

function SalesList({ rows, empty }: { rows: SaleRow[]; empty: string }) {
  const [open, setOpen] = useState<SaleRow>();
  return (
    <>
      <Card className="divide-y divide-line overflow-hidden">{rows.length ? rows.map((r) => <SaleRowItem key={r.key} r={r} onOpen={setOpen} />) : <Empty>{empty}</Empty>}</Card>
      <SaleDetail r={open} onClose={() => setOpen(undefined)} />
    </>
  );
}

export function Overview({ go }: { go(p: Page): void }) {
  const { seller, summary, rows } = useSeller();
  return (
    <div className="fade-up">
      <SubTitle title="Overview" sub={`${seller.name} · ${seller.category}`} />
      <Card className="px-6 py-10 text-center">
        <div className="eyebrow text-muted">Earned from AI agents</div>
        <div className="figure mt-2 text-[56px] leading-[60px] sm:text-[72px] sm:leading-[76px]" data-testid="earned"><Fig text={money(summary.earned)} /></div>
        <div className="mt-2 text-[15px] text-ink2">{summary.paid} {summary.paid === 1 ? "payment" : "payments"} from {summary.buyers} buyer {summary.buyers === 1 ? "agent" : "agents"}</div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="primary" onClick={() => go("sales")}><ArrowDownLeft className="size-4" {...ICON} />View sales</Button>
          <Button variant="soft" onClick={() => go("catalogue")}><Tag className="size-4" {...ICON} />Catalogue</Button>
        </div>
      </Card>
      <KpiStrip className="mt-3" items={[
        { label: "Payments", value: summary.paid, note: summary.buyers ? `From ${summary.buyers} buyer ${summary.buyers === 1 ? "agent" : "agents"}` : undefined },
        { label: "Average sale", value: moneyCents(summary.average), note: "Per payment" },
        { label: "Refused by buyers' wallets", value: summary.refused, note: summary.refused ? "Before any money moved" : "None yet", accent: true },
      ]} />
      <Section title="Recent sales" right={rows.length > 5 && <button type="button" onClick={() => go("sales")} className="pressable inline-flex h-9 items-center rounded-full bg-blue px-4 text-[14px] font-bold text-blue-ink hover:bg-blue-press">View all</button>}>
        <SalesList rows={rows.slice(0, 5)} empty="No agent has bought from you yet." />
      </Section>
      <Card className="hatch hatch-soft relative mt-10 overflow-hidden bg-blue-soft p-1.5 [--hatch:rgba(18,73,119,0.22)]">
       <div className="rounded-[20px] bg-card p-6">
        <div className="eyebrow text-blue-ink">How agent payments work</div>
        <p className="mt-2 max-w-[60ch] text-[16px] leading-6 text-ink">Buyers' AI agents pay you in {tokenSymbol()} from a pocket their owner funded. Each pocket has its own rules, so some attempts are refused before any money moves, and you see why here.</p>
       </div>
      </Card>
    </div>
  );
}

const FILTERS = [["all", "All"], ["paid", "Paid"], ["refused", "Refused"]] as const;
export function Sales() {
  const { rows } = useSeller();
  const [f, setF] = useState<(typeof FILTERS)[number][0]>("all");
  const shown = f === "all" ? rows : rows.filter((r) => r.outcome === f);
  const groups = useMemo(() => {
    const g = new Map<string, SaleRow[]>();
    for (const r of shown) { const d = new Date(r.at).toDateString() === new Date().toDateString() ? "Today" : new Date(r.at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" }); g.set(d, [...(g.get(d) ?? []), r]); }
    return [...g];
  }, [shown]);
  return (
    <div className="fade-up">
      <SubTitle title="Sales" sub="Every agent purchase, and every attempt a buyer's wallet stopped." />
      <div role="tablist" aria-label="Filter sales" className="mb-6 flex gap-2">
        {FILTERS.map(([v, l]) => (
          <button key={v} type="button" role="tab" aria-selected={f === v} onClick={() => setF(v)}
            className={tabPill(f === v)}>{l}</button>
        ))}
      </div>
      {groups.length ? groups.map(([d, rs]) => (
        <section key={d} className="mb-8"><h2 className="eyebrow mb-3 text-muted-canvas">{d}</h2><SalesList rows={rs} empty="" /></section>
      )) : <Card><Empty>Nothing here yet.</Empty></Card>}
    </div>
  );
}

export function Catalogue() {
  const { seller } = useSeller();
  const [copied, setCopied] = useState(false);
  const copy = () => { void navigator.clipboard?.writeText(seller.payTo).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); };
  return (
    <div className="fade-up">
      <SubTitle title="Catalogue" sub="What buyer agents can buy from you, and the price they see." />
      <Card className="divide-y divide-line">
        {seller.items.map((i) => (
          <Row key={i.sku} avatar={<Avatar tone="warning"><Tag className="size-5" {...ICON} /></Avatar>} title={cleanText(i.description, 90)} sub={i.sku} amount={i.price ? `${curSign()}${i.price}` : "Free"} amountClass={i.price ? undefined : "text-muted"} />
        ))}
      </Card>
      <Section title="Payouts">
        <Card>
          <Row avatar={<Avatar tone="accent">$</Avatar>} title={`${tokenSymbol()} on ${chainLabel()}`} sub={`Paid to ${shortAddr(seller.payTo)}`}
            amount={<button type="button" onClick={copy} className="inline-flex items-center gap-1.5 text-[15px] font-bold text-ink hover:underline">{copied ? <Check className="size-4" /> : <Copy className="size-4" {...ICON} />}{copied ? "Copied" : "Copy address"}</button>} />
        </Card>
      </Section>
    </div>
  );
}
