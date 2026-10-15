# Shared paths for the local FISCO BCOS chain (sourced by the other scripts).
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
F="$ROOT/.fisco"
FISCO_VERSION=v3.16.4
CONSOLE_VERSION=v3.7.0
NODES="$F/nodes/127.0.0.1"
export JAVA_HOME="${JAVA_HOME:-$(/usr/libexec/java_home -v 17 2>/dev/null)}"
console() { (cd "$F/console" && bash console.sh "$@" 2>&1); }
governor() { ls "$F/console/account/ecdsa/" 2>/dev/null | grep -oE '^0x[0-9a-fA-F]{40}' | head -1; }
