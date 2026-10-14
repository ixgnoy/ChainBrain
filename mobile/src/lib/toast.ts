// Tiny toast channel (no React Native imports): notify("text") shows a short message at the bottom of the screen.
type Fn = (msg: string) => void;
let sink: Fn | null = null;
export const setToastSink = (f: Fn | null) => { sink = f; };
export const notify = (msg: string) => { sink?.(msg); };
export const DEMO_MSG = "Not available in demo data";
