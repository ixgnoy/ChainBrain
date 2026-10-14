// ChainBrain design tokens, clean bank v3 (design-system/chainbrain/MASTER.md). Light only: there is no dark palette.
// One accent (deep teal), white borderless cards on a grey canvas, no gradients, blur, glow or monospace.

export const c = {
  canvas: "#F5F7F8", card: "#FFFFFF", fill: "#EDF0F2", line: "#E3E7EA",
  ink: "#0F2236", ink2: "#3E4F63", muted: "#5D6B7B", faint: "#9AA5B1",
  accent: "#00727F", accentPress: "#005C66", accentSoft: "#DDF0F2", onAccent: "#FFFFFF",
  positive: "#1A7F4B", negative: "#C8372D", negativeSoft: "#FCEBEA", warning: "#9A6200", warningSoft: "#FFF3DB",
  mint: "#DFF3EC", peach: "#FDEBDD", sky: "#E3EEF9",
  scrim: "rgba(15,34,54,0.40)",
} as const;
export type Tone = keyof typeof c;

/** Loaded font family names (see _layout.tsx useFonts). Plus Jakarta Sans for all UI, Fraunces only for page titles. */
export const F = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semi: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  serif: "Fraunces_600SemiBold",
} as const;

export const radius = { input: 12, card: 20, pill: 9999 } as const;
/** The only shadow in the app: floating tab bar and bottom sheets. */
export const lift = { shadowColor: "#0F2236", shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 6 } as const;

/** Motion tokens (design-system/chainbrain/pages/motion.md). Springs use Reanimated's perceptual {duration, dampingRatio} form
 *  (dampingRatio ≈ 1 - Apple's "bounce"). Calm by default; bounce only at the end of a gesture or on a success mark. */
export const motion = {
  // durations (ms)
  pressIn: 90, fast: 160, base: 220, tab: 260, exit: 160,
  spring: {
    smooth: { duration: 400, dampingRatio: 1 },
    snappy: { duration: 350, dampingRatio: 0.85 },
    bouncy: { duration: 500, dampingRatio: 0.7 },
    press: { duration: 300, dampingRatio: 0.75 },
    pill: { duration: 420, dampingRatio: 0.82 },
    sheet: { duration: 480, dampingRatio: 1 },
    release: { duration: 500, dampingRatio: 0.8 },
    /** older name, kept for existing callers */
    ui: { duration: 350, dampingRatio: 0.85 },
  },
  /** press scale by element size */
  scale: { row: 0.985, button: 0.97, round: 0.94, icon: 0.9 },
} as const;
export type SpringName = keyof typeof motion.spring;

export const brand = { name: "ChainBrain" } as const;
