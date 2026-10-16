// Minimize-on-scroll state for the glass tab bar. Ported from expo-glass-tabs (MIT, © 2026 David Mokos,
// reference/frontend/glass/expo-glass-tabs/src/minimize-context.tsx), unchanged in behaviour.
import { createContext, use, useMemo, type PropsWithChildren } from "react";
import { useAnimatedScrollHandler, useSharedValue, withSpring, type SharedValue } from "react-native-reanimated";

/** Critically damped: scroll direction flips mid-animation; a spring retargets with its velocity, timing would restart. */
export const MINIMIZE_SPRING = { duration: 380, dampingRatio: 1 };

export type MinimizeState = { progress: SharedValue<number>; target: SharedValue<number> };
const Ctx = createContext<MinimizeState | null>(null);

export function TabBarMinimizeProvider({ children }: PropsWithChildren) {
  const progress = useSharedValue(0);
  const target = useSharedValue(0);
  const state = useMemo(() => ({ progress, target }), [progress, target]);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useMinimizeState(): MinimizeState {
  const shared = use(Ctx);
  const progress = useSharedValue(0);
  const target = useSharedValue(0);
  const local = useMemo(() => ({ progress, target }), [progress, target]);
  return shared ?? local;
}

/** Retarget only when the target changes, so per-frame scroll events never restart the spring. Both threads. */
export function setMinimized(state: MinimizeState, next: 0 | 1) {
  "worklet";
  if (state.target.value !== next) {
    state.target.value = next;
    state.progress.value = withSpring(next, MINIMIZE_SPRING);
  }
}

/** Animated.ScrollView onScroll: scrolling down folds the labels away, scrolling up or near the top brings them back. */
export function useMinimizeOnScroll(scrollY?: SharedValue<number>) {
  const state = useMinimizeState();
  const previousY = useSharedValue(0);
  return useAnimatedScrollHandler({
    onScroll: (e) => {
      if (scrollY) scrollY.value = e.contentOffset.y; // raw, overscroll included (Home's wallet stack spreads on a pull)
      const maxY = Math.max(e.contentSize.height - e.layoutMeasurement.height, 0);
      const y = Math.min(Math.max(e.contentOffset.y, 0), maxY); // ignore rubber-band overscroll
      const dy = y - previousY.value;
      previousY.value = y;
      if (y < 24) setMinimized(state, 0);
      else if (dy > 3) setMinimized(state, 1);
      else if (dy < -3) setMinimized(state, 0);
    },
  });
}
