import { useCallback, useEffect, useState } from "react";

export type ThemeChoice = "system" | "light" | "dark";
const KEY = "cb-theme";
const sys = () => (typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
const read = (): ThemeChoice => { try { const v = localStorage.getItem(KEY); return v === "light" || v === "dark" ? v : "system"; } catch { return "system"; } };

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(read);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(sys);
  const resolved = choice === "system" ? systemTheme : choice;

  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: light)");
    const on = () => setSystemTheme(mq.matches ? "light" : "dark");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  useEffect(() => { document.documentElement.dataset.theme = resolved; }, [resolved]);

  const set = useCallback((c: ThemeChoice) => {
    setChoice(c);
    try { if (c === "system") localStorage.removeItem(KEY); else localStorage.setItem(KEY, c); } catch { /* storage blocked */ }
  }, []);
  return { choice, resolved, set };
}
