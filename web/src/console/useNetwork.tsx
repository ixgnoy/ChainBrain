// The whole ChainBrain network for the console, from whichever source is chosen (source/source.ts): the built-in
// network by default, a real server when one is set in Settings. Screens call useNetwork() and never ask which.
import type { ReactNode } from "react";
import { useSource } from "../source/source";
import { FeedNetwork } from "./FeedNetwork";
import { LiveNetwork } from "./LiveNetwork";

export { useNetwork, type Network } from "./network";

export function NetworkProvider({ children }: { children: ReactNode }) {
  const src = useSource();
  // a different source is a fresh provider: no state leaks from one network into the other
  return src.kind === "live"
    ? <LiveNetwork key={src.url} url={src.url}>{children}</LiveNetwork>
    : <FeedNetwork key="builtin">{children}</FeedNetwork>;
}
