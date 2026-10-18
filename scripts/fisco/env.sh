# Shared paths for the local FISCO BCOS chain (sourced by the other scripts).
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
F="${FISCO_HOME:-$ROOT/.fisco}" # .fisco/ locally; a volume path in the Railway image
FISCO_VERSION=v3.16.4
CONSOLE_VERSION=v3.7.0
NODES="$F/nodes/127.0.0.1"
[ -x /usr/libexec/java_home ] && export JAVA_HOME="${JAVA_HOME:-$(/usr/libexec/java_home -v 17 2>/dev/null)}"
# Homebrew's openjdk@17 is keg-only: java_home doesn't see it unless it was symlinked into /Library/Java
for j in /opt/homebrew/opt/openjdk@17 /usr/local/opt/openjdk@17; do
  [ -z "${JAVA_HOME:-}" ] && [ -d "$j/libexec/openjdk.jdk/Contents/Home" ] && export JAVA_HOME="$j/libexec/openjdk.jdk/Contents/Home"
done
case "$(uname -s)-$(uname -m)" in
  Darwin-arm64) FISCO_ASSET=fisco-bcos-macOS-arm.tar.gz ;;
  Linux-x86_64) FISCO_ASSET=fisco-bcos-linux-x86_64.tar.gz ;;
  Linux-aarch64) FISCO_ASSET=fisco-bcos-linux-aarch64.tar.gz ;;
  *) FISCO_ASSET="" ;;
esac
console() { (cd "$F/console" && bash console.sh "$@" 2>&1); }
governor() { ls "$F/console/account/ecdsa/" 2>/dev/null | grep -oE '^0x[0-9a-fA-F]{40}' | head -1; }
