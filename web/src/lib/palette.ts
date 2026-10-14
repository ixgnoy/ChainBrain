// Live theme colours for canvas/WebGL components (React Bits backgrounds take hex, not CSS variables).
import { useEffect, useState } from "react";

export type Ink = { bg: string; e1: string; fg: string; t3: string; hair2: string; accent: string; accentHi: string; dot: string; dark: boolean };

const read = (): Ink => {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string) => cs.getPropertyValue(n).trim();
  return { bg: v("--bg"), e1: v("--e1"), fg: v("--fg"), t3: v("--t3"), hair2: v("--hair2"), accent: v("--accent"), accentHi: v("--accent-hi"), dot: v("--dot"), dark: document.documentElement.dataset.theme === "dark" };
};

/** Re-reads the tokens whenever <html data-theme> changes. */
export function useInk(): Ink {
  const [ink, setInk] = useState(read);
  useEffect(() => {
    const mo = new MutationObserver(() => setInk(read()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  return ink;
}

/** prefers-reduced-motion as state (React Bits text effects do not check it themselves). */
export function useReducedMotionPref(): boolean {
  const q = "(prefers-reduced-motion: reduce)";
  const [r, setR] = useState(() => typeof matchMedia !== "undefined" && matchMedia(q).matches);
  useEffect(() => {
    const mq = matchMedia(q);
    const on = () => setR(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return r;
}
