// How the phone is tilted, for the 2.5D pocket cards: one rotation sensor for the whole app, read on the UI thread
// (Reanimated's useAnimatedSensor, no JS round trip). Tilt is relative to how the phone is being held: a slow baseline
// follows the hand, so only quick turns move the cards. x, y are -1..1 (x: rolled right, y: pitched towards you).
// Reduce Motion, web and a phone without the sensor: always 0.
import React, { createContext, useContext } from "react";
import { Platform } from "react-native";
import { SensorType, useAnimatedReaction, useAnimatedSensor, useSharedValue, type SharedValue } from "react-native-reanimated";
import { useReduceMotion } from "./motion";

export type Tilt = { x: SharedValue<number>; y: SharedValue<number> };
const Ctx = createContext<Tilt | null>(null);

/** Range of a full tilt in radians away from the baseline (about 20°), and how fast the baseline follows the hand. */
const RANGE = 0.35;
const FOLLOW = 0.025;

function SensorTilt({ x, y }: Tilt) {
  const sensor = useAnimatedSensor(SensorType.ROTATION, { interval: 16 });
  const base = useSharedValue<{ pitch: number; roll: number } | null>(null);
  useAnimatedReaction(() => sensor.sensor.value, (v) => {
    if (!v || (v.pitch === 0 && v.roll === 0)) return;
    const b = base.value ?? { pitch: v.pitch, roll: v.roll };
    const nb = { pitch: b.pitch + (v.pitch - b.pitch) * FOLLOW, roll: b.roll + (v.roll - b.roll) * FOLLOW };
    base.value = nb;
    x.value = Math.max(-1, Math.min(1, (v.roll - nb.roll) / RANGE));
    y.value = Math.max(-1, Math.min(1, (v.pitch - nb.pitch) / RANGE));
  });
  return null;
}

export function TiltProvider({ children }: { children: React.ReactNode }) {
  const reduce = useReduceMotion();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const live = Platform.OS !== "web" && !reduce;
  return (
    <Ctx.Provider value={{ x, y }}>
      {live ? <SensorTilt x={x} y={y} /> : null}
      {children}
    </Ctx.Provider>
  );
}

/** The app's tilt; a still pair of zeros outside the provider (tests, isolated renders). */
export function useTilt(): Tilt {
  const t = useContext(Ctx);
  const zx = useSharedValue(0);
  const zy = useSharedValue(0);
  return t ?? { x: zx, y: zy };
}
