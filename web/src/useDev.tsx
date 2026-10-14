// Dev-stack mode: detected from GET /dev/health, re-checked every 15 s (the server may be swapped under the page).
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { detectDev, devRpcUrl, loadScenes, type DevInfo, type DevScene } from "./dev";
import { setReadRpc } from "./wallet";
import { API } from "./shared";

/** state: undefined = still checking, null = real server, DevInfo = local fork dev stack. */
type DevValue = { state: DevInfo | null | undefined; scenes: DevScene[] };
const Ctx = createContext<DevValue>({ state: undefined, scenes: [] });

export function DevProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DevInfo | null | undefined>(undefined);
  const [scenes, setScenes] = useState<DevScene[]>([]);
  useEffect(() => {
    let live = true;
    const check = () => void detectDev().then((d) => live && setState((prev) => (JSON.stringify(prev) === JSON.stringify(d) ? prev : d)));
    check();
    const t = setInterval(check, 15_000);
    return () => { live = false; clearInterval(t); };
  }, []);
  useEffect(() => {
    setReadRpc(state ? devRpcUrl(state, API) : undefined);
    if (!state) { setScenes([]); return; }
    let live = true;
    void loadScenes().then((s) => live && setScenes(s));
    return () => { live = false; };
  }, [state]);
  const value = useMemo(() => ({ state, scenes }), [state, scenes]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useDev = () => useContext(Ctx);
