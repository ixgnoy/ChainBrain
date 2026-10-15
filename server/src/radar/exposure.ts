import type { Address } from "viem";
import { exposure as core, type TransferSource, type WalkOpts, type Exposure, type Direction } from "../../../shared/sim/radar";
import { labels } from "./labels";

export { memorySource, type Transfer, type TransferSource, type Direction, type Exposure, type Hit, type Edge, type WalkOpts } from "../../../shared/sim/radar";

/** Proportional exposure over the server's label book (the algorithm lives in shared/sim/radar.ts). */
export const exposure = (src: TransferSource, root: Address, direction: Direction, o: WalkOpts = {}): Promise<Exposure> => core(src, labels, root, direction, o);
