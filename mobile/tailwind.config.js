const { hairlineWidth } = require("nativewind/theme");

// Clean bank v2 tokens (design-system/chainbrain/MASTER.md). Light only: there is no dark variant.
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: { sans: ["PlusJakartaSans_400Regular"], serif: ["Fraunces_600SemiBold"] },
      colors: {
        canvas: "#F7F7F8", card: "#FFFFFF", fill: "#EFEFF1", line: "#E6E6EA",
        ink: "#111318", ink2: "#4B5058", muted: "#6B7280", faint: "#A1A6AE",
        accent: { DEFAULT: "#0B7A4B", press: "#08613B", soft: "#E3F3EA" },
        negative: { DEFAULT: "#C8372D", soft: "#FCEBEA" },
        warning: { DEFAULT: "#9A6200", soft: "#FFF3DB" },
      },
      borderRadius: { card: "20px", input: "12px" },
      borderWidth: { hairline: hairlineWidth() },
    },
  },
  plugins: [],
};
