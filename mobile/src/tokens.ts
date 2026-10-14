// ChainBrain design tokens (source: docs/frontend/research/design-brief.md §1).
// One brand for web and phone: Revolut-like dark premium, glass only on chrome/overlays, hairlines not shadows.
// Signal violet = actions. Agent cyan = anything the agent is doing (never a button colour).

export const palette = {
  dark: {
    bg: "#050607", bgElev1: "#0E1012", bgElev2: "#16191C", bgElev3: "#1F2328",
    hairline: "rgba(255,255,255,0.08)", hairlineStrong: "rgba(255,255,255,0.14)",
    text: "#F5F6F7", text2: "#A7ADB4", text3: "#6F767E", textDisabled: "#3D4349",
    accent: "#6E56FF", accentHi: "#8C7BFF", accentPress: "#5A43E6", onAccent: "#FFFFFF",
    agent: "#38E1FF", agentGlow: "rgba(56,225,255,0.35)",
    ok: "#2ED47A", okBg: "rgba(46,212,122,0.14)", okBorder: "rgba(46,212,122,0.30)",
    refused: "#FF5A5F", refusedBg: "rgba(255,90,95,0.14)", refusedBorder: "rgba(255,90,95,0.30)",
    stepup: "#FFB020", stepupBg: "rgba(255,176,32,0.14)", stepupBorder: "rgba(255,176,32,0.30)",
    revoked: "#C45CFF", revokedBg: "rgba(196,92,255,0.16)", revokedBorder: "rgba(196,92,255,0.34)",
    info: "#38E1FF", infoBg: "rgba(56,225,255,0.12)", infoBorder: "rgba(56,225,255,0.28)",
    glass: "rgba(22,25,28,0.55)", glassStrong: "rgba(14,16,18,0.72)", glassBorder: "rgba(255,255,255,0.10)", glassRim: "rgba(255,255,255,0.12)",
  },
  light: {
    bg: "#F4F4F6", bgElev1: "#FFFFFF", bgElev2: "#F0F1F3", bgElev3: "#E6E8EB",
    hairline: "#E2E2E7", hairlineStrong: "#CFD2D8",
    text: "#191C1F", text2: "#505A63", text3: "#8D969E", textDisabled: "#C9C9CD",
    accent: "#5B43F0", accentHi: "#7A66FF", accentPress: "#4A33D6", onAccent: "#FFFFFF",
    agent: "#0A9DBF", agentGlow: "rgba(10,157,191,0.25)",
    ok: "#14A35A", okBg: "rgba(20,163,90,0.10)", okBorder: "rgba(20,163,90,0.28)",
    refused: "#E23B4A", refusedBg: "rgba(226,59,74,0.10)", refusedBorder: "rgba(226,59,74,0.28)",
    stepup: "#C77700", stepupBg: "rgba(199,119,0,0.10)", stepupBorder: "rgba(199,119,0,0.28)",
    revoked: "#A63FE0", revokedBg: "rgba(166,63,224,0.10)", revokedBorder: "rgba(166,63,224,0.28)",
    info: "#0A9DBF", infoBg: "rgba(10,157,191,0.10)", infoBorder: "rgba(10,157,191,0.26)",
    glass: "rgba(255,255,255,0.65)", glassStrong: "rgba(255,255,255,0.82)", glassBorder: "rgba(0,0,0,0.06)", glassRim: "rgba(255,255,255,0.8)",
  },
} as const;

export type ThemeName = keyof typeof palette;
export type Palette = { [K in keyof (typeof palette)["dark"]]: string };

/** Pocket card gradients, top-left → bottom-right. */
export const pocketGradients: Record<string, [string, string]> = {
  research: ["#2A2F8F", "#6E56FF"],
  gifts: ["#8F2A6B", "#FF6AA8"],
  tight: ["#0F5B52", "#2ED4B0"],
  custom: ["#2B2F36", "#5B6370"],
};

/** Brand mark gradient (violet → cyan). */
export const brandGradient: [string, string] = ["#6E56FF", "#38E1FF"];

export const radius = { xs: 8, sm: 12, md: 16, lg: 20, xl: 28, xxl: 36, pill: 9999 } as const;
export const space = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64] as const;

export const font = {
  display: "Inter Tight",
  body: "Inter",
  mono: "Geist Mono",
} as const;

/** px size / line height / weight / letter-spacing (em). */
export const type = {
  displayXl: { size: 48, line: 52, weight: 600, tracking: -0.03 },
  displayLg: { size: 36, line: 40, weight: 600, tracking: -0.025 },
  headingLg: { size: 28, line: 34, weight: 600, tracking: -0.02 },
  headingMd: { size: 22, line: 28, weight: 600, tracking: -0.015 },
  title: { size: 17, line: 22, weight: 600, tracking: -0.01 },
  body: { size: 16, line: 24, weight: 400, tracking: 0 },
  bodySm: { size: 14, line: 20, weight: 400, tracking: 0 },
  caption: { size: 12, line: 16, weight: 500, tracking: 0.01 },
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
