// The ChainBrain explorer: every hash and address in the console opens here. Built-in and local-fork hashes are not on any
// FISCO chain the server reports, so they never get an explorer link; a real server links to its own /explorer.
// Pages: #explorer (blocks and latest transactions), #explorer/tx/0x…, #explorer/block/n, #explorer/address/0x….
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Copy, ExternalLink, Search, ShieldCheck } from "lucide-react";
import { blocksFrom, explainTx, txsOfAddress, hkdText, type ExplorerInput, type Field } from "@sim/explorer";
import { useNetwork } from "./useNetwork";
import { txLabel } from "./network";
import { AttemptHeadline, ChecksPath, CodePill } from "./ChecksPath";
import { Verdict, pocketStatus, hkd, NEVER } from "./parts";
import { explorerHref, searchTarget, type ExplorerRoute } from "./route";
import { ago } from "./liveRules";
import { KpiStrip, EmptyState, chip } from "./kit";
import type { ChainTx } from "./chain";
import { Button, Card, PageTitle, Pill, Section } from "../seller/ui";
import { REASONS, shortAddr, tokenSymbol } from "../shared";
import { cn } from "../lib/cn";
import { curSign } from "../shared";

const lc = (a?: string) => (a ?? "").toLowerCase();
const when = (at?: number) => (at ? new Date(at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : undefined);

const toInput = (t: ChainTx): ExplorerInput => ({
  hash: t.hash, block: t.block > 0n ? t.block : undefined, at: t.at, from: t.from, kind: t.kind, pocket: t.pocket, counterparty: t.counterparty, amount: t.amount,
  status: t.status, method: t.method, reason: t.reason, args: t.args, label: t.label,
});

/** Names and kinds for any address the explorer meets. */
function useWho() {
  const { cfg, pockets, nameOf } = useNetwork();
  return useMemo(() => {
    const kindOf = (a?: string): { name?: string; kind: "pocket" | "seller" | "owner" | "agent" | "ehkd" | "factory" | "other" } => {
      const l = lc(a);
      if (!l) return { kind: "other" };
      if (l === lc(cfg.token)) return { name: tokenSymbol(), kind: "ehkd" };
      if (l === lc(cfg.factory)) return { name: "PocketFactory", kind: "factory" };
      if (pockets.some((p) => lc(p.address) === l)) return { name: nameOf(a!), kind: "pocket" };
      const s = cfg.sellers.find((x) => lc(x.payTo) === l);
      if (s) return { name: s.name, kind: "seller" };
      if (l === lc(cfg.agent) || pockets.some((p) => lc(p.agent) === l)) return { name: "Agent key", kind: "agent" };
      if (pockets.some((p) => lc(p.owner) === l)) return { name: "Owner", kind: "owner" };
      return { kind: "other" };
    };
    return { kindOf, nameOf: (a?: string) => kindOf(a).name };
  }, [cfg, pockets, nameOf]);
}

function useChain() {
  const net = useNetwork();
  const who = useWho();
  const inputs = useMemo(() => {
    const seen = new Set<string>();
    return net.allTxs.filter((t) => (seen.has(lc(t.hash)) ? false : (seen.add(lc(t.hash)), true))).map(toInput);
  }, [net.allTxs]);
  const chainTx = useMemo(() => new Map(net.allTxs.map((t) => [lc(t.hash), t])), [net.allTxs]);
  const ctx = useMemo(() => ({ ehkd: net.cfg.token, factory: net.cfg.factory, nameOf: who.nameOf }), [net.cfg, who]);
  return { net, who, inputs, chainTx, ctx };
}

// ------------------------------------------------------------------ small pieces
function Crumbs({ here }: { here: string }) {
  return (
    <nav aria-label="Explorer" className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px]">
      <button type="button" onClick={() => history.back()} aria-label="Back" className="pressable mr-1 inline-flex h-11 items-center gap-1.5 rounded-[14px] bg-card px-4 font-bold text-ink shadow-[inset_0_0_0_1.5px_var(--color-tile-stroke)] hover:bg-tile"><ArrowLeft className="size-4" strokeWidth={2} aria-hidden />Back</button>
      <a href={explorerHref.home} className="font-bold text-ink hover:underline">Explorer</a><span className="text-faint" aria-hidden>›</span><span className="text-ink2">{here}</span>
    </nav>
  );
}

function CopyButton({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return <button type="button" onClick={() => void navigator.clipboard?.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1400); })} className="relative inline-flex items-center gap-1.5 text-[13px] font-bold text-ink before:absolute before:-inset-x-2 before:-inset-y-3 before:content-[''] hover:underline">{ok ? <Check className="size-4" /> : <Copy className="size-4" strokeWidth={1.75} />}{ok ? "Copied" : "Copy"}</button>;
}

function Addr({ address, full }: { address?: string; full?: boolean }) {
  const { who } = useChain();
  if (!address) return <span className="text-muted">–</span>;
  const k = who.kindOf(address);
  return (
    <span className="inline-flex min-w-0 flex-wrap items-baseline gap-x-2">
      {k.name && <span className="font-bold text-ink">{k.name}</span>}
      <a href={explorerHref.address(address)} className="num break-all text-ink underline decoration-line decoration-2 underline-offset-4 hover:decoration-vermillion">{full ? address : shortAddr(address)}</a>
    </span>
  );
}

function Rows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="divide-y divide-line text-[14px]">
      {rows.filter(([, v]) => v != null && v !== "").map(([k, v]) => (
        <div key={k} className="grid gap-x-6 gap-y-0.5 py-3 sm:grid-cols-[180px_1fr]"><dt className="text-muted">{k}</dt><dd className="min-w-0 break-words font-semibold">{v}</dd></div>
      ))}
    </dl>
  );
}

function FieldValue({ f }: { f: Field }) {
  if (f.kind === "address") return <Addr address={f.value} />;
  if (f.kind === "amount") { const t = hkdText(f.value); return <span className="num">{t ? `${curSign()}${t}` : f.value}</span>; }
  return <span className="num break-all">{f.value}</span>;
}

function StatusPill({ status }: { status: "success" | "reverted" }) {
  return status === "success" ? <Pill tone="mint"><Check className="mr-1 size-3.5" strokeWidth={2.5} aria-hidden />Success</Pill> : <Pill tone="negative">Reverted</Pill>;
}

function TxLine({ t }: { t: ChainTx }) {
  const { net, who } = useChain();
  const cp = t.counterparty;
  return (
    <div data-testid="explorer-tx-row" data-status={t.status ?? "success"} className="txline relative px-4 py-3.5 transition-colors hover:bg-tile sm:px-5">
      <a href={explorerHref.tx(t.hash)} aria-label={`${txLabel(t)} ${t.hash}`} className="absolute inset-0 z-0" />
      <span className="tl-pill pointer-events-none relative"><StatusPill status={t.status ?? "success"} /></span>
      <span className="tl-title pointer-events-none relative min-w-0 break-words text-[15px] font-bold leading-5 tracking-[-0.01em]">{txLabel(t)}{t.method && <span className="num ml-2 text-[12px] font-normal text-muted">{t.method}</span>}</span>
      <span className="tl-sub relative min-w-0 break-words text-[12px] leading-4 text-muted">
        <a href={explorerHref.address(t.pocket)} className="relative z-10 font-semibold text-ink underline decoration-line decoration-2 underline-offset-2 hover:decoration-vermillion">{net.nameOf(t.pocket)}</a>
        {cp && <> {t.kind === "payment" ? "to" : t.kind === "fund" ? "from" : "with"} <a href={explorerHref.address(cp)} className="relative z-10 font-semibold text-ink underline decoration-line decoration-2 underline-offset-2 hover:decoration-vermillion">{who.nameOf(cp) ?? shortAddr(cp)}</a></>}
        {t.block > 0n && <> · block {String(t.block)}</>}
      </span>
      <span className="tl-amount pointer-events-none relative num text-[16px] font-extrabold leading-5 tracking-[-0.02em]">{t.amount != null && t.amount > 0n ? hkd(t.amount) : ""}</span>
      <span className="tl-hash pointer-events-none relative num break-all text-[12px] leading-4 text-muted sm:text-right">{t.hash.slice(0, 10)}…{t.hash.slice(-6)}{t.at ? ` · ${ago(t.at)}` : ""}</span>
    </div>
  );
}

function SearchBox() {
  const [q, setQ] = useState("");
  const [bad, setBad] = useState(false);
  const go = (e: FormEvent) => { e.preventDefault(); const t = searchTarget(q); if (t) { setBad(false); location.hash = t.slice(1); setQ(""); } else setBad(!!q.trim()); };
  return (
    <form onSubmit={go} role="search" className="mb-5">
      <label className="card relative flex h-14 items-center rounded-[16px] pl-5 pr-2 focus-within:outline-2 focus-within:outline-ink">
        <Search className="mr-3 size-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
        <input aria-label="Search the explorer" value={q} onChange={(e) => { setQ(e.target.value); setBad(false); }} placeholder="Transaction hash, address or block number" spellCheck={false} autoCapitalize="off"
          className="num min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint" />
        <Button type="submit" className="h-10 rounded-[10px] px-5 text-[14px]">Search</Button>
      </label>
      {bad && <p role="alert" className="mt-2 pl-5 text-[13px] font-semibold text-vermillion-ink">That is not a transaction hash, an address or a block number.</p>}
    </form>
  );
}

// ------------------------------------------------------------------ pages
const FILTERS = [["all", "All"], ["payment", "Payments"], ["blocked", "Blocked"], ["rules", "Rules"]] as const;

function Home() {
  const { net, inputs } = useChain();
  const [f, setF] = useState<(typeof FILTERS)[number][0]>("all");
  const seen = new Set<string>();
  const all = [...net.allTxs].filter((t) => (seen.has(lc(t.hash)) ? false : (seen.add(lc(t.hash)), true))).sort((a, b) => (b.at ?? 0) - (a.at ?? 0) || Number(b.block - a.block));
  const match = (t: ChainTx, k: string) => k === "all" || (k === "blocked" ? t.status === "reverted" : t.kind === k);
  const rows = all.filter((t) => match(t, f)).slice(0, 40);
  const blocks = blocksFrom(inputs, 8);
  const blocked = all.filter((t) => t.status === "reverted").length;
  return (
    <div data-testid="explorer-home" className="fade-up">
      <PageTitle title="Explorer" sub={<>Every block and transaction on this network ({net.chainName.toLowerCase() === "test network" ? "a test network, no real money" : net.chainName}). Open a hash or an address to see what happened and which checks decided it.</>} />
      <SearchBox />
      <KpiStrip items={[
        { label: "Latest block", value: blocks[0]?.number ?? "–", note: `${net.chainName} · blocks with transactions` },
        { label: "Transactions", value: all.length, note: `${all.filter((t) => t.kind === "payment").length} agent payments` },
        { label: "Reverted by the pocket", value: blocked, note: blocked ? "Attacks the contract refused" : "None yet", accent: true, icon: <ShieldCheck className="size-4" strokeWidth={1.75} aria-hidden /> },
      ]} />
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)]">
        <section>
          <h2 className="mb-3 text-[22px] font-bold leading-7 tracking-[-0.02em]">Latest blocks</h2>
          <Card className="divide-y divide-line overflow-hidden">
            {blocks.length ? blocks.map((b) => (
              <a key={b.number} href={explorerHref.block(b.number)} data-testid="explorer-block-row" className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-tile sm:px-5">
                <span><span className="num block text-[16px] font-extrabold leading-5 tracking-[-0.02em]">Block {b.number}</span><span className="block text-[12px] leading-4 text-muted">{b.at ? ago(b.at) : ""}</span></span>
                <span className="num text-[13px] text-ink2">{b.txs.length} {b.txs.length === 1 ? "transaction" : "transactions"}</span>
              </a>
            )) : <EmptyState title="No blocks yet">Transactions appear here as they happen.</EmptyState>}
          </Card>
        </section>
        <section>
          <h2 className="mb-3 text-[22px] font-bold leading-7 tracking-[-0.02em]">Latest transactions</h2>
          <div role="tablist" aria-label="Filter transactions" className="chip-row -mx-4 mb-3 flex snap-x gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {FILTERS.map(([k, label]) => <button key={k} type="button" role="tab" aria-selected={f === k} onClick={() => setF(k)} className={chip(f === k)}>{label}<span className="num text-[12px] opacity-70">{all.filter((t) => match(t, k)).length}</span></button>)}
          </div>
          <Card className="divide-y divide-line overflow-hidden">{rows.length ? rows.map((t) => <TxLine key={t.hash} t={t} />) : <EmptyState title="No transactions here">Nothing matches this filter yet.</EmptyState>}</Card>
        </section>
      </div>
    </div>
  );
}

function TxPage({ hash, watch }: { hash: string; watch?(pocket: string): void }) {
  const { net, who, inputs, chainTx, ctx } = useChain();
  const input = inputs.find((t) => lc(t.hash) === lc(hash));
  const attempt = useMemo(() => net.attempts.find((a) => lc(a.tx) === lc(hash) || (a.txs ?? []).some((h) => lc(h) === lc(hash))), [net.attempts, hash]);
  if (!input) {
    return (
      <div data-testid="explorer-tx" data-found="false"><Crumbs here="Transaction" />
        <Card><EmptyState title="Transaction not found" action={<a href={explorerHref.home} className="font-bold text-ink underline hover:decoration-vermillion">Back to the explorer</a>}>This hash is not on {net.chainName} yet. It may still be arriving.<span className="num mt-2 block break-all text-[12px]">{hash}</span></EmptyState></Card>
      </div>
    );
  }
  const x = explainTx(input, ctx, inputs);
  const ex = x as typeof x & { revert?: string; rule?: string };
  const revert = ex.revert ?? (x.reason === "NOT_OWNER" ? "NOT_OWNER" : undefined);
  const rule = ex.rule ?? (ex.revert ? undefined : x.reason && x.reason !== "NOT_OWNER" ? x.reason : undefined);
  const t = chainTx.get(lc(hash));
  const blockN = x.block;
  const toKind = x.to ? who.kindOf(x.to) : undefined;
  return (
    <div data-testid="explorer-tx" data-found="true" data-status={x.status} className="fade-up">
      <Crumbs here="Transaction" />
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-3"><h1 className="title-serif text-[32px] leading-10 sm:text-[40px] sm:leading-[46px]">Transaction</h1><StatusPill status={x.status} /></div>
        {x.value && <p data-testid="tx-amount" className="mt-3 flex flex-wrap items-center gap-3"><span className="figure text-[40px] leading-[44px]"><span className="cur">{curSign()}</span>{x.value}</span>{x.status === "reverted" ? <Pill tone="warning">Did not move</Pill> : <Pill tone="neutral">Moved</Pill>}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1"><span className="num break-all text-[13px] text-ink2" data-testid="tx-hash-full">{hash}</span><CopyButton text={hash} /></div>
      </header>
      <Card className="p-5 sm:p-6">
        <p className="text-[20px] font-bold leading-7 tracking-[-0.02em] [overflow-wrap:anywhere]">{x.summary}</p>
        {x.status === "reverted" && (
          <div data-testid="explorer-revert" className="band-bad hatch relative mt-4 overflow-hidden rounded-[16px] p-1.5">
          <div className="rounded-[12px] bg-card px-4 py-3.5">
            <p className="flex flex-wrap items-center gap-2 text-[14px] font-bold text-ink"><ShieldCheck className="size-4 shrink-0 text-vermillion-ink" strokeWidth={2} aria-hidden />{revert ? <>Reverted: <CodePill code={revert} /></> : "Reverted on-chain"}</p>
            {revert && REASONS[revert] && <p className="mt-1 text-[14px] leading-5 text-ink2">{REASONS[revert]}</p>}
            {rule && <p className="mt-2 text-[14px] leading-5 text-ink">Pocket rule that failed (canPay): <CodePill code={rule} /><span className="text-ink2"> {REASONS[rule] ? `· ${REASONS[rule]}` : ""}</span></p>}
            <p className="mt-2 text-[13px] leading-5 text-muted">No money moved.</p>
          </div></div>
        )}
      </Card>

      {attempt && (
        <Section title="Which checks decided it">
          <Card className="p-4 sm:p-5"><ChecksPath attempt={attempt} /><div className="mt-4"><AttemptHeadline a={attempt} /></div></Card>
        </Section>
      )}

      <Section title="Overview">
        <Card className="px-5 sm:px-6">
          <Rows rows={[
            ["Status", <StatusPill key="s" status={x.status} />],
            ["Block", blockN ? <span key="b"><a href={explorerHref.block(blockN)} data-testid="tx-block-link" className="num font-bold text-ink underline decoration-line decoration-2 underline-offset-4 hover:decoration-vermillion">{blockN}</a><span className="font-normal text-muted"> · {net.chainName}</span></span> : undefined],
            ["Position in block", x.position != null ? <span key="p" className="num">{x.position}</span> : undefined],
            ["Time", x.at ? <span key="t">{when(x.at)} <span className="font-normal text-muted">· {ago(x.at)}</span></span> : undefined],
            ["From", x.from ? <Addr key="f" address={x.from} full /> : undefined],
            ["To (contract)", x.to ? <span key="to" className="inline-flex min-w-0 flex-wrap items-baseline gap-x-2"><span className="font-medium">{x.toName}</span><a href={explorerHref.address(x.to)} className="num break-all text-ink underline decoration-line decoration-2 underline-offset-4 hover:decoration-vermillion">{x.to}</a>{toKind?.kind === "pocket" && <span className="sr-only">pocket</span>}</span> : undefined],
            ["Value", x.value ? <span key="v" className="num">{curSign()}{x.value}</span> : undefined],
            ["Method", <span key="m" className="num rounded-full bg-tile px-2.5 py-1 text-[13px] font-bold shadow-[inset_0_0_0_1px_var(--color-tile-stroke)]">{x.method}</span>],
            ["Pocket", x.pocket ? <Addr key="pk" address={x.pocket} /> : undefined],
            ["Network", <span key="n">{net.chainName}{net.builtin || net.dev ? <span className="font-normal text-muted"> · no real money</span> : null}</span>],
          ]} />
        </Card>
      </Section>

      {x.args.some((a) => a.name !== "ok") && (
        <Section title="Input">
          <Card className="px-5 sm:px-6"><Rows rows={x.args.filter((a) => a.name !== "ok").map((a) => [a.name, <FieldValue key={a.name} f={a} />])} /></Card>
        </Section>
      )}

      <Section title={`Event logs${x.logs.length ? ` (${x.logs.length})` : ""}`}>
        {x.logs.length ? (
          <Card className="divide-y divide-line">
            {x.logs.map((l) => (
              <div key={l.index} data-testid="explorer-log" className="px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-baseline gap-x-2"><span className="num text-[12px] text-muted">#{l.index}</span><span className="text-[16px] font-bold tracking-[-0.01em]">{l.contractName}.{l.event}</span></div>
                {l.fields.length > 0 && <div className="mt-2"><Rows rows={l.fields.map((f) => [f.name, <FieldValue key={f.name} f={f} />])} /></div>}
              </div>
            ))}
          </Card>
        ) : <Card><p className="px-5 py-4 text-[14px] text-muted sm:px-6">{x.status === "reverted" ? "A reverted transaction emits no logs." : "This transaction emitted no logs."}</p></Card>}
      </Section>

      <div className="mt-6 flex flex-wrap gap-2">
        {net.explorer && <a href={net.explorer(hash)} target="_blank" rel="noreferrer noopener" className="pressable inline-flex h-11 items-center gap-2 rounded-[14px] bg-card px-5 text-[14px] font-bold text-ink shadow-[inset_0_0_0_1.5px_var(--color-tile-stroke)] hover:bg-tile">View on BaseScan<ExternalLink className="size-4" strokeWidth={1.75} aria-hidden /></a>}
        {watch && t?.pocket && <Button className="h-11 px-5 text-[14px]" onClick={() => watch(t.pocket)}>Watch it in Live</Button>}
      </div>
    </div>
  );
}

function BlockPage({ number }: { number: string }) {
  const { net, inputs } = useChain();
  const blocks = blocksFrom(inputs, 10_000);
  const i = blocks.findIndex((b) => b.number === number);
  const b = blocks[i];
  const newer = blocks[i - 1], older = blocks[i + 1];
  const chainTx = new Map(net.allTxs.map((t) => [lc(t.hash), t]));
  return (
    <div data-testid="explorer-block" data-found={b ? "true" : "false"} className="fade-up">
      <Crumbs here={`Block ${number}`} />
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3"><h1 className="title-serif text-[32px] leading-10 sm:text-[40px] sm:leading-[46px]">Block {number}</h1><Pill tone="neutral">{net.chainName}</Pill></div>
        <div className="flex gap-2">
          <a aria-disabled={!older} href={older ? explorerHref.block(older.number) : undefined} className={cn("pressable inline-flex h-11 items-center gap-1 rounded-[14px] bg-card px-4 text-[14px] font-bold shadow-[inset_0_0_0_1.5px_var(--color-tile-stroke)]", older ? "text-ink hover:bg-tile" : "pointer-events-none text-faint")}><ChevronLeft className="size-4" aria-hidden />Older</a>
          <a aria-disabled={!newer} href={newer ? explorerHref.block(newer.number) : undefined} className={cn("pressable inline-flex h-11 items-center gap-1 rounded-[14px] bg-card px-4 text-[14px] font-bold shadow-[inset_0_0_0_1.5px_var(--color-tile-stroke)]", newer ? "text-ink hover:bg-tile" : "pointer-events-none text-faint")}>Newer<ChevronRight className="size-4" aria-hidden /></a>
        </div>
      </header>
      {b ? (
        <>
          <Card className="px-5 sm:px-6"><Rows rows={[["Block number", <span key="n" className="num">{b.number}</span>], ["Time", b.at ? <span key="t">{when(b.at)} <span className="font-normal text-muted">· {ago(b.at)}</span></span> : undefined], ["Transactions", <span key="c" className="num">{b.txs.length}</span>], ["Network", net.chainName]]} /></Card>
          <Section title="Transactions in this block"><Card className="divide-y divide-line overflow-hidden">{b.txs.map((t) => { const c = chainTx.get(lc(t.hash)); return c ? <TxLine key={t.hash} t={c} /> : null; })}</Card></Section>
        </>
      ) : <Card><EmptyState title="No such block here">This network has no transactions in block {number}.</EmptyState></Card>}
    </div>
  );
}

function AddressPage({ address, watch }: { address: string; watch?(pocket: string): void }) {
  const { net, who, inputs, chainTx } = useChain();
  const k = who.kindOf(address);
  const pocket = net.pockets.find((p) => lc(p.address) === lc(address));
  // every transfer in or out of a pocket is a call to the eHKD contract, and every pocket comes from the factory: their pages list those
  const newest = (x: ExplorerInput, y: ExplorerInput) => (y.at ?? 0) - (x.at ?? 0) || Number(BigInt(y.block ?? 0) - BigInt(x.block ?? 0)); // chain logs carry no time
  // an agent key signs its pockets' payments but never submits them, so the chain's logs do not name it: list those payments
  const held = k.kind === "agent" ? new Set(net.pockets.filter((p) => lc(p.agent) === lc(address)).map((p) => lc(p.address))) : undefined;
  const via = k.kind === "ehkd" ? ["fund", "payment", "return", "out"] : k.kind === "factory" ? ["create"] : undefined;
  const list = via ? inputs.filter((t) => via.includes(t.kind)).sort(newest)
    : held ? [...new Map([...txsOfAddress(address, inputs), ...inputs.filter((t) => (t.kind === "payment" || t.kind === "out") && held.has(lc(t.pocket)))].map((t) => [lc(t.hash), t])).values()].sort(newest)
    : txsOfAddress(address, inputs);
  const names = new Map(net.cfg.sellers.map((s) => [s.id, s.name]));
  const received = k.kind === "seller" ? net.allTxs.filter((t) => t.kind === "payment" && lc(t.counterparty) === lc(address) && t.status !== "reverted").reduce((n, t) => n + (t.amount ?? 0n), 0n) : undefined;
  const KIND: Record<string, string> = { pocket: "Pocket contract", seller: "Seller", owner: "Owner", agent: "Agent key", ehkd: `${tokenSymbol()} token contract`, factory: "Pocket factory", other: "Address" };
  const st = pocket ? pocketStatus(pocket) : undefined;
  return (
    <div data-testid="explorer-address" data-kind={k.kind} className="fade-up">
      <Crumbs here={k.name ?? "Address"} />
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-3"><h1 className="title-serif text-[32px] leading-10 sm:text-[40px] sm:leading-[46px]">{k.name ?? "Address"}</h1><Pill tone="neutral">{KIND[k.kind]}</Pill>{st && <Verdict kind={st.kind}>{st.label}</Verdict>}</div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1"><span className="num break-all text-[13px] text-ink2">{address}</span><CopyButton text={address} /></div>
      </header>
      {pocket && (
        <Card className="px-5 sm:px-6">
          <Rows rows={[
            ["Balance", <span key="b" className="figure text-[24px]">{hkd(pocket.balance)}</span>],
            ["Cap per payment", <span key="c" className="num">{hkd(pocket.cap)}</span>],
            ["Asks the owner above", <span key="a" className="num">{pocket.askAbove === NEVER ? "Never asks" : pocket.askAbove === 0n ? "Every time" : hkd(pocket.askAbove)}</span>],
            ["Ends", <span key="e" className="num">{new Date(pocket.expiresAt * 1000).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>],
            ["Allowed sellers", pocket.allowed.map((i) => names.get(i) ?? i).join(", ") || "None"],
            ["Owner", <Addr key="o" address={pocket.owner} />],
            ["Agent key", <Addr key="g" address={pocket.agent} />],
          ]} />
        </Card>
      )}
      {received != null && <Card className="px-5 sm:px-6"><Rows rows={[["Received from agents", <span key="r" className="figure text-[24px]">{hkd(received)}</span>]]} /></Card>}
      {watch && pocket && <div className="mt-4"><Button className="h-11 px-5 text-[14px]" onClick={() => watch(pocket.address)}>Watch it in Live</Button></div>}
      <Section title={`Transactions (${list.length})`}>
        <Card className="divide-y divide-line overflow-hidden">{list.length ? list.map((t) => { const c = chainTx.get(lc(t.hash)); return c ? <TxLine key={t.hash} t={c} /> : null; }) : <EmptyState title="No transactions">Nothing on this network involves this address yet.</EmptyState>}</Card>
      </Section>
    </div>
  );
}

export function Explorer({ route, watch }: { route: ExplorerRoute; watch?(pocket: string): void }) {
  return (
    <div className="mx-auto max-w-[1040px] pb-10">
      {route.kind === "home" && <Home />}
      {route.kind === "tx" && <TxPage hash={route.hash} watch={watch} />}
      {route.kind === "block" && <BlockPage number={route.number} />}
      {route.kind === "address" && <AddressPage address={route.address} watch={watch} />}
    </div>
  );
}
