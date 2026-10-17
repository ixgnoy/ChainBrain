import { it, expect } from "vitest";
import { setChainInfo, curSign, tokenSymbol, chainLabel, txUrl, addrUrl } from "./shared";
import { usd } from "./console/parts";

it("a FISCO server's config switches labels and links to HK$, eHKD and its own explorer; unset stays Base Sepolia", () => {
  expect([curSign(), tokenSymbol(), chainLabel(), txUrl("0xab")]).toEqual(["US$", "USDC", "Base Sepolia", "https://sepolia.basescan.org/tx/0xab"]);
  setChainInfo({ key: "fisco", id: 20200, name: "FISCO BCOS", rpc: "https://node.example", currency: "HK$", txUrl: "https://api.example/explorer#/tx/" });
  expect([curSign(), tokenSymbol(), chainLabel(), usd(2_300_000n)]).toEqual(["HK$", "eHKD", "FISCO BCOS", "HK$2.30"]);
  expect([txUrl("0xab"), addrUrl("0xcd")]).toEqual(["https://api.example/explorer#/tx/0xab", "https://api.example/explorer#/address/0xcd"]);
  setChainInfo(null);
  expect(usd(2_300_000n)).toBe("US$2.30");
});
