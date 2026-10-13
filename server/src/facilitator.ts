import { HTTPFacilitatorClient } from "@x402/core/server";
import { x402Facilitator } from "@x402/core/facilitator";
import { registerExactEvmScheme } from "@x402/evm/exact/facilitator";
import { toFacilitatorEvmSigner } from "@x402/evm";
import { createWalletClient, http, publicActions, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

/** x402's own facilitator code, run in-process: fork tests, and the gate fallback if the hosted one refuses pockets. */
export function localFacilitator() {
  const account = privateKeyToAccount(process.env.FACILITATOR_PK as Hex);
  const wc = createWalletClient({ account, chain: baseSepolia, transport: http(process.env.BASE_SEPOLIA_RPC) }).extend(publicActions);
  const f = registerExactEvmScheme(new x402Facilitator(), {
    signer: toFacilitatorEvmSigner({ ...(wc as any), address: account.address }),
    networks: "eip155:84532",
  });
  return { verify: f.verify.bind(f), settle: f.settle.bind(f), getSupported: async () => f.getSupported() } as any;
}

export function facilitatorClient() {
  if (process.env.FACILITATOR === "local") return localFacilitator();
  return new HTTPFacilitatorClient({ url: process.env.FACILITATOR_URL || "https://x402.org/facilitator" });
}
