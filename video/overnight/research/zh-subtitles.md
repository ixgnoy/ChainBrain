# Simplified Chinese subtitles (prototype P1)

Commit: "Subtitles: optional Simplified Chinese line under the English".

## What it does
- `remotion/src/subs-zh.json` holds one Chinese sentence per English sentence of each voice line. `"enabled": false` turns it off.
- The Chinese sits under the English in the same box, in PingFang SC at 33 px, slightly dimmer than the English.
- When one English sentence spans two pages, a `|` in the Chinese splits it the same way. If the owner's own voice moves the page breaks, the whole sentence shows on both pages instead, so nothing breaks.
- `tools/srt.py` writes the same two lines into the `.srt`.

## Honesty and checking (must do before shipping)
- Claude drafted the translation. **A team member who reads Chinese must check every line** before it ships, and should own it. Terms to check first:
  - "AI 卡" for AI Card, "代理" for agent, "所有者密钥" owner key, "代理密钥" agent key, "守护密钥" guardian key.
  - "结算方" for the x402 facilitator.
  - "金管局" for the HKMA, with Carmen Chu kept in English because her official Chinese name was not verified.
  - "涵盖了这四点" keeps the "covers, never complies" rule.
  - Team names stay romanised; add Chinese names only if the team gives them.
- If the Chinese is not checked by tonight, ship English only (`"enabled": false`). A wrong Chinese line in front of Chinese-speaking judges costs more than no Chinese line.

## Why
See `judges.md` (judge language) and `academic.md` (dual subtitles for second-language viewers).
