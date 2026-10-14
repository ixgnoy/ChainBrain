// Typed theme context built from shared/tokens.ts. Dark default, light supported, follows the system unless overridden.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { palette, type Palette } from "./tokens";
import { getItem, setItem } from "./storage";

export type ThemeMode = "system" | "dark" | "light";
type Ctx = { c: Palette; dark: boolean; mode: ThemeMode; setMode: (m: ThemeMode) => void };
const ThemeCtx = createContext<Ctx | null>(null);
const KEY = "cb.theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  useEffect(() => {
    getItem(KEY).then((v) => { if (v === "dark" || v === "light" || v === "system") setModeState(v); });
  }, []);
  const setMode = useCallback((m: ThemeMode) => { setModeState(m); setItem(KEY, m); }, []);
  // "dark first": when the system reports nothing, use dark.
  const dark = mode === "dark" || (mode === "system" && system !== "light");
  const value = useMemo<Ctx>(() => ({ c: dark ? palette.dark : palette.light, dark, mode, setMode }), [dark, mode, setMode]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): Ctx {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error("ThemeProvider missing");
  return v;
}

/** Loaded font family names (see _layout.tsx useFonts). */
export const F = {
  body: "Inter_400Regular",
  bodyMed: "Inter_500Medium",
  bodySemi: "Inter_600SemiBold",
  bodyBold: "Inter_700Bold",
  display: "InterTight_600SemiBold",
  displayBold: "InterTight_700Bold",
  mono: "GeistMono_500Medium",
} as const;
