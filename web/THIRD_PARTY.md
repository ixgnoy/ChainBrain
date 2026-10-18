# Third-party code copied into web/

Design system and components were ported from the earlier standalone console (`lianainao-frontend/web`), which itself copied the files below from reference clones kept outside the repo (gitignored). Changes are listed per row. No rival FinTechathon entries were used. Licences were recorded as instructed even though the team said they do not matter.

| Copied into | Source path (in the reference clone) | Repo | Licence | Changes |
| --- | --- | --- | --- | --- |
| `src/components/vendor/HoldButton.tsx` | `react-bits/src/ts-tailwind/Micro/HoldButton/HoldButton.tsx` | https://github.com/DavidHDev/react-bits | MIT + Commons Clause | `'use client'` removed; eslint `no-empty` disabled for its try/catch blocks. Used for hold-to-revoke. |
| `src/components/vendor/ThoughtLine.tsx` | `react-bits/src/ts-tailwind/Micro/ThoughtLine/ThoughtLine.tsx` | https://github.com/DavidHDev/react-bits | MIT + Commons Clause | `'use client'` removed; `@hugeicons` icons replaced by `lucide-react` (`Sparkles`, `ChevronDown`, `Check`). Used for the per-turn trace line under agent replies. |
| `src/components/bits/{DotGrid,Threads,BlurText,ShinyText,SpotlightCard,ClickSpark,Magnet,DecryptedText,AnimatedList,Stepper}.tsx` | `react-bits/src/ts-tailwind/{Backgrounds,TextAnimations,Components,Animations}/<Name>/<Name>.tsx` at `496968c4` | https://github.com/DavidHDev/react-bits | MIT + Commons Clause | Themed through `src/components/bits/presets.tsx` (Ink & jade tokens, reduced motion). Edits: `@hugeicons` replaced by `lucide-react` and demo items dropped (`AnimatedList`, `Stepper`); `SpotlightCard` radius/padding left to the caller; `BlurText` root is a `<span>` so it can sit inside headings; two `no-useless-spread` lint suppressions in `ClickSpark` (the copies are intentional). |
| `Money` in `src/components/ui.tsx` | idea and spring tuning from `react-bits/src/ts-tailwind/TextAnimations/CountUp/CountUp.tsx` | https://github.com/DavidHDev/react-bits | MIT + Commons Clause | Rewritten (money needs fixed 2-decimal output and counting from the previous value); not a file copy. |
| Verdict chips, KPI strip, pocket card layout, tokens wiring | design patterns from `web/shadcn-fintech` (`src/app/globals.css`, `components/dashboard/account-cards.tsx`) and `web/next-shadcn-admin-dashboard` (finance `overview-kpis`) | https://github.com/abderrahimghazali/shadcn-fintech , https://github.com/arhamkhnz/next-shadcn-admin-dashboard | MIT | Patterns only (Tailwind v4 `@theme inline` token wiring, card rail, KPI strip); the code here is written for this app. |
| Radix Dialog / Tooltip usage, `cn()` helper | shadcn/ui conventions (`web/ui`) | https://github.com/shadcn-ui/ui | MIT | Re-implemented in `src/components/ui.tsx` (`Sheet` for the approval and new-pocket dialogs, `Tip`, `Switch`) and `src/lib/cn.ts`; no shadcn files copied verbatim. |

`src/index.css` (tokens, surfaces, motion), `src/lib/{theme,cn}.ts`, `src/lib/{sanitize}.ts` and the Bank / Trace layouts are copied from the earlier console and rewritten for the v2 data shapes (`src/lib/{trace,ledger,bank}.ts` are new).

Not copied: react-bits `SlideCommit` (approval uses a plain accessible button instead), `CountUp` as a file (see `Money`), `StatusMark`, `GradualBlur`, magicui components. The trace keeps its own CSS row animation (`row-in`) because it can hold hundreds of rows.

Visual system: Ink & jade, see `docs/08-frontend/design-system.md`.

npm dependencies (not copied code): react, react-dom, motion, lucide-react, viem 2.57.4, @radix-ui/react-dialog, @radix-ui/react-tooltip, sonner, clsx, tailwind-merge, @fontsource/{ibm-plex-sans,ibm-plex-mono}, viem, tailwindcss, @tailwindcss/vite, vite, vitest, @playwright/test.

## Console refinement (Live, Pockets, On-chain, Judges, presenter)

Small components in `src/console/kit.tsx` and the restyled sheet in `src/seller/ui.tsx` were adapted by hand (rewritten for Tailwind v4 and the ChainBrain tokens, no gradients or shadows) from these permissively licensed references:

| Written in | Adapted from | Repo | Licence | Changes |
| --- | --- | --- | --- | --- |
| `Kbd`, `EmptyState` (`src/console/kit.tsx`) | `apps/v4/registry/new-york-v4/ui/{kbd,empty}.tsx` | https://github.com/shadcn-ui/ui | MIT | Same anatomy (media, title, description, action); cva and shadcn tokens replaced by ChainBrain classes. |
| `DetailSheet` (`src/seller/ui.tsx`) | `apps/v4/registry/new-york-v4/ui/sheet.tsx` | https://github.com/shadcn-ui/ui | MIT | Side-right panel on Radix Dialog (already a dependency); bottom sheet on a phone. |
| `Tracker`, `SegmentBar` (`src/console/kit.tsx`) | `src/components/Tracker/Tracker.tsx`, `src/components/CategoryBar/CategoryBar.tsx` | https://github.com/tremorlabs/tremor | Apache-2.0 | Hover card replaced by native tooltips; CategoryBar reduced to segments with the legend written below it. |
| `Skeleton`, `KpiStrip` | `apps/v4/registry/new-york-v4/ui/skeleton.tsx`, `blocks/dashboard-01/components/section-cards.tsx` (anatomy only) | https://github.com/shadcn-ui/ui | MIT | Pulse animation removed (still blocks); card gradient and shadow dropped. |
| Trace `Call` disclosure (Pretty / JSON), turn grouping | layout idea from `web/src/features/traces/components/TraceLogView` | https://github.com/langfuse/langfuse | MIT (non-`ee/` paths) | Markup idea only; no code copied. |

Not used: anything from blockscout/frontend (restrictive licence) or originui outside `apps/origin` and `apps/ui`.

## Frontend wow round (checks path, arena, scorecard, evidence, explorer)

Written fresh for ChainBrain; no code copied. Patterns only, from public product UIs: the checks path follows the rule-evaluation lists of Stripe Radar and the step-by-step trace views of Datadog / Honeycomb (ordered stages, the deciding stage called out); the explorer's transaction page follows the general Etherscan layout (status, block, from/to, method, input, logs). No Blockscout code was read or used. The checklist tick and the gate list reuse the `Tracker` / `Kbd` conventions already credited above.

### Round 4 research notes (ideas only, no code copied)
- Stripe Radar docs (rule order and short-circuiting, "Not evaluated" kept apart from "Normal", per-signal explanations, rule-impact "what would have happened"): the checks path shows skipped gates as "Not needed" / "Bypassed" and each blocked transfer says how much would have left the pocket.
- Etherscan transaction page and its Transaction Debugger write-up (verdict first, status banner, the native "Value" field misleading for token transfers, decoded input and logs behind progressive disclosure): the explorer tx page leads with the amount and "Did not move".
- Datadog TV mode and large-screen dashboard guidance (one screen, no scrolling, primary indicator large, red means act): the presenter fits one screen, with a persistent "N attacks stopped · HK$0.00 lost" and keyboard control.
