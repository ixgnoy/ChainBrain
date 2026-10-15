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
rm -f deployments/20200.json # forge writes it even when the broadcast fails
forge script script/DeployFisco.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --slow --legacy --with-gas-price 0 | grep "ONCHAIN EXECUTION COMPLETE & SUCCESSFUL" >/dev/null
for c in Token PocketFactory; do
  [ "$(cast code "$(jq -r .$c deployments/20200.json)" --rpc-url http://127.0.0.1:8545 | wc -c)" -gt 1000 ] || { echo "no code for $c"; exit 1; }
done
cat deployments/20200.json
