// A pocket's app on the console (#pockets/0x…): the same spec and the same numbers as the phone's pocket page. The spec
// and the routine come from the event stream (shared/sim/pocketAppData.ts appFromEvents / routineFromEvents), every figure
// from the same selectors the phone uses, so the two screens can never disagree. The card wears its job's face (research
// desk black, deal watcher powder blue, subscriptions white hatch, haggler vermillion); the agent shows by its own mark.
import { useMemo, useState } from "react";
import { ArrowLeft, Ban, Check, ChevronRight, Clock, Radio, ShieldCheck } from "lucide-react";
import { useNetwork } from "./useNetwork";
import { AgentTag, SellerLogo, agentOfKey, pocketStatus, usd, NEVER } from "./parts";
import { Card, Empty } from "../seller/ui";
import { cn } from "../lib/cn";
import { cleanText } from "../lib/sanitize";
import { CLAUDE_SPARK, OPENAI_BLOSSOM } from "../../../shared/brand/marks";
import { BLOCKS, cadenceText, nextRuns, param, usageChip, usageOf, type Block, type Layout, type PocketAppSpec, type Routine, type Usage } from "@sim/pocketApp";
import {
  appFromEvents, budgetOf, haggleOf, monthBySeller, priceChanges, priceSeries, purchasesOf, renewalsOf, routineFromEvents, runsOf, savingsOf, sourcesOf, upcoming,
} from "@sim/pocketAppData";
import type { PocketState } from "./chain";

const I = { strokeWidth: 1.75 } as const;
const LAYOUT_NAME: Record<Layout, string> = { research: "Research desk", deal: "Deal watcher", subscriptions: "Subscriptions", haggle: "Haggler" };
// the card's face says how often the pocket spends (usageOf, as on the phone): daily powder blue, weekly or monthly sage,
// one-time wheat (vermillion is for alerts), when asked white hatch
const SAGE = { bg: "#CBD9C4", ink: "#111215", sub: "rgba(17,18,21,0.66)", band: "#111215", chip: "#2C4A2A" };
const FACE: Record<Usage, { bg: string; ink: string; sub: string; band: string; chip: string; hatch?: boolean }> = {
  daily: { bg: "#9DCAFF", ink: "#111215", sub: "rgba(17,18,21,0.66)", band: "#111215", chip: "#124977" },
  weekly: SAGE, monthly: SAGE,
  once: { bg: "#E9D6AE", ink: "#111215", sub: "rgba(17,18,21,0.66)", band: "#111215", chip: "#5C4314" },
  asked: { bg: "#FFFFFF", ink: "#111215", sub: "#5E5F68", band: "#111215", chip: "#111215", hatch: true },
};
type Ev = { type: string; pocket?: string; at: number; [k: string]: any };
const day = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const hm = (ms: number) => new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const pct = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(Math.round(x * 100))}%`;
const short = (s: string) => cleanText(s.split(/: | \(/)[0], 40);
const fallbackApp = (name: string): PocketAppSpec => ({ v: 1, catalogue: "chainbrain.pocket.v1", layout: "research", title: name.slice(0, 28), blocks: [{ type: "shelf" }, { type: "budget" }, { type: "sources" }], routine: null });

type Ctx = { spec: PocketAppSpec; p: PocketState; events: Ev[]; routine: Routine | null; agent: string; seller(id?: string): string; item(sid: string, sku: string): string; now: number; registry: { id: string; items: any[] }[] };

function AgentMark({ id, size = 40 }: { id?: string; size?: number }) {
  const m = id === "claude" ? CLAUDE_SPARK : id === "chatgpt" ? OPENAI_BLOSSOM : null;
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-[12px]", m ? "bg-white ring-1 ring-inset ring-tile-stroke" : "bg-ink")} style={{ width: size, height: size }}>
      {m ? <svg width={size * 0.6} height={size * 0.6} viewBox={m.viewBox}>{m.paths.map((d, i) => <path key={i} d={d} fill={m.fill} />)}</svg>
        : <span className="grid grid-cols-2 gap-[2px]" style={{ width: size * 0.42, height: size * 0.42 }}>{[0, 1, 2, 3].map((i) => <span key={i} className={cn("rounded-[2px]", i === 1 ? "bg-vermillion" : "bg-white")} />)}</span>}
    </span>
  );
}

/** The pocket as its card: the job's face, the agent on a white pill across the stripe, the balance, the contract tail. */
function FaceCard({ p, spec, agentId, agentName }: { p: PocketState; spec: PocketAppSpec; agentId?: string; agentName: string }) {
  const f = FACE[usageOf(spec)];
  const st = pocketStatus(p);
  const off = st.label !== "Active";
  return (
    <div className="relative aspect-[1.586] w-full overflow-hidden rounded-[18px] shadow-[0_12px_32px_-4px_rgba(17,18,21,0.16)]" style={{ background: off ? "#FFFFFF" : f.bg, color: off ? "#777781" : f.ink }}
      aria-label={`${cleanText(p.name ?? spec.title, 30)} card, ${usd(p.balance)}`}>
      {(f.hatch || off) && <span aria-hidden className="hatch hatch-soft absolute inset-0 opacity-70" />}
      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between px-5 pt-4"><span className="flex min-w-0 items-center gap-2"><span className="truncate font-display text-[18px] font-semibold">{cleanText(p.name ?? spec.title, 28)}</span>{!off && <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: f.chip }}>{usageChip(spec)}</span>}</span>{off && <span className="rounded-full bg-vermillion-soft px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-vermillion-ink">{st.label}</span>}</div>
        <div className="mt-2 flex h-10 items-center px-5" style={{ background: off ? "#3A3B41" : f.band }}>
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white pl-0.5 pr-3 text-[12px] font-semibold text-ink"><AgentMark id={agentId} size={24} />{agentName} · {LAYOUT_NAME[spec.layout].toLowerCase()}</span>
        </div>
        <div className="px-5 pt-3"><span className="eyebrow" style={{ color: off ? "#777781" : f.sub }}>Available</span><div className="num font-display text-[30px] font-medium leading-9 tracking-[-0.02em]">{usd(p.balance)}</div></div>
        <div className="mt-auto flex items-end justify-between px-5 pb-4">
          <div>
            <div className="text-[12px]" style={{ color: off ? "#777781" : f.sub }}>Cap {usd(p.cap)} · {p.askAbove === NEVER || p.askAbove > p.cap ? "never asks" : p.askAbove === 0n ? "asks every time" : `asks above ${usd(p.askAbove)}`}</div>
            <div className="num font-display text-[19px] font-semibold">{`0x…${p.address.slice(-4).toLowerCase()}`}</div>
          </div>
          <span className="text-[12px] font-semibold" style={{ color: off ? "#777781" : f.sub }}>{new Date(p.expiresAt * 1000).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" })}</span>
        </div>
      </div>
    </div>
  );
}

function Block({ label, right, children, wide, i }: { label: string; right?: React.ReactNode; children: React.ReactNode; wide?: boolean; i: number }) {
  return (
    // the app builds itself on the console too: each block rises after the one before it
    <div className={cn("fade-up", wide && "lg:col-span-2")} style={{ animationDelay: `${Math.min(i, 8) * 70}ms` }}><Card className="h-full p-5">
      <div className="mb-4 flex items-center justify-between gap-3"><h3 className="font-display text-[17px] font-semibold leading-[22px]">{label}</h3>{typeof right === "string" ? <span className="truncate text-[12px] text-muted">{right}</span> : right}</div>
      {children}
    </Card></div>
  );
}
const EmptyHatch = ({ text }: { text: string }) => (
  <div className="relative grid min-h-24 place-items-center overflow-hidden rounded-2xl bg-tile px-4 py-4 text-center text-[14px] text-ink2"><span aria-hidden className="hatch hatch-soft absolute inset-0 opacity-60" /><span className="relative">{text}</span></div>
);

// ---------------------------------------------------------------- blocks

function Shelf({ c, i }: { c: Ctx; i: number }) {
  const all = purchasesOf(c.events, c.p.address);
  const list = [...all].reverse().slice(0, 8);
  return (
    <Block i={i} wide label="Library" right={all.length ? `${usd(all.reduce((n, x) => n + x.amount, 0n))} in all` : undefined}>
      <div className="mb-4 flex items-baseline gap-2"><span className="num font-display text-[44px] font-medium leading-none">{all.length}</span><span className="text-[14px] text-ink2">{all.length === 1 ? "report bought" : "reports bought"}</span></div>
      {list.length ? (
        <div className="chip-row -mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1">
          {list.map((x, k) => (
            <div key={k} className={cn("w-[150px] shrink-0 overflow-hidden rounded-2xl", k === 0 ? "bg-ink text-white" : "bg-tile")}>
              <div className="relative flex h-[72px] items-end p-3"><span aria-hidden className={cn("hatch absolute inset-0", k === 0 ? "hatch-white opacity-40" : "hatch-soft")} /><SellerLogo id={x.sellerId} name={c.seller(x.sellerId)} className="relative" /></div>
              <div className="flex min-h-[100px] flex-col justify-between gap-2 p-3 pt-2">
                <span className="text-[14px] font-semibold leading-[18px]">{short(c.item(x.sellerId, x.sku))}</span>
                <span><span className={cn("block text-[12px]", k === 0 ? "text-white/65" : "text-muted")}>{day(x.at)}{x.run ? ` · run ${x.run}` : ""}</span><span className="num font-display text-[17px] font-semibold">{usd(x.amount)}</span></span>
              </div>
            </div>
          ))}
        </div>
      ) : <EmptyHatch text="Nothing bought yet. The first run fills the shelf." />}
    </Block>
  );
}

function PriceHero({ c, block, i }: { c: Ctx; block: Block; i: number }) {
  const days = param(block, "range") === "7d" ? 7 : 14;
  const limit = c.spec.routine?.limitPrice ? BigInt(Math.round(Number(c.spec.routine.limitPrice) * 1e6)) : undefined;
  const s = priceSeries(c.events, c.p.address, { now: c.now, days, limit });
  const item = c.spec.routine?.items[0];
  const W = 640, H = 200, R = 70, T = 16, B = 14;
  const plot = useMemo(() => {
    if (!s.quotes.length) return null;
    const vals = [...s.quotes.map((q) => Number(q.price)), ...(limit != null ? [Number(limit)] : [])];
    const pad = Math.max((Math.max(...vals) - Math.min(...vals)) * 0.18, 1500);
    const lo = Math.min(...vals) - pad, hi = Math.max(...vals) + pad;
    const t0 = s.quotes[0].at, t1 = Math.max(s.quotes.at(-1)!.at, t0 + 1);
    const x = (t: number) => 8 + ((t - t0) / (t1 - t0)) * (W - R - 16);
    const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    const pts = s.quotes.map((q) => [x(q.at), y(Number(q.price))] as const);
    return { pts, line: pts.map(([a, b], k) => `${k ? "L" : "M"}${a.toFixed(1)},${b.toFixed(1)}`).join(" "), ly: limit != null ? y(Number(limit)) : null, dots: s.buys.map((b) => { const q = s.quotes.reduce((m, z) => (Math.abs(z.at - b.at) < Math.abs(m.at - b.at) ? z : m), s.quotes[0]); return [x(q.at), y(Number(b.amount))] as const; }) };
  }, [s.quotes, s.buys, limit]); // eslint-disable-line react-hooks/exhaustive-deps
  // hover (or arrow keys) to read any day: the nearest quote, its price, and whether it was in the buy zone
  const [at, setAt] = useState<number | null>(null);
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!plot) return;
    const r = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    plot.pts.forEach(([px], k) => { if (Math.abs(px - vx) < Math.abs(plot.pts[best][0] - vx)) best = k; });
    setAt(best);
  };
  const onKey = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (!plot || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    e.preventDefault();
    setAt((k) => Math.max(0, Math.min(plot.pts.length - 1, (k ?? plot.pts.length - 1) + (e.key === "ArrowRight" ? 1 : -1))));
  };
  const q = at != null ? s.quotes[at] : null;
  const inZone = q && limit != null ? q.price <= limit : false;
  return (
    <Block i={i} wide label={item ? `${c.seller(item.sellerId)} · quoted prices` : "Quoted prices"} right={`${days} days`}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div><div className="num font-display text-[32px] font-medium leading-9">{s.last ? usd(s.last.price) : "—"}</div><div className="text-[12px] text-muted">{s.last ? `Last quote · ${day(s.last.at)} ${hm(s.last.at)}` : "No quotes yet"}</div></div>
        {s.quotes.length > 1 && <span className={cn("rounded-full px-2.5 py-1 text-[12px] font-bold", s.change > 0 ? "bg-vermillion-soft text-vermillion-ink" : "bg-green-soft text-green-ink")}>{pct(s.change)} in {days} days</span>}
      </div>
      {plot ? (
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full cursor-crosshair rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ink" role="img" tabIndex={0}
          onMouseMove={onMove} onMouseLeave={() => setAt(null)} onKeyDown={onKey} onBlur={() => setAt(null)} aria-label={`Quoted prices: ${s.quotes.map((q) => `${day(q.at)} ${usd(q.price)}`).join(", ")}${limit != null ? `. Limit ${usd(limit)}` : ""}. ${s.buys.length} bought.`}>
          <defs><pattern id="pa-lines" patternUnits="userSpaceOnUse" width="5" height="8"><line x1="2.5" x2="2.5" y1="0" y2="8" stroke="#111215" strokeWidth="1.2" /></pattern></defs>
          {plot.ly != null && <rect x="0" y={plot.ly} width={W - R} height={H - B - plot.ly} fill="#D1E4FF" opacity="0.75" />}
          <line x1="0" x2={W - R} y1={H - B} y2={H - B} stroke="#D3D3D1" />
          <path d={`${plot.line} L${plot.pts.at(-1)![0]},${H} L${plot.pts[0][0]},${H} Z`} fill="url(#pa-lines)" opacity="0.22" />
          <path d={plot.line} fill="none" stroke="#111215" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
          {plot.ly != null && <line x1="0" x2={W - R + 4} y1={plot.ly} y2={plot.ly} stroke="#124977" strokeWidth="1.6" strokeDasharray="5 4" />}
          {plot.dots.map(([a, b], k) => <circle key={k} cx={a} cy={b} r="5" fill="#111215" stroke="#fff" strokeWidth="2" />)}
          <circle cx={plot.pts.at(-1)![0]} cy={plot.pts.at(-1)![1]} r="6" fill="#fff" stroke="#F04E23" strokeWidth="3" />
          {q && at != null && (
            <g pointerEvents="none">
              <line x1={plot.pts[at][0]} x2={plot.pts[at][0]} y1="0" y2={H - B} stroke="#111215" strokeWidth="1.4" />
              <circle cx={plot.pts[at][0]} cy={plot.pts[at][1]} r="7" fill={inZone ? "#124977" : "#111215"} stroke="#fff" strokeWidth="3" />
              <g transform={`translate(${Math.min(Math.max(plot.pts[at][0] - 80, 0), W - R - 160)}, 0)`}>
                <rect width="160" height="28" rx="9" fill="#111215" />
                <text x="10" y="18" fontSize="12" fill="rgba(255,255,255,0.72)">{day(q.at)}</text>
                <text x="150" y="18" fontSize="12" fontWeight="700" textAnchor="end" fill={inZone ? "#9DCAFF" : "#fff"}>{usd(q.price)}</text>
              </g>
            </g>
          )}
          {plot.ly != null && limit != null && <g><rect x={W - R + 8} y={plot.ly - 12} width="58" height="24" rx="7" fill="#124977" /><text x={W - R + 37} y={plot.ly + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">≤ {usd(limit).replace("US$", "")}</text></g>}
        </svg>
      ) : <EmptyHatch text={limit != null ? `Every quote lands here. It buys at ${usd(limit)} or less.` : "Every quote lands here."} />}
      {plot && <div className="mt-1 flex justify-between pr-[11%] text-[12px]"><span className="text-muted">{day(s.quotes[0].at)}</span><span className="font-bold">{day(s.quotes.at(-1)!.at)}</span></div>}
      {plot && <div className="mt-2 flex flex-wrap gap-4 text-[12px] text-ink2"><span className="inline-flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-blue-ink" />Your limit</span><span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-ink" />{s.buys.length} bought</span><span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full border-[2.5px] border-vermillion" />{s.quotes.length} quotes</span></div>}
    </Block>
  );
}

const SEG = ["#111215", "#F04E23", "#9DCAFF", "#22C55E"];
function MonthSpend({ c, i }: { c: Ctx; i: number }) {
  const m = monthBySeller(c.events, c.p.address, c.now);
  const month = new Date(c.now).toLocaleDateString("en-GB", { month: "long" });
  return (
    <Block i={i} wide label={`Spent in ${month}`} right={c.routine?.status === "active" ? `Renews ${day(c.routine.nextAt)}` : undefined}>
      <div className="num mb-4 font-display text-[32px] font-medium leading-9">{usd(m.total)}</div>
      <div className="flex h-6 overflow-hidden rounded-lg bg-fill" role="img" aria-label={m.rows.map((r) => `${c.seller(r.sellerId)} ${usd(r.amount)}`).join(", ") || "Nothing spent this month"}>
        {m.rows.length ? m.rows.map((r, k) => <span key={r.sellerId} style={{ flex: Number(r.amount), background: SEG[k % SEG.length] }} className="border-r-2 border-card last:border-r-0" />) : <span className="hatch hatch-soft flex-1" />}
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {m.rows.map((r, k) => <li key={r.sellerId} className="flex items-center gap-2.5 text-[14px]"><span className="size-2.5 rounded-[3px]" style={{ background: SEG[k % SEG.length] }} /><SellerLogo id={r.sellerId} name={c.seller(r.sellerId)} className="size-6 rounded-[8px]" /><span className="flex-1 truncate">{c.seller(r.sellerId)}</span><span className="num font-semibold">{usd(r.amount)}</span></li>)}
      </ul>
    </Block>
  );
}

function Ladder({ c, i }: { c: Ctx; i: number }) {
  const h = haggleOf(c.events, c.p.address);
  if (!h) return <Block i={i} wide label="The deal"><EmptyHatch text={`No deal yet. ${c.agent} asks the price and offers less, in up to three rounds.`} /></Block>;
  const rows: { who: string; label: string; price: bigint }[] = [{ who: "seller", label: `${c.seller(h.sellerId)} asks`, price: h.list }];
  for (const s of h.steps) {
    if (s.accepting) continue;
    rows.push({ who: "agent", label: `${c.agent} offers`, price: s.offer });
    if (s.reply !== "accept") rows.push({ who: "seller", label: s.final ? `${c.seller(h.sellerId)}'s final price` : `${c.seller(h.sellerId)} counters`, price: s.price });
  }
  if (h.paid != null) rows.push({ who: "paid", label: h.cosigned ? "Paid · co-signed by the owner" : "Paid", price: h.paid });
  const max = Number(h.list) || 1;
  return (
    <Block i={i} wide label="The deal" right={short(c.item(h.sellerId, h.sku))}>
      <ol className="grid gap-2">
        {rows.map((r, k) => (
          <li key={k}>
            <div className="mb-1 flex justify-between text-[12px]"><span className={r.who === "paid" ? "font-bold" : "text-ink2"}>{r.label}</span><span className="num font-bold">{usd(r.price)}</span></div>
            <div className="h-3.5 overflow-hidden rounded-[5px] bg-tile"><div className={cn("h-full rounded-[5px]", r.who === "paid" ? "bg-vermillion" : r.who === "agent" ? "bg-ink" : "hatch bg-fill")} style={{ width: `${Math.max(8, (Number(r.price) / max) * 100)}%` }} /></div>
          </li>
        ))}
      </ol>
    </Block>
  );
}

function Budget({ c, i }: { c: Ctx; i: number }) {
  const b = budgetOf(c.events, c.p.address, { routine: c.routine, balance: c.p.balance, now: c.now });
  const scale = Math.max(Number(b.limit), Number(b.spent), 1);
  const tick = Number(b.limit) / scale, fill = Math.min(1, Number(b.spent) / scale);
  const over = b.kind === "period" && b.spent > b.limit;
  return (
    <Block i={i} label={b.kind === "period" ? `This ${b.period}` : "Budget"} right={b.window ? `resets ${day(b.window.end).split(",")[0]}` : undefined}>
      <div className="flex items-end gap-2"><span className="num font-display text-[24px] font-semibold leading-7">{usd(b.kind === "period" ? b.spent : b.left)}</span><span className="pb-0.5 text-[14px] text-ink2">{b.kind === "period" ? `of ${usd(b.limit)} a ${b.period}` : `left of ${usd(b.limit)} put in`}</span></div>
      <div className="relative mt-6" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((Number(b.spent) / Math.max(Number(b.limit), 1)) * 100)} aria-label={b.kind === "period" ? `Spent this ${b.period}` : "Budget used"}>
        <div className="relative flex h-[18px] overflow-hidden rounded-md bg-fill"><span aria-hidden className="hatch hatch-soft absolute inset-0" /><span className="relative bg-ink" style={{ width: `${(over ? tick : fill) * 100}%` }} />{over && <span className="relative bg-vermillion" style={{ width: `${(fill - tick) * 100}%` }} />}</div>
        {b.kind === "period" && <><span aria-hidden className="absolute -bottom-1.5 -top-1.5 w-0.5 bg-ink" style={{ left: `calc(${tick * 100}% - 1px)` }} /><span className="num absolute -top-6 text-[12px] font-bold" style={{ left: `${tick * 100}%`, transform: tick > 0.75 ? "translateX(-100%)" : undefined }}>{usd(b.limit)}</span></>}
      </div>
      <p className="mt-3 text-[12px] text-muted">{over ? `${usd(b.spent - b.limit)} over, co-signed by the owner on its cheque.` : b.kind === "period" ? `Above ${usd(b.limit)} a ${b.period}, ${c.agent} stops and sends the owner a cheque.` : "The contract holds the pocket to its balance."}</p>
    </Block>
  );
}

function NextRun({ c, i }: { c: Ctx; i: number }) {
  const rs = c.spec.routine!;
  const times = c.routine ? upcoming(c.routine, 4) : nextRuns(rs.cadence, c.now, 4);
  return (
    <Block i={i} label={rs.kind === "price-watch" ? "Next check" : rs.kind === "renewals" ? "Next renewal" : "Next run"} right={c.routine?.status === "paused" ? "Paused" : undefined}>
      <div className="grid grid-cols-4 gap-2">
        {times.map((t, k) => (
          <div key={k} className={cn("grid min-h-[76px] place-items-center rounded-2xl py-2 text-center", k === 0 ? "bg-ink text-white" : "bg-tile")}>
            <span className={cn("eyebrow", k === 0 ? "text-white/70" : "text-muted")}>{new Date(t).toLocaleDateString("en-GB", { weekday: "short" })}</span>
            <span className="num font-display text-[22px] font-semibold leading-6">{new Date(t).getDate()}</span>
            <span className={cn("text-[12px]", k === 0 ? "text-white/70" : "text-muted")}>{hm(t)}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-muted">{cadenceText(rs.cadence)}{rs.kind === "price-watch" ? ` · buys at US$${rs.limitPrice} or less` : ""}</p>
    </Block>
  );
}

function Runs({ c, block, i }: { c: Ctx; block: Block; i: number }) {
  const runs = runsOf(c.events, c.p.address).slice(0, param(block, "limit"));
  return (
    <Block i={i} label="Recent runs">
      {runs.length ? <ul className="grid gap-3">{runs.map((r) => {
        const paid = r.outs.filter((o) => o.outcome === "paid" || o.outcome === "cosigned");
        const watching = r.outs.find((o) => o.outcome === "watching");
        return (
          <li key={r.run} className="grid gap-2">
            <div className="flex items-center gap-3">
              <span className={cn("grid size-10 place-items-center rounded-xl font-display text-[17px] font-semibold", r.asked ? "bg-vermillion-soft text-vermillion-ink" : "bg-fill")}>{r.run}</span>
              <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">{paid.length ? `Paid ${usd(r.paid)}` : watching ? `Watched · US$${watching.amount}` : "Nothing paid"}</span><span className="block text-[12px] text-muted">{day(r.at)} {hm(r.at)}{r.early ? " · ran early" : ""}{r.asked ? " · asked the owner" : ""}</span></span>
              <span className="flex -space-x-2">{paid.slice(0, 3).map((o, k) => <SellerLogo key={k} id={o.sellerId} name={c.seller(o.sellerId)} className="size-6 rounded-[8px] ring-2 ring-card" />)}</span>
            </div>
            {r.ignored.map((x, k) => <div key={k} className="flex gap-2.5 rounded-xl bg-tile p-3 text-[12px]"><ShieldCheck className="size-4 shrink-0 text-green-ink" {...I} aria-hidden /><span><b>{c.seller(x.sellerId)} tried to change this routine. Nothing changed.</b>{x.excerpt && <span className="block text-muted">“{cleanText(x.excerpt, 110)}”</span>}</span></div>)}
          </li>
        );
      })}</ul> : c.spec.routine ? <WhatNext c={c} /> : <EmptyHatch text="No runs yet." />}
    </Block>
  );
}

/** Before the first run (as on the phone): when it runs, who buys what, what it pays, where it lands, when it asks. */
function WhatNext({ c }: { c: Ctx }) {
  const rs = c.routine ?? c.spec.routine!;
  const at = c.routine?.nextAt ?? nextRuns(rs.cadence, c.now, 1)[0];
  const watch = rs.kind === "price-watch";
  const sellers = [...new Set(rs.items.map((x) => x.sellerId))];
  const total = rs.items.reduce((n, it) => n + Number(c.registry.find((s) => s.id === it.sellerId)?.items.find((i: { sku: string; price: string | null }) => i.sku === it.sku)?.price ?? 0), 0);
  const steps: [string, string, React.ReactNode?][] = [
    [`First ${watch ? "check" : "run"} ${day(at)} · ${hm(at)}`, cadenceText(rs.cadence)],
    [`${c.agent} ${watch ? "checks" : "buys"} ${rs.items.length === 1 ? c.item(rs.items[0].sellerId, rs.items[0].sku) : `${rs.items.length} items`}`, sellers.map((x) => c.seller(x)).join(" · "),
      <span className="flex -space-x-2">{sellers.slice(0, 3).map((x) => <SellerLogo key={x} id={x} name={c.seller(x)} className="size-6 rounded-[8px] ring-2 ring-card" />)}</span>],
    watch ? [`Buys only at US$${rs.limitPrice} or less`, "Above that, it only logs the price"] : [`Pays US$${total.toFixed(3).replace(/0$/, "")}`, "The sellers' listed prices"],
    [`Past US$${rs.allowance.amount} a ${rs.allowance.period}, ${c.agent} asks its owner`, "A co-signature, or it doesn't pay"],
  ];
  return (
    <ol aria-label="What happens next" className="grid">
      {steps.map(([t, sub, lead], k) => (
        <li key={k} className="relative flex gap-3 pb-4 last:pb-0">
          {k < steps.length - 1 && <span aria-hidden className="absolute left-[7px] top-5 bottom-0 w-0.5 bg-fill" />}
          <span aria-hidden className={cn("relative mt-1 grid size-4 shrink-0 place-items-center rounded-full border-2 bg-card", k === 0 ? "border-dashed border-ink" : "border-line")}>{k === 0 && <span className="size-1.5 rounded-full bg-vermillion" />}</span>
          <span className="min-w-0 flex-1"><span className={cn("block text-[15px]", k === 0 ? "font-bold" : "font-semibold")}>{t}</span><span className="block text-[12px] text-muted">{sub}</span></span>
          {lead}
        </li>
      ))}
    </ol>
  );
}

function Library({ c, block, i }: { c: Ctx; block: Block; i: number }) {
  const list = [...purchasesOf(c.events, c.p.address)].reverse().slice(0, param(block, "limit"));
  return (
    <Block i={i} label={c.spec.layout === "deal" ? "Bought below the limit" : "Bought"}>
      {list.length ? <ul className="divide-y divide-line">{list.map((x, k) => <li key={k} className="flex items-center gap-3 py-2.5"><SellerLogo id={x.sellerId} name={c.seller(x.sellerId)} /><span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-semibold">{short(c.item(x.sellerId, x.sku))}</span><span className="block text-[12px] text-muted">{c.seller(x.sellerId)} · {day(x.at)} {hm(x.at)}{x.cosigned ? " · co-signed" : ""}</span></span><span className="num text-[14px] font-semibold">{usd(x.amount)}</span></li>)}</ul> : <EmptyHatch text="Nothing bought yet." />}
    </Block>
  );
}

function Sources({ c, i }: { c: Ctx; i: number }) {
  const s = sourcesOf(c.events, c.p.address);
  return (
    <Block i={i} label="Sources" right={`${c.p.allowed.length} allowed`}>
      {s.length ? <ul className="grid gap-3">{s.map((x) => <li key={x.sellerId}><div className="mb-1.5 flex items-center gap-2.5 text-[14px]"><SellerLogo id={x.sellerId} name={c.seller(x.sellerId)} className="size-7 rounded-[9px]" /><span className="flex-1">{c.seller(x.sellerId)}</span><span className="text-[12px] text-muted">{x.count}×</span><span className="num font-semibold">{usd(x.amount)}</span></div><div className="relative h-2 overflow-hidden rounded-full bg-fill"><span aria-hidden className="hatch hatch-soft absolute inset-0" /><span className="relative block h-full rounded-full bg-ink" style={{ width: `${x.share * 100}%` }} /></div></li>)}</ul> : <p className="text-[14px] text-ink2">Nothing paid yet.</p>}
    </Block>
  );
}

function Renewals({ c, i }: { c: Ctx; i: number }) {
  const rows = c.routine ? renewalsOf(c.events, c.p.address, c.routine) : [];
  return (
    <Block i={i} label="Renewals" right={c.routine ? cadenceText(c.routine.cadence) : undefined}>
      <ul className="divide-y divide-line">{rows.map((r, k) => <li key={k} className="flex items-center gap-3 py-2.5"><SellerLogo id={r.sellerId} name={c.seller(r.sellerId)} /><span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-semibold">{short(c.item(r.sellerId, r.sku))}</span><span className="block text-[12px] text-muted">{c.seller(r.sellerId)} · renews {day(r.nextAt)}</span></span>{r.last ? <span className="text-right"><span className="num block text-[14px] font-semibold">{usd(r.last.amount)}</span><span className="block text-[12px] text-muted">last time</span></span> : <span className="text-[12px] text-muted">first renewal</span>}</li>)}</ul>
    </Block>
  );
}

function PriceChanges({ c, i }: { c: Ctx; i: number }) {
  const ch = priceChanges(c.events, c.p.address).slice(0, 4);
  return (
    <Block i={i} label="Price changes">
      {ch.length ? <ul className="grid gap-3">{ch.map((x, k) => { const up = x.to > x.from; return <li key={k} className="flex items-center gap-3"><SellerLogo id={x.sellerId} name={c.seller(x.sellerId)} /><span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-semibold">{short(c.item(x.sellerId, x.sku))}</span><span className="block text-[12px] text-muted">{usd(x.from)} → {usd(x.to)} · {day(x.at)}</span></span><span className={cn("rounded-full px-2.5 py-1 text-[12px] font-bold", up ? "bg-vermillion-soft text-vermillion-ink" : "bg-green-soft text-green-ink")}>{up ? "↑" : "↓"} {pct(x.pct).replace(/^[+−]/, "")}</span></li>; })}</ul> : <p className="text-[14px] text-ink2">No price has moved yet.</p>}
    </Block>
  );
}

function Savings({ c, i }: { c: Ctx; i: number }) {
  const s = savingsOf(c.events, c.p.address);
  return (
    <Block i={i} label="Saved">
      {s.count ? <><div className="flex items-end gap-2"><span className="num font-display text-[32px] font-medium leading-9 text-green-ink">{usd(s.saved)}</span><span className="pb-1 text-[14px] text-ink2">{Math.round((Number(s.saved) / Number(s.list)) * 100)}% off the first price</span></div><p className="mt-2 text-[12px] text-muted">{s.count === 1 ? "First price" : "First prices"} {usd(s.list)} · paid {usd(s.paid)}</p></> : <p className="text-[14px] text-ink2">{`Whatever ${c.agent} talks the price down by shows here.`}</p>}
    </Block>
  );
}

function Guard({ c, i }: { c: Ctx; i: number }) {
  const rs = c.spec.routine!;
  const rows: [string, "Contract" | "ChainBrain"][] = [
    [`Pay anyone but ${c.p.allowed.map((id) => c.seller(id)).join(", ")}`, "Contract"],
    [`Pay more than ${usd(c.p.cap)} at once`, "Contract"],
    [`Spend past US$${rs.allowance.amount} a ${rs.allowance.period} without the owner's cheque`, "ChainBrain"],
    ["Change its own schedule, sellers or limits, whatever a seller says", "ChainBrain"],
    ["Pay anything after the owner revokes the pocket", "Contract"],
  ];
  return (
    <Block i={i} label="Will never">
      <ul className="grid gap-2.5">{rows.map(([t, by], k) => <li key={k} className="flex items-center gap-2.5 text-[14px]"><Ban className="size-4 shrink-0 text-vermillion-ink" {...I} aria-hidden /><span className="flex-1">{t}</span><span className={cn("rounded px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide", by === "Contract" ? "bg-ink text-white" : "bg-blue-soft text-blue-ink")}>{by}</span></li>)}</ul>
      <p className="mt-3 text-[12px] text-muted">Contract: Pocket.sol refuses it on-chain. ChainBrain: the routine's fixed fields, checked before every payment.</p>
    </Block>
  );
}

function BlockView({ b, c, i }: { b: Block; c: Ctx; i: number }) {
  switch (b.type) {
    case "shelf": return <Shelf c={c} i={i} />;
    case "price-chart": return <PriceHero c={c} block={b} i={i} />;
    case "month-spend": return <MonthSpend c={c} i={i} />;
    case "ladder": return <Ladder c={c} i={i} />;
    case "budget": return <Budget c={c} i={i} />;
    case "next-run": return c.spec.routine ? <NextRun c={c} i={i} /> : null;
    case "runs": return <Runs c={c} block={b} i={i} />;
    case "library": return <Library c={c} block={b} i={i} />;
    case "sources": return <Sources c={c} i={i} />;
    case "renewals": return <Renewals c={c} i={i} />;
    case "price-changes": return <PriceChanges c={c} i={i} />;
    case "savings": return <Savings c={c} i={i} />;
    case "guard": return c.spec.routine ? <Guard c={c} i={i} /> : null;
    default: return null;
  }
}

export function PocketAppView({ address, back, watch }: { address: string; back(): void; watch(a: string): void }) {
  const { pockets, events, cfg, nameOf } = useNetwork();
  const p = pockets.find((x) => x.address.toLowerCase() === address.toLowerCase());
  const evs = events as Ev[];
  const spec = useMemo(() => appFromEvents(evs, address), [evs, address]);
  const routine = useMemo(() => routineFromEvents(evs, address), [evs, address]);
  if (!p) return <Empty icon={<Radio {...I} />} title="Pocket not found">It may be on another network, or not read yet.</Empty>;
  const a = agentOfKey(p.agent, cfg.agent);
  const app = spec ?? fallbackApp(nameOf(p.address));
  const names = new Map(cfg.sellers.map((s) => [s.id, s]));
  const c: Ctx = {
    spec: app, p: { ...p, name: nameOf(p.address) }, events: evs, routine, agent: a?.name ?? "The agent", now: Date.now(),
    seller: (id) => cleanText(names.get(id ?? "")?.name ?? id ?? "", 24),
    item: (sid, sku) => { const it = names.get(sid)?.items.find((x) => x.sku === sku) as { short?: string; description: string } | undefined; return it?.short ?? it?.description ?? sku; },
    registry: cfg.sellers,
  };
  const rs = app.routine;
  const line = rs
    ? rs.kind === "price-watch" ? `Checks ${cadenceText(rs.cadence).replace(/^Every /, "every ").toLowerCase()} · buys at US$${rs.limitPrice} or less` : `${cadenceText(rs.cadence)} · on its own inside US$${rs.allowance.amount} a ${rs.allowance.period}`
    : app.layout === "haggle" ? "Negotiates first, pays only what the owner allows" : "Buys when asked, inside the pocket's rules";
  return (
    <div className="fade-up">
      <button type="button" onClick={back} className="pressable mb-5 inline-flex h-11 items-center gap-2 rounded-full bg-card px-4 text-[14px] font-bold shadow-[inset_0_0_0_1.5px_var(--color-tile-stroke)] hover:bg-tile"><ArrowLeft className="size-4" {...I} aria-hidden />All pockets</button>
      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="grid content-start gap-4 lg:sticky lg:top-24">
          <FaceCard p={c.p} spec={app} agentId={a?.id} agentName={a?.name ?? "Agent"} />
          <div className="flex items-center gap-3">
            <AgentMark id={a?.id} />
            <div className="min-w-0 flex-1"><div className="font-display text-[18px] font-semibold">{a?.name ?? "Agent"}</div><div className="text-[13px] text-muted-canvas">{LAYOUT_NAME[app.layout]} · {line}</div></div>
            {rs && <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-card px-2.5 text-[12px] font-semibold"><span className={cn("size-2 rounded-full", routine?.status === "paused" ? "bg-faint" : "bg-green")} />{routine?.status === "paused" ? "Paused" : "Active"}</span>}
          </div>
          <Card className="p-4">
            <h3 className="mb-3 font-display text-[17px] font-semibold">Rules the owner signed</h3>
            <dl className="grid grid-cols-3 gap-2 text-[13px]">
              <div><dt className="text-muted">Cap</dt><dd className="num font-semibold">{usd(p.cap)}</dd></div>
              <div><dt className="text-muted">Asks above</dt><dd className="num font-semibold">{p.askAbove === NEVER || p.askAbove > p.cap ? "Never" : p.askAbove === 0n ? "Every time" : usd(p.askAbove)}</dd></div>
              <div><dt className="text-muted">Ends</dt><dd className="num font-semibold">{new Date(p.expiresAt * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</dd></div>
            </dl>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">{p.allowed.map((id) => <SellerLogo key={id} id={id} name={c.seller(id)} className="size-7 rounded-[9px]" />)}<span className="ml-1 text-[12px] text-muted">allowed</span></div>
            <p className="mt-3 text-[12px] text-muted"><AgentTag agentKey={p.agent} serverAgent={cfg.agent} /> holds its key. The screen above the rules is composed from {Object.keys(BLOCKS).length} fixed blocks; the rules are the contract's.</p>
          </Card>
          <button type="button" onClick={() => watch(p.address)} className="pressable inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-ink px-4 text-[15px] font-bold text-on-accent hover:bg-accent-press"><Clock className="size-4" {...I} aria-hidden />Watch it live<ChevronRight className="size-4" {...I} aria-hidden /></button>
        </aside>
        <section aria-label={`${nameOf(p.address)} pocket app`} className="grid content-start gap-4 lg:grid-cols-2">
          {app.blocks.map((b, k) => <BlockView key={b.type} b={b} c={c} i={k} />)}
        </section>
      </div>
      {!spec && <p className="mt-4 flex items-center gap-2 text-[12px] text-muted-canvas"><Check className="size-3.5" {...I} aria-hidden />This pocket was made without a sentence, so it shows the standard research desk.</p>}
    </div>
  );
}
