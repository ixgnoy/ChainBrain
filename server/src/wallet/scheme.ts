import { encodeAbiParameters, getAddress, keccak256, type Address, type Hex, type LocalAccount } from "viem";
import { cfg } from "../chains";
import type { Reason } from "./reasons";

export class CbError extends Error {
  constructor(public reason: Reason, public detail?: string) {
    super(`${reason}${detail ? `: ${detail}` : ""}`);
  }
}

export type Authorization = { from: Address; to: Address; value: string; validAfter: string; validBefore: string; nonce: Hex };

const TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" }, { name: "to", type: "address" }, { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" }, { name: "validBefore", type: "uint256" }, { name: "nonce", type: "bytes32" },
  ],
} as const;

/** nonce = keccak256(abi.encode(intentHash, seq)): every payment is traceable to its intent by recomputing. */
export const intentNonce = (intentHash: Hex, seq: bigint) =>
  keccak256(encodeAbiParameters([{ type: "bytes32" }, { type: "uint256" }], [intentHash, seq]));

export function buildAuthorization(pocket: Address, to: Address, value: bigint, intentHash: Hex, seq: bigint, ttlSec = 600): Authorization {
  return {
    from: getAddress(pocket), to: getAddress(to), value: value.toString(), validAfter: "0",
    validBefore: String(Math.floor(Date.now() / 1000) + ttlSec), nonce: intentNonce(intentHash, seq),
  };
}

/** The exact typed data the agent key signs, and the owner co-signs above the ask-me threshold. */
export const transferTypedData = (a: Authorization) => ({
  domain: { ...cfg().domain, chainId: cfg().chain.id, verifyingContract: cfg().token },
  types: TYPES,
  primaryType: "TransferWithAuthorization" as const,
  message: { from: a.from, to: a.to, value: BigInt(a.value), validAfter: BigInt(a.validAfter), validBefore: BigInt(a.validBefore), nonce: a.nonce },
});

/** abi.encode(to, value, validAfter, validBefore, nonce, agentSig, ownerSig): what Pocket.isValidSignature decodes. */
export const envelope = (a: Authorization, agentSig: Hex, ownerSig: Hex) =>
  encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }, { type: "uint256" }, { type: "uint256" }, { type: "bytes32" }, { type: "bytes" }, { type: "bytes" }],
    [a.to, BigInt(a.value), BigInt(a.validAfter), BigInt(a.validBefore), a.nonce, agentSig, ownerSig],
  );

/**
 * Our x402 client scheme. It never signs what a seller hands it: it signs the authorization the tool layer built,
 * after checking the live 402 still matches it.
 */
export class PocketScheme {
  scheme = "exact";
  constructor(private o: { auth: Authorization; agent: LocalAccount; ownerSig: Hex }) {}

  async createPaymentPayload(x402Version: number, req: any) {
    const a = this.o.auth;
    if ((req.extra?.assetTransferMethod ?? "eip3009") !== "eip3009") throw new CbError("SIGNATURE_TYPE_NOT_ALLOWED", "seller asked for permit2");
    if (req.network !== cfg().network || getAddress(req.asset) !== getAddress(cfg().token)) throw new CbError("QUOTE_MISMATCH", "asset or network changed");
    if (getAddress(req.payTo) !== a.to || String(req.amount) !== a.value) throw new CbError("QUOTE_MISMATCH", `402 now asks ${req.amount} to ${req.payTo}`);
    const agentSig = await this.o.agent.signTypedData(transferTypedData(a));
    return { x402Version, payload: { authorization: a, signature: envelope(a, agentSig, this.o.ownerSig) } };
  }
}
