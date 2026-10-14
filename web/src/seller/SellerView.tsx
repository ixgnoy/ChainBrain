// The seller's side of the network (a finals preview in the spec): pick a shop, see its sales and catalogue.
import { useState } from "react";
import { SellerProvider, useSeller } from "./useSeller";
import { Overview, Sales, Catalogue, type Page } from "./pages";
import { PillSelect, Pill, tabPill } from "./ui";

function ShopSwitch() {
  const { cfg, seller, setSellerId } = useSeller();
  return (
    <PillSelect label="Shop" value={seller.id} onChange={setSellerId} shown={<span className="flex items-center gap-2.5"><span aria-hidden className="grid size-8 place-items-center rounded-full bg-accent text-[13px] font-semibold text-on-accent">{seller.name[0]}</span>{seller.name}</span>}>
      {cfg.sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
    </PillSelect>
  );
}

const TABS: [Page, string][] = [["overview", "Overview"], ["sales", "Sales"], ["catalogue", "Catalogue"]];

function Inner() {
  const [page, setPage] = useState<Page>("overview");
  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <ShopSwitch />
        <nav aria-label="Seller pages" className="flex flex-wrap gap-2">
          {TABS.map(([id, label]) => <button key={id} type="button" onClick={() => setPage(id)} aria-current={page === id ? "page" : undefined} className={tabPill(page === id)}>{label}</button>)}
        </nav>
        <Pill tone="neutral" className="ml-auto" ><span title="In the prelim, sellers are plain x402 endpoints">Finals preview</span></Pill>
      </div>
      {page === "overview" ? <Overview go={setPage} /> : page === "sales" ? <Sales /> : <Catalogue />}
    </div>
  );
}

export default function SellerView() {
  return <SellerProvider><Inner /></SellerProvider>;
}
