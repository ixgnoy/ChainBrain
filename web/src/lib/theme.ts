import { useCallback, useEffect, useState } from "react";

export type ThemeChoice = "system" | "light" | "dark";
export const THEME_KEY = "cb-theme";
export const resolveTheme = (choice: ThemeChoice, system: "light" | "dark"): "light" | "dark" => (choice === "system" ? system : choice);
export const nextChoice = (c: ThemeChoice): ThemeChoice => ({ system: "light", light: "dark", dark: "system" } as const)[c];
export const parseChoice = (v: string | null | undefined): ThemeChoice => (v === "light" || v === "dark" ? v : "system");

const sys = (): "light" | "dark" => (typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
const read = (): ThemeChoice => { try { return parseChoice(localStorage.getItem(THEME_KEY)); } catch { return "system"; } };

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(read);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(sys);
  const resolved = resolveTheme(choice, systemTheme);

  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: light)");
    const on = () => setSystemTheme(mq.matches ? "light" : "dark");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  useEffect(() => { document.documentElement.dataset.theme = resolved; }, [resolved]);

  const set = useCallback((c: ThemeChoice) => {
    setChoice(c);
    try { if (c === "system") localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, c); } catch { /* storage blocked: per-viewer convenience only */ }
  }, []);
  return { choice, resolved, set };
}
