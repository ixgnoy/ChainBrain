/**
 * Links the phone's built-in network to the web console on the laptop. The phone (built-in mode) pushes its world's
 * events and a snapshot of its pockets and transactions; the console listens over SSE and shows them live. The
 * console's judge actions (plant text in a seller, force a transfer) go back to the phone as commands, and their
 * results come back with the phone's next push. One room: one phone and any number of consoles on this laptop.
 *
 *   POST /dev/relay/push     {device, events, snapshot, results?, cmdAfter}  ->  {ok, commands}
 *   GET  /dev/relay/stream   SSE: {kind:"hello"|"events"|"snapshot"|"result"|"reset", ...}
 *   GET  /dev/relay/state    {linked, device, lastSeen, snapshot, events}
 *   POST /dev/relay/command  {type:"plant", sellerId, text} | {type:"force", pocket} | {type:"hijack", pocket, text?} | {type:"say", text, preset?}  ->  {id}
 *                            ("say": the phone types `text` to its agent, on a pocket matching `preset` when given;
 *                             "hijack": assume the phone's AI is fooled by `text`: its agent key signs the attacker's transfer,
 *                             and the phone's pocket refuses it on-chain. The relay itself still never signs or approves.)
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { EventEmitter } from "node:events";

type Ev = { id?: string; at?: number; [k: string]: unknown };
type Cmd = { id: number; type: string; [k: string]: unknown };

const FRESH_MS = 15_000;

export function relayApp() {
  const app = new Hono();
  // changes every time this relay starts: a phone that sees a new epoch starts its command cursor over
  const epoch = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const em = new EventEmitter();
  em.setMaxListeners(100);
  let device = "";
  let events: Ev[] = [];
  const ids = new Set<string>();
  let snapshot: unknown = null;
  let lastSeen = 0;
  let cmds: Cmd[] = [];
  let nextCmd = 1;
  const send = (m: object) => em.emit("m", m);
  const linked = () => !!device && Date.now() - lastSeen < FRESH_MS;

  app.use("*", cors({ origin: "*" }));

  app.post("/push", async (c) => {
    const b = (await c.req.json().catch(() => ({}))) as { device?: string; from?: number; events?: Ev[]; snapshot?: unknown; results?: { id: number; result: unknown }[]; cmdAfter?: number };
    if (typeof b.device !== "string" || !b.device) return c.json({ error: "BAD_DEVICE" }, 400);
    if (b.device !== device) { // a new phone session (app reloaded), or this relay restarted: start over
      device = b.device; events = []; ids.clear(); cmds = [];
      send({ kind: "reset", device });
      // the phone sent only what is new since its last push: ask it for its whole history
      if (Number(b.from ?? 0) > 0) return c.json({ ok: true, resync: true, epoch, commands: [] });
    }
    lastSeen = Date.now();
    const fresh = (Array.isArray(b.events) ? b.events : []).filter((e) => e && typeof e === "object" && (!e.id || !ids.has(String(e.id))));
    for (const e of fresh) { if (e.id) ids.add(String(e.id)); events.push(e); }
    if (events.length > 3000) events = events.slice(-3000);
    if (fresh.length) send({ kind: "events", events: fresh });
    if (b.snapshot) { snapshot = b.snapshot; send({ kind: "snapshot", snapshot, lastSeen }); }
    for (const r of b.results ?? []) send({ kind: "result", id: r.id, result: r.result });
    const after = Number(b.cmdAfter ?? 0);
    cmds = cmds.filter((x) => x.id > after); // delivered and acknowledged
    return c.json({ ok: true, epoch, commands: cmds });
  });

  app.get("/state", (c) => c.json({ epoch, linked: linked(), device, lastSeen, snapshot, events }));

  app.get("/stream", (c) =>
    streamSSE(c, async (s) => {
      await s.writeSSE({ data: JSON.stringify({ kind: "hello", epoch, linked: linked(), device, lastSeen, snapshot, events }) });
      const on = (m: object) => void s.writeSSE({ data: JSON.stringify(m) });
      em.on("m", on);
      s.onAbort(() => void em.off("m", on));
      while (!s.aborted) { await s.sleep(5000); if (!s.aborted) await s.writeSSE({ data: JSON.stringify({ kind: "beat", linked: linked(), lastSeen }) }); }
    }));

  app.post("/command", async (c) => {
    const b = (await c.req.json().catch(() => ({}))) as { type?: string; [k: string]: unknown };
    if (b.type !== "plant" && b.type !== "force" && b.type !== "hijack" && b.type !== "say") return c.json({ error: "BAD_COMMAND" }, 400);
    if (!linked()) return c.json({ error: "NO_PHONE" }, 409);
    const cmd: Cmd = { ...b, id: nextCmd++, type: b.type };
    cmds.push(cmd);
    return c.json({ id: cmd.id });
  });

  return app;
}
