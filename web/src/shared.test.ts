import { it, expect } from "vitest";
import { setChainInfo, curSign, tokenSymbol, chainLabel, txUrl, addrUrl } from "./shared";
import { hkd } from "./console/parts";

it("money is HK$ eHKD on FISCO BCOS; a server's config points links at its own explorer", () => {
  expect([curSign(), tokenSymbol(), chainLabel(), hkd(2_300_000n)]).toEqual(["HK$", "eHKD", "FISCO BCOS", "HK$2.30"]);
  setChainInfo({ key: "fisco", id: 20200, name: "FISCO BCOS", rpc: "https://node.example", currency: "HK$", txUrl: "https://api.example/explorer#/tx/" });
  expect([txUrl("0xab"), addrUrl("0xcd")]).toEqual(["https://api.example/explorer#/tx/0xab", "https://api.example/explorer#/address/0xcd"]);
  setChainInfo(null);
});
