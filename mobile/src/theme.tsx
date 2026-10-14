// Typed theme context built from tokens.ts. Light is the default; dark follows the system or the user's choice (Settings).
// The same mode drives NativeWind's colour scheme, so `dark:` classes and the CSS variables in global.css follow it.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { useColorScheme as useNativeWindScheme } from "nativewind";
import { palette, type Palette } from "./tokens";
import { getItem, setItem } from "./storage";

export type ThemeMode = "system" | "dark" | "light";
type Ctx = { c: Palette; dark: boolean; mode: ThemeMode; setMode: (m: ThemeMode) => void };
const ThemeCtx = createContext<Ctx | null>(null);
const KEY = "cb.theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const { setColorScheme } = useNativeWindScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  useEffect(() => {
    getItem(KEY).then((v) => { if (v === "dark" || v === "light" || v === "system") setModeState(v); });
  }, []);
  const setMode = useCallback((m: ThemeMode) => { setModeState(m); setItem(KEY, m); }, []);
  // Light first: only an explicit dark choice, or a system that reports dark, gives dark.
  const dark = mode === "dark" || (mode === "system" && system === "dark");
  useEffect(() => { setColorScheme(dark ? "dark" : "light"); }, [dark, setColorScheme]);
  const value = useMemo<Ctx>(() => ({ c: dark ? palette.dark : palette.light, dark, mode, setMode }), [dark, mode, setMode]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): Ctx {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error("ThemeProvider missing");
  return v;
}

/** Loaded font family names (see _layout.tsx useFonts). IBM Plex Sans for text, IBM Plex Mono for addresses, hashes and codes. */
export const F = {
  body: "IBMPlexSans_400Regular",
  bodyMed: "IBMPlexSans_500Medium",
  bodySemi: "IBMPlexSans_600SemiBold",
  bodyBold: "IBMPlexSans_600SemiBold",
  display: "IBMPlexSans_600SemiBold",
  displayBold: "IBMPlexSans_600SemiBold",
  mono: "IBMPlexMono_500Medium",
} as const;
