import { useEffect, useState } from "react";
import type { Address } from "viem";
import { loadConfig, store, type Config } from "./shared";
import { connect, usdcBalance } from "./wallet";
import { useEvents, approvalsFrom } from "./useEvents";
import { Home } from "./screens/Home";
import { NewPocket } from "./screens/NewPocket";
import { PocketDetail } from "./screens/PocketDetail";
import { Chat } from "./screens/Chat";
import { ApprovalSheet } from "./screens/ApprovalSheet";
import { RedTeam } from "./screens/RedTeam";

export default function App() {
  const [cfg, setCfg] = useState<Config>();
  const [owner, setOwner] = useState<Address>();
  const [main, setMain] = useState<bigint>();
  const [pockets, setPockets] = useState<Address[]>([]);
  const [active, setActive] = useState<Address>();
  const [creating, setCreating] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [err, setErr] = useState("");
  const events = useEvents(active);
  const sheet = approvalsFrom(events).find((a) => a.kind === "payment" && a.status === "pending");

  useEffect(() => { loadConfig().then(setCfg).catch(() => setErr("Wallet API not reachable: start `pnpm dev` in server/.")); }, []);
  useEffect(() => {
    if (!owner) return;
    const mine = store.get<Address[]>(`pockets:${owner.toLowerCase()}`, []);
    setPockets(mine);
    setActive((a) => a ?? mine[0]);
  }, [owner]);
  useEffect(() => { if (owner) usdcBalance(owner).then(setMain).catch(() => {}); }, [owner, refresh]);
  // a payment or refusal changes balances: re-read
  useEffect(() => { if (events.at(-1)?.type === "payment") setRefresh((n) => n + 1); }, [events.length]);

  const onCreated = (p: Address) => {
    const next = [p, ...pockets];
    store.set(`pockets:${owner!.toLowerCase()}`, next);
    setPockets(next);
    setActive(p);
    setCreating(false);
    setRefresh((n) => n + 1);
  };

  if (err) return <main className="center"><p className="error">{err}</p></main>;
  if (!cfg) return <main className="center">Loading…</main>;
  if (!owner)
    return (
      <main className="center">
        <h1>链AI脑 ChainBrain</h1>
        <p>Give your AI a pocket, not your wallet.</p>
        <button onClick={() => connect().then(setOwner).catch((e) => setErr(e.message))}>Connect wallet</button>
      </main>
    );

  return (
    <main className="layout">
      <header><h1>链AI脑 ChainBrain</h1><span className="muted">Base Sepolia · test USDC</span></header>
      <div className="left">
        {active ? <Chat pocket={active} events={events} /> : <section className="card muted">Create a pocket to start a task.</section>}
        <RedTeam cfg={cfg} />
      </div>
      <div className="right">
        <Home owner={owner} mainBalance={main} pockets={pockets} active={active} onOpen={(p) => { setActive(p); setCreating(false); }} onNew={() => setCreating(true)} refresh={refresh} />
        {creating ? <NewPocket cfg={cfg} onCreated={onCreated} onCancel={() => setCreating(false)} />
          : active && <PocketDetail cfg={cfg} pocket={active} events={events} refresh={refresh} onChanged={() => setRefresh((n) => n + 1)} />}
      </div>
      {sheet && <ApprovalSheet approval={sheet} onDone={() => setRefresh((n) => n + 1)} />}
    </main>
  );
}
