const { hairlineWidth, platformSelect } = require("nativewind/theme");
const plexFontPlugin = require("./plugins/plexFontPlugin.js");

// Ink & jade tokens (design-system/chainbrain/MASTER.md). The values live in global.css as CSS variables, light and dark.
const v = (name) => `var(--${name})`;
const verdict = (k) => ({ DEFAULT: v(k), fg: v(`${k}-fg`), soft: v(`${k}-soft`), line: v(`${k}-line`) });

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: { sans: ["IBMPlexSans_400Regular"], mono: ["IBMPlexMono_500Medium"] },
      colors: {
        // shadcn / Reusables semantic names
        border: v("hair"),
        input: v("hair2"),
        ring: v("accent"),
        background: v("bg"),
        foreground: v("fg"),
        primary: { DEFAULT: v("accent"), foreground: v("on-accent") },
        secondary: { DEFAULT: v("e2"), foreground: v("fg") },
        destructive: { DEFAULT: v("refused"), foreground: v("on-accent") },
        muted: { DEFAULT: v("e2"), foreground: v("t3") },
        accent: { DEFAULT: v("e3"), foreground: v("fg") },
        popover: { DEFAULT: v("e1"), foreground: v("fg") },
        card: { DEFAULT: v("e1"), foreground: v("fg") },
        // ChainBrain names
        e1: v("e1"), e2: v("e2"), e3: v("e3"),
        hair: v("hair"), hair2: v("hair2"),
        t2: v("t2"), t3: v("t3"), tdis: v("tdis"),
        jade: { DEFAULT: v("accent"), hi: v("accent-hi"), press: v("accent-press"), ink: v("accent-ink"), soft: v("accent-soft") },
        ok: verdict("ok"), refused: verdict("refused"), stepup: verdict("stepup"), revoked: verdict("revoked"), info: verdict("info"),
      },
      borderRadius: { chip: "6px", md: "10px", lg: "14px" },
      borderWidth: { hairline: hairlineWidth() },
    },
  },
  future: { hoverOnlyWhenSupported: true },
  plugins: [platformSelect({ native: plexFontPlugin, default: [] }), require("tailwindcss-animate")],
};
