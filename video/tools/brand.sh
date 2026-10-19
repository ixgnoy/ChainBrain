#!/bin/sh
# Copy the brand marks the video shows into remotion/public/brand (git-ignored).
# Sources: shared/brand (committed, see shared/brand/SOURCES.md) and, when present, the official press-kit and
# project files under reference/ (git-ignored third-party material). Falls back to shared/brand's SVGs.
set -eu
cd "$(dirname "$0")/.."
R=..
B=remotion/public/brand
mkdir -p "$B"
for f in exa-icon-square.svg coingecko-symbol.svg nansen-icon-black.svg claude-spark.svg openai-blossom-white.svg openai-blossom-black.svg; do
  cp -f "$R/shared/brand/$f" "$B/$f"
done
L="$R/reference/frontend/stitch_chainbrain_ai_pocket_banking/logo"
cp -f "$L/Anthropic media resources/Anthropic logos/Claude logos/3 Claude Spark/PNG/Claude Spark - Clay.png" "$B/claude-spark-clay.png" 2>/dev/null || cp -f "$B/claude-spark.svg" "$B/claude-spark-clay.png"
cp -f "$L/OpenAI-logos/PNGs/OAI_OpenAI-Blossom_Black.png" "$B/openai-blossom-black.png" 2>/dev/null || true
cp -f "$R/reference/repos/from-prior/x402/examples/typescript/fullstack/next/public/x402-logo-dark.png" "$B/x402-logo-dark.png" 2>/dev/null || echo "note: x402 logo not found (reference/ missing)"
cp -f "$R/reference/repos/from-prior/FISCO-BCOS/docs/FISCO_BCOS_Logo.svg" "$B/fisco-bcos-logo.svg" 2>/dev/null || echo "note: FISCO BCOS logo not found (reference/ missing)"
# official marks for the "Built with" strip (video/assets/brand, see CREDITS.md)
cp -f assets/brand/* "$B/"
ls "$B" | wc -l
