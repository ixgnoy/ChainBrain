// Minimize-on-scroll state for the floating tab bar.
// Ported from expo-glass-tabs (MIT, David Mokos): src/minimize-context.tsx. See THIRD_PARTY.md.
import { createContext, useContext, useMemo, type PropsWithChildren } from "react";
import { useAnimatedScrollHandler, useSharedValue, withSpring, type SharedValue } from "react-native-reanimated";
import { useReduceMotion } from "./motion";

export const MINIMIZE_SPRING = { duration: 380, dampingRatio: 1 };
export type MinimizeState = { progress: SharedValue<number>; target: SharedValue<number>; reduce: SharedValue<number> };
const Ctx = createContext<MinimizeState | null>(null);

export function TabBarMinimizeProvider({ children }: PropsWithChildren) {
  const progress = useSharedValue(0);
  const target = useSharedValue(0);
  const reduce = useSharedValue(0);
  const rm = useReduceMotion();
  reduce.value = rm ? 1 : 0;
  const state = useMemo(() => ({ progress, target, reduce }), [progress, target, reduce]);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useMinimizeState(): MinimizeState {
  const shared = useContext(Ctx);
  const progress = useSharedValue(0);
  const target = useSharedValue(0);
  const reduce = useSharedValue(0);
  const local = useMemo(() => ({ progress, target, reduce }), [progress, target, reduce]);
  return shared ?? local;
}

export function setMinimized(state: MinimizeState, next: 0 | 1) {
  "worklet";
  if (state.target.value !== next) {
    state.target.value = next;
    state.progress.value = state.reduce.value ? next : withSpring(next, MINIMIZE_SPRING);
  }
}

/** Scroll handler for Animated.ScrollView / FlatList: down minimizes, up (or near top) expands. */
export function useMinimizeOnScroll() {
  const state = useMinimizeState();
  const previousY = useSharedValue(0);
  return useAnimatedScrollHandler({
    onScroll: (event) => {
      const maxY = Math.max(event.contentSize.height - event.layoutMeasurement.height, 0);
      const y = Math.min(Math.max(event.contentOffset.y, 0), maxY);
      const dy = y - previousY.value;
      previousY.value = y;
      if (y < 24) setMinimized(state, 0);
      else if (dy > 3) setMinimized(state, 1);
      else if (dy < -3) setMinimized(state, 0);
    },
  });
}
