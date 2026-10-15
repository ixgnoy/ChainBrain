// ChainBrain design tokens: Neo-Kinetic Fintech (design-system/chainbrain/MASTER.md). Light only: there is no dark palette.
// Black ink on white cards over a slate canvas, vermillion and powder blue as the only accents, 45° hatch instead of fills.
// The older role names (accent, negative, warning…) are kept so every screen maps onto the new palette; new code uses the
// Neo-Kinetic names (vermillion, blue, green, hatch).

export const c = {
  // Level 0 canvas, level 1 cards, level 2 tiles
  canvas: "#E2E5E8", card: "#FFFFFF", fill: "#F1F3F5", tile: "#F4F5F6", tileStroke: "#ECEFEF", line: "#D3D3D1",
  // ink and neutrals. muted (#777781) is for white surfaces only; on the canvas use mutedOnCanvas (contrast ≥ 4.5:1)
  ink: "#111215", ink2: "#3A3B41", muted: "#777781", mutedOnCanvas: "#5E5F68", faint: "#A7A8AF",
  // accents
  vermillion: "#F04E23", vermillionPress: "#D8411A", vermillionInk: "#B32A00", vermillionSoft: "#FFDBD2",
  blue: "#9DCAFF", bluePress: "#86BCFA", blueInk: "#124977", blueSoft: "#D1E4FF",
  green: "#22C55E", greenInk: "#15803D", greenSoft: "#DCFCE7",
  // roles (kept names): the primary interactive colour is ink black; refusals and alerts are vermillion
  accent: "#111215", accentPress: "#2A2B30", accentSoft: "#E9EBED", onAccent: "#FFFFFF",
  positive: "#15803D", negative: "#B32A00", negativeSoft: "#FFDBD2", warning: "#124977", warningSoft: "#D1E4FF",
  mint: "#DCFCE7", peach: "#FFDBD2", sky: "#D1E4FF",
  white: "#FFFFFF",
  scrim: "rgba(17,18,21,0.40)",
} as const;
export type Tone = keyof typeof c;

/** Loaded font family names (see _layout.tsx useFonts). Plus Jakarta Sans everywhere; ExtraBold for display and balances. */
export const F = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semi: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extra: "PlusJakartaSans_800ExtraBold",
  /** older name: page titles are now Jakarta ExtraBold (Fraunces is gone) */
  serif: "PlusJakartaSans_800ExtraBold",
} as const;

/** Radii (DESIGN.md "Shapes"): cards 24, tiles 16, pocket cards 20, avatars 14 (squircle), pills full. */
export const radius = { input: 16, tile: 16, card: 24, pocket: 20, avatar: 14, sheet: 28, pill: 9999 } as const;

/** 8-pt spacing (DESIGN.md "Layout & Spacing"). */
export const space = { xs: 4, sm: 8, gutter: 12, md: 16, lg: 24, xl: 32, margin: 16 } as const;

/** Level 1: cards on the canvas. Ultra-soft ambient shadow plus a hairline (see `hairline`). */
export const level1 = { shadowColor: "#111215", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1 } as const;
/** Level 3: fanned pocket cards, sheets, popovers. */
export const level3 = { shadowColor: "#111215", shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 12 }, elevation: 8 } as const;
/** older name for the floating-surface shadow */
export const lift = level3;
/** The hairline boundary every level-1 card carries. */
export const hairline = "rgba(17,18,21,0.06)";

/** 45° hatch (DESIGN.md "Hatch Infill"): 2 px stroke on a 4 px pitch… scaled to read on a phone (2 px on 6 px). */
export const hatch = { stroke: 2, pitch: 6, angle: 45 } as const;

/** Pocket card faces, in deck order (DESIGN.md "Card Deck Component"). */
export const deck = [
  { face: "#111215", ink: "#FFFFFF", sub: "rgba(255,255,255,0.64)", chip: "rgba(255,255,255,0.14)" },
  { face: "#F04E23", ink: "#FFFFFF", sub: "rgba(255,255,255,0.80)", chip: "rgba(17,18,21,0.16)" },
  { face: "#9DCAFF", ink: "#111215", sub: "rgba(17,18,21,0.66)", chip: "rgba(17,18,21,0.10)" },
  { face: "#FFFFFF", ink: "#111215", sub: "#5E5F68", chip: "rgba(17,18,21,0.06)", hatch: true },
] as const;
export type DeckFace = (typeof deck)[number];

/** Motion tokens (design-system/chainbrain/pages/motion.md). Springs use Reanimated's perceptual {duration, dampingRatio} form
 *  (dampingRatio ≈ 1 - Apple's "bounce"). Calm by default; bounce only at the end of a gesture or on a success mark. */
export const motion = {
  // durations (ms)
  pressIn: 90, fast: 160, base: 220, tab: 260, exit: 160, draw: 700,
  spring: {
    smooth: { duration: 400, dampingRatio: 1 },
    snappy: { duration: 350, dampingRatio: 0.85 },
    bouncy: { duration: 500, dampingRatio: 0.7 },
    press: { duration: 300, dampingRatio: 0.75 },
    pill: { duration: 420, dampingRatio: 0.82 },
    sheet: { duration: 480, dampingRatio: 1 },
    release: { duration: 500, dampingRatio: 0.8 },
    /** the pocket deck: a card coming to the front */
    deck: { duration: 520, dampingRatio: 0.78 },
    /** older name, kept for existing callers */
    ui: { duration: 350, dampingRatio: 0.85 },
  },
  /** press scale by element size (DESIGN.md: active state scales to 0.98) */
  scale: { row: 0.985, button: 0.98, round: 0.96, icon: 0.9 },
} as const;
export type SpringName = keyof typeof motion.spring;

export const brand = { name: "ChainBrain" } as const;
