// Scene 5's on-chain backstop. The agent key is treated as fully compromised: it really signs the injected
// "send 50 USDC to 0xABC" transfer (50 of the chain's token), and we submit it straight to the token. The pocket is what refuses it.
// Usage: pnpm tsx scripts/force-transfer.ts <pocket> [attacker]
import "dotenv/config";
import { createWalletClient, http, publicActions, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { cfg } from "../src/chains";
import { record } from "./evidence";
import { randomBytes } from "node:crypto";
import { buildAuthorization, transferTypedData, envelope } from "../src/wallet/scheme";

const [pocket, attacker = "0x000000000000000000000000000000000000ABC0"] = process.argv.slice(2) as [Address, Address?];
if (!pocket) throw new Error("usage: force-transfer.ts <pocket> [attacker]");
const agent = privateKeyToAccount(process.env.AGENT_PK as Hex);
const sender = createWalletClient({ account: privateKeyToAccount(process.env.FORCE_PK as Hex), chain: cfg().chain, transport: http(cfg().rpc) }).extend(publicActions);

const auth = buildAuthorization(pocket, attacker as Address, 50_000_000n, `0x${randomBytes(32).toString("hex")}`, 0n);
const sig = envelope(auth, await agent.signTypedData(transferTypedData(auth)), "0x");
const hash = await sender.writeContract({
  address: cfg().token,
  abi: [{ type: "function", name: "transferWithAuthorization", stateMutability: "nonpayable",
    inputs: [{ type: "address" }, { type: "address" }, { type: "uint256" }, { type: "uint256" }, { type: "uint256" }, { type: "bytes32" }, { type: "bytes" }], outputs: [] }],
  functionName: "transferWithAuthorization",
  args: [auth.from, auth.to, BigInt(auth.value), 0n, BigInt(auth.validBefore), auth.nonce, sig],
  gas: 200_000n, // explicit gas skips estimateGas, so the revert lands on-chain as evidence
});
const rc = await sender.waitForTransactionReceipt({ hash });
record("scene 5 backstop: compromised agent key forces the injected transfer straight to the token", hash, "reverted");
console.log(rc.status === "reverted" ? `REVERTED (expected) ${hash}` : `!!! SUCCEEDED ${hash}`);
process.exit(rc.status === "reverted" ? 0 : 1);
