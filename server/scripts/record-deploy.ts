// Records scripts/fisco/deploy.sh's txs (from forge's broadcast file) into EVIDENCE_FILE. No-op when it is unset.
import { readFileSync } from "node:fs";
import { record } from "./evidence";

if (process.env.EVIDENCE_FILE) {
  const b = JSON.parse(readFileSync(new URL("../../contracts/broadcast/DeployFisco.s.sol/20200/run-latest.json", import.meta.url), "utf8"));
  for (const t of b.transactions) {
    if (t.transactionType === "CREATE") record(`deploy: ${t.contractName}`, t.hash, "success");
    else record(`deploy: ${t.contractName}.${t.function}`, t.hash, "success", "Transfer(address,address,uint256)", t.contractAddress);
  }
}
