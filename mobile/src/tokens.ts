// ChainBrain design tokens: Ink & jade.

// Ink & jade (design-system/chainbrain/MASTER.md). Same values live in global.css as CSS variables for NativeWind classes.
// Light is the default. Hairlines, not shadows. Jade is the only accent; verdicts carry an icon and a word, never colour alone.

export const palette = {
  light: {
    bg: "#F6F4EF", bgElev1: "#FFFFFF", bgElev2: "#EFECE5", bgElev3: "#E6E2D9",
    hairline: "#E3DFD6", hairlineStrong: "#CFCAC0",
    text: "#16181A", text2: "#3F4347", text3: "#6B6F73", textDisabled: "#B9B6AF",
    accent: "#0F6E56", accentHi: "#138467", accentPress: "#0B5946", accentInk: "#0B5946", accentSoft: "rgba(15,110,86,0.10)", onAccent: "#FFFFFF",
    agent: "#0F6E56",
    ok: "#1F8A4C", okText: "#18703F", okBg: "rgba(31,138,76,0.10)", okBorder: "rgba(31,138,76,0.28)",
    refused: "#C2410C", refusedText: "#B23C0B", refusedBg: "rgba(194,65,12,0.08)", refusedBorder: "rgba(194,65,12,0.28)",
    stepup: "#B7791F", stepupText: "#8A5A12", stepupBg: "rgba(183,121,31,0.12)", stepupBorder: "rgba(183,121,31,0.28)",
    revoked: "#5B6168", revokedText: "#4A4F55", revokedBg: "rgba(22,24,26,0.06)", revokedBorder: "rgba(91,97,104,0.28)",
    info: "#6B6F73", infoText: "#3F4347", infoBg: "rgba(22,24,26,0.05)", infoBorder: "rgba(107,111,115,0.28)",
    scrim: "rgba(22,24,26,0.40)",
  },
  dark: {
    bg: "#121314", bgElev1: "#1B1C1E", bgElev2: "#232426", bgElev3: "#2C2D30",
    hairline: "rgba(236,234,228,0.08)", hairlineStrong: "rgba(236,234,228,0.16)",
    text: "#ECEAE4", text2: "#BDBBB5", text3: "#9A9C9E", textDisabled: "#55575A",
    accent: "#3FBF9A", accentHi: "#5CD1AE", accentPress: "#2FA584", accentInk: "#3FBF9A", accentSoft: "rgba(63,191,154,0.14)", onAccent: "#0D1F19",
    agent: "#3FBF9A",
    ok: "#4CC27E", okText: "#4CC27E", okBg: "rgba(76,194,126,0.14)", okBorder: "rgba(76,194,126,0.28)",
    refused: "#F0804A", refusedText: "#F0804A", refusedBg: "rgba(240,128,74,0.14)", refusedBorder: "rgba(240,128,74,0.28)",
    stepup: "#E0A84A", stepupText: "#E0A84A", stepupBg: "rgba(224,168,74,0.14)", stepupBorder: "rgba(224,168,74,0.28)",
    revoked: "#A3A7AB", revokedText: "#A3A7AB", revokedBg: "rgba(236,234,228,0.08)", revokedBorder: "rgba(163,167,171,0.28)",
    info: "#9A9C9E", infoText: "#BDBBB5", infoBg: "rgba(236,234,228,0.06)", infoBorder: "rgba(154,156,158,0.28)",
    scrim: "rgba(0,0,0,0.60)",
  },
} as const;

export type ThemeName = keyof typeof palette;
export type Palette = { [K in keyof (typeof palette)["dark"]]: string };

/** 6 chips and inputs, 10 buttons and rows, 14 cards, panes and sheets. Pills only for chips and segmented controls. */
export const radius = { xs: 6, sm: 6, md: 10, lg: 14, xl: 14, xxl: 14, pill: 9999 } as const;
export const space = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64] as const;

export const font = {
  display: "IBM Plex Sans",
  body: "IBM Plex Sans",
  mono: "IBM Plex Mono",
} as const;

/** px size / line height / weight / letter-spacing (em). Scale: 12 meta, 13-14 small, 16 body, 20 title, 24 h2, 32 h1, 44 balance. */
export const type = {
  displayXl: { size: 44, line: 48, weight: 600, tracking: -0.02 },
  displayLg: { size: 32, line: 40, weight: 600, tracking: -0.01 },
  headingLg: { size: 24, line: 32, weight: 600, tracking: -0.01 },
  headingMd: { size: 20, line: 28, weight: 600, tracking: -0.01 },
  title: { size: 16, line: 22, weight: 600, tracking: 0 },
  body: { size: 16, line: 24, weight: 400, tracking: 0 },
  bodySm: { size: 14, line: 20, weight: 400, tracking: 0 },
  caption: { size: 12, line: 16, weight: 500, tracking: 0 },
  mono: { size: 12, line: 16, weight: 500, tracking: 0 },
} as const;

export const motion = {
  instant: 80, fast: 160, base: 240, slow: 400, hero: 600,
  easing: {
    standard: "cubic-bezier(0.2,0,0,1)", decelerate: "cubic-bezier(0,0,0,1)",
    accelerate: "cubic-bezier(0.3,0,1,1)", emphasized: "cubic-bezier(0.2,0,0,1.15)",
  },
  spring: {
    ui: { damping: 18, stiffness: 220, mass: 1 },
    sheet: { damping: 26, stiffness: 260, mass: 1 },
  },
} as const;

/** Verdict chip vocabulary shared by every surface. */
export type ChipKind = "ok" | "refused" | "stepup" | "revoked" | "info";
export const chipLabel: Record<ChipKind, string> = {
  ok: "Allowed", refused: "Refused", stepup: "Needs you", revoked: "Revoked", info: "Working",
};

export const brand = {
  name: "ChainBrain",
  nameZh: "链AI脑",
  tagline: "Let your agent spend. Keep the keys.",
} as const;
