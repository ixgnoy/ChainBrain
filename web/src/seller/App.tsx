import { useEffect, useState } from "react";
import { LayoutGrid, ArrowDownLeft, Tag, MessageSquareText, ChevronDown } from "lucide-react";
import { EventsProvider } from "../useEvents";
import { SellerProvider, useSeller } from "./useSeller";
import { Overview, Sales, Catalogue, Response, type Page } from "./pages";
import { cn } from "../lib/cn";

const NAV: { id: Page; label: string; Icon: typeof LayoutGrid }[] = [
  { id: "overview", label: "Overview", Icon: LayoutGrid },
  { id: "sales", label: "Sales", Icon: ArrowDownLeft },
  { id: "catalogue", label: "Catalogue", Icon: Tag },
  { id: "response", label: "Response content", Icon: MessageSquareText },
];
const pageFromHash = (): Page => { const h = location.hash.slice(1); return (NAV.some((n) => n.id === h) ? h : "overview") as Page; };

function Mark({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <rect width="64" height="64" rx="18" fill="#111318" />
      <g fill="none" strokeWidth="5" strokeLinecap="round">
        <rect x="11" y="24" width="26" height="16" rx="8" transform="rotate(-35 24 32)" stroke="#FFFFFF" />
        <rect x="27" y="24" width="26" height="16" rx="8" transform="rotate(-35 40 32)" stroke="#3FBF86" />
      </g>
    </svg>
  );
}

function SellerSwitch({ compact }: { compact?: boolean }) {
  const { cfg, seller, setSellerId } = useSeller();
  return (
    <label className={cn("relative flex items-center gap-3 rounded-full bg-fill pl-1.5 pr-10 transition-colors hover:bg-line", compact ? "h-11" : "h-14")}>
      <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-full bg-accent font-semibold text-on-accent", compact ? "size-8 text-[13px]" : "size-11 text-[15px]")}>{seller.name[0]}</span>
      <span className="min-w-0 leading-tight"><span className="block truncate text-[15px] font-semibold">{seller.name}</span>{!compact && <span className="block truncate text-[13px] text-muted">{seller.category}</span>}</span>
      <ChevronDown className="pointer-events-none absolute right-3.5 size-4 text-muted" />
      <select aria-label="Shop" value={seller.id} onChange={(e) => setSellerId(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0">
        {cfg.sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </label>
  );
}

function Shell() {
  const { network, mode } = useSeller();
  const [page, setPage] = useState<Page>(pageFromHash);
  useEffect(() => { const on = () => setPage(pageFromHash()); addEventListener("hashchange", on); return () => removeEventListener("hashchange", on); }, []);
  const go = (p: Page) => { location.hash = p; setPage(p); scrollTo({ top: 0 }); };

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-[272px] shrink-0 flex-col bg-card px-5 py-6 lg:flex" aria-label="Sidebar">
        <div className="flex items-center gap-3 px-1"><Mark /><div className="leading-tight"><div className="text-[17px] font-bold">ChainBrain</div><div className="text-[13px] text-muted">for sellers</div></div></div>
        <div className="mt-8"><SellerSwitch /></div>
        <nav className="mt-8 space-y-1" aria-label="Main">
          {NAV.map(({ id, label, Icon }) => (
            <button key={id} type="button" onClick={() => go(id)} aria-current={page === id ? "page" : undefined}
              className={cn("flex h-12 w-full items-center gap-3 rounded-full px-4 text-[15px] font-medium transition-colors", page === id ? "bg-fill text-accent" : "text-ink2 hover:bg-canvas hover:text-ink")}>
              <Icon className="size-5" strokeWidth={1.75} aria-hidden />{label}
            </button>
          ))}
        </nav>
        <div className="mt-auto px-1 text-[13px] text-muted">{mode === "demo" ? "Demo data · the wallet server is not reachable" : network}</div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 bg-canvas/95 px-4 pb-3 pt-4 lg:hidden">
          <div className="flex items-center justify-between gap-3"><Mark size={36} /><SellerSwitch compact /></div>
          <nav className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" aria-label="Main">
            {NAV.map(({ id, label }) => (
              <button key={id} type="button" onClick={() => go(id)} aria-current={page === id ? "page" : undefined}
                className={cn("h-10 shrink-0 rounded-full px-4 text-[15px] font-medium", page === id ? "bg-ink text-white" : "bg-card text-ink2")}>{id === "response" ? "Response" : label}</button>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-[880px] px-4 py-8 sm:px-8 lg:py-14">
          {page === "overview" ? <Overview go={go} /> : page === "sales" ? <Sales /> : page === "catalogue" ? <Catalogue /> : <Response />}
          <p className="mt-16 text-center text-[13px] text-muted lg:hidden">{mode === "demo" ? "Demo data · the wallet server is not reachable" : network}</p>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <EventsProvider>
      <SellerProvider><Shell /></SellerProvider>
    </EventsProvider>
  );
}
