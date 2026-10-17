#!/bin/bash
# Deploy MockEHKD + PocketFactory to the local FISCO chain and fund every server-side sender's native balance.
# FISCO web3 RPC has no eth_feeHistory, so forge sends legacy txs at gas price 0.
set -euo pipefail
source "$(dirname "$0")/env.sh"
set -a; source "$ROOT/server/.env"; set +a
export PATH="$HOME/.foundry/bin:$PATH"
addrs=()
for k in OWNER_PK FACILITATOR_PK FORCE_PK; do addrs+=("$(cast wallet address "${!k}")"); done
bash "$(dirname "$0")/fund.sh" "${addrs[@]}"
cd "$ROOT/contracts"
# forge writes deployments/20200.json even when the broadcast fails: keep the previous one until the new one is proven
[ -f deployments/20200.json ] && cp deployments/20200.json deployments/20200.json.bak
restore() { [ -f deployments/20200.json.bak ] && mv deployments/20200.json.bak deployments/20200.json; echo "deploy failed: $1" >&2; exit 1; }
forge script script/DeployFisco.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --slow --legacy --with-gas-price 0 | grep "ONCHAIN EXECUTION COMPLETE & SUCCESSFUL" >/dev/null || restore "broadcast"
for c in Token PocketFactory; do
  [ "$(cast code "$(jq -r .$c deployments/20200.json)" --rpc-url http://127.0.0.1:8545 | wc -c)" -gt 1000 ] || restore "no code for $c"
done
rm -f deployments/20200.json.bak
# record the deploy txs for scripts/verify-evidence.ts (only when EVIDENCE_FILE is set)
(cd "$ROOT/server" && npx tsx scripts/record-deploy.ts)
cat deployments/20200.json
