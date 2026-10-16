// Hidden auto-play for recording the video: plays scenes 1-11 on the phone by itself, the way the presenter would. It
// creates the Research pocket in the wizard, types each sentence, answers the one question, confirms tasks, slides to
// co-sign, holds to revoke (which also returns the money), switches to One purchase, applies the fix and asks again. Then
// the outside agents: it connects Claude (pairing link, consent, a new pocket), confirms Claude's task and co-signs its
// payment from the ask dock (the cheque). Scene 11 (haggler) runs on Premium reports; 9 (Radar) and 10 (Sentinel) on the
// scene-1 pocket, and the run closes on that pocket's Brain tab. Every press goes through a
// target the screen registered (lib/autoplayTargets.ts), so what the camera sees is the real UI doing real work; the
// built-in network decides every outcome. Started and stopped by a long-press on the Agent header. No React Native
// imports: Node tests drive it with a fake host.
import { ROUTINE_INJECTION, SCENES } from "../../../shared/sim";
import { ESCALATION_TEXT } from "../../../shared/sim/autopilot";
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
  /** Requests from outside agents (Claude, ChatGPT) waiting in the Approvals inbox, on any pocket. */
  outside?: { id: string; kind: "intent" | "payment" | "question"; agent?: string }[];
  /** Routine runs finished on the active pocket (pocket apps). */
  routineRuns?: number;
};
export type AutoplayHost = {
  navigate(path: "/" | "/agent" | "/brain"): void;
  state(): HostState;
  subscribe(f: () => void): () => void;
  /** Scene 5's on-chain backstop on this phone's network: the agent key signs the injected transfer; the pocket reverts it. */
  forceTransfer(pocket: string): Promise<unknown>;
  sleep(ms: number): Promise<void>;
  /** The red-team box on this phone's network: text a seller's next delivery carries (scene 12's rewrite attempt). */
  inject?(sellerId: string, text: string): void;
  /** Pace multiplier: 1 natural, 0 instant (tests). */
  pace?: number;
};

class Cancelled extends Error {}
const text = (id: string) => SCENES.find((s) => s.id === id)!;

export type Autoplay = { start(): void; stop(): void; readonly running: boolean; done: Promise<void> | null };

export function createAutoplay(host: AutoplayHost, press: (name: TargetName, arg?: unknown, ms?: number, alive?: () => boolean) => Promise<boolean> = pressTarget): Autoplay {
  let token = 0;
  let running = false;
  const self: Autoplay = {
    get running() { return running; },
    done: null,
    start() {
      if (running) return;
      const tok = ++token;
      running = true; setAutoplayRunning(true);
      const prev = self.done; // a press of a stopped run may still be finishing (typing): let it end first
      self.done = (prev ?? Promise.resolve()).then(() => play(tok)).catch((e) => { if (!(e instanceof Cancelled)) console.warn("auto-play stopped:", (e as Error).message); })
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
      let off: () => void = () => {};
      let iv: ReturnType<typeof setInterval> | undefined;
      let t: ReturnType<typeof setTimeout> | undefined;
      const finish = (err?: Error) => { if (done) return; done = true; off(); if (iv) clearInterval(iv); if (t) clearTimeout(t); if (err) rej(err); else res(); };
      const test = () => { if (!alive()) finish(new Cancelled()); else if (pred(host.state())) finish(); };
      iv = setInterval(test, 250);
      t = setTimeout(() => finish(new Error(`timed out waiting for ${what}`)), Math.max(ms * Math.max(pace, 0.05), 2000));
      off = host.subscribe(test);
      if (done) off();
    });
    const soft = (e: unknown) => { if (e instanceof Cancelled) throw e; }; // a wait that may time out, but never hides a stop
    const tap = async (name: TargetName, arg?: unknown, ms = 8000) => { check(); const ok = await press(name, arg, ms, alive); check(); return ok; };
    const must = async (name: TargetName, arg?: unknown, ms = 8000) => { if (!(await tap(name, arg, ms))) throw new Error(`${name} never appeared`); };

    /** Answers whatever the agent asks for until its turn is over (confirm the task, co-sign, nothing else). */
    async function drive() {
      await until("the agent to start", (s) => s.busy, 6000).catch(soft);
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
    await must("compose.manual"); // scene 1 walks the wizard; the pocket app made from a sentence is scene 12
    await wait(1000);
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
    await must("question.answer", "in total");
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

    // ---- privilege escalation: the agent refuses, and the agent key's setCap reverts NOT_OWNER on-chain
    await say(ESCALATION_TEXT);
    await wait(3000);

    // ---- scene 11 (haggler) on Premium reports: DataPro (fictional) prices in dollars, so it has its own pocket. The agent
    // negotiates its premium report down, numbers only (1.50 -> 1.10); still above that pocket's US$1 ask-me, so the owner co-signs
    await must("picker.open");
    await wait(900);
    await must("picker.pocket", "Premium reports");
    await wait(1400);
    await say(text("11").text);
    await wait(3500);

    // ---- back on the pocket made in scene 1 ("Research data · <date>"), which holds the rest of the story
    await must("picker.open");
    await wait(900);
    await must("picker.pocket", "Research data ·");
    await wait(1400);
    // ---- scene 9 (Radar): a drainer pays TradeWire on-chain; Radar scores it 9/10 and blocks it; the Radar screen shows why
    await say(text("9").text);
    await wait(2400);
    await tap("radar.open", undefined, 3000);
    await wait(3600);
    host.navigate("/agent");
    await wait(1500);
    // ---- scene 10 (Sentinel): the fooled agent keeps trying Harbour Wines; the Sentinel freezes this pocket on-chain.
    // This pocket now holds 1, 4, 5, 6, the escalation, 9 and 10: the Brain tab shows it at the end.
    await say(text("10").text);
    await wait(3500);

    // ---- scene 7 runs on the lived-in Research data pocket (this one is frozen): revoke mid-task, take the money back
    await must("picker.open");
    await wait(900);
    await must("picker.pocket", "Research data");
    await wait(1400);
    const paidBefore = host.state().lastPaymentAt;
    await must("composer", { text: text("7").text });
    const revoking = (async () => {
      await until("the first payment", (s) => s.lastPaymentAt > paidBefore, 60_000);
      await wait(1300);
      await must("revoke.open");
      await wait(700);
      await must("revoke.hold");
    })();
    revoking.catch(() => {}); // awaited below; never an unhandled rejection while drive() runs
    await Promise.all([drive(), revoking]);
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
    await wait(3000);

    // ---- outside agents: connect Claude, give it its own pocket, then answer it from the ask dock
    host.navigate("/");
    await wait(2200);
    if (await tap("home.connect", undefined, 5000)) {
      await wait(1600);
      await tap("connect.agent", "claude", 3000);
      await wait(1100);
      await must("connect.copy");
      await must("consent.allow", undefined, 15_000); // the consent sheet opens once Claude "opens" the link
      await wait(2400);
      await tap("consent.done", undefined, 6000);
      await wait(2600);
      // only requests that arrive after Claude was connected count (the seeded premium request may still be waiting)
      const seen = new Set((host.state().outside ?? []).map((x) => x.id));
      const claude = (kind: "intent" | "payment") => (s: HostState) => (s.outside ?? []).some((x) => x.agent === "claude" && x.kind === kind && !seen.has(x.id));
      await until("Claude's task", claude("intent"), 40_000).catch(soft);
      if (claude("intent")(host.state())) {
        host.navigate("/");
        await wait(2200); // the ask dock rises above the tab bar
        await must("dock.open", { agent: "claude", kind: "intent" });
        await wait(1500);
        await must("intent.confirm");
        await until("Claude's payment request", claude("payment"), 40_000).catch(soft);
        if (claude("payment")(host.state())) {
          await wait(2200);
          await must("dock.open", { agent: "claude", kind: "payment" }); // the card turns over to the cheque
          await wait(2600);
          const paidBefore = host.state().lastPaymentAt;
          await must("approval.slide");
          // let Claude's payment settle before the run closes on the Brain tab
          await until("Claude's payment settles", (s) => s.lastPaymentAt > paidBefore, 30_000).catch(soft);
          await wait(3200);
        }
      }
    }

    // ---- scene 12, pocket apps: one sentence makes a pocket with a routine. The proof card, then the app builds itself; slide
    // to create and the card flies into its app. Its routine runs now, twice, inside the week's US$0.05 (the second run's Exa
    // delivery tries to rewrite the routine: reported, nothing changes); the third would pass it, so its cheque is co-signed.
    host.navigate("/");
    await wait(2200);
    const before12 = host.state().pocketCount;
    await must("home.newPocket");
    await wait(1400);
    await must("compose.text", { text: text("12").text }, 15_000);
    await wait(5800); // the proof card, then the blocks fly in one after another
    await must("compose.create");
    await until("the pocket app", (s) => s.pocketCount > before12, 30_000);
    await wait(3200); // it opens by itself: the card flies into its own app
    await tap("compose.open", undefined, 1200);
    await wait(2600);
    const runs0 = host.state().routineRuns ?? 0;
    const runNow = async (n: number) => { await must("routine.runNow"); await until(`routine run ${n}`, (s) => (s.routineRuns ?? 0) >= runs0 + n, 40_000); await wait(2600); };
    await runNow(1);
    host.inject?.("exa", ROUTINE_INJECTION);
    await runNow(2);
    await must("routine.runNow");
    await until("the routine's cheque", (s) => s.pending.some((p) => p.kind === "payment"), 40_000);
    await wait(2400); // the cheque: this week's bar, the overage in vermillion
    await must("approval.slide");
    await until("routine run 3", (s) => (s.routineRuns ?? 0) >= runs0 + 3, 40_000);
    await wait(3400);

    // ---- close on the Brain tab for the pocket made in scene 1 ("Research data · <date>"): what the AI understood,
    // blocked, screened, froze and remembers, all in one place
    await must("picker.open");
    await wait(900);
    await must("picker.pocket", "Research data ·");
    await wait(1400);
    host.navigate("/brain");
    await wait(5000);
  }

  return self;
}
