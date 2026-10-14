import React from "react";
import Svg, { Circle, Path } from "react-native-svg";

type Shape = string | { c: [number, number, number] };
const I: Record<string, Shape[]> = {
  home: ["M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"],
  chat: ["M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 0 1 3.9 11.5 8.5 8.5 0 0 1 12.4 3 8.4 8.4 0 0 1 21 11.5z"],
  activity: ["M22 12h-4l-3 9L9 3l-3 9H2"],
  settings: ["M3 6h9", "M16 6h5", "M3 12h3", "M10 12h11", "M3 18h11", "M18 18h3", { c: [14, 6, 2] }, { c: [8, 12, 2] }, { c: [16, 18, 2] }],
  plus: ["M12 5v14", "M5 12h14"],
  undo: ["M9 14 4 9l5-5", "M4 9h10.5a5.5 5.5 0 0 1 0 11H11"],
  shield: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"],
  shieldCheck: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", "m9 12 2 2 4-4"],
  shieldAlert: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", "M12 8v4", "M12 16h.01"],
  shieldOff: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", "M4 4l16 16"],
  lock: ["M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z", "M8 11V7a4 4 0 0 1 8 0v4"],
  ban: [{ c: [12, 12, 9] }, "M5.6 5.6l12.8 12.8"],
  x: ["M18 6 6 18", "M6 6l12 12"],
  check: ["M20 6 9 17l-5-5"],
  chevronRight: ["m9 18 6-6-6-6"],
  chevronLeft: ["m15 18-6-6 6-6"],
  chevronDown: ["m6 9 6 6 6-6"],
  copy: ["M11 9h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z", "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"],
  external: ["M15 3h6v6", "M10 14 21 3", "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"],
  bolt: ["M13 2 3 14h9l-1 8 10-12h-9z"],
  clock: [{ c: [12, 12, 9] }, "M12 7v5l3 2"],
  send: ["M22 2 11 13", "M22 2l-7 20-4-9-9-4z"],
  arrowUp: ["M12 19V5", "M5 12l7-7 7 7"],
  arrowDown: ["M12 5v14", "M19 12l-7 7-7-7"],
  user: ["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", { c: [12, 7, 4] }],
  sparkle: ["M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z", "M19 16v4", "M17 18h4"],
  key: [{ c: [8, 15, 4] }, "m10.9 12.1 9.1-9.1", "M17 6l3 3", "M14 9l2 2"],
  globe: [{ c: [12, 12, 9] }, "M3 12h18", "M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18"],
  layers: ["M12 2 2 7l10 5 10-5z", "M2 17l10 5 10-5", "M2 12l10 5 10-5"],
  play: ["M6 4l14 8-14 8z"],
  wallet: ["M20 7H5a2 2 0 0 1 0-4h13v4", "M3 5v14a2 2 0 0 0 2 2h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1"],
  moon: ["M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"],
  alert: ["M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z", "M12 9v4", "M12 17h.01"],
  refresh: ["M21 12a9 9 0 1 1-3-6.7L21 8", "M21 3v5h-5"],
  trash: ["M3 6h18", "M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2", "M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"],
  tag: ["M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z", "M7 7h.01"],
};

export type IconName = keyof typeof I;

export function Icon({ name, size = 22, color = "#fff", stroke = 1.9 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {I[name].map((s, i) => typeof s === "string" ? <Path key={i} d={s} /> : <Circle key={i} cx={s.c[0]} cy={s.c[1]} r={s.c[2]} />)}
    </Svg>
  );
}
