// The agent's reply arrives word by word (about 130 characters a second, a little uneven, a beat longer after each
// sentence), like a live model streaming. The full text is laid out from the first frame and the unread part is
// transparent, so the bubble never grows or reflows while it types. Reduced motion, or a reply seen before: shown whole.
import React, { useEffect, useRef, useState } from "react";
import { type TextStyle } from "react-native";
import { T } from "./Text";
import { useReduceMotion } from "./motion";

const CPS = 130;

export function StreamText({ text, play, style, onDone }: { text: string; play: boolean; style?: TextStyle; onDone?: () => void }) {
  const reduce = useReduceMotion();
  const animate = play && !reduce && text.length > 0;
  const [n, setN] = useState(animate ? 0 : text.length);
  const done = useRef(!animate);
  useEffect(() => {
    if (!animate) { setN(text.length); return; }
    let i = 0, t: ReturnType<typeof setTimeout>;
    const cps = Math.max(CPS, text.length / 1.8); // a long reply still lands within about two seconds
    const step = () => {
      if (i >= text.length) { done.current = true; onDone?.(); return; }
      let j = text.indexOf(" ", i + 1);
      if (j < 0) j = text.length; else j += 1;
      const chunk = text.slice(i, j);
      i = j;
      setN(i);
      const pause = /[.?!:]\s*$/.test(chunk) ? 170 : /,\s*$/.test(chunk) ? 70 : 0;
      t = setTimeout(step, (chunk.length / cps) * 1000 * (0.7 + Math.random() * 0.6) + pause);
    };
    t = setTimeout(step, 60);
    return () => clearTimeout(t);
  }, [text, animate]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <T v="body" style={style} accessibilityLabel={text}>
      {text.slice(0, n)}
      {n < text.length ? <T v="body" style={{ color: "transparent" }}>{text.slice(n)}</T> : null}
    </T>
  );
}
