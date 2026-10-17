#!/bin/bash
# ROLE=api: bootstrap the chain (funding, contracts), then the wallet API + explorer. ROLE=sellers: the x402 test sellers
# with x402's facilitator in-process. Railway gives each service one public port: $PORT.
set -euo pipefail
cd /app/server
case "${ROLE:-api}" in
  api) npx tsx scripts/bootstrap-fisco.ts && PORT="${PORT:-8787}" exec npx tsx src/index.ts ;;
  sellers) SELLERS_PORT="${PORT:-4021}" exec npx tsx src/sellers.ts ;;
  *) echo "ROLE must be api or sellers" >&2; exit 1 ;;
esac
