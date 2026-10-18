// The Brain page: the same living graph as the phone's Brain tab, at desk size (layout: shared/sim/brainGraph.ts). The brain
// in the middle, the agents round it, their pockets and the sellers those pockets may pay further out; edges curve and
// thicken with two weeks of payments, and that traffic runs along them. Every attempt (a payment, a refusal, an attack the
// pocket held) travels the graph as a pulse, newest first, and the side shows how it was decided, gate by gate, from its own
// events (ChecksPath, shared/sim/checks.ts). "Run a test" sends one real payment, or one the pocket's rules must refuse,
// through the same wallet tools on the built-in network. Every node, number and pulse is a real pocket, agent, seller or event.
import { useEffect, useMemo, useRef, useState } from "react";
import { Brain as BrainIcon, Ban, Loader2, Play, X } from "lucide-react";
import type { Attempt } from "@sim/checks";
import { agentByAddress } from "@sim/agents";
import { brainGraph, trafficOf, type GEdge, type GNode } from "@sim/brainGraph";
import { CLAUDE_SPARK, OPENAI_BLOSSOM, type Mark } from "../../../shared/brand/marks";
import { useNetwork, type TestMode } from "./network";
import { AttemptHeadline, ChecksPath, useReducedMotion } from "./ChecksPath";
import { SellerLogo, usd } from "./parts";
import { PageTitle } from "../seller/ui";
import { cn } from "../lib/cn";

const HOP = 0.55; // seconds per edge
const TONE = { paid: "#FFFFFF", stop: "#F04E23", fooled: "#9DCAFF", test: "#9DCAFF" } as const;
const bend = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: (a.x + b.x) / 2 - (b.y - a.y) * 0.16, y: (a.y + b.y) / 2 + (b.x - a.x) * 0.16 });
const ago = (at: number) => { const m = Math.round((Date.now() - at) / 60_000); return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };
const S = 1000; // the drawing's own units

type Pulse = { a: Attempt; path: string[]; tone: string };

export function Brain() {
  const { events, attempts, cfg, nameOf, listed, actions, follow } = useNetwork();
  const reduced = useReducedMotion();
  const sellerName = (id: string) => cfg.sellers.find((s) => s.id === id)?.name ?? id;
  const agentOf = (key?: string) => agentByAddress(key)?.id ?? "chainbrain";

  // the pockets worth drawing: live ones, the ten an agent touched last, kept in the order they were made so the graph
  // does not rearrange itself every time one of them is used
  const shown = useMemo(() => {
    const last = new Map<string, number>(), first = new Map<string, number>();
    events.forEach((e, k) => { if (!e.pocket) return; const a = String(e.pocket).toLowerCase(); last.set(a, e.at); if (!first.has(a)) first.set(a, k); });
    const recent = listed().filter((p) => !p.revoked).sort((a, b) => (last.get(b.address.toLowerCase()) ?? 0) - (last.get(a.address.toLowerCase()) ?? 0)).slice(0, 10);
    return recent.sort((a, b) => (first.get(a.address.toLowerCase()) ?? 0) - (first.get(b.address.toLowerCase()) ?? 0));
  }, [listed, events]);
  const payN = events.filter((e) => e.type === "payment").length;
  const memN = events.filter((e) => e.type === "trace" && (e as { phase?: string }).phase === "memory").length;
  const traffic = useMemo(() => trafficOf(events), [payN]); // eslint-disable-line react-hooks/exhaustive-deps
  const graph = useMemo(() => brainGraph({
    pockets: shown.map((p) => ({ address: p.address, agentId: agentOf(p.agent), allowed: p.allowed, name: nameOf(p.address) })),
    agentName: (id) => (id === "claude" ? "Claude" : id === "chatgpt" ? "ChatGPT" : "ChainBrain"), sellerName, memory: memN, traffic,
  }), [shown, traffic, memN, cfg]); // eslint-disable-line react-hooks/exhaustive-deps
  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);

  // every attempt on a drawn pocket, newest first, as a pulse along the edges it touched
  const pulses: Pulse[] = useMemo(() => attempts.filter((a) => a.pocket && byId.has(`pocket:${a.pocket.toLowerCase()}`)).slice(-14).reverse().map((a) => {
    const pk = `pocket:${a.pocket!.toLowerCase()}`;
    const agent = `agent:${agentOf(shown.find((p) => p.address.toLowerCase() === a.pocket!.toLowerCase())?.agent)}`;
    const seller = a.sellerId && byId.has(`seller:${a.sellerId}`) ? `seller:${a.sellerId}` : undefined;
    const path = a.verdict === "paid" && seller ? ["brain", agent, pk, seller] : ["brain", agent, pk];
    return { a, path: path.filter((n) => byId.has(n)), tone: a.aiFooled ? TONE.fooled : a.verdict === "paid" ? TONE.paid : TONE.stop };
  }), [attempts, byId, shown]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- the test
  // pockets a test can run on: one payment it allows and one seller it does not; not the one the story is playing on
  const testable = useMemo(() => {
    if (!actions.testPlan) return [];
    const ok = shown.filter((p) => actions.testPlan!(p.address, "pay") && actions.testPlan!(p.address, "refuse"));
    const free = ok.filter((p) => p.address.toLowerCase() !== follow?.toLowerCase());
    return free.length ? free : ok;
  }, [shown, actions, follow]);
  const [testPocket, setTestPocket] = useState<string>();
  useEffect(() => { if (!testPocket && testable[0]) setTestPocket(testable[0].address); }, [testPocket, testable]);
  const tp = testable.find((p) => p.address === testPocket) ?? testable[0];
  const [test, setTest] = useState<{ pocket: string; since: number; mode: TestMode; done?: boolean } | null>(null);
  const running = !!test && !test.done;
  const run = async (mode: TestMode) => {
    if (!tp || running || !actions.runTest) return;
    // the world's own clock (it can run ahead of this tab's): the test is everything after the last event so far
    const since = Math.max(0, ...events.map((e) => e.at)) + 1;
    setFocus(null);
    setTest({ pocket: tp.address, since, mode });
    await actions.runTest(tp.address, mode).catch(() => undefined);
    setTest({ pocket: tp.address, since, mode, done: true });
  };
  // the test's own attempt, once it lands
  const testAttempt = test ? [...attempts].reverse().find((a) => a.at >= test.since && a.pocket?.toLowerCase() === test.pocket.toLowerCase()) : undefined;

  // ---- the pulse on show
  const [i, setI] = useState(0);
  const [focus, setFocus] = useState<string | null>(null);
  const [hold, setHold] = useState(false);
  const newest = useRef(pulses[0]?.a.id);
  useEffect(() => { if (pulses[0] && pulses[0].a.id !== newest.current) { newest.current = pulses[0].a.id; setI(0); } }, [pulses]);
  const pinned = test?.done && testAttempt ? pulses.find((p) => p.a.id === testAttempt.id) : undefined;
  const cur = running ? undefined : pinned ?? pulses[i % Math.max(pulses.length, 1)];
  useEffect(() => {
    if (pulses.length < 2 || focus || hold || running || pinned) return;
    const t = setTimeout(() => setI((n) => (n + 1) % pulses.length), reduced ? 4000 : (cur?.path.length ?? 2) * HOP * 1000 + 1600);
    return () => clearTimeout(t);
  }, [i, pulses.length, focus, hold, running, pinned, reduced, cur?.a.id]);
  // a pinned test result lets go after a while
  useEffect(() => { if (!test?.done) return; const t = setTimeout(() => setTest(null), 12_000); return () => clearTimeout(t); }, [test?.done]);

  const testPath = running && test ? ["brain", `agent:${agentOf(shown.find((p) => p.address === test.pocket)?.agent)}`, `pocket:${test.pocket.toLowerCase()}`] : undefined;
  const steps = running && test ? liveSteps(events, test.pocket, test.since, sellerName) : [];
  const plan = tp && actions.testPlan ? { pay: actions.testPlan(tp.address, "pay"), refuse: actions.testPlan(tp.address, "refuse") } : null;
  const paid = attempts.filter((a) => a.verdict === "paid").length;
  const stopped = attempts.filter((a) => a.verdict !== "paid").length;
  const held = attempts.filter((a) => a.aiFooled).length;

  return (
    <div className="mx-auto max-w-[1440px]">
      <PageTitle title="Brain" sub="ChainBrain watching every payment your agents make, deciding each one in the open, and learning from it." />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="overflow-hidden rounded-[24px] bg-ink text-white" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)}>
          <div className="flex items-center justify-between gap-3 px-5 pt-4">
            <span className="inline-flex h-7 items-center gap-2 rounded-full bg-white/10 px-3 text-[11px] font-bold uppercase tracking-[0.14em]">
              <span className={cn("size-2 rounded-full motion-safe:animate-pulse", running ? "bg-blue" : "bg-green")} />{running ? "Testing" : "Live"}
            </span>
            <span className="num truncate text-[11px] font-bold uppercase tracking-[0.12em] text-white/55">{`${graph.nodes.filter((n) => n.kind === "agent").length} agents · ${shown.length} pockets · ${graph.nodes.filter((n) => n.kind === "seller").length} sellers · ${payN} payments`}</span>
          </div>
          <Graph nodes={graph.nodes} edges={graph.edges} byId={byId} pulse={cur} lit={testPath} reduced={reduced} focus={focus} onFocus={(id) => setFocus((f) => (f === id ? null : id))} />
          <div className="flex min-h-[72px] items-center gap-3 border-t border-white/10 px-5 py-3" aria-live="polite">
            {focus ? <FocusLine id={focus} byId={byId} edges={graph.edges} attempts={attempts} onClose={() => setFocus(null)} />
              : running ? <><Loader2 className="size-5 animate-spin text-blue" /><span className="text-[15px] font-semibold">{steps.at(-1) ?? "Starting the test…"}</span></>
              : cur ? <>
                <span className={cn("grid size-9 place-items-center rounded-[10px]", cur.a.verdict === "paid" ? "bg-white/10" : "bg-vermillion/20")}>{cur.a.verdict === "paid" ? <Play className="size-4" /> : <Ban className="size-4 text-vermillion" />}</span>
                <div className="min-w-0 flex-1"><div className="truncate text-[15px] font-semibold">{cur.a.headline}</div><div className="text-[12px] text-white/55">{`${nameOf(cur.a.pocket!)} · ${ago(cur.a.at)}`}</div></div>
                <span className={cn("rounded-full px-3 py-1 text-[12px] font-bold", cur.a.verdict === "paid" ? "bg-white/10" : "bg-vermillion/20 text-vermillion")}>{cur.a.verdict === "paid" ? "Paid" : cur.a.verdict === "blocked" ? "Blocked" : "Refused"}</span>
              </> : <span className="text-[14px] text-white/55">Waiting for the agents' first move</span>}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {plan?.pay && plan.refuse ? (
            <div className="card p-5" data-testid="brain-test">
              <div className="flex items-center justify-between gap-3">
                <div><div className="text-[17px] font-bold">Run a test</div><div className="text-[13px] text-muted">Real, on the test network. Watch every gate.</div></div>
                {testable.length > 1 && (
                  <select aria-label="Test pocket" value={tp!.address} disabled={running} onChange={(e) => setTestPocket(e.target.value)}
                    className="h-10 max-w-[200px] rounded-full bg-fill px-3 text-[13px] font-semibold">
                    {testable.map((p) => <option key={p.address} value={p.address}>{nameOf(p.address)} · {usd(p.balance)}</option>)}
                  </select>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" disabled={running} onClick={() => void run("pay")} aria-label={`Test a payment: pay ${plan.pay.seller} US$${plan.pay.price} from ${nameOf(tp!.address)}`}
                  className="pressable flex min-h-14 items-center gap-3 rounded-[16px] bg-ink px-4 text-left text-white disabled:opacity-60">
                  {running && test?.mode === "pay" ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                  <span><span className="block text-[15px] font-bold">{running && test?.mode === "pay" ? "Running…" : `Pay ${plan.pay.seller}`}</span><span className="block text-[12px] text-white/60">US${plan.pay.price} · on its list</span></span>
                </button>
                <button type="button" disabled={running} onClick={() => void run("refuse")} aria-label={`Test a refusal: try ${plan.refuse.seller}, not on ${nameOf(tp!.address)}'s list`}
                  className="pressable flex min-h-14 items-center gap-3 rounded-[16px] bg-card px-4 text-left shadow-[inset_0_0_0_1.5px_var(--color-vermillion)] disabled:opacity-60">
                  {running && test?.mode === "refuse" ? <Loader2 className="size-4 animate-spin" /> : <Ban className="size-4 text-vermillion" />}
                  <span><span className="block text-[15px] font-bold">{running && test?.mode === "refuse" ? "Running…" : `Try ${plan.refuse.seller}`}</span><span className="block text-[12px] text-muted">Not on its list</span></span>
                </button>
              </div>
              {running && steps.length ? <ol className="mt-4 space-y-1 text-[13px] text-ink2">{steps.map((s, k) => <li key={k} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-ink" />{s}</li>)}</ol> : null}
            </div>
          ) : null}
          <div className="grid grid-cols-3 gap-2">
            <Stat n={paid} label="Paid" />
            <Stat n={stopped} label="Stopped" tone="text-vermillion-ink" />
            <Stat n={held} label="Fooled agent, pocket held" tone="text-blue-ink" />
          </div>
        </div>
      </div>
      <div className="card mt-4 p-5" data-testid="brain-decided">
        <div className="mb-3 flex items-center justify-between"><div className="text-[17px] font-bold">{running ? "Deciding now" : "How it decided"}</div>{cur ? <span className="text-[12px] text-muted">{ago(cur.a.at)}</span> : null}</div>
        {cur ? <><AttemptHeadline a={cur.a} /><div className="mt-3"><ChecksPath attempt={cur.a} /></div></> : <ChecksPath />}
      </div>
    </div>
  );
}

/** What a test has done so far, from its own events: one line per step, in order. */
function liveSteps(events: { type: string; at: number; pocket?: string; [k: string]: any }[], pocket: string, since: number, sellerName: (id: string) => string): string[] {
  const out: string[] = [];
  for (const e of events) {
    if (e.at < since || String(e.pocket).toLowerCase() !== pocket.toLowerCase()) continue;
    if (e.type === "trace" && e.phase === "tool_call" && e.tool === "get_quote") out.push(`Asking ${sellerName(e.args?.sellerId)} for a quote`);
    else if (e.type === "trace" && e.phase === "tool_result" && e.tool === "get_quote" && e.result?.ok) out.push(e.result.allowedByPocket === "OK" ? `Pocket rules: allowed, US$${e.result.price}` : `Pocket rules: ${e.result.allowedByPocket?.reason ?? "refused"}`);
    else if (e.type === "radar" && e.kind === "screen") out.push(`Radar: risk ${Number(e.score) || 0}/10`);
    else if (e.type === "preflight" && e.kind === "predict") out.push(`Pre-flight predicts ${e.predicted?.outcome === "pays" ? "it pays" : "a refusal"}`);
  }
  return out;
}

function Stat({ n, label, tone }: { n: number; label: string; tone?: string }) {
  return <div className="card px-4 py-3"><div className={cn("num text-[26px] font-extrabold tracking-[-0.03em]", tone)}>{n}</div><div className="text-[12px] font-semibold text-muted">{label}</div></div>;
}

function FocusLine({ id, byId, edges, attempts, onClose }: { id: string; byId: Map<string, GNode>; edges: GEdge[]; attempts: Attempt[]; onClose(): void }) {
  const n = byId.get(id);
  if (!n) return null;
  const mine = n.kind === "pocket" ? attempts.filter((a) => a.pocket?.toLowerCase() === n.ref?.toLowerCase()) : n.kind === "seller" ? attempts.filter((a) => a.sellerId === n.ref) : [];
  const sub = n.kind === "pocket" || n.kind === "seller"
    ? `${mine.filter((a) => a.verdict === "paid").length} paid · ${mine.filter((a) => a.verdict !== "paid").length} stopped · ${edges.filter((e) => e.from === id || e.to === id).length} connections`
    : n.kind === "agent" ? `Holds ${edges.filter((e) => e.from === id).length} pockets` : n.kind === "brain" ? "Checks every payment against the pocket's rules, Radar and the Sentinel, then learns from it" : "A memory update";
  return (
    <>
      <div className="min-w-0 flex-1"><div className="truncate text-[15px] font-bold">{n.kind === "brain" ? "ChainBrain" : n.label || "Memory"}</div><div className="text-[12px] text-white/60">{sub}</div></div>
      <button type="button" onClick={onClose} aria-label="Close" className="pressable grid size-10 place-items-center rounded-full hover:bg-white/10"><X className="size-4" /></button>
    </>
  );
}

function AgentMark({ id, size = 34 }: { id: string; size?: number }) {
  const mark: Mark | undefined = id === "claude" ? CLAUDE_SPARK : id === "chatgpt" ? OPENAI_BLOSSOM : undefined;
  return (
    <span className={cn("grid place-items-center rounded-[10px]", mark ? "bg-white" : "bg-ink ring-1 ring-white/30")} style={{ width: size, height: size }}>
      {mark ? <svg width={size * 0.6} height={size * 0.6} viewBox={mark.viewBox} aria-hidden>{mark.paths.map((d, k) => <path key={k} d={d} fill={mark.fill} />)}</svg> : <BrainIcon className="text-white" style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={2} />}
    </span>
  );
}

function Graph({ nodes, edges, byId, pulse, lit, reduced, focus, onFocus }: {
  nodes: GNode[]; edges: GEdge[]; byId: Map<string, GNode>; pulse?: Pulse; lit?: string[]; reduced: boolean; focus: string | null; onFocus(id: string): void;
}) {
  const path = focus ? [] : lit ?? pulse?.path ?? [];
  const tone = lit ? TONE.test : pulse?.tone ?? TONE.paid;
  const on = new Set(path);
  const hot = (a: string, b: string) => path.some((p, k) => k > 0 && ((path[k - 1] === a && p === b) || (path[k - 1] === b && p === a)));
  const near = useMemo(() => { if (!focus) return null; const s = new Set([focus]); for (const e of edges) { if (e.from === focus) s.add(e.to); if (e.to === focus) s.add(e.from); } return s; }, [focus, edges]);
  const P = (id: string) => { const n = byId.get(id)!; return { x: n.x * S, y: n.y * S }; };
  const curve = (from: string, to: string) => { const a = P(from), b = P(to), q = bend(a, b); return `M${a.x},${a.y} Q${q.x},${q.y} ${b.x},${b.y}`; };
  const flows = edges.filter((e) => (e.traffic ?? 0) > 0).sort((a, b) => (b.traffic ?? 0) - (a.traffic ?? 0)).slice(0, 16);
  // the pulse's whole route as one path, so the browser moves the dot along every curve in one go
  const route = pulse && !lit && path.length > 1 ? path.map((id, k) => { if (k === 0) { const a = P(id); return `M${a.x},${a.y}`; } const a = P(path[k - 1]), b = P(id), q = bend(a, b); return `Q${q.x},${q.y} ${b.x},${b.y}`; }).join(" ") : "";
  const dur = (path.length - 1) * HOP;
  const end = path.length ? P(path[path.length - 1]) : { x: 0, y: 0 };
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[640px]">
      <svg viewBox={`0 0 ${S} ${S}`} className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <radialGradient id="brain-core" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#9DCAFF" stopOpacity="0.24" /><stop offset="0.45" stopColor="#9DCAFF" stopOpacity="0.05" /><stop offset="1" stopColor="#9DCAFF" stopOpacity="0" /></radialGradient>
          <filter id="brain-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" /></filter>
        </defs>
        <circle cx={S / 2} cy={S / 2} r={S / 2} fill="url(#brain-core)" />
        {[0.25, 0.42, 0.66, 0.9].map((r) => <circle key={r} cx={S / 2} cy={S / 2} r={(S / 2) * r} fill="none" stroke="white" strokeOpacity={0.07} strokeDasharray="3 9" />)}
        {edges.map((e) => {
          const h = hot(e.from, e.to), faded = near && !(near.has(e.from) && near.has(e.to));
          return <path key={`${e.from}>${e.to}`} d={curve(e.from, e.to)} fill="none" stroke={h ? tone : "white"} strokeLinecap="round"
            strokeOpacity={h ? 0.95 : faded ? 0.04 : near ? 0.4 : 0.13 + Math.min(e.traffic ?? 0, 10) * 0.025} strokeWidth={h ? 3.5 : 1.3 + Math.min(e.traffic ?? 0, 10) * 0.35} />;
        })}
        {edges.filter((e) => hot(e.from, e.to)).map((e) => <path key={`g:${e.from}>${e.to}`} d={curve(e.from, e.to)} fill="none" stroke={tone} strokeWidth={10} strokeOpacity={0.45} filter="url(#brain-glow)" />)}
        {!reduced && !near && flows.map((e, k) => (
          <circle key={`f:${e.from}>${e.to}`} r={3.2} fill="white" fillOpacity={0.8}>
            <animateMotion dur={`${Math.max(2.8 - Math.min(e.traffic ?? 0, 10) * 0.16, 1.2)}s`} begin={`${k * 0.23}s`} repeatCount="indefinite" path={curve(e.from, e.to)} />
          </circle>
        ))}
        {!reduced && route ? (
          <g key={pulse!.a.id}>
            <circle r={16} fill={tone} fillOpacity={0.35} filter="url(#brain-glow)"><animateMotion dur={`${dur}s`} fill="freeze" path={route} /></circle>
            <circle r={7} fill={tone}><animateMotion dur={`${dur}s`} fill="freeze" path={route} /></circle>
            <circle cx={end.x} cy={end.y} r={14} fill="none" stroke={tone} strokeWidth={3} opacity={0}>
              <animate attributeName="r" from="14" to="52" begin={`${dur}s`} dur="0.6s" fill="freeze" />
              <animate attributeName="opacity" values="0.9;0" begin={`${dur}s`} dur="0.6s" fill="freeze" />
            </circle>
          </g>
        ) : null}
      </svg>
      {nodes.map((n) => {
        const isLit = on.has(n.id), faded = !!near && !near.has(n.id), mine = focus === n.id;
        const label = n.kind === "agent" || n.kind === "seller" || (n.kind === "pocket" && (isLit || mine || !!near?.has(n.id))) ? n.label : "";
        return (
          <div key={n.id} className={cn("absolute -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200", faded && "opacity-20")} style={{ left: `${n.x * 100}%`, top: `${n.y * 100}%` }}>
            {n.kind === "memory" ? <span className="block size-2.5 rounded-full bg-blue motion-safe:animate-pulse" aria-hidden /> : (
              <button type="button" onClick={() => onFocus(n.id)} aria-label={`${n.kind === "brain" ? "ChainBrain" : n.label}, ${n.kind}`} className="pressable relative grid place-items-center rounded-full">
                {n.kind === "brain" ? (
                  <>
                    <span aria-hidden className="absolute size-[118px] rounded-full border-2 border-dashed border-blue/60 motion-safe:animate-[spin_9s_linear_infinite]" />
                    <span className={cn("grid size-[86px] place-items-center rounded-full bg-white", isLit && "ring-4 ring-blue")}><BrandTiles /></span>
                  </>
                ) : n.kind === "agent" ? (
                  <span className={cn("rounded-[13px] p-[3px]", isLit ? "bg-[var(--lit)]" : mine ? "bg-white" : "bg-white/35")} style={{ ["--lit" as string]: tone }}><AgentMark id={n.ref ?? "chainbrain"} size={40} /></span>
                ) : n.kind === "seller" ? (
                  <span className={cn("rounded-[14px] p-[3px]", isLit ? "bg-[var(--lit)]" : mine ? "bg-white" : "")} style={{ ["--lit" as string]: tone }}><SellerLogo id={n.ref!} name={n.label} className="size-10" /></span>
                ) : (
                  <span className="block size-6 rounded-full border-2 bg-white/90" style={{ borderColor: isLit ? tone : mine ? "white" : "rgba(255,255,255,0.4)", background: isLit ? tone : "#2A2B30" }} />
                )}
              </button>
            )}
            {label ? <span className={cn("pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap text-[12px] font-semibold", isLit || mine ? "text-white" : "text-white/55")}>{label}</span> : null}
          </div>
        );
      })}
    </div>
  );
}

/** ChainBrain's four tiles, small, for the graph's centre. */
function BrandTiles() {
  return (
    <svg viewBox="0 0 64 64" width={46} height={46} aria-hidden>
      <defs><pattern id="brain-hatch" patternUnits="userSpaceOnUse" width="7" height="7"><path d="M0,7 L7,0 M-1.75,1.75 L1.75,-1.75 M5.25,8.75 L8.75,5.25" stroke="#111215" strokeWidth="2.4" /></pattern></defs>
      <rect x="2" y="2" width="27" height="27" rx="2.5" fill="url(#brain-hatch)" /><rect x="35" y="2" width="27" height="27" rx="2.5" fill="#F04E23" />
      <rect x="2" y="35" width="27" height="27" rx="2.5" fill="#111215" /><rect x="35" y="35" width="27" height="27" rx="2.5" fill="url(#brain-hatch)" />
    </svg>
  );
}
