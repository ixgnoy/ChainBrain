import type { Address } from "viem";
import sellers from "../sellers.json" with { type: "json" };

export type Seller = { id: string; name: string; category: string; payTo: Address; items: { sku: string; description: string; price: string | null }[] };

let cache: Promise<Seller[]> | undefined;

/** The seller list the app ships with. A picking aid: the pocket enforces addresses, not this list. */
export function directory(): Promise<Seller[]> {
  cache ??= fetch(`${process.env.SELLERS_URL ?? "http://localhost:4021"}/admin/payto`)
    .then((r) => r.json() as Promise<Record<string, Address>>)
    .then((payTo) => sellers.map((s) => ({ id: s.id, name: s.name, category: s.category, payTo: payTo[s.id], items: s.items.map(({ sku, description, price }) => ({ sku, description, price })) })))
    .catch((e) => { cache = undefined; throw e; });
  return cache;
}
