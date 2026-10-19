import { loadFont } from "@remotion/fonts";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadCjk } from "@remotion/google-fonts/NotoSansSC";
import { staticFile } from "remotion";

// Dark-keynote stage around the app's own Neo-Kinetic tokens (mobile/src/tokens.ts).
export const C = {
  stage: "#0A0B0D",
  stage2: "#121318",
  grid: "rgba(255,255,255,0.045)",
  text: "#F2F1EE",
  muted: "#8C8D95",
  faint: "#4A4B52",
  vermillion: "#F04E23",
  vermillionSoft: "rgba(240,78,35,0.14)",
  blue: "#9DCAFF",
  blueSoft: "rgba(157,202,255,0.12)",
  canvas: "#E7E6E2",
  ink: "#111215",
  green: "#22C55E",
};

export const FPS = 30;
export const W = 1920;
export const H = 1080;

const faces: [string, string, string][] = [
  ["Clash Display", "ClashDisplay-Medium.ttf", "500"],
  ["Clash Display", "ClashDisplay-Semibold.ttf", "600"],
  ["Clash Display", "ClashDisplay-Bold.ttf", "700"],
  ["General Sans", "GeneralSans-Regular.ttf", "400"],
  ["General Sans", "GeneralSans-Medium.ttf", "500"],
  ["General Sans", "GeneralSans-Semibold.ttf", "600"],
  ["General Sans", "GeneralSans-Bold.ttf", "700"],
];
for (const [family, file, weight] of faces) {
  loadFont({ family, url: staticFile(`fonts/${file}`), weight });
}
export const mono = loadMono("normal", { weights: ["400", "500", "700"], subsets: ["latin"] }).fontFamily;
export const cjk = loadCjk("normal", { weights: ["500", "700"] }).fontFamily;

export const F = {
  display: "'Clash Display', sans-serif",
  body: "'General Sans', sans-serif",
  mono: `${mono}, monospace`,
  cjk: `${cjk}, sans-serif`,
};

// Critically damped spring step response: 0 → 1, no overshoot (the banned list forbids bouncy easing).
export const settle = (t: number, w = 14) => (t <= 0 ? 0 : 1 - (1 + w * t) * Math.exp(-w * t));
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const easeInOut = (t: number) => {
  const x = clamp(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
