// ChainBrain network console (web): the whole system at once for the laptop demo, judges and presenter.
// The owner's own app is the phone; this shows the agent, the pockets, the sellers and the chain together. No login.
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { NetworkProvider, useNetwork } from "./useNetwork";
import { Live } from "./Live";
import { Pockets, Judges } from "./pages";
import { Explorer } from "./Explorer";
import { Evidence } from "./Evidence";
import SellerView from "../seller/SellerView";
import { PhoneTag, TestnetChip, usd } from "./parts";
import { Stepper } from "./Stepper";
import { Kbd } from "./kit";
import { eventPocket } from "../lib/events";
import { Settings } from "./Settings";
import { Protected } from "./Protected";
import { PageTitle, PillSelect } from "../seller/ui";
import { cn } from "../lib/cn";
import { parseExplorer, splitHash, type ExplorerRoute } from "./route";

type Tab = "live" | "pockets" | "sellers" | "explorer" | "evidence" | "judges";
const TABS: [Tab, string][] = [["live", "Live"], ["pockets", "Pockets"], ["sellers", "Sellers"], ["explorer", "Explorer"], ["evidence", "Evidence"], ["judges", "Judges"]];
const ADDR = /^0x[0-9a-fA-F]{40}$/;
type Route = { tab: Tab; pocket?: string; present: boolean; explorer: ExplorerRoute };
const HOME: ExplorerRoute = { kind: "home" };
/** #live, #judges/0x… (a pinned pocket), #present (presenter mode), #explorer, #explorer/tx/0x…, #explorer/block/n, #explorer/address/0x…. */
export const parseRoute = (hash = location.hash): Route => {
  const { path, tx } = splitHash(hash);
  const [t, p] = path.split("/");
  if (tx) return { tab: "explorer", present: false, explorer: { kind: "tx", hash: tx } }; // an older shared `?tx=` link
  if (t === "explorer" || t === "chain") return { tab: "explorer", present: false, explorer: parseExplorer(path) };
  const pocket = p && ADDR.test(p) ? p : undefined;
  if (t === "present") return { tab: "live", pocket, present: true, explorer: HOME };
  return { tab: (TABS.some(([id]) => id === t) ? t : "live") as Tab, pocket, present: false, explorer: HOME };
};
const toHash = (r: Route) => (r.present ? "present" : r.tab) + (r.pocket ? `/${r.pocket}` : "");

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
  const { pockets, listed, nameOf, isPhone } = useNetwork();
  if (!pockets.length) return null;
  const cur = pockets.find((p) => p.address.toLowerCase() === value?.toLowerCase());
  const shownPockets = listed([value]);
  return (
    <PillSelect label="Pocket" value={cur?.address ?? ""} onChange={onChange}
      shown={cur ? <>{nameOf(cur.address)}{isPhone(cur.address) && <PhoneTag />}<span className="num ml-2 font-medium text-ink2">{usd(cur.balance)}</span></> : "Choose a pocket"}>
      {shownPockets.map((p) => <option key={p.address} value={p.address}>{nameOf(p.address)} · {usd(p.balance)}</option>)}
    </PillSelect>
  );
}

function Shell() {
  const { events, pockets, follow, linked, phonePockets } = useNetwork();
  const [route, setRoute] = useState(parseRoute);
  const { tab, pocket: pinned, present } = route;
  useEffect(() => { const on = () => { setRoute(parseRoute()); scrollTo({ top: 0 }); }; addEventListener("hashchange", on); return () => removeEventListener("hashchange", on); }, []);
  // ONE pocket per render: the one a person picked, else the one the story (or the linked phone) is on, else the last one touched.
  // Trace, balance, rules and sellers all read this same value.
  const latest = useMemo(() => [...events].reverse().map(eventPocket).find(Boolean) ?? pockets[0]?.address, [events, pockets]);
  const pocket = pinned ?? follow ?? latest;
  const go = (next: Omit<Partial<Route>, "pocket"> & { pocket?: string | null }) => {
    const r: Route = { tab: next.tab ?? tab, present: next.present ?? present, pocket: next.pocket === null ? undefined : next.pocket ?? pinned, explorer: HOME };
    location.hash = toHash(r); setRoute(r); scrollTo({ top: 0 });
  };
  const openPocket = (p: string) => go({ tab: "live", present: false, pocket: p });
  // with a phone linked, "watch it in Live" keeps following the phone instead of pinning a pocket
  const watchLive = (p: string) => (linked && phonePockets.some((a) => a.toLowerCase() === p.toLowerCase()) ? go({ tab: "live", present: false, pocket: null }) : openPocket(p));
  const following = !pinned;

  const nav = (
    <nav aria-label="Main" className="fixed inset-x-3 bottom-3 z-30 flex gap-1 rounded-full bg-card p-1.5 shadow-[0_8px_24px_rgba(17,19,24,0.08)] md:static md:inset-auto md:bottom-auto md:z-auto md:bg-transparent md:p-0 md:shadow-none">
      {TABS.map(([id, label]) => (
        <button key={id} type="button" onClick={() => go({ tab: id })} aria-current={tab === id ? "page" : undefined}
          className={cn("h-11 min-w-0 flex-1 whitespace-nowrap rounded-full px-1 text-[12.5px] font-semibold transition-colors md:h-11 md:flex-none md:px-5 md:text-[15px] md:font-medium", tab === id ? "bg-accent-soft text-accent" : "text-ink2 hover:bg-fill md:hover:bg-card")}>{label}</button>
      ))}
    </nav>
  );

  return (
        <div className="min-h-dvh">
      {present ? (
        <div className="mx-auto flex max-w-[1680px] flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 pb-1 pt-2 sm:px-8">
          <div className="flex min-w-0 items-center gap-3 text-[15px] font-semibold"><Mark size={28} />ChainBrain</div>
          <div className="min-w-0 max-sm:order-3 max-sm:w-full sm:ml-3 [&_label]:max-w-full"><PocketPicker value={pocket} onChange={(a) => go({ pocket: a })} /></div>
          <span className="ml-auto mr-2 hidden sm:block"><Protected big /></span>
          <button type="button" onClick={() => go({ present: false })} className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-semibold text-ink2 hover:bg-card"><X className="size-4" strokeWidth={1.75} />Exit presenter<Kbd className="ml-1 hidden sm:inline-flex">Esc</Kbd></button>
        </div>
      ) : (
        <header className="sticky top-0 z-30 bg-canvas">
          <div className="mx-auto flex max-w-[1680px] items-center gap-x-6 px-4 py-3 sm:px-8 sm:py-4">
            <div className="flex items-center gap-3"><Mark /><div className="leading-tight"><div className="text-[17px] font-bold">ChainBrain</div><div className="text-[13px] text-muted">Network console</div></div></div>
            <div className="hidden md:block">{nav}</div>
            <div className="ml-auto flex items-center gap-2"><span className="hidden lg:block"><TestnetChip /></span><Settings presenter={() => go({ present: true })} /></div>
          </div>
        </header>
      )}
      <main className={cn("mx-auto max-w-[1680px] px-4 sm:px-8", present ? "pt-1 pb-[calc(var(--stepper-h,6rem)+0.5rem)]" : "pt-4 pb-28 md:pb-16")}>
        {tab === "live" && (
          <>
            <h1 className="sr-only">Live</h1>
            {!present && <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <PocketPicker value={pocket} onChange={(a) => go({ pocket: a })} />
              <Protected className="max-sm:order-last" />
              {linked && following && <span data-testid="following" className="inline-flex items-center gap-2 text-[14px] font-medium text-ink2"><span className="size-2 rounded-full bg-accent" aria-hidden />Following your phone</span>}
              {!following && <button type="button" onClick={() => go({ pocket: null })} className="inline-flex h-11 items-center rounded-full px-3 text-[14px] font-semibold text-accent hover:bg-accent-soft">{linked ? "Follow your phone" : "Follow the story"}</button>}
            </div>}
            <Live pocket={pocket} present={present} goJudges={() => go({ tab: "judges" })} />
          </>
        )}
        {!present && tab === "pockets" && <div className="mx-auto max-w-[1040px]"><Pockets open={openPocket} /></div>}
        {!present && tab === "sellers" && <div className="mx-auto max-w-[1040px]"><PageTitle title="Sellers" sub="The other side of every payment: what each shop sees when an agent buys or gets refused." /><SellerView /></div>}
        {!present && tab === "explorer" && <Explorer route={route.explorer} watch={watchLive} />}
        {!present && tab === "evidence" && <div className="mx-auto max-w-[1180px]"><Evidence /></div>}
        {!present && tab === "judges" && <div className="mx-auto max-w-[1040px]"><Judges pocket={pocket} open={watchLive} /></div>}
        {!present && <div className="mt-12 text-center lg:hidden"><TestnetChip /></div>}
      </main>
      {!present && <div className="md:hidden">{nav}</div>}
      {present && <Stepper pocket={pocket} onExit={() => go({ present: false })} />}
    </div>
  );
}

export default function App() {
  return (
    <NetworkProvider><Shell /></NetworkProvider>
  );
}
