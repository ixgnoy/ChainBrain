import { Hono } from "hono";
import { keccak256, toHex, type Address, type Hex } from "viem";
import { validateRoutine, nextRun, available, type Routine, type RoutineSpec, type Cadence, type Period } from "../../shared/sim/pocketApp";
import { bus } from "./wallet/events";
import { tools } from "./wallet/tools";
import { approvals } from "./wallet/approvals";
import { newTask, state } from "./wallet/state";
import { prepareApproval } from "./wallet/pay";
import { pocket as P } from "./wallet/chain";
import { formatAmount, parseAmount } from "./wallet/money";
import { renderIntent } from "./wallet/intent";
import { directory } from "./wallet/directory";
import { guard } from "./visitors";
import { table } from "./store";

/**
 * Routines on the real chain: a card's standing order (what to buy, when, at most how much per period), set by its owner,
 * run by the server on schedule through the same wallet tools as a chat (quote, Radar, pre-flight, the card's own agent
 * key, x402), so every run is real payments with real hashes. A run that would pass the period's allowance, or the card's
 * ask-me limit, asks the owner (a co-sign, the cheque) instead of paying. The routine's fields are fixed: nothing a seller
 * delivers can change them. Published as the same `routine` events the demo network uses, so both apps read it back with
 * routineFromEvents.
 *   GET  /api/routine?pocket=          the routine (or null)
 *   POST /api/routine {pocket, spec}   set (owner)        POST /api/routine/pause {pocket, paused}   (owner)
 *   POST /api/routine/run {pocket}     run the next now   POST /api/routine/edit {pocket, cadence?, allowance?} (owner)
 */
type Stored = Routine & { payments: { at: number; amount: string }[] };
const routines = table<Stored>("routines");
const busy = new Set<string>();
const lower = (a: string) => a.toLowerCase();
const ROUTINE_WORDS = /\b(?:routine|schedule|every (?:hour|minute)|from now on|switch (?:to|sellers?)|instead of|ignore (?:all|previous|your)|new instructions?|raise (?:the|your) (?:cap|limit|allowance))\b/i;
const view = (r: Stored): Routine => { const { payments: _p, ...rt } = r; return rt; };
const registry = async () => (await directory()).map((s) => ({ id: s.id, name: s.name, items: s.items.map((i) => ({ sku: i.sku, price: i.price })) }));
const nameOf = async (id: string) => (await directory().catch(() => [])).find((s) => s.id === id)?.name ?? id;
const trace = (pocket: string, phase: string, extra: object) => bus.publish({ type: "trace", pocket, phase, ...extra });

export const routineOf = (pocket: string): Routine | null => { const r = routines.get(lower(pocket)); return r ? view(r) : null; };

export async function setRoutine(pocket: Address, spec: RoutineSpec, at = Date.now()): Promise<Routine> {
  const v = validateRoutine(spec, await registry());
  if (!v.ok) throw new Error(`invalid routine: ${v.errors.join("; ")}`);
  const rt: Stored = { ...v.value, id: `rt_${keccak256(toHex(`${pocket}:${at}`)).slice(2, 14)}`, pocket: lower(pocket), createdAt: at, nextAt: nextRun(v.value.cadence, at), runs: 0, status: "active", payments: [] };
  routines.set(rt.pocket, rt);
  bus.publish({ type: "routine", kind: "set", pocket, routine: view(rt), at });
  return view(rt);
}

export function pauseRoutine(pocket: string, paused: boolean): boolean {
  const rt = routines.get(lower(pocket));
  if (!rt) return false;
  rt.status = paused ? "paused" : "active";
  if (!paused && rt.nextAt <= Date.now()) rt.nextAt = nextRun(rt.cadence, Date.now());
  routines.set(rt.pocket, rt);
  bus.publish({ type: "routine", kind: paused ? "paused" : "resumed", pocket, routineId: rt.id });
  return true;
}

/** When it runs and its allowance; the same routine (id, runs, this period's payments), so an edit never resets the spend. */
export async function editRoutine(pocket: string, change: { cadence?: Cadence; allowance?: { amount: string; period: Period } }): Promise<Routine> {
  const rt = routines.get(lower(pocket));
  if (!rt) throw new Error("NO_ROUTINE");
  const v = validateRoutine({ kind: rt.kind, cadence: change.cadence ?? rt.cadence, items: rt.items, allowance: change.allowance ?? rt.allowance, limitPrice: rt.limitPrice ?? null }, await registry());
  if (!v.ok) throw new Error(`invalid routine: ${v.errors.join("; ")}`);
  rt.cadence = v.value.cadence; rt.allowance = v.value.allowance; rt.nextAt = nextRun(rt.cadence, Date.now());
  routines.set(rt.pocket, rt);
  bus.publish({ type: "routine", kind: "edited", pocket, routineId: rt.id, cadence: rt.cadence, allowance: rt.allowance, nextAt: rt.nextAt });
  return view(rt);
}

type Out = { sellerId: string; sku: string; outcome: "paid" | "cosigned" | "watching" | "declined" | "refused"; amount?: string; reason?: string; tx?: string };

/** One run, now (on schedule, or `early` for "run the next one now"). */
export async function runRoutine(pocket: Address, o: { early?: boolean } = {}) {
  const rt = routines.get(lower(pocket));
  if (!rt) return { ok: false as const, reason: "NO_ROUTINE" };
  if (rt.status !== "active") return { ok: false as const, reason: "ROUTINE_PAUSED" };
  if (busy.has(rt.pocket)) return { ok: false as const, reason: "BUSY" };
  const info = await P(pocket).info();
  if (info.revoked) {
    // a due run that can't happen is skipped, not queued: the schedule moves on and the screen says why
    if (!o.early && rt.nextAt <= Date.now()) { rt.nextAt = nextRun(rt.cadence, Date.now()); routines.set(rt.pocket, rt); bus.publish({ type: "routine", kind: "skipped", pocket, routineId: rt.id, reason: "POCKET_REVOKED", nextAt: rt.nextAt }); }
    return { ok: false as const, reason: "POCKET_REVOKED" };
  }
  busy.add(rt.pocket);
  try {
    const run = rt.runs + 1, scheduledFor = rt.nextAt, early = !!o.early && scheduledFor > Date.now();
    const allowance = parseAmount(rt.allowance.amount);
    bus.publish({ type: "routine", kind: "run-start", pocket, routineId: rt.id, run, scheduledFor, early });
    // the routine is the owner's standing, signed-off intent: each run is a confirmed task bounded by the card's cap
    newTask(pocket);
    const s = state(pocket);
    s.routine = { id: rt.id, run }; // the run's payments carry it, so the apps' period meter and renewals count them
    s.intent = {
      request: "routine", description: `Routine run ${run}`, maxPricePerItem: formatAmount(info.cap), maxTotal: formatAmount(info.cap * BigInt(rt.items.length)),
      maxItems: rt.items.length, deadline: new Date(Date.now() + 3_600_000).toISOString(), intentHash: keccak256(toHex(`routine:${rt.id}:${run}`)) as Hex, status: "confirmed",
    };
    trace(pocket, "thinking", { text: `Your routine's run ${run} is ${early ? "running early, at your request" : "due"}. Its fields are fixed; nothing a seller sends can change them.`, routine: rt.id });
    const ctx = { pocket };
    const outs: Out[] = [];
    for (const it of rt.items) {
      const q: any = await tools.get_quote.run(ctx, it);
      if (!q?.ok || !q.price) { outs.push({ ...it, outcome: "refused", reason: q?.reason ?? "QUOTE_UNKNOWN" }); continue; }
      const amount = parseAmount(q.price);
      if (rt.kind === "price-watch") {
        const limit = parseAmount(rt.limitPrice ?? "0");
        bus.publish({ type: "quote", pocket, routineId: rt.id, run, sellerId: it.sellerId, sku: it.sku, price: amount, limit, below: amount <= limit });
        if (amount > limit) { outs.push({ ...it, outcome: "watching", amount: q.price }); continue; }
      }
      // past the card's on-chain allowance (OVER_PERIOD) the card itself wants the owner's co-sign: ask, don't refuse
      const overPeriod = q.allowedByPocket !== "OK" && q.allowedByPocket.reason === "OVER_PERIOD";
      if (q.allowedByPocket !== "OK" && !overPeriod) { outs.push({ ...it, outcome: "refused", amount: q.price, reason: q.allowedByPocket.reason }); continue; }
      const left = available(allowance, rt.payments.map((p) => ({ at: p.at, amount: parseAmount(p.amount) })), rt.allowance.period, Date.now());
      let cosign = false;
      if (amount > left.left || q.needsOwnerApproval || overPeriod) {
        // over the period's allowance (or the card's ask-me limit): the owner co-signs this exact payment, or it isn't made
        const rec = s.quotes.get(q.quoteId)!;
        const after = left.spent + amount;
        const seller = await nameOf(it.sellerId);
        const a = approvals.create({
          pocket, kind: "payment",
          text: amount > left.left
            ? `Run ${run} of your routine: ${seller} costs ${"HK$"}${q.price}. That takes this ${rt.allowance.period} to HK$${formatAmount(after)}, past your HK$${formatAmount(allowance)} a ${rt.allowance.period}.`
            : overPeriod ? `Run ${run} of your routine: ${seller} costs HK$${q.price}, past the allowance this card holds on-chain.`
            : `Run ${run} of your routine: ${seller} costs HK$${q.price}, above your ask-me limit.`,
          data: {
            auth: prepareApproval(pocket, rec, s.intent!.intentHash), sellerId: it.sellerId, sku: it.sku, description: rec.description, amount: formatAmount(amount), intent: renderIntent(s.intent!),
            allowance: { routineId: rt.id, run, period: rt.allowance.period, allowance: formatAmount(allowance), spent: formatAmount(left.spent), after: formatAmount(after) },
          },
        });
        const res = await approvals.wait(a.id, Number(process.env.APPROVAL_WAIT_MS ?? 600_000));
        if (res.status !== "approved") { outs.push({ ...it, outcome: "declined", amount: q.price, reason: res.status === "timeout" ? "APPROVAL_EXPIRED" : "OWNER_DECLINED" }); continue; }
        rec.ownerSig = res.signature;
        cosign = true;
      }
      const p: any = await tools.pay.run(ctx, { quoteId: q.quoteId });
      if (!p?.ok) { outs.push({ ...it, outcome: "refused", amount: q.price, reason: p?.reason }); continue; }
      rt.payments.push({ at: Date.now(), amount: q.price });
      outs.push({ ...it, outcome: cosign ? "cosigned" : "paid", amount: q.price, tx: p.tx });
      const body = String(p.content ?? "");
      if (ROUTINE_WORDS.test(body)) {
        const line = body.split("\n").find((l) => ROUTINE_WORDS.test(l)) ?? "";
        bus.publish({ type: "routine", kind: "ignored", pocket, routineId: rt.id, run, sellerId: it.sellerId, excerpt: line.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 140) });
      }
    }
    rt.runs = run; rt.lastRunAt = Date.now();
    rt.nextAt = nextRun(rt.cadence, early ? scheduledFor : Date.now());
    routines.set(rt.pocket, rt);
    const after = available(allowance, rt.payments.map((p) => ({ at: p.at, amount: parseAmount(p.amount) })), rt.allowance.period, Date.now());
    const paid = outs.filter((x) => x.outcome === "paid" || x.outcome === "cosigned").reduce((n, x) => n + parseAmount(x.amount!), 0n);
    bus.publish({ type: "routine", kind: "run", pocket, routineId: rt.id, run, scheduledFor, early, outs, paid, spent: after.spent, allowance, period: rt.allowance.period, nextAt: rt.nextAt });
    const names = await Promise.all(outs.map(async (x) => ({ ...x, name: await nameOf(x.sellerId) })));
    trace(pocket, "reply", { text: `Run ${run}: ${names.map((x) => x.outcome === "watching" ? `${x.name} quotes HK$${x.amount}, above your HK$${rt.limitPrice} limit: not buying` : x.outcome === "paid" || x.outcome === "cosigned" ? `paid ${x.name} HK$${x.amount}${x.outcome === "cosigned" ? " (co-signed by you)" : ""}` : `${x.name} not paid (${x.reason ?? x.outcome})`).join("; ")}.`, routine: rt.id });
    return { ok: true as const, run, outs, paid: formatAmount(paid), spent: formatAmount(after.spent), nextAt: rt.nextAt };
  } finally { busy.delete(rt.pocket); }
}

/** Runs every routine whose time has come. */
export async function tickRoutines(now = Date.now()) {
  const due = routines.all().filter((r) => r.status === "active" && r.nextAt <= now);
  const out = [];
  for (const r of due) out.push(await runRoutine(r.pocket as Address).catch((e) => ({ ok: false as const, reason: String((e as Error).message).slice(0, 80) })));
  return out;
}

/** The scheduler in the API process: every ROUTINE_TICK_MS (30 s). */
export function startRoutines(): () => void {
  const t = setInterval(() => void tickRoutines(), Number(process.env.ROUTINE_TICK_MS ?? 30_000));
  return () => clearInterval(t);
}

export function routineRoutes() {
  const app = new Hono();
  app.get("/api/routine", (c) => c.json(routineOf(c.req.query("pocket") ?? "")));
  const body = async (c: any) => (await c.req.json().catch(() => ({}))) as Record<string, any>;
  app.post("/api/routine", async (c) => {
    const b = await body(c);
    const denied = await guard(c, b.pocket ?? "");
    if (denied) return denied;
    try { return c.json(await setRoutine(b.pocket, b.spec)); } catch (e) { return c.json({ error: "INVALID_ROUTINE", detail: (e as Error).message }, 400); }
  });
  app.post("/api/routine/pause", async (c) => {
    const b = await body(c);
    const denied = await guard(c, b.pocket ?? "");
    if (denied) return denied;
    return pauseRoutine(b.pocket, !!b.paused) ? c.json({ ok: true }) : c.json({ error: "NO_ROUTINE" }, 404);
  });
  app.post("/api/routine/edit", async (c) => {
    const b = await body(c);
    const denied = await guard(c, b.pocket ?? "");
    if (denied) return denied;
    try { return c.json(await editRoutine(b.pocket, b)); } catch (e) { return c.json({ error: (e as Error).message }, 400); }
  });
  app.post("/api/routine/run", async (c) => {
    const b = await body(c);
    const denied = await guard(c, b.pocket ?? "");
    if (denied) return denied;
    return c.json(await runRoutine(b.pocket, { early: true }));
  });
  return app;
}

/** Tests: forget every routine. */
export const resetRoutines = () => routines.reset();
