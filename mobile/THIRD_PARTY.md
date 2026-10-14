# Third-party code and ideas

Everything here was read from `reference/frontend/` (read-only, never run or installed from there). Rival FinTechathon entries were not copied.

| What | Source path | URL | Licence | How used |
| --- | --- | --- | --- | --- |
| Floating glass tab bar structure, sizes and spring constants, minimise-on-scroll state | `reference/frontend/glass/expo-glass-tabs/src/glass-tab-bar.tsx`, `minimize-context.tsx` | https://github.com/davidmokos/expo-glass-tabs | MIT (David Mokos) | Ported to `src/ui/TabBar.tsx` and `src/ui/minimize.tsx`. Rewritten for expo-router's JS `Tabs` (custom `tabBar`), SVG icons, `BlurView` fallback, and a tap-only pill (scrubbing gesture and progressive blur dropped). |
| Slide-to-commit interaction idea | `reference/frontend/react-bits/src/ts-tailwind/Micro/SlideCommit` | https://github.com/DavidHDev/react-bits | MIT + Commons Clause | Idea only. Rebuilt on Reanimated and Gesture Handler in `src/ui/SlideToConfirm.tsx`. No source copied. |
| Hold-to-confirm interaction idea | `reference/frontend/react-bits/src/ts-tailwind/Micro/HoldButton` | https://github.com/DavidHDev/react-bits | MIT + Commons Clause | Idea only. Rebuilt in `src/ui/HoldToRevoke.tsx`. |
| Thought-line / status-mark idea (compact trace) | `reference/frontend/react-bits/src/ts-tailwind/Micro/ThoughtLine`, `StatusMark` | https://github.com/DavidHDev/react-bits | MIT + Commons Clause | Idea only, in `src/components/TraceBlock.tsx`. |
| Component patterns (button, badge, card) | `reference/frontend/react-native-reusables/packages/registry/src/nativewind/components/ui/*` | https://github.com/founded-labs/react-native-reusables | MIT | Patterns only, written as StyleSheet in `src/ui/primitives.tsx`. |
| Glass blur layering idea | `reference/frontend/glass/expo-backdrop/example/components/*`, `glass/expo-progressive-blur/app/index.tsx` | https://github.com/rit3zh/expo-backdrop (and the progressive-blur repo) | MIT (expo-backdrop); progressive-blur see its repo | Design reference only (its native module does not run in Expo Go). |
| Screen ideas (wallet layout) | `reference/frontend/mobile/rainbow/src/design-system`, `src/screens` | https://github.com/rainbow-me/rainbow | GPL-3.0 | Ideas only, no code copied. |

Packages (npm): expo, expo-router, react-native-reanimated, react-native-gesture-handler, react-native-svg, expo-blur, expo-glass-effect, expo-linear-gradient, expo-haptics, expo-clipboard, expo-secure-store, react-native-get-random-values, react-native-sse, viem (2.57.4), @expo-google-fonts/{inter,inter-tight,geist-mono}. Fonts: Inter, Inter Tight and Geist Mono are SIL OFL 1.1.
