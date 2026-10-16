# Pocket apps: research log

This log records what was read before each slice and the decision each finding changed. Licences were checked against the cloned `LICENSE` files. The date is given on each loop. The design that came out of loop 1 is in [`docs/superpowers/specs/2026-10-17-pocket-apps-design.md`](../superpowers/specs/2026-10-17-pocket-apps-design.md), and the as-built description is in [`pocket-apps.md`](pocket-apps.md).

## Loop 1: before the first slice (17 Oct 2026)

### Generative UI on GitHub

| Repo | Licence (checked 17 Oct) | What we took | Code copied? |
| --- | --- | --- | --- |
| [vercel-labs/json-render](https://github.com/vercel-labs/json-render) | Apache-2.0 | Every block declares a description and an example, and the model prompt is generated from the catalogue (`core/src/schema.ts` `catalog.prompt`). A structural validator runs after parsing (`core/src/spec-validator.ts`). Optional props are nullable, not omitted. | No: the ideas were re-written in about 150 lines |
| [a2ui-project/a2ui](https://github.com/a2ui-project/a2ui) | Apache-2.0 | A versioned spec plus a `catalogId` (we use `catalogue: "chainbrain.pocket.v1"`). The component tree is kept apart from its data. An action that moves money must come from a user gesture in the renderer (`requiresUserActivation`, v1.0 protocol). | No |
| [ag-ui-protocol/ag-ui](https://github.com/ag-ui-protocol/ag-ui), [CopilotKit](https://github.com/CopilotKit/CopilotKit) | MIT | The snapshot-plus-delta idea, applied to the "assembles itself" animation: the whole spec is validated first, then the screen plays it in block order. | No |
| [Vercel AI SDK](https://github.com/vercel/ai) generative UI | Apache-2.0 | The pattern only: a typed tool result maps to a fixed component. | No |
| [thesysdev/openui](https://github.com/thesysdev/openui) | MIT | Skimmed. Its compact language is not needed, because our specs are small and JSON is easier to validate. | No |
| [MetaMask/delegation-framework](https://github.com/MetaMask/delegation-framework) | MIT and Apache-2.0 (dual; the files say `SPDX: MIT AND Apache-2.0`) | The semantics of `ERC20PeriodTransferEnforcer` (details below). | No: the semantics only |
| [google-agentic-commerce/AP2](https://github.com/google-agentic-commerce/AP2) | Apache-2.0 | The `IntentMandate` vocabulary (`code/sdk/python/ap2/models/mandate.py`): description, merchants, skus, intent expiry, `user_cart_confirmation_required`. AP2 has no recurring mandate, so a routine is our extension. | No |

**How the period rule works in `ERC20PeriodTransferEnforcer`:**
- **Terms.** It takes `periodAmount`, `periodDuration` and `startDate`.
- **Current period.** `currentPeriod = floor((now - startDate) / periodDuration) + 1`.
- **What can be spent.** "Available" is `periodAmount` minus the amount already spent in the current period. Before `startDate` it is 0.
- **No carry-over.** Unused allowance is forfeited when the next period starts.
- **Our version.** `shared/sim/pocketApp.ts` `periodWindow` / `available` work the same way. Our weeks are calendar weeks in Hong Kong time (UTC+8, no DST), so a "week" starts on Monday at 00:00.

**What changed:**
- **Nothing was copied.** Every useful piece was short enough to write ourselves, so no licence file or NOTICE was needed. This is recorded in `docs/04-build/licences-and-reuse.md`.
- **Blocks never carry values.** A block names a data source by enum, and the renderer reads the numbers from the ledger. A spec therefore can't lie about a balance.
- **Seller names come from the seller registry by id**, never from the spec.

### Papers (abstracts checked on arXiv, 17 Oct)

| Paper | Finding | Decision it changed or supported |
| --- | --- | --- |
| Chen et al., [Generative Interfaces for Language Models](https://arxiv.org/abs/2508.19227) (2025) | Structured interface output beat chat answers by up to 72% in human preference. | Supports: a spec of fixed blocks, not code |
| Cao et al., [Generative and Malleable UIs with a task-driven data model](https://arxiv.org/abs/2503.04084) (CHI 2025) | Generate the data model first, then the UI. | The routine (typed fields) is the pocket's data model, and blocks bind to it |
| Peng et al., [EvoGenUI-Bench](https://arxiv.org/abs/2608.29387) (Aug 2026) | Multi-turn regeneration dropped to 37% task completion, and retention of earlier behaviour to 52%. | **Changed:** a spec is composed once, at creation, and never regenerated in place. Block order is fixed across runs |
| Kim et al., [Fostering Appropriate Reliance on LLMs](https://arxiv.org/abs/2502.08554) (2025) | Explanations raised reliance on wrong answers too. Sources and visible inconsistencies lowered it. | **Changed:** the routine's cheque shows checkable facts (this week's spend, the allowance, this item's price), not prose |
| Vasconcelos et al., [Explanations can reduce overreliance](https://arxiv.org/abs/2212.06823) (2023) | Explanations help only when they make verifying cheaper. | The budget meter puts spent, allowance and this run on one bar |
| Turan, [Oversight Has a Capacity](https://arxiv.org/abs/2606.08919) (Jun 2026, preprint) | With fatigue modelled, more oversight can make a system less safe. | A routine asks at most once per run. The cheque offers "raise the weekly limit" as the lasting fix rather than asking again |
| Feng et al., [Levels of Autonomy for AI Agents](https://arxiv.org/abs/2506.12469) (2025) | Five levels, defined by the user's role. | The routine header reads "Runs on its own inside US$X a week · asks you above it" (observer inside the limit, approver above it) |
| Bilal et al., [From Information to Delegation](https://arxiv.org/abs/2608.02100) (Aug 2026) | Delegating financial execution to AI is still rare. | Tight defaults: two periods of funding at most, and Pause and Revoke always on screen |
| Chan et al., [Visibility into AI Agents](https://arxiv.org/abs/2401.13138) (2024) | Agent identifiers plus activity logs. | Every run receipt names the agent and the routine run number |
| Xiong et al., [Biased average position estimates in line and bar graphs](https://arxiv.org/abs/1908.00073) (2019) | Position judgements on bars and lines are biased. | **Changed:** the limit is a marked tick or line with its exact amount, never bar length alone. The deal chart draws the owner's limit as a labelled line |
| Debenedetti et al., [CaMeL: Defeating Prompt Injections by Design](https://arxiv.org/abs/2503.18813) (2025) | A plan fixed before untrusted data arrives gives provable security. | A routine is typed fields fixed at creation, and the runner never reads seller content |
| Beurer-Kellner et al., [Design patterns for securing LLM agents](https://arxiv.org/abs/2506.08837) (2025) | Plan-then-execute and similar patterns. | A "Will never" block lists the fixed payees, the cap and the schedule |

These came up but could not be verified, so no decision rests on them:
- a controlled study of digest versus real-time notifications;
- a study of limit lines specifically;
- a study of "who acted" cues for agents.

**Agent attribution.** [*Who am I talking to?*](https://research.google/pubs/who-am-i-talking-to-a-large-scale-measurement-of-surface-attribution-across-real-world-security-and-privacy-interfaces/) (CHI 2026, N = 4,400 and 3,057) found that people name the source of a UI element only about 55% of the time, and familiar brand marks raise that. This, together with [Anthropic's trademark guidelines](https://www.anthropic.com/legal/trademark-guidelines) (no colour changes) and [OpenAI's brand page](https://openai.com/brand/) (approved colour formats only), decided the theming:
- the job picks the card colour;
- the agent shows through its own unaltered mark and its name.

### Fintech practice (checked 17 Oct)

- **Revolut Subscriptions** ([Oct 2020 launch](https://www.revolut.com/news/revolut_launches_smart_subscriptions_feature/), [scheduled payments help](https://help.revolut.com/en-AU/help/card-payments-withdrawals/getting-started-with-card-payments/scheduled-payments/how-to-unblock-a-merchant)). It shows one list with spend per merchant, notifies before a scheduled payment, and warns when funds are short. → Our renewals list is sorted by next date, and each row has its seller, amount and a "short of funds" state.
- **Monzo Trends** ([Trends](https://monzo.com/blog/monzo-us-blog/trends), [Balance in Trends](https://monzo.com/blog/balance-in-trends)). It plots upcoming payments on the balance graph. → The subscriptions hero shows upcoming renewals as ticks on the month bar.
- **Robinhood limit orders** ([Legend charting](https://robinhood.com/us/en/support/articles/trading-with-robinhood-legend), [limit order](https://robinhood.com/us/en/support/articles/limit-order)). The limit sits on the chart as a horizontal line, with a price pill at the axis edge. → The deal chart draws the owner's limit as a dashed line with a pill at the right edge, and marks each buy on the line.
- **Not found, and not used:** authoritative layout sources for Alipay mini-programs, Ah Bao, WeChat Pay or Cash App.

### Expo, Reanimated 4 and Skia 2 (docs via ctx7, no quota error)

The ctx7 library ids were `/websites/swmansion_react-native-reanimated` and `/wcandillon/react-native-skia`.

**Do:**
- Build entering animations once, at module scope or memoised.
- Cap staggers at about 8 items, 50 to 70 ms each.
- Draw a line in with a Skia stroke whose `end` is driven by a shared value.
- Use one Canvas per hero and pass shared or derived values straight to Skia props.
- Under Reduce Motion, entering animations snap and exits are dropped ([accessibility guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility)), so the layout must work with no motion at all.

**Don't:**
- Use shared element transitions. They are experimental, gated by a build flag and not supported with expo-router ([overview](https://docs.swmansion.com/react-native-reanimated/docs/shared-element-transitions/overview)). The existing measured card flight (`ui/cardFlight.ts`) stays.
- Use `usePathInterpolation` unless the paths have the same commands.
- Read `.value` during render.

### UI/UX Pro Max (skill database, 17 Oct)

- **Charts.** "Performance vs target" points to a bullet chart with a marker line, with the number and target as text beside it. Trend over time points to a line chart with a visible data-table fallback. → The budget meter is a bullet bar with a labelled limit tick. The price chart gives screen readers its quotes as a list ("09:00 Tue, US$0.046 …").
- **Suggestion not taken.** The product search suggested "glassmorphism plus dark mode" for fintech. Our design system forbids both and takes precedence.
