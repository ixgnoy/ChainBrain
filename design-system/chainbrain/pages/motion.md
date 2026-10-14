# Motion and haptics (phone app) — overrides MASTER.md for movement

Goal: feel like a first-class iPhone app: calm and precise by default, a few rewarding moments where money moves. Rich haptics. Everything interruptible, UI-thread (Reanimated 4 worklets), Expo Go SDK 57 only.

Research behind it: Emil Kowalski (press 0.97, ease-out, < 300 ms, interruptible, exit faster than enter, iOS drawer curve), Apple WWDC23 "Animate with springs" (duration + bounce; bounce 0 default, ~0.15 brisk, > 0.4 too much), Rauno Freiberg (apply gesture deltas immediately, commit destructive actions on release), Family / Benji Taylor (directional tabs, rare delight, persistent elements travel), Expo docs (glass-effect, haptics). Reference code: `reference/frontend/glass/expo-glass-tabs` (MIT, ported), `reference/frontend/motion/*` (gorhom bottom-sheet MIT, Reanimated examples MIT, rit3zh repos study-only, Reactiive demos study-only).

## Tokens (`mobile/src/tokens.ts` → `motion`)

| Name | Reanimated config | Use |
| --- | --- | --- |
| `smooth` | `withSpring {duration: 400, dampingRatio: 1}` | default for content, layout, digit roll |
| `snappy` | `{duration: 350, dampingRatio: 0.85}` | toggles, chips, cards entering |
| `bouncy` | `{duration: 500, dampingRatio: 0.7}` | success marks and the end of a gesture only |
| `press` | `{duration: 300, dampingRatio: 0.75}` | press release |
| `pill` | `{duration: 420, dampingRatio: 0.82}` | glass tab highlight |
| `sheet` | `{duration: 480, dampingRatio: 1}` | sheet open / settle (critically damped, iOS feel) |
| `release` | `{duration: 500, dampingRatio: 0.8}` + gesture velocity | anything let go after a drag |
| `EASE_OUT` | `bezier(0.23, 1, 0.32, 1)` | fades, entering content |
| `EASE_SHEET` | `bezier(0.32, 0.72, 0, 1)` | sheet close, drawers |

Durations: press-in 90 ms, fades 220 ms, exits 160 ms (≈ 0.7 × enter), tab screen enter 260 ms. Nothing decorative over 300 ms except sheets and money moments. No bounce above dampingRatio 0.7.

Press scale: rows/cards 0.985, buttons 0.97, round actions 0.94, tab icons 0.9. Scale applies on touch-down (timing 90 ms), releases with `press`.

## Haptic map (`mobile/src/haptics.ts`, rich level, throttled 50 ms)

| Event | Call |
| --- | --- |
| tab change, wizard step, chip / segment / picker change, slider step | selection |
| any button / row / card press | impact Light |
| round action press, sheet snap landing | impact Medium |
| sheet open, drag-to-dismiss threshold crossed | impact Soft |
| slide-to-approve: ticks every 25 % | selection |
| slide-to-approve commit | impact Rigid, then Success when confirmed |
| hold-to-revoke start / 25-50-75 % / 90 % / done | Light / selection / Medium / Warning |
| pocket funded, payment settled, rule saved | Success |
| agent refusal, dead end, error | Error |
| limit warnings | Warning |
| pull-to-refresh trigger | impact Medium |

Never: on scroll, per character, two within 50 ms, Success for ordinary taps. Haptics are never the only feedback.

## Moments

- **Glass tab bar:** iOS 26 Liquid Glass (`expo-glass-effect`), BlurView on older iOS, solid white on Android / web / Reduce Transparency. Sliding highlight on `pill`, finger scrubbing with selection ticks, minimize on scroll (labels fold away), progressive blur under it. Never fade glass with opacity.
- **Tab switch:** the entering screen slides 28 pt from the direction of travel and fades in (260 ms EASE_OUT); the outgoing one hides at once. No animation on first launch.
- **Sheets:** follow the finger 1:1, rubber-band past the top, dismiss on velocity > 600 pt/s or 40 % drag, release spring with velocity, backdrop tied to position, page behind scales to 0.96.
- **Money:** rolling digits (each digit its own column, direction-aware, 20 ms stagger, `smooth`), calm colours; success mark: ring `bouncy` + check stroke draw 260 ms + Success haptic + 0.974 landing dip. No confetti except the first pocket.
- **Gestures:** slide-to-approve with label fade by 55 % travel, grip squash ≤ 0.08, ticks every 25 %, commit at 90 % or fast flick past 60 %, error shake `[0,-5,5,-3,3,-1,0]` 450 ms. Hold-to-revoke 1.2 s linear fill with ticks, Warning on complete.
- **Agent:** steps enter fade + 6 pt rise (`smooth`, 60 ms stagger), status mark (dot → spinning arc → drawn check / X), a hairline "working" line instead of any sparkle or orb, shown only after 400 ms; intent card scale 0.96 → 1 `snappy`; refusal shake once + Error; dead-end card quiet (no bounce).
- **Lists:** first-mount stagger 50 ms (max 6), insert fade + rise, exit faster; layout `LinearTransition.springify()`.

## Reduced motion / transparency

Reduce Motion: springs become 180 ms fades, no translate/scale entrances, digits cross-fade, glass pill jumps. Reduce Transparency or no glass API: solid white bar with a hairline. Haptics stay.

## Do not

Sparkles, orbs, glow, shimmer on content, scale-from-0, ease-in, infinite idle loops, red/green flashes on balances, glass on glass or on content, typewriter effects, confetti for routine payments, uninterruptible animations.
