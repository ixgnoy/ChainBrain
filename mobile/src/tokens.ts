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

export const motion = {
  fast: 160, base: 200,
  spring: { ui: { damping: 18, stiffness: 220, mass: 1 }, sheet: { damping: 26, stiffness: 260, mass: 1 } },
} as const;

export const brand = { name: "ChainBrain" } as const;
