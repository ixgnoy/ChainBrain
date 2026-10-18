import { x402Facilitator } from "@x402/core/facilitator";
import { registerExactEvmScheme } from "@x402/evm/exact/facilitator";
import { toFacilitatorEvmSigner } from "@x402/evm";
import type { Hex } from "viem";
import { cfg } from "./chains";
import { queuedSigner } from "./ledger";

/**
 * x402's own facilitator code, run in-process (no hosted facilitator knows the FISCO chain). FACILITATOR_PK pays nothing:
 * gas is free. Its settlements go through the ledger's queue: every visitor's payment shares this one sender.
 */
export function localFacilitator() {
  const { network } = cfg();
  const f = registerExactEvmScheme(new x402Facilitator(), {
    signer: toFacilitatorEvmSigner(queuedSigner(process.env.FACILITATOR_PK as Hex)),
    networks: network,
  });
  return { verify: f.verify.bind(f), settle: f.settle.bind(f), getSupported: async () => f.getSupported() } as any;
}

export const facilitatorClient = localFacilitator;
