// How far text may grow with the phone's text size (iOS Dynamic Type, Android font scale). Body text grows the most; headings,
// figures and card print less (they are already large, and a wide display face runs out of room first); tab-bar labels least
// (iOS keeps tab bars compact). Rolling figures size themselves with `useTextScale` because their reels have fixed heights.
import React, { createContext, useContext } from "react";
import { useWindowDimensions } from "react-native";

export const GROW = { body: 1.6, heading: 1.3, figure: 1.25, chrome: 1.15 } as const;
export type Grow = keyof typeof GROW;

/** A region whose text grows less or not at all (a pocket card's print is fixed like a real card's). */
const Cap = createContext<number>(Infinity);
export const TextScaleCap = ({ max, children }: { max: number; children: React.ReactNode }) => React.createElement(Cap.Provider, { value: max }, children);
/** The cap for this kind of text inside the current region. */
export function useGrowCap(kind: Grow = "body") { return Math.min(GROW[kind], useContext(Cap)); }

/** The system text scale, capped for this kind of text (and the region). */
export function useTextScale(kind: Grow = "body") {
  const { fontScale } = useWindowDimensions();
  return Math.max(1, Math.min(fontScale || 1, useGrowCap(kind)));
}
