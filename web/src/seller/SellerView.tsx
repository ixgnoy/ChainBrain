// The seller's side of the network (a finals preview in the spec): pick a shop, see its sales and catalogue.
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SellerProvider, useSeller } from "./useSeller";
import { Overview, Sales, Catalogue, type Page } from "./pages";
import { cn } from "../lib/cn";

function ShopSwitch() {
  const { cfg, seller, setSellerId } = useSeller();
  return (
    <label className="relative flex h-12 items-center gap-3 rounded-full bg-card pl-1.5 pr-10 transition-colors hover:bg-fill">
      <span aria-hidden className="grid size-9 place-items-center rounded-full bg-accent text-[14px] font-semibold text-on-accent">{seller.name[0]}</span>
      <span className="text-[15px] font-semibold">{seller.name}</span>
      <ChevronDown className="pointer-events-none absolute right-3.5 size-4 text-muted" />
      <select aria-label="Shop" value={seller.id} onChange={(e) => setSellerId(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0">
        {cfg.sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </label>
  );
}

const TABS: [Page, string][] = [["overview", "Overview"], ["sales", "Sales"], ["catalogue", "Catalogue"]];

function Inner() {
  const [page, setPage] = useState<Page>("overview");
  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <ShopSwitch />
        <nav aria-label="Seller pages" className="flex gap-2">
          {TABS.map(([id, label]) => <button key={id} type="button" onClick={() => setPage(id)} aria-current={page === id ? "page" : undefined} className={cn("h-10 rounded-full px-4 text-[15px] font-medium", page === id ? "bg-ink text-white" : "bg-card text-ink2 hover:bg-fill")}>{label}</button>)}
        </nav>
        <span className="text-[13px] text-muted">Seller view · a finals preview: in the prelim, sellers are plain x402 endpoints.</span>
      </div>
      {page === "overview" ? <Overview go={setPage} /> : page === "sales" ? <Sales /> : <Catalogue />}
    </div>
  );
}

export default function SellerView() {
  return <SellerProvider><Inner /></SellerProvider>;
}
