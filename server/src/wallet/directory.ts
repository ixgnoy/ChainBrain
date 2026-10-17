import type { Address } from "viem";
import sellers from "../sellers.json" with { type: "json" };

export type Seller = { id: string; name: string; category: string; payTo: Address; items: { sku: string; description: string; price: string | null; negotiable?: boolean }[] };

let cache: Promise<Seller[]> | undefined;

/** The seller list the app ships with. A picking aid: the pocket enforces addresses, not this list. */
export function directory(): Promise<Seller[]> {
  cache ??= fetch(`${process.env.SELLERS_URL ?? "http://localhost:4021"}/admin/payto`)
    .then((r) => r.json() as Promise<Record<string, Address>>)
    .then((payTo) => {
      // a sellers service that is still starting answers with an error page: never cache a list without addresses
      if (!sellers.every((s) => /^0x[0-9a-fA-F]{40}$/.test(String(payTo?.[s.id])))) throw new Error("sellers service not ready (no payTo addresses)");
      return payTo;
    })
    .then((payTo) => sellers.map((s) => ({ id: s.id, name: s.name, category: s.category, payTo: payTo[s.id], items: s.items.map((i) => ({ sku: i.sku, description: i.description, price: i.price, ...("floor" in i && i.floor ? { negotiable: true } : {}) })) })))
    .catch((e) => { cache = undefined; throw e; });
  return cache;
}
