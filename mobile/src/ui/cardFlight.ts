// The shared-element-like hand-off between a Home card and the pocket page's header card. Expo Go has no shared element
// transitions, so Home measures the card, starts a flight here, and a host at the root draws an overlay card that travels
// to the page's card position (components/CardFlight.tsx). The page keeps its own card hidden until the flight lands.
import { useSyncExternalStore } from "react";

export type Rect = { x: number; y: number; w: number; h: number };
export type Flight = { id: number; pocket: string; from: Rect; tone: "navy" | "teal" } | null;

let flight: Flight = null;
let n = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export const startFlight = (pocket: string, from: Rect, tone: "navy" | "teal") => { flight = { id: ++n, pocket: pocket.toLowerCase(), from, tone }; emit(); };
export const endFlight = (id?: number) => { if (flight && (id == null || flight.id === id)) { flight = null; emit(); } };
export const currentFlight = () => flight;
export const useFlight = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => flight, () => flight);
