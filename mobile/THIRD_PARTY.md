# Third-party code and ideas

Everything here was read from `reference/frontend/` (read-only, never run or installed from there). Rival FinTechathon entries were not copied.

| What | Source path | URL | Licence | How used |
| --- | --- | --- | --- | --- |
| Slide-to-commit interaction idea | `reference/frontend/react-bits/src/ts-tailwind/Micro/SlideCommit` | https://github.com/DavidHDev/react-bits | MIT + Commons Clause | Idea only. Rebuilt on Reanimated and Gesture Handler in `src/ui/SlideToConfirm.tsx`. No source copied. |
| Hold-to-confirm interaction idea | `reference/frontend/react-bits/src/ts-tailwind/Micro/HoldButton` | https://github.com/DavidHDev/react-bits | MIT + Commons Clause | Idea only. Rebuilt in `src/ui/HoldToRevoke.tsx`. |
| Thought-line / status-mark idea (compact trace) | `reference/frontend/react-bits/src/ts-tailwind/Micro/ThoughtLine`, `StatusMark` | https://github.com/DavidHDev/react-bits | MIT + Commons Clause | Idea only, in `src/components/TraceBlock.tsx`. |
| UI kit: Text, Button, Card, Badge, Input, Switch, Separator, Progress, Skeleton, Alert, Icon, `cn` | `reference/frontend/react-native-reusables/packages/registry/src/nativewind/{components/ui,lib}`; NativeWind setup from `apps/showcase` | https://github.com/founded-labs/react-native-reusables | MIT | Source copied into `src/components/ui/` and `src/lib/cn.ts`, restyled to Ink & jade (tokens in `global.css`, `tailwind.config.js`). `src/ui/primitives.tsx` wraps them. |
| CountUp, AnimatedList, ShinyText ideas | `reference/frontend/react-bits/src/ts-tailwind/*` | https://github.com/DavidHDev/react-bits | MIT + Commons Clause | Ideas only, rebuilt on Reanimated: `src/lib/useCountUp.ts`, Activity list entering animations, `src/ui/ShinyText.tsx`. |
| Screen ideas (wallet layout) | `reference/frontend/mobile/rainbow/src/design-system`, `src/screens` | https://github.com/rainbow-me/rainbow | GPL-3.0 | Ideas only, no code copied. |

Packages (npm): expo, expo-router, react-native-reanimated, react-native-gesture-handler, react-native-svg, expo-haptics, expo-clipboard, expo-secure-store, expo-crypto, viem (2.57.4), nativewind 4, tailwindcss 3, tailwindcss-animate, class-variance-authority, clsx, tailwind-merge, lucide-react-native (ISC), @rn-primitives/{slot,types,switch,progress,separator} (MIT), @expo-google-fonts/{ibm-plex-sans,ibm-plex-mono}. All run in Expo Go. Fonts: IBM Plex Sans and IBM Plex Mono are SIL OFL 1.1.

Merge note: the wallet logic (key handling, viem chain calls, co-sign of the USDC TransferWithAuthorization, presets, event polling) is the team's own code in `src/lib/`. The look, shell and UI kit under `src/ui/`, `src/components/` and `src/app/` come from the ChainBrain frontend app and are credited above. The unused packages react-native-sse and react-native-get-random-values were not carried over (the app polls /api/events.json; the key is made with expo-crypto).
