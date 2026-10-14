import { useEffect, useRef, useState } from "react";
import { useReduceMotion } from "../ui/motion";

/** Count a number toward `target` over `ms` with a decelerating ease. Used for balance numbers. */
export function useCountUp(target: number, ms = 600): number {
  const [v, setV] = useState(0);
  const reduce = useReduceMotion();
  const from = useRef(0);
  const cur = useRef(0);
  useEffect(() => {
    if (cur.current === target) return;
    if (reduce) { cur.current = target; setV(target); return; }
    from.current = cur.current;
    const t0 = Date.now();
    let raf: ReturnType<typeof requestAnimationFrame>;
    const tick = () => {
      const p = Math.min(1, (Date.now() - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      cur.current = from.current + (target - from.current) * e;
      setV(cur.current);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, reduce]);
  return v;
}
