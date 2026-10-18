#!/bin/bash
# First boot (empty volume): build the 1-node chain with the governor + balance features (scripts/fisco/setup.sh).
# Every boot: start the node, then run the gateway in the foreground.
set -euo pipefail
export FISCO_HOME="${FISCO_HOME:-/data/fisco}"
mkdir -p "$FISCO_HOME"
cp -rn /opt/fisco/. "$FISCO_HOME"/ # binary, build_chain.sh, console baked into the image (setup.sh skips downloads when present)
# .ready is written only after a complete setup: a first boot that died halfway is rebuilt, never half-started
if [ ! -f "$FISCO_HOME/.ready" ]; then
  echo "first boot: building the chain"
  rm -rf "$FISCO_HOME/nodes"
  bash /app/scripts/fisco/setup.sh
  touch "$FISCO_HOME/.ready"
else
  bash "$FISCO_HOME/nodes/127.0.0.1/start_all.sh"
fi
for _ in $(seq 60); do curl -sf 127.0.0.1:8545 -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' >/dev/null && break; sleep 1; done
exec node /app/deploy/fisco-node/gateway.mjs
