const { hairlineWidth } = require("nativewind/theme");

// Neo-Kinetic tokens, kept in step with src/tokens.ts (design-system/chainbrain/MASTER.md). Light only.
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: { sans: ["PlusJakartaSans_400Regular"], display: ["PlusJakartaSans_800ExtraBold"] },
      colors: {
        canvas: "#E2E5E8", card: "#FFFFFF", fill: "#F1F3F5", line: "#D3D3D1",
        ink: "#111215", ink2: "#3A3B41", muted: "#777781", faint: "#A7A8AF",
        vermillion: { DEFAULT: "#F04E23", ink: "#B32A00", soft: "#FFDBD2" },
        blue: { DEFAULT: "#9DCAFF", ink: "#124977", soft: "#D1E4FF" },
        green: { DEFAULT: "#22C55E", ink: "#15803D", soft: "#DCFCE7" },
      },
      borderRadius: { card: "24px", tile: "16px", input: "16px" },
      borderWidth: { hairline: hairlineWidth() },
    },
  },
  plugins: [],
};
