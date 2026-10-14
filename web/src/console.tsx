// App-wide state: server config, the connected owner (MetaMask or dev signer), the local pocket list, role and view.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Address } from "viem";
import { loadConfig, store, type Config } from "./shared";
import { connect as connectWallet, disconnect as disconnectWallet, setProvider, usdcBalance } from "./wallet";
import { createDevProvider } from "./devSigner";
import { devRpcUrl, fundDevSigner } from "./dev";
import { useDev } from "./useDev";
import { useEvents } from "./useEvents";
import { effectiveView, viewsFor, type Role, type View } from "./lib/view";
import { API } from "./shared";

export type { Role, View };
export type SignerKind = "wallet" | "dev";

type Console = {
  cfg?: Config; cfgError: string; retryConfig(): void;
  owner?: Address; signerKind?: SignerKind; mainBalance?: bigint; connecting: boolean; connectError: string;
  connectInjected(): Promise<void>; connectDev(): Promise<void>; disconnect(): void;
  pockets: Address[]; active?: Address; setActive(p: Address): void; addPocket(p: Address): void;
  refresh: number; bump(): void;
  role: Role; setRole(r: Role): void; view: View; setView(v: View): void; readOnly: boolean;
};
const Ctx = createContext<Console | null>(null);
export const useConsole = () => { const c = useContext(Ctx); if (!c) throw new Error("ConsoleProvider missing"); return c; };

const msg = (e: unknown) => ((e as Error)?.message ?? String(e)).split("\n")[0];

export function ConsoleProvider({ children }: { children: ReactNode }) {
  const dev = useDev();
  const { events } = useEvents();
  const [cfg, setCfg] = useState<Config>();
  const [cfgError, setCfgError] = useState("");
  const [owner, setOwner] = useState<Address>();
  const [signerKind, setSignerKind] = useState<SignerKind>();
  const [mainBalance, setMain] = useState<bigint>();
  const [pockets, setPockets] = useState<Address[]>([]);
  const [active, setActiveState] = useState<Address>();
  const [refresh, setRefresh] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [role, setRoleState] = useState<Role>("owner");
  const [view, setViewState] = useState<View>("operate");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    loadConfig().then((c) => { if (live) { setCfg(c); setCfgError(""); } })
      .catch(() => { if (live) { setCfgError(`Wallet API not reachable at ${API}. Start the server (pnpm dev in server/) or the dev stack.`); setTimeout(() => setAttempt((n) => n + 1), 5000); } });
    return () => { live = false; };
  }, [attempt]);

  useEffect(() => {
    if (!owner) { setPockets([]); setActiveState(undefined); return; }
    const mine = store.get<Address[]>(`pockets:${owner.toLowerCase()}`, []);
    setPockets(mine);
    setActiveState((a) => a ?? mine[0]);
  }, [owner]);
  useEffect(() => { if (owner && cfg) usdcBalance(owner).then(setMain).catch(() => {}); }, [owner, cfg, refresh]);
  // a settled payment changes balances: re-read
  const payments = events.filter((e) => e.type === "payment").length;
  useEffect(() => { if (payments) setRefresh((n) => n + 1); }, [payments]);

  const finish = (addr: Address, kind: SignerKind) => { setOwner(addr); setSignerKind(kind); };
  const connectInjected = useCallback(async () => {
    setConnecting(true); setConnectError("");
    try { setProvider(undefined); finish(await connectWallet(), "wallet"); } catch (e) { setConnectError(msg(e)); } finally { setConnecting(false); }
  }, []);
  const connectDev = useCallback(async () => {
    if (!dev.state) return;
    setConnecting(true); setConnectError("");
    try {
      const p = createDevProvider(devRpcUrl(dev.state, API), dev.state.owner);
      await fundDevSigner(dev.state.owner).catch(() => {}); // already funded or older dev stack: carry on
      finish(await connectWallet(p), "dev");
    } catch (e) { setConnectError(msg(e)); } finally { setConnecting(false); }
  }, [dev.state]);
  const disconnect = useCallback(() => { disconnectWallet(); setOwner(undefined); setSignerKind(undefined); setMain(undefined); }, []);

  // leaving dev mode (server swapped for the real one) drops the dev signer
  useEffect(() => { if (dev.state === null && signerKind === "dev") disconnect(); }, [dev.state, signerKind, disconnect]);

  const addPocket = useCallback((p: Address) => {
    setPockets((xs) => {
      const next = [p, ...xs.filter((x) => x.toLowerCase() !== p.toLowerCase())];
      if (owner) store.set(`pockets:${owner.toLowerCase()}`, next);
      return next;
    });
    setActiveState(p);
    setRefresh((n) => n + 1);
  }, [owner]);

  const setRole = useCallback((r: Role) => { setRoleState(r); setViewState(r === "owner" ? "operate" : "bank"); }, []);
  const bump = useCallback(() => setRefresh((n) => n + 1), []);
  const value = useMemo<Console>(() => ({
    cfg, cfgError, retryConfig: () => setAttempt((n) => n + 1), owner, signerKind, mainBalance, connecting, connectError,
    connectInjected, connectDev, disconnect, pockets, active, setActive: setActiveState, addPocket, refresh, bump,
    role, setRole, view: effectiveView(role, view), setView: setViewState, readOnly: role === "regulator",
  }), [cfg, cfgError, owner, signerKind, mainBalance, connecting, connectError, connectInjected, connectDev, disconnect, pockets, active, addPocket, refresh, bump, role, setRole, view]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export { viewsFor };
