#!/bin/bash
# Credit native balance so an address can send web3 transactions (gas price is 0; the RPC only requires balance > 0).
# usage: fund.sh 0xADDR [0xADDR ...]
set -euo pipefail
source "$(dirname "$0")/env.sh"
for a in "$@"; do console addBalance "$a" 1000000 | grep -q success && echo "funded $a"; done
