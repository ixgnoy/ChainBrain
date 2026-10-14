// ChainBrain network console (web): the whole system at once for the laptop demo, judges and presenter.
// The owner's own app is the phone; this shows the agent, the pockets, the sellers and the chain together. No login.
import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { NetworkProvider, useNetwork } from "./useNetwork";
import { Live } from "./Live";
import { Pockets, OnChain, Judges } from "./pages";
import SellerView from "../seller/SellerView";
import { TestnetChip, TxViewerHost, pocketTag, usd } from "./parts";
import { Settings } from "./Settings";
import { PageTitle } from "../seller/ui";
import { cn } from "../lib/cn";

type Tab = "live" | "pockets" | "sellers" | "chain" | "judges";
const TABS: [Tab, string][] = [["live", "Live"], ["pockets", "Pockets"], ["sellers", "Sellers"], ["chain", "On-chain"], ["judges", "Judges"]];
const parse = (): { tab: Tab; pocket?: string } => {
  const [t, p] = location.hash.slice(1).split("/");
  return { tab: (TABS.some(([id]) => id === t) ? t : "live") as Tab, pocket: p && /^0x[0-9a-fA-F]{40}$/.test(p) ? p : undefined };
};

export function Mark({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <rect width="64" height="64" rx="18" fill="#0F2236" />
      <g fill="none" strokeWidth="5" strokeLinecap="round">
        <rect x="11" y="24" width="26" height="16" rx="8" transform="rotate(-35 24 32)" stroke="#FFFFFF" />
        <rect x="27" y="24" width="26" height="16" rx="8" transform="rotate(-35 40 32)" stroke="#3FB7C4" />
      </g>
    </svg>
  );
}

function PocketPicker({ value, onChange }: { value?: string; onChange(a: string): void }) {
  const { pockets } = useNetwork();
  if (!pockets.length) return null;
  const cur = pockets.find((p) => p.address.toLowerCase() === value?.toLowerCase());
  return (
    <label className="relative flex h-12 items-center gap-2 rounded-full bg-card pl-5 pr-10 text-[15px] font-semibold hover:bg-fill">
      {cur ? `${pocketTag(cur.address, cur.name)} · ${usd(cur.balance)}` : "Choose a pocket"}
      <ChevronDown className="pointer-events-none absolute right-4 size-4 text-muted" />
      <select aria-label="Pocket" value={cur?.address ?? ""} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0">
        {pockets.map((p) => <option key={p.address} value={p.address}>{pocketTag(p.address, p.name)} · {usd(p.balance)}</option>)}
      </select>
    </label>
  );
}

function Shell() {
  const { events, pockets, follow } = useNetwork();
  const [{ tab, pocket: chosen }, setRoute] = useState(parse);
  useEffect(() => { const on = () => setRoute(parse()); addEventListener("hashchange", on); return () => removeEventListener("hashchange", on); }, []);
  // Without a choice, follow the pocket the story is on, else the one the agent touched last (the screen tracks the action by itself).
  const latest = useMemo(() => [...events].reverse().find((e) => typeof e.pocket === "string" && e.pocket.length === 42)?.pocket ?? pockets[0]?.address, [events, pockets]);
  const pocket = chosen ?? follow ?? latest;
  const go = (t: Tab, p = chosen) => { location.hash = p ? `${t}/${p}` : t; setRoute({ tab: t, pocket: p }); scrollTo({ top: 0 }); };
  const openPocket = (p: string) => go("live", p);

  return (
    <TxViewerHost>
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 bg-canvas/95 backdrop-saturate-100">
        <div className="mx-auto flex max-w-[1680px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-8">
          <div className="flex items-center gap-3"><Mark /><div className="leading-tight"><div className="text-[17px] font-bold">ChainBrain</div><div className="text-[13px] text-muted">Network console</div></div></div>
          <nav aria-label="Main" className="-mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none]">
            {TABS.map(([id, label]) => (
              <button key={id} type="button" onClick={() => go(id)} aria-current={tab === id ? "page" : undefined}
                className={cn("h-11 shrink-0 rounded-full px-5 text-[15px] font-medium transition-colors", tab === id ? "bg-ink text-white" : "text-ink2 hover:bg-card hover:text-ink")}>{label}</button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2"><span className="hidden md:block"><TestnetChip /></span><Settings /></div>
        </div>
      </header>
      <main className="mx-auto max-w-[1680px] px-4 pb-16 pt-4 sm:px-8">
        {tab === "live" && (
          <>
            <PageTitle title="Live" sub="The agent's decisions, the pocket it spends from and what each seller sees, as they happen." action={<PocketPicker value={pocket} onChange={(a) => go("live", a)} />} />
            <Live pocket={pocket} />
          </>
        )}
        {tab === "pockets" && <div className="mx-auto max-w-[960px]"><Pockets open={openPocket} /></div>}
        {tab === "sellers" && <div className="mx-auto max-w-[960px]"><PageTitle title="Sellers" sub="The other side of every payment: what each shop sees when an agent buys or gets refused." /><SellerView /></div>}
        {tab === "chain" && <div className="mx-auto max-w-[960px]"><OnChain open={openPocket} /></div>}
        {tab === "judges" && <div className="mx-auto max-w-[960px]"><Judges pocket={pocket} open={openPocket} /></div>}
        <div className="mt-12 text-center md:hidden"><TestnetChip /></div>
      </main>
    </div>
    </TxViewerHost>
  );
}

export default function App() {
  return (
    <NetworkProvider><Shell /></NetworkProvider>
  );
}
