// Hidden auto-play for recording the video: plays scenes 1-8 on the phone by itself, the way the presenter would. It
// creates the Research pocket in the wizard, types each sentence, answers the one question, confirms tasks, slides to
// co-sign, holds to revoke, switches to One purchase, applies the fix and asks again. Every press goes through a
// target the screen registered (lib/autoplayTargets.ts), so what the camera sees is the real UI doing real work; the
// built-in network decides every outcome. Started and stopped by a long-press on the Agent header. No React Native
// imports: Node tests drive it with a fake host.
import { SCENES } from "../../../shared/sim";
import { hasTarget, pressTarget, setAutoplayRunning, type TargetName } from "./autoplayTargets";

export type HostState = {
  /** Approvals waiting for the owner on the active pocket. */
  pending: { id: string; kind: "intent" | "payment" | "question" }[];
  /** The agent is working on a message. */
  busy: boolean;
  activeName?: string;
  activeAddress?: string;
  pocketCount: number;
  /** Time of the newest settled payment on the owner's pockets (0 when none). */
  lastPaymentAt: number;
  /** Owner transactions so far (create, fund, revoke, return, rule edits). */
  ownerTxCount: number;
};
export type AutoplayHost = {
  navigate(path: "/" | "/agent"): void;
  state(): HostState;
  subscribe(f: () => void): () => void;
  /** Scene 5's on-chain backstop on this phone's network: the agent key signs the injected transfer; the pocket reverts it. */
  forceTransfer(pocket: string): Promise<unknown>;
  sleep(ms: number): Promise<void>;
  /** Pace multiplier: 1 natural, 0 instant (tests). */
  pace?: number;
};

class Cancelled extends Error {}
const text = (id: string) => SCENES.find((s) => s.id === id)!;

export type Autoplay = { start(): void; stop(): void; readonly running: boolean; done: Promise<void> | null };

export function createAutoplay(host: AutoplayHost, press: (name: TargetName, arg?: unknown, ms?: number) => Promise<boolean> = pressTarget): Autoplay {
  let token = 0;
  let running = false;
  const self: Autoplay = {
    get running() { return running; },
    done: null,
    start() {
      if (running) return;
      const tok = ++token;
      running = true; setAutoplayRunning(true);
      self.done = play(tok).catch((e) => { if (!(e instanceof Cancelled)) console.warn("auto-play stopped:", (e as Error).message); })
        .finally(() => { if (tok === token) { running = false; setAutoplayRunning(false); } });
    },
    stop() { token++; running = false; setAutoplayRunning(false); },
  };

  async function play(tok: number) {
    const pace = host.pace ?? 1;
    const alive = () => tok === token;
    const check = () => { if (!alive()) throw new Cancelled(); };
    const wait = async (ms: number) => { check(); await host.sleep(ms * pace); check(); };
    /** Resolves when `pred` holds (checked on every store change, and every 250 ms); throws on timeout or stop. */
    const until = (what: string, pred: (s: HostState) => boolean, ms = 30_000) => new Promise<void>((res, rej) => {
      check();
      if (pred(host.state())) return res();
      let done = false;
      const finish = (err?: Error) => { if (done) return; done = true; off(); clearInterval(iv); clearTimeout(t); if (err) rej(err); else res(); };
      const test = () => { if (!alive()) finish(new Cancelled()); else if (pred(host.state())) finish(); };
      const off = host.subscribe(test);
      const iv = setInterval(test, 250);
      const t = setTimeout(() => finish(new Error(`timed out waiting for ${what}`)), Math.max(ms * Math.max(pace, 0.05), 2000));
    });
    const tap = async (name: TargetName, arg?: unknown, ms = 8000) => { check(); const ok = await press(name, arg, ms); check(); return ok; };
    const must = async (name: TargetName, arg?: unknown, ms = 8000) => { if (!(await tap(name, arg, ms))) throw new Error(`${name} never appeared`); };

    /** Answers whatever the agent asks for until its turn is over (confirm the task, co-sign, nothing else). */
    async function drive() {
      await until("the agent to start", (s) => s.busy, 6000).catch(() => {});
      const handled = new Set<string>();
      for (;;) {
        check();
        const s = host.state();
        const p = s.pending.find((x) => x.kind !== "question" && !handled.has(x.id));
        if (p) {
          handled.add(p.id);
          await wait(p.kind === "payment" ? 1900 : 1500); // a beat to read the card or the sheet
          await must(p.kind === "payment" ? "approval.slide" : "intent.confirm");
          await until("the answer to land", (x) => !x.pending.some((y) => y.id === p.id), 10_000);
          continue;
        }
        if (!s.busy) return;
        await until("the agent to ask or finish", (x) => !x.busy || x.pending.some((y) => y.kind !== "question" && !handled.has(y.id)), 60_000);
      }
    }
    const say = async (t: string) => { await must("composer", { text: t }); await drive(); };

    // ---- scene 1: create and fund the Research pocket in the wizard, then the task with one question
    host.navigate("/");
    await wait(1800);
    const before = host.state().pocketCount;
    await must("home.newPocket");
    await wait(1200);
    await must("wizard.preset", "research");
    for (let i = 0; i < 8 && !hasTarget("wizard.create"); i++) { await wait(950); await must("wizard.continue"); }
    await wait(1400);
    await must("wizard.create");
    await until("the new pocket", (s) => s.pocketCount > before, 30_000);
    await wait(2200);
    await tap("wizard.open", undefined, 5000);
    await wait(1800);
    host.navigate("/agent");
    await wait(1500);
    await say(text("1").text);
    await until("the clarifying question", (s) => s.pending.some((p) => p.kind === "question"), 20_000);
    await wait(1800);
    await must("question.answer", "per report");
    await drive();
    await wait(3000);

    // ---- scene 4: refused, then re-plan
    await say(text("4").text);
    await wait(3000);

    // ---- scene 5: the injected order is ignored; then the fooled agent key's transfer reverts on-chain
    await say(text("5").text);
    await wait(2200);
    const pocket = host.state().activeAddress;
    if (pocket) await host.forceTransfer(pocket);
    await wait(3500);

    // ---- scene 6: data grab refused
    await say(text("6").text);
    await wait(3000);

    // ---- scene 7: revoke mid-task, then take the money back
    const paidBefore = host.state().lastPaymentAt;
    await must("composer", { text: text("7").text });
    const revoking = (async () => {
      await until("the first payment", (s) => s.lastPaymentAt > paidBefore, 60_000);
      await wait(1300);
      await must("revoke.open");
      await wait(700);
      await must("revoke.hold");
    })();
    await drive();
    await revoking;
    await until("the turn to end", (s) => !s.busy, 30_000);
    await wait(2200);
    if (await tap("return.open", undefined, 4000)) { await wait(1200); await tap("return.slide", undefined, 4000); await wait(2600); }

    // ---- scene 8: the One purchase pocket, a dead end, the one-tap fix, ask again
    await must("picker.open");
    await wait(900);
    await must("picker.pocket", "One purchase");
    await wait(1400);
    await say(text("8").text);
    await wait(2600);
    const txs = host.state().ownerTxCount;
    await must("deadend.fix");
    await wait(1200);
    await must("rules.slide");
    await until("the fix to be saved", (s) => s.ownerTxCount > txs, 30_000);
    await wait(2200);
    await tap("sheet.close", undefined, 2500);
    await wait(900);
    await must("deadend.askAgain");
    await drive();
    await wait(2500);
  }

  return self;
}
