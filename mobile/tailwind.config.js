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
        canvas: "#F5F7F8", card: "#FFFFFF", fill: "#EDF0F2", line: "#E3E7EA",
        ink: "#0F2236", ink2: "#3E4F63", muted: "#5D6B7B", faint: "#9AA5B1",
        accent: { DEFAULT: "#00727F", press: "#005C66", soft: "#DDF0F2" },
        negative: { DEFAULT: "#C8372D", soft: "#FCEBEA" },
        warning: { DEFAULT: "#9A6200", soft: "#FFF3DB" },
      },
      borderRadius: { card: "20px", input: "12px" },
      borderWidth: { hairline: hairlineWidth() },
    },
  },
  plugins: [],
};
