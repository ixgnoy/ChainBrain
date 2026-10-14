// ChainBrain design tokens, clean bank v2 (design-system/chainbrain/MASTER.md). Light only: there is no dark palette.
// One accent (forest green), white borderless cards on a grey canvas, no gradients, blur, glow or monospace.

export const c = {
  canvas: "#F7F7F8", card: "#FFFFFF", fill: "#EFEFF1", line: "#E6E6EA",
  ink: "#111318", ink2: "#4B5058", muted: "#6B7280", faint: "#A1A6AE",
  accent: "#0B7A4B", accentPress: "#08613B", accentSoft: "#E3F3EA", onAccent: "#FFFFFF",
  positive: "#0B7A4B", negative: "#C8372D", negativeSoft: "#FCEBEA", warning: "#9A6200", warningSoft: "#FFF3DB",
  mint: "#DDF5EC", peach: "#FDEBDD", lilac: "#ECE9FB",
  scrim: "rgba(17,19,24,0.40)",
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
export const lift = { shadowColor: "#111318", shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 6 } as const;

export const motion = {
  fast: 160, base: 200,
  spring: { ui: { damping: 18, stiffness: 220, mass: 1 }, sheet: { damping: 26, stiffness: 260, mass: 1 } },
} as const;

export const brand = { name: "ChainBrain" } as const;
