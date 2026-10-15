#!/bin/bash
# One-time: download FISCO BCOS + console into .fisco/, build a 1-node chain with the web3 RPC on 127.0.0.1:8545
# (chain id 20200), native balances enabled, and the console account as governor and balance governor.
#
# Why the governor: FISCO's web3 eth_sendRawTransaction rejects any sender whose native balance is 0
# (bcos-rpc/validator/TxValidator.cpp checkSenderBalance), even with gas price 0. Genesis "alloc" is not parsed
# in 3.16.4, so balances are credited after start with the console's addBalance (see fund.sh).
set -euo pipefail
source "$(dirname "$0")/env.sh"
mkdir -p "$F" && cd "$F"
[ -x fisco-bcos ] || { curl -sfLO "https://github.com/FISCO-BCOS/FISCO-BCOS/releases/download/$FISCO_VERSION/fisco-bcos-macOS-arm.tar.gz"; tar xzf fisco-bcos-macOS-arm.tar.gz; }
[ -f build_chain.sh ] || curl -sfLo build_chain.sh "https://github.com/FISCO-BCOS/FISCO-BCOS/releases/download/$FISCO_VERSION/build_chain.sh"
[ -d console ] || { curl -sfLO "https://github.com/FISCO-BCOS/console/releases/download/$CONSOLE_VERSION/console.tar.gz"; tar xzf console.tar.gz; cp console/conf/config-example.toml console/conf/config.toml; }

build() { # $@ extra build_chain args
  [ -d nodes ] && { bash "$NODES/stop_all.sh" >/dev/null 2>&1 || true; rm -rf nodes; }
  bash build_chain.sh -l 127.0.0.1:1 -p 30300,20200 -e ./fisco-bcos -o nodes "$@" >/dev/null
  sed -i '' '/\[web3_rpc\]/,/listen_port/{s/enable=false/enable=true/;s/listen_ip=0.0.0.0/listen_ip=127.0.0.1/;}' "$NODES/node0/config.ini"
  printf '\n[features]\n    feature_balance=1\n    feature_balance_precompiled=1\n' >> "$NODES/node0/config.genesis"
  cp "$NODES"/sdk/* console/conf/
  bash "$NODES/start_all.sh" >/dev/null
  for _ in $(seq 30); do curl -sf 127.0.0.1:8545 -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' >/dev/null && break; sleep 1; done
}

if [ -z "$(governor)" ]; then build; console getCurrentAccount >/dev/null; fi # first run: let the console create its account
G="$(governor)"
build -a "$G"
console registerBalanceGovernor "$G" | grep -q success
echo "FISCO BCOS up: web3 RPC http://127.0.0.1:8545 (chain id 20200), governor $G"
