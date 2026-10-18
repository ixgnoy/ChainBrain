// ChainBrain design tokens: Neo-Kinetic Fintech after VaultBank (docs/08-frontend/design-system.md). Light only.
// Black ink on white cards over a warm paper-grey canvas, vermillion and powder blue as the only accents, hatch instead of
// fills, Clash Display for what you read first. The older role names (accent, negative, warning…) are kept so every screen
// maps onto the palette; new code uses the Neo-Kinetic names (vermillion, blue, green, hatch).

export const c = {
  // Level 0 canvas, level 1 cards, level 2 tiles
  canvas: "#E7E6E2", card: "#FFFFFF", fill: "#F2F1EE", tile: "#F5F4F1", tileStroke: "#EBEAE6", line: "#D3D3D1",
  // ink and neutrals. muted (#777781) is for white surfaces only; on the canvas use mutedOnCanvas (contrast ≥ 4.5:1)
  ink: "#111215", ink2: "#3A3B41", muted: "#777781", mutedOnCanvas: "#5E5F68", faint: "#A7A8AF",
  // accents
  vermillion: "#F04E23", vermillionPress: "#D8411A", vermillionInk: "#B32A00", vermillionSoft: "#FFDBD2",
  blue: "#9DCAFF", bluePress: "#86BCFA", blueInk: "#124977", blueSoft: "#D1E4FF",
  green: "#22C55E", greenInk: "#15803D", greenSoft: "#DCFCE7",
  // roles (kept names): the primary interactive colour is ink black; refusals and alerts are vermillion
  accent: "#111215", accentPress: "#2A2B30", accentSoft: "#EAE9E5", onAccent: "#FFFFFF",
  positive: "#15803D", negative: "#B32A00", negativeSoft: "#FFDBD2", warning: "#124977", warningSoft: "#D1E4FF",
  mint: "#DCFCE7", peach: "#FFDBD2", sky: "#D1E4FF",
  white: "#FFFFFF",
  scrim: "rgba(17,18,21,0.40)",
} as const;
export type Tone = keyof typeof c;

/** Loaded font family names (see _layout.tsx useFonts; files from scripts/fonts.sh). Clash Display, a wide grotesk, for
 *  headings, balances and card numbers (`display*`); General Sans for everything else. */
export const F = {
  regular: "GeneralSans-Regular",
  medium: "GeneralSans-Medium",
  semi: "GeneralSans-Semibold",
  bold: "GeneralSans-Bold",
  display: "ClashDisplay-Medium",
  displaySemi: "ClashDisplay-Semibold",
  displayBold: "ClashDisplay-Bold",
  /** older names: the heaviest display weight */
  extra: "ClashDisplay-Semibold",
  serif: "ClashDisplay-Semibold",
} as const;

/** Radii, VaultBank-tight: cards 20, tiles 16, buttons and inputs 14 (rectangles, not pills), pocket cards 18, sheets 28.
 *  Pills stay for chips, status labels and the tab bar. */
export const radius = { input: 14, button: 14, tile: 16, card: 20, pocket: 18, avatar: 14, sheet: 28, pill: 9999 } as const;

/** 8-pt spacing (DESIGN.md "Layout & Spacing"). */
export const space = { xs: 4, sm: 8, gutter: 12, md: 16, lg: 24, xl: 32, margin: 16 } as const;

/** Level 1: cards on the canvas. White on warm grey carries them; only a whisper of shadow (VaultBank is flat). */
export const level1 = { shadowColor: "#111215", shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 0 } as const;
/** Level 3: fanned pocket cards, sheets, popovers. */
export const level3 = { shadowColor: "#111215", shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 12 }, elevation: 8 } as const;
/** older name for the floating-surface shadow */
export const lift = level3;
/** The hairline boundary every level-1 card carries. */
export const hairline = "rgba(17,18,21,0.06)";

/** 45° hatch (DESIGN.md "Hatch Infill"): 2 px stroke on a 4 px pitch… scaled to read on a phone (2 px on 6 px). */
export const hatch = { stroke: 2, pitch: 6, angle: 45 } as const;

/** Pocket card faces, one per usage (shared/sim/pocketApp.ts `usageOf`; components/app/theme.ts `USAGE_FACE`): `band` is the stripe across the card, `edge` the card's side seen
 *  under the face (2.5D thickness). */
export const deck = [
  // weekly and monthly: sage (a black face read as a heavy block against the white wallet card)
  { face: "#CBD9C4", ink: "#111215", sub: "rgba(17,18,21,0.66)", chip: "rgba(17,18,21,0.10)", band: "#111215", edge: "#9DB396", usage: "#2C4A2A" },
  // one-time: warm wheat, not vermillion (a vermillion card read as Anthropic's coral; vermillion is for alerts and actions)
  { face: "#E9D6AE", ink: "#111215", sub: "rgba(17,18,21,0.66)", chip: "rgba(17,18,21,0.10)", band: "#111215", edge: "#C4AC7C", usage: "#5C4314" },
  // daily: powder blue
  { face: "#9DCAFF", ink: "#111215", sub: "rgba(17,18,21,0.66)", chip: "rgba(17,18,21,0.10)", band: "#111215", edge: "#6E9FD8", usage: "#124977" },
  // when asked: white hatch (it spends only when an agent is asked to buy)
  { face: "#FFFFFF", ink: "#111215", sub: "#5E5F68", chip: "rgba(17,18,21,0.06)", hatch: true, band: "#111215", edge: "#C9C8C3", usage: "#111215" },
] as const;
export type DeckFace = (typeof deck)[number];

/** Motion tokens (docs/08-frontend/motion.md). Springs use Reanimated's perceptual {duration, dampingRatio} form
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
