/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { setChain, setSource, rpcUrl, txUrl, curSign, tokenSymbol, ENV_RPC } from "./runtime";
import { transferTypedData } from "./typed";
import { money } from "./util";
import { presetsFor, HKD_PRESETS, PRESETS } from "./presets";

const EHKD = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const auth = { from: EHKD, to: EHKD, value: "1", validAfter: "0", validBefore: "9", nonce: `0x${"0".repeat(64)}` } as const;

test("a FISCO server: Mock e-HKD signing domain, HK$, its RPC and its explorer; the built-in network stays USDC", () => {
  setChain({ key: "fisco", id: 20200, name: "FISCO BCOS", rpc: "https://node.example", domain: { name: "Mock e-HKD", version: "1" }, currency: "HK$", txUrl: "https://api.example/explorer#/tx/", token: EHKD });
  setSource("builtin");
  assert.equal(transferTypedData(auth).domain.name, "USDC");
  assert.equal(money(2_300_000n), "US$2.30");
  assert.equal(rpcUrl(), ENV_RPC);

  setSource("server");
  assert.deepEqual(transferTypedData(auth).domain, { name: "Mock e-HKD", version: "1", chainId: 20200, verifyingContract: EHKD });
  assert.equal(money(2_300_000n), "HK$2.30");
  assert.equal([curSign(), tokenSymbol()].join(" "), "HK$ eHKD");
  if (!process.env.EXPO_PUBLIC_RPC_URL) assert.equal(rpcUrl(), "https://node.example");
  assert.equal(txUrl("0xab"), "https://api.example/explorer#/tx/0xab");
  assert.equal(presetsFor(["datalite", "datapro"]), HKD_PRESETS);

  setChain(null);
  assert.equal(presetsFor(["datalite", "datapro"]), PRESETS);
  setSource("builtin");
});
