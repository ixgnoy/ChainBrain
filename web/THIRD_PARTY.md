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

Visual system: Ink & jade, see `design-system/chainbrain/MASTER.md`.

npm dependencies (not copied code): react, react-dom, motion, lucide-react, viem 2.57.4, @radix-ui/react-dialog, @radix-ui/react-tooltip, sonner, clsx, tailwind-merge, @fontsource/{ibm-plex-sans,ibm-plex-mono}, viem, tailwindcss, @tailwindcss/vite, vite, vitest, @playwright/test.
