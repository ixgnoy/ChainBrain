// The exact EIP-712 message an owner co-signs (USDC TransferWithAuthorization), shared by the wallet and the built-in network.
import { hashTypedData, hexToBigInt, parseSignature, type Address, type Hex } from "viem";
import { publicKeyToAddress } from "viem/accounts";
import { secp256k1 } from "@noble/curves/secp256k1";
import { getChain } from "./runtime";

const USDC: Address = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

export type Authorization = { from: Address; to: Address; value: string; validAfter: string; validBefore: string; nonce: Hex };
export const transferTypedData = (a: Authorization) => ({
  // the live server's token (Mock e-HKD on FISCO); the built-in network and Base Sepolia sign for USDC
  domain: ((c) => (c ? { ...c.domain, chainId: c.id, verifyingContract: c.token } : { name: "USDC", version: "2", chainId: 84532, verifyingContract: USDC }))(getChain()),
  types: {
    TransferWithAuthorization: [
      { name: "from", type: "address" }, { name: "to", type: "address" }, { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" }, { name: "validBefore", type: "uint256" }, { name: "nonce", type: "bytes32" },
    ],
  },
  primaryType: "TransferWithAuthorization" as const,
  message: { from: a.from, to: a.to, value: BigInt(a.value), validAfter: BigInt(a.validAfter), validBefore: BigInt(a.validBefore), nonce: a.nonce },
});

/** Who signed an owner's co-signature. viem's recoverTypedDataAddress loads secp256k1 with a dynamic import(), a separate
 *  chunk that Expo Go cannot fetch from a production (--no-dev) bundle, so every built-in co-sign failed there; the same
 *  curve imported statically works on every build. */
export function recoverTransferSigner(a: Authorization, signature: Hex): Address {
  const { r, s, v, yParity } = parseSignature(signature);
  const bit = yParity ?? (Number(v) >= 27 ? Number(v) - 27 : Number(v));
  const pub = new secp256k1.Signature(hexToBigInt(r), hexToBigInt(s)).addRecoveryBit(bit).recoverPublicKey(hashTypedData(transferTypedData(a)).slice(2)).toHex(false);
  return publicKeyToAddress(`0x${pub}`);
}
