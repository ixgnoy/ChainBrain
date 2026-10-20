# Simplified Chinese subtitles (prototype P1)

Commit: "Subtitles: optional Simplified Chinese line under the English".

## What it does
- `remotion/src/subs-zh.json` holds one Chinese sentence per English sentence of each voice line. `"enabled": false` turns it off.
- The Chinese sits under the English in the same box, in PingFang SC at 33 px, slightly dimmer than the English.
- When one English sentence spans two pages, a `|` in the Chinese splits it the same way. If the owner's own voice moves the page breaks, the whole sentence shows on both pages instead, so nothing breaks.
- `tools/srt.py` writes the same two lines into the `.srt`.

## Honesty and checking (must do before shipping)
- Claude drafted the translation. **A team member who reads Chinese must check every line** before it ships, and should own it. Terms to check first:
  - "AI 卡" for AI Card, "智能体" for agent (the mainland term; HKMA writes A.I.代理), "所有者密钥" owner key, "代理密钥" agent key, "守护密钥" guardian key.
  - "结算方" for the x402 facilitator.
  - "金管局" for the HKMA, with Carmen Chu kept in English because her official Chinese name was not verified.
  - "涵盖了这四点" keeps the "covers, never complies" rule.
  - Team names stay romanised; add Chinese names only if the team gives them.
- If the Chinese is not checked by tonight, ship English only (`"enabled": false`). A wrong Chinese line in front of Chinese-speaking judges costs more than no Chinese line.

## Why
See `judges.md` (judge language) and `academic.md` (dual subtitles for second-language viewers).

## Revision after the native-reader review (`review-nonnative.md` §3)

Applied: 智能体 everywhere; "购买价格数据" (u1); "支付中继服务（facilitator）" (x5, replacing the wrong 结算方); "由代币直接向这张卡确认" (x6); "取消" (r1, not 注销, which means closing an account); 部署的 (f1, f4); 守护者密钥; 香港金管局; plus smaller wording. **Still needs a team member's final check before `enabled` goes true.**

## Second native pass

- n1: 我们给你的 AI 发一张它专属的卡。 → 我们给你的 AI 一张它自己的卡。
- x7: 八项全部通过，于是付款在 FISCO BCOS 上完成，|交易哈希可以在我们的浏览器里查到。 → 八项全部通过，于是付款在 FISCO BCOS 上完成，|交易哈希可以在我们的区块浏览器里查到。
- u2: 金额超过你设定的数额，就要你在手机上也签一次名。 → 超过你设定的金额，卡会要求你也在手机上签名。
- y2: 最后两层在链上，即使我们的服务器被攻陷，|也能让每张卡守住自己的规则。 → 最后两层在链上，即使我们的服务器被接管，|也能让每张卡守住自己的规则。
- w2: 多次可疑尝试后，它会冻结这张卡，|只有你能解冻。 → 多次尝试后，它会冻结这张卡，|只有你能解冻。
- x6: 在这里，由代币直接向这张卡确认，卡会先做它自己的八项检查。 → 在这里，由代币向这张卡确认，卡会先做它自己的八项检查。

Reasons: x7 浏览器 means web browser, so 区块浏览器; n1 closer to the English "give ... its own card"; u2 smoother, keeps "too"; y2 "taken over" = 接管 (not 攻陷); w2 drops 可疑, which the English does not say; x6 plainer phrasing. All other lines reviewed and kept. Verified: every vo-lines id has one entry per English sentence; enabled stays false.
