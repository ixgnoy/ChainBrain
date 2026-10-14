// Maps Tailwind font-weight utilities to the loaded IBM Plex files (React Native cannot pick a weight inside one family).
const plugin = require("tailwindcss/plugin");

module.exports = plugin(function ({ addUtilities }) {
  addUtilities({
    ".font-sans": { fontFamily: "IBMPlexSans_400Regular" },
    ".font-normal": { fontFamily: "IBMPlexSans_400Regular" },
    ".font-medium": { fontFamily: "IBMPlexSans_500Medium" },
    ".font-semibold": { fontFamily: "IBMPlexSans_600SemiBold" },
    ".font-bold": { fontFamily: "IBMPlexSans_600SemiBold" },
    ".font-mono": { fontFamily: "IBMPlexMono_500Medium" },
  });
});
