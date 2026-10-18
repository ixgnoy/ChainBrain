import { x402Facilitator } from "@x402/core/facilitator";
import { registerExactEvmScheme } from "@x402/evm/exact/facilitator";
import { toFacilitatorEvmSigner } from "@x402/evm";
import { createWalletClient, http, publicActions, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { cfg } from "./chains";

/** x402's own facilitator code, run in-process (no hosted facilitator knows the FISCO chain). FACILITATOR_PK pays nothing: gas is free. */
export function localFacilitator() {
  const account = privateKeyToAccount(process.env.FACILITATOR_PK as Hex);
  const { chain, rpc, network } = cfg();
  const wc = createWalletClient({ account, chain, transport: http(rpc) }).extend(publicActions);
  const f = registerExactEvmScheme(new x402Facilitator(), {
    signer: toFacilitatorEvmSigner({ ...(wc as any), address: account.address }),
    networks: network,
  });
  return { verify: f.verify.bind(f), settle: f.settle.bind(f), getSupported: async () => f.getSupported() } as any;
}

export const facilitatorClient = localFacilitator;
