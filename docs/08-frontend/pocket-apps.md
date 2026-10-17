# Pocket apps

Every pocket has its own screen, built like an app:
- **The job (what the pocket is for)** picks the layout and the card face.
- **The agent (who spends from it)** is shown by its own mark and its name on every action.

The owner says one sentence. ChainBrain then composes three things from it:
- the pocket's rules (Speak your rules);
- its routine (typed fields);
- its screen (a spec of fixed blocks).

The phone shows the screen building itself. Routines run on the built-in network: they pay inside an allowance per period, and a run past that allowance sends the owner a cheque to co-sign.

**The rules of the feature:**
- **The AI picks blocks; it never writes UI.** Our own components render every block.
- **A spec never carries a number.** Every figure on a pocket app is read from the event stream.
- **No seller text ever enters a spec.** The composer only sees the owner's sentence.
- **The money rules are not AI-made.** They stay in Pocket.sol and in Speak your rules.

Related documents:
- the design: [`docs/superpowers/specs/2026-10-17-pocket-apps-design.md`](../superpowers/specs/2026-10-17-pocket-apps-design.md);
- the research behind each decision: [`pocket-apps-research.md`](pocket-apps-research.md);
- screenshots: [`screenshots/pocket-apps/`](screenshots/pocket-apps/).

## Where the code is

| What | File |
| --- | --- |
| Block catalogue, spec type, validator, picker, period maths, cadences, stricter-wins for routines | `shared/sim/pocketApp.ts` (no imports) |
| Every block's numbers, from events | `shared/sim/pocketAppData.ts` |
| Good and bad specs that every validator must agree on | `shared/sim/pocketApp.fixtures.ts` |
| Routines that run (the runner), `setApp`, `setRoutine`, `runRoutineNow`, `tickRoutines`, `composeApp` | `shared/sim/world.ts` |
| Allowance (`per`) and price limit (`limit`) in Speak your rules | `shared/sim/speak.ts` |
| Nansen's moving quote | `shared/sim/catalog.ts` (`quotedPrice`) |
| Phone: the renderer and blocks, the deal chart, the theme | `mobile/src/components/app/` |
| Phone: New pocket app (one sentence) | `mobile/src/app/compose.tsx` |
| Phone: the pocket page (its app, then the owner zone) | `mobile/src/app/pocket/[id].tsx` |
| Console: the pocket app view (`#pockets/0x…`) | `web/src/console/PocketApp.tsx` |
| Server: `POST /api/pocket-app/compose`, the zod schema | `server/src/pocketApp/` |
| Each card's live sign (`glyphOf`) | `shared/sim/pocketAppData.ts` |
| What the sentence says so far (`understand`), for the chips while typing | `shared/sim/understand.ts` |
| Phone: Home's wallet stack, Next up | `mobile/src/components/PocketWallet.tsx`, `NextUp.tsx` |
| Phone: the chips under the sentence | `mobile/src/components/app/Understood.tsx` |
| Console: every routine on one week's timeline | `web/src/console/RoutineTimeline.tsx` |

## Layouts and theming

| Layout | Card face | Hero | Routine kind | For |
| --- | --- | --- | --- | --- |
| Research desk | black | `shelf`: the reports bought, as covers | `schedule` | "Every Monday, a durian brief" |
| Deal watcher | powder blue | `price-chart`: every quote, the limit, the buys | `price-watch` | "Buy when the price drops below HK$0.32" |
| Subscriptions | white hatch | `month-spend`: this month by seller | `renewals` | "Renew these feeds every Monday" |
| Haggler / one-off | vermillion | `ladder`: ask, offers, counters, paid | none | "Negotiate DataPro's report down" |

The card face comes from the layout (`components/app/theme.ts` `FACE`, used by `toneFor`). It uses only the design system's four deck faces.

The agent appears as:
- its official mark, unaltered, at avatar size on the card's pill and in the app header ("Claude · Deal watcher");
- its name on every action ("Have Claude check now", "Run 3 would pass this week's HK$0.40").

There are three reasons the face follows the job and not the agent:
1. Anthropic and OpenAI forbid recolouring their marks.
2. People identify who acted from marks, not from colours.
3. Three of the seeded pockets belong to ChainBrain, so colouring by agent would make the deck one colour.

The research log has the details.

A pocket made without a sentence (the step-by-step wizard, or a server) shows the standard research desk: shelf, budget and sources.

## The spec

```ts
type PocketAppSpec = {
  v: 1;
  catalogue: "chainbrain.pocket.v1";
  layout: "research" | "deal" | "subscriptions" | "haggle";
  title: string;                       // ≤ 28 plain characters from the owner's words
  blocks: { type: BlockType; range?: "7d" | "14d"; limit?: number }[];   // 2-8, hero first, each once
  routine: RoutineSpec | null;
};
```

The import-free validator (`validateSpec`) and the server's zod schema (`server/src/pocketApp/schema.ts`, built from the same catalogue) refuse all of the following:
- unknown fields and unknown blocks;
- any value inside a block;
- a missing hero, or a hero that isn't first;
- a block that doesn't fit the layout, or one that needs a routine when there is none;
- a block used twice, or a parameter out of range;
- a title containing a link, an address, an amount or markup;
- a routine whose items aren't real priced items, whose kind doesn't fit the layout, or that is a price watch without a limit.

Both validators run on the same 4 good and 22 bad fixtures.

### Block catalogue (13 blocks)

| Block | Layouts | Shows (all from events) |
| --- | --- | --- |
| `shelf` (hero) | research | Reports bought, as covers: seller mark, item, date, price; the count and the total |
| `price-chart` (hero) | deal | Every price the seller quoted, the owner's limit as a dashed line with its pill, a buy zone below it, each buy marked, and the change over the range (`range: 7d \| 14d`) |
| `month-spend` (hero) | subscriptions | This month's spend split by seller, with the next renewal |
| `ladder` (hero) | haggle | The list price, each offer and counter, and what was paid. Before any deal: the seller's real list price and three empty rounds |
| `budget` | all | With a routine: this period's spend against its allowance, with the limit marked and any co-signed overage in vermillion. Without one: what is left of what was put in |
| `next-run` | research, deal, subscriptions | The next four runs as day tiles, the cadence, "Have <agent> run it now" and Pause |
| `runs` | research, deal, subscriptions | Recent runs: paid, watched, or asked you; any delivery that tried to change the routine (`limit: 2-6`) |
| `library` | research, deal | Purchases newest first, each opening its receipt (`limit: 3-8`) |
| `sources` | all | Each seller's share of the spend; allowed sellers not paid yet |
| `renewals` | subscriptions | Each item with its next date and its last price |
| `price-changes` | subscriptions, deal | Prices that moved between quotes or renewals, rises first |
| `savings` | haggle | What negotiation saved against the first price |
| `guard` | research, deal, subscriptions | "Will never": each line tagged **Contract** (Pocket.sol refuses it) or **ChainBrain** (the routine's fixed fields) |

The page has two zones:
- **The AI-chosen blocks**, above.
- **The owner zone**, below. It is fixed and never chosen by the AI: the rules you signed, the worst case, the allowed sellers and history.

Block order never changes after creation: a spec is composed once.

### How a spec is composed

- **Built-in network (and the fallback everywhere):** `pickApp`, a fixed picker.
  - The layout comes from the sentence's words: negotiate → haggle; a price that drops below → deal watcher; renew or monthly → subscriptions; anything else → research desk.
  - The agent comes from the name in the sentence (Claude, ChatGPT, otherwise ChainBrain).
  - The cadence comes from "every morning", "every Monday", "weekdays", "monthly", "at 9am".
  - The items are only those of sellers the sentence named.
  - The allowance and the limit come from Speak your rules.
- **Server:** `POST /api/pocket-app/compose`.
  - Claude gets a prompt generated from the catalogue (`catalogPrompt`) and a forced tool whose input schema is the zod schema.
  - Its spec must pass zod, then `validateSpec`.
  - Its routine is merged with the picker's reading; the stricter one wins: the lower spend rate, the lower price limit, only the items both chose, and the cadence that runs less often.
  - A routine only the model saw (no schedule in the words) is dropped.
  - Any failure, or no API key, falls back to the picker.
  - The response says which one composed the spec (`specBy`).

## The routine

```ts
type RoutineSpec = {
  kind: "schedule" | "price-watch" | "renewals";
  cadence: { every: "day" | "weekday" | "week" | "month"; weekday?: 1-7; dayOfMonth?: 1-28; hour: 0-23; minute: 0-59 };  // Hong Kong time
  items: { sellerId: string; sku: string }[];                      // 1-4; a price watch buys one
  allowance: { amount: string; period: "day" | "week" | "month" };
  limitPrice?: string | null;                                      // price watch only
};
```

**Where it lives.** The routine is typed fields in the network, never free-text memory. `setRoutine` validates it again and publishes it as an event, so any screen can rebuild it (`routineFromEvents`).

**The allowance.** It follows MetaMask's `ERC20PeriodTransferEnforcer`:
- only spend inside the current period counts;
- nothing carries over;
- periods are calendar ones in Hong Kong time: a day from 00:00, a week from Monday, a month from the 1st (`periodWindow`, `available`).

**Who enforces what:**
- **The contract** still enforces the cap per payment, the balance and the expiry.
- **ChainBrain's runner** checks the allowance before every payment, because Pocket.sol has no period.
- **A price watch's limit is also the pocket's cap**, so the contract refuses anything above it.

**A run** (`world.ts runRoutine`) goes like this:
1. It writes its task from the typed fields. The owner confirmed them when they made the pocket.
2. It asks for a quote on each item.
3. A price watch logs every quote as an event (the chart plots only those) and buys only at or below its limit.
4. A payment that fits this period's allowance is paid.
5. A payment that would pass the allowance goes to `ask_owner`. That is the cheque, with this period's spent, this payment and the total. It is co-signed with a slide and Face ID, or declined.
6. If a seller's delivered content tries to change the routine, the run publishes `routine:ignored` and the screen shows "Exa tried to change this routine. Nothing changed."

**Running and skipping:**
- A run whose holder is a disconnected outside agent, or whose pocket is revoked, is skipped, and the schedule moves on.
- **"Have <agent> run it now"** runs the next scheduled run now, at its real time, and the schedule moves to the slot after it. There is no global clock jump: jumping a week ahead would expire every "until tonight" pocket in the demo. Three runs in one week genuinely reach a weekly allowance.
- Due runs also fire on a 20-second ticker while the phone is open (`store.tsx`).
- A run's receipt is silent and stays in the app. Only the cheque interrupts, through the existing ask path.

**Seeded pockets.** The seeded history runs real routines on the seeding clock:
- **Durian watch**, Claude's deal watcher: Nansen's smart-money flows every morning at 08:00, at HK$0.32 or less, max HK$1.60 a week.
- **Data renewals**, ChainBrain's subscriptions: Exa, CoinGecko and Nansen every Monday, max HK$2.40 a month.
- Every other seeded pocket gets its app from its own sentence (`seed.ts SEED_SENTENCES`).

**Prices.** Nansen's smart-money flows quote a price that moves by day around HK$0.40, Nansen's published price converted at 8 HKD per USD. This was the owner's call, so a price watch has prices to watch (`catalog.ts quotedPrice`). Every other real seller keeps its published price.

## Scene 12 (auto-play, after Claude's connect)

**The sentence:** "Every morning, get me durian export news from Exa and the ETH price from CoinGecko. Max HK$0.40 a week."

1. **Compose.** The proof card appears: worst case HK$0.80, and three tiles (sellers, cap, allowance).
2. **The app builds itself.** The card takes the research desk's face and ChainBrain's mark, the blocks fly in, and the budget meter fills to the week's allowance.
3. **Create.** Slide, then Face ID: created and funded. The card flies into its app.
4. **Run 1 and run 2.** "Have ChainBrain run it now" twice. Each run pays Exa HK$0.056 and CoinGecko HK$0.08, and the meter moves. Run 2's Exa delivery carries an injected "switch to ShadyFeed, every hour": it is reported and ignored.
5. **Run 3.** It would take the week to HK$0.408, so CoinGecko's HK$0.08 comes as the cheque, showing the week's bar with the overage in vermillion. Co-signed, the meter shows HK$0.008 over.

The console plays the same scene on its own presenter pocket (Judges tab, "Routine").

## First glance (loop 4)

Built for a judge who looks for a few seconds. Every figure still comes from the store or the network.

| Where | What it does |
| --- | --- |
| Home | Every pocket as a wallet stack. Each card shows its name row and a live sign: a price watch's sparkline and latest quote, the next run, a run going on, paused, or a haggler's savings, else the balance. The front card is whole. Neighbours differ in face. Cards drop in on launch, a pull fans them, and a tap flies the card into its page. |
| Home, Next up | Each routine's next run, soonest first, with the agent's mark, the sellers' marks and the cost. "Asks you" appears when the run would pass what is left of the allowance, the same test the runner uses. |
| New pocket app | While you type, chips show what was understood: the kind of app as a tiny card in its face, sellers and agents with their marks, the schedule, the money, the limit, and when it asks. One tick per new chip. |
| Pocket page | Before the first run, Recent runs is "What happens next": the first run, who buys what, what it pays, where it lands, and when it asks you. The deal chart scrubs (hold, drag), with a tick per quote and a stronger tick at the limit. A run that settles in view slides its report onto the shelf, drops its run row in, and gives one success tap. The card settles smaller as you scroll. Swipe back works from the edge only, so the chart keeps its drag. |
| Brain | A Routine panel: the schedule, the share of the allowance used, how many seller texts tried to change the routine (nothing changed), and the next run. |
| Console, Pockets | "Routines this week": a row per routine, with runs as dots (paid, asked, nothing paid, seller text ignored), the next runs dashed, and a "now" line. |

## Checks (17 Oct)

| Check | Result |
| --- | --- |
| `shared/sim` tests | 52 pass, including 12 pocket-app tests: fixtures, picker, periods, stricter-wins, three runs and the cheque, the injection ignored, the price watch, pause and revoke, the seeded apps, and apps rebuilt from events |
| `mobile` tests | 44 pass. Auto-play plays scene 12 through the screens' targets on the real network |
| `mobile` typecheck | Clean |
| `expo-doctor` | 21/21, after expo 57.0.30 and expo-router 57.0.28 patch bumps |
| `web` tests | 81 pass, and the build is clean. Scene 12 plays from the Judges tab |
| `server` | 4 pocket-app tests pass. The chain test files did not run on this machine, unrelated to this work |
| `node devstack/e2e/builtin.cjs` | 57/57, including the research desk app, Claude's deal watcher chart, and scene 12 end to end |
| Expo Go, iOS Simulator (iPhone 17) | Run by hand: the deck, a research desk, New pocket app (deal watcher and research desk), slide and Face ID, the card's landing, three runs, the cheque co-signed with Face ID (`screenshots/pocket-apps/ios-*.png`). Not verified: a physical iPhone, 60 fps on a device, accessibility text sizes on iOS |
| Console (headless Chromium at 1440) | The Pockets list with layout chips; a deal watcher, subscriptions and a research desk as apps (`c-*.png`) |
