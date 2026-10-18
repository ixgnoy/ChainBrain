/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { setChain, setSource, rpcUrl, txUrl, curSign, tokenSymbol } from "./runtime";
import { transferTypedData } from "./typed";
import { money } from "./util";
import { presetsFor, PRESETS, BUILTIN_PRESETS } from "./presets";

const EHKD = "0x0355c0c5Afe2A35369056FBB854903A4aF07781A";
const auth = { from: EHKD, to: EHKD, value: "1", validAfter: "0", validBefore: "9", nonce: `0x${"0".repeat(64)}` } as const;

test("money is HK$ eHKD everywhere; a server's config sets the RPC, explorer and signing domain", () => {
  setSource("builtin");
  assert.deepEqual(transferTypedData(auth).domain, { name: "Mock e-HKD", version: "1", chainId: 20200, verifyingContract: EHKD });
  assert.equal(money(2_300_000n), "HK$2.30");
  assert.equal([curSign(), tokenSymbol()].join(" "), "HK$ eHKD");
  assert.equal(txUrl("0xab"), undefined, "built-in hashes are not on the chain");

  setChain({ key: "fisco", id: 20200, name: "FISCO BCOS", rpc: "https://node.example", domain: { name: "Mock e-HKD", version: "1" }, currency: "HK$", txUrl: "https://api.example/explorer#/tx/", token: EHKD });
  setSource("server");
  if (!process.env.EXPO_PUBLIC_RPC_URL) assert.equal(rpcUrl(), "https://node.example");
  assert.equal(txUrl("0xab"), "https://api.example/explorer#/tx/0xab");
  assert.equal(presetsFor(["datalite", "datapro"]), PRESETS);
  assert.equal(presetsFor(["exa", "coingecko"]), BUILTIN_PRESETS);
  setChain(null);
  setSource("builtin");
});
