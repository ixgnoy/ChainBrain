# Review as a Mandarin-first judge (good, not native English)

Setup: 13-inch laptop, built-in speakers, many entries. Frames at 1440 px and 720 px from v4 (4:46); branch frames hash-129, zh-100, rubric-170. Frames are in scratchpad/nonnative. Note: SRT/video are v4 words; subs-zh.json follows v4.1 words.

## 1. Where I got lost or could not read

| Time | Problem |
|---|---|
| 0:12-0:20 | Source line "Accenture, Talk to My AI Agent..." is tiny, grey, mono. Unreadable at 720 and hard at 1440. Harmless, the 74% / 9% are big. |
| 0:35-0:41 | "smart contract" card: the key/value rows are small; only "HK$15.00" is readable. OK because voice carries it. |
| 0:52 | Headline "It builds the card..." was caught half-formed (cut off at the baseline) in my frame. On a second pass it is fine, but a viewer pausing sees broken text. Also the phone is small and the checklist text (Reading your sentence / Writing the rules...) is below reading size at 720. |
| 1:12-1:20 | Three small round logos plus "Exa and CoinGecko, over x402" in mono. I read "x402" as a product name; no one says what it is. |
| 1:20-1:28 | Start of X-ray: four lanes, small mono labels ("YOUR PHONE", "off-chain", "CHAINBRAIN SERVER"). I understood "phone" and "server" only; "off-chain" is a new word before "on-chain" appears. The phone screenshot at left (co-sign) is a second thing to read while the sentence is long (two-line subtitle). |
| 1:35-1:45 (frame 1:40) | "SERVER CHECKS, BEFORE SIGNING": four tiles. Sub-labels are tiny and the first one overflows its tile ("what you confirmed" cut). Voice says three things (checks / traces / simulates) and tiles are called Task check / Radar / Sentinel / Pre-flight. Names do not match voice words. I stopped trying to map them. |
| 1:44-1:52 | Ghost (dimmed) boxes "Agent key ... (EIP-3009)" and "Facilitator" are already on screen, dim. "EIP-3009" is a code I cannot decode. At 720 px the subtitle sits on top of two small labels on the right ("holds without our server", "helps the agent behave") so I saw overlapping text. Same overlap at 2:03 (frame 2:04). |
| 1:52-2:03 | Comparison board: clear and slow, my favourite part. But "off-chain / on-chain" in grey mono at small size. |
| 2:00-2:05 | "Mock e-HKD token: asks the card first (ERC-1271)" wraps badly: "ERC-" / "1271". Eight checks list is readable at 1440, but the last line is tight against the card edge. "Your signature, if above ask-me" is odd English. |
| 2:05-2:13 | The real hash screen (branch hash-129) is the best moment for a judge. In v4 it was a 2 s tiny screenshot, I could not read a hash. The branch fixes this. |
| 2:13-2:37 | Phone scenes with subtitle at the bottom. Subtitle "Above your ask-me limit... co-sign" is jargon-dense (see 2). The phone "Harbour Wines was refused" card is readable and good. |
| 2:47-2:58 | "Worst case, we fool the agent on purpose and it tries to send the money. The card says no." Strong. But "agent" vs "AI" vs "card" are used for three things in six seconds. |
| 3:03-3:18 | "Why it held": 8 layer list. Names (Content wrap and scan, Task check, Radar, Sentinel, Signing rule) are not said aloud. Red attack chips are small at 720. Good structure. |
| 3:51-4:08 | HKMA slide is easy to read. Voice "anchored to intent" is the only hard word. |
| 4:09-4:29 | Proof slide: small mono footer on test money, unreadable at 720. Numbers (7, 63, 462) are big, good. |

Fast subtitles: 0:23-0:33 and 1:23-1:52 feel fast; my reading speed in English is about 12-14 characters a second, and some X-ray pages are near the 18 cps cap. Two-line subtitle blocks (1:23, 2:04) cover the lower board.

Jargon I did not know or only half knew: x402, facilitator, EIP-3009, ERC-1271, co-sign, ask-me limit, Pre-flight, Sentinel, Radar, "token asks the card", "settles", "simulates", "traces the seller's money", "on-chain / off-chain" (I know them, but the board uses them as labels before the voice does).

## 2. Hard words in the voice-over, plainer replacements

Same spirit, spoken, no "not X, because Y" and no colon reveals. (Words from SCRIPT.md v4.1; v4 SRT wording differs a little.)

| Hard | Why | Plainer |
|---|---|---|
| "tricked an AI agent into giving away..." | "tricked" and "giving away" are fine; "Morse code" fine | keep |
| "Only nine percent would let it buy on its own." | "buy on its own" ok | "...would let it spend alone." (keep original; it is clear) |
| "a second AI watches every payment" | ok | keep |
| "Its limits live in the card's own smart contract" | "live in" is idiom | "The card's limits are written in its own smart contract." |
| "Slide to approve, and the card's live." | "the card's live" contraction + idiom | "Slide to approve. Now the card works." |
| "It builds the card right in front of you" | "right in front of you" idiom | "You watch it build the card." |
| "over x402" | no meaning | "using a payment standard called x402." (once, then just "x402") |
| "names its price" | idiom | "tells its price" |
| "traces the seller's money, and simulates it" | two hard verbs | "checks where the seller's money goes, and tries the payment first as a test." |
| "the agent key signs one exact payment" | "exact" odd | "...signs this one payment, nothing more." |
| "a facilitator sends it to the chain" | "facilitator" | "a helper service sends it to the chain." Keep "facilitator" only on screen. |
| "the token asks the card" | "the token" means a money token; I thought a login token | "the digital money asks the card first." (screen: "token" with the word "money") |
| "runs eight checks before any money moves" | fine | keep |
| "it settles on FISCO BCOS, with a hash anyone can open" | "settles", "open a hash" | "the payment is final on FISCO BCOS. Anyone can look it up with its hash." |
| "Above your ask-me limit" | invented term | "Above the amount you set for asking you" or "For big amounts" |
| "co-sign" | rare | "you also sign on your phone" |
| "gets refused, and the agent re-plans" | "re-plans" | "the agent picks another plan, or asks you" |
| "negotiates the price down" | fine | keep |
| "cancel it mid-task" | "mid-task" | "cancel it while it is working" |
| "Now, let's break it." | idiom (break = attack) | "Now we attack it." |
| "We try hidden orders, data requests, even a fake admin." | ok | "...even someone pretending to be the admin." |
| "fool the agent on purpose" | ok | keep |
| "make the agent behave" | idiom | "keep the agent inside the rules" |
| "they hold even if our whole server is taken over" | "hold", "taken over" | "they still work even if someone controls our whole server." |
| "it's still capped" | "capped" | "it still has a spending limit" |
| "The guardian key can only freeze" | ok | keep |
| "stricter, never looser" | "looser" unusual | "stricter, never weaker" |
| "anchored to intent" | abstract | "tied to what the user wanted" |
| "kill switches" | idiom | "emergency stop" |
| "secure boundaries" | ok | keep |
| "didn't lose a single dollar" | idiom | "and lost no money" |
| "Give your AI a card, not your wallet." | ok, memorable | keep |

## 3. Simplified Chinese subtitle

Would it help? Yes, a lot. In 1:20-2:13 and 2:13-2:37 it let me confirm each sentence in a glance, and the frame zh-100 stays readable (English bold white, Chinese lighter). Risks: it makes a 4-line block when the English wraps (zh-236 and 1:23 will be tall); keep it off during the X-ray lines that already show a two-line English subtitle, or reduce to 12 px smaller... simpler: keep as is, but check no overlap with the lower board labels (see 1:44 and 2:04 overlaps above). If the team cannot check all lines tonight, a half-checked set is worse than none; ship off.

Branch frame mismatch: zh-236 / the fourth-attack frame shows "我们故意骗过代理，它真的试图把钱转走" (uses 代理, "真的试图"), but subs-zh.json k3 is a different, better sentence using 智能体. The frames were made from an older draft; re-render before using them as evidence. Use 智能体 everywhere (not 代理).

Line-by-line (key = id in subs-zh.json). OK means natural and correct.

| id | Current | Verdict / correction |
|---|---|---|
| m1 | 今年五月，一条用摩斯电码写成的帖子 | OK. Mainland usual: 摩尔斯电码 (摩斯电码 is also fine). |
| m2 | 骗得一个 AI 智能体送出了超过十五万美元。 | OK. "骗得...送出" a bit written-style; spoken: 骗得一个 AI 智能体转走了超过十五万美元。 |
| m3 | 大多数人愿意让 AI 智能体处理日常事务。 / 但只有 9% ... | OK. "自己买东西" better "自行购买". |
| n1 | 这是 ChainBrain。/ 我们给你的 AI 一张自己的卡。 | "一张自己的卡" odd. Use: 我们给你的 AI 发一张它专属的卡。 |
| n2 | ...无论是 Claude、ChatGPT 还是我们自己的... | "我们自己的" unclear. Use: 无论是 Claude、ChatGPT，还是我们自家的智能体，都有一张专属的 AI 卡。 |
| n3 | 它的额度写在...智能合约里，运行在 FISCO BCOS 上。 | "运行在" -> 部署在 (contract is deployed). "额度" ok. |
| n4 | 还有第二个 AI 监督每一笔付款。 | OK. "监督" fine; "盯着" more spoken. |
| g1 | 用一句话告诉它要做什么。 | OK. |
| g2 | 它当着你的面生成这张卡，每条规则都由你批准。 | OK, good. |
| g3 | 滑动确认，卡就生效了。 | OK. Optional: 滑动确认，这张卡立刻生效。 |
| u0 | 如果任务不清楚，它可以先问你一个问题。 | OK. |
| u1 | 小额付款它自己就能付。 / ...向测试版 Exa 买搜索，向测试版 CoinGecko 买价格。 | "买价格" is wrong: you buy price data. Use: 在演示中，它通过 x402 向测试用的 Exa 购买搜索服务，向测试用的 CoinGecko 购买价格数据。 |
| x1 | 我们来透视这笔付款。 | OK. "透视" works; "拆开看看这笔付款" is more spoken. |
| x2 | 所有者密钥...单独的智能体密钥。 / AI 本身从不持有密钥。 | "所有者密钥" matches on-screen "Owner key"; fine. "服务器为每张卡生成一把单独的" -> 为每张卡各生成一把。 |
| x3 | AI 选定卖家，卖家通过 x402 报价。 | OK. |
| x4 | ...核对这笔付款是否符合你确认的任务，追查卖家的资金，并先模拟执行。 | "追查卖家的资金" sounds like a police case; use 查看卖家的资金去向，并先试运行一次。 |
| x5 | ...签出一笔金额确定的付款，再由结算方提交上链。 | Wrong term: facilitator is not "结算方" (settlement party). Use 支付中继服务 or keep "facilitator". "金额确定" -> 金额固定. Suggest: 然后智能体密钥从这张卡签下一笔金额固定的付款，再由支付中继服务提交上链。 |
| x6a | 有些智能体钱包是在钱包公司的服务器上检查额度。 | Fine; tighter: 不少智能体钱包只在钱包公司的服务器上检查额度。 |
| x6 | 在这里，是代币去问这张卡，卡在资金转移前执行八项检查。 | Awkward. Use: 在这里，由代币直接向这张卡确认，卡会在任何资金转出之前做八项检查。 |
| x7 | 八项全部通过，于是在 FISCO BCOS 上结算，留下任何人都能查看的哈希。 | "查看哈希" -> 交易哈希，任何人都能查询。 "结算" ok. |
| u2 | 超过你设定的确认额度，就需要你在手机上共同签名。 | "确认额度" unclear. Use: 金额超过你设定的"需确认额度"，就要你在手机上一起签名。 |
| u4 | 不在你名单上的卖家会被拒绝，智能体会重新规划，或者来问你。 | OK. "重新规划" -> 换个办法。 |
| u3 | 智能体把价格从 12 港元谈到 8.80 港元。 | OK. "谈到" is fine; "砍到" more lively. |
| r1 | 卡是你的，任务进行到一半也能注销，取回还没花掉的钱。 | "注销" means delete an account; use 取消。 -> 卡是你的，任务做到一半也能取消，没花掉的钱会退回给你。 |
| k1 | 现在，我们来攻击它。 | OK; "break it" = 来试试攻破它。 |
| k2 | 我们试了隐藏指令、索取数据，甚至冒充管理员。 / 全都没用。 | Good. "全都没用" -> 全都失败了。 |
| k3 | ...我们扮演一个被骗的智能体，用它的密钥把钱转走。 | OK. Optional: 故意骗过智能体。 |
| k4 | 卡拒绝了。 | OK. Short and strong. |
| k5 | 即使智能体被骗，也无法在这张卡的规则之外付款。 | Good. |
| y1 | 因为每笔付款都要经过八层防护。/ 六层在我们的服务器上运行，约束智能体的行为。 | Good. |
| y2 | 最后两层在链上，即使我们整个服务器被攻陷也依然有效。 | Good. |
| y3 | ...额度依然受限。/ 守护密钥只能冻结... | "额度依然受限" -> 它的额度仍有上限。 "守护密钥" -> 守护者密钥. |
| w1 | 第二个 AI 检查每个卖家和每笔付款。 | OK. |
| w1b | 它会学习你的消费习惯。 | OK. "购买习惯" matches "how you buy". |
| w2 | 多次可疑尝试后，它会冻结这张卡，只有你能解冻。 | Good. |
| w3 | 它只能让你的规则更严格，绝不会更宽松。 | Good. |
| h1 | 十月，金管局的 Carmen Chu 谈到...要以意图为本，设置紧急停止开关，以 AI 对抗 AI，守住安全边界。 | Say 香港金管局. Put the official Chinese name of Carmen Chu if the HKMA publishes it (I am not sure of the characters, do not guess). "以意图为本" -> 紧扣用户意图. |
| h2 | ChainBrain 涵盖了这四点。 | OK. |
| f1 | 在我们托管的 FISCO BCOS 链上，七次违规尝试全部被拒绝。 | "托管的" -> 部署的 (hosted = deployed by us). |
| f2 | 我们对自己的钱包发起了 63 次攻击，一分钱都没有损失。 | Good. |
| f3 | 462 项自动化测试全部通过。 | Good. |
| t1 | 我们是马来亚大学的 Jun Quan 和 Hao Wen，以及马来西亚博特拉大学的 Yong Xi。 | University names correct. Fine. |
| z1 | 给你的 AI 一张卡，而不是你的钱包。 | "而不是" is the "not X" shape the English avoids but fine in Chinese; spoken: 给你的 AI 一张卡，别把钱包交给它。 |

Consistency: always 智能体 (never 代理), 港元 (screen shows HK$), 卡 (not 卡片) in the phone UI.

## 4. Five smallest changes

1. **Before the deadline.** Pick the branch's hash hold (77d4822). It is the one thing I could read and verify. Add nothing else on that beat.
2. **Before the deadline.** Replace the three hardest spoken terms in the voice: "ask-me limit" -> "the amount you set for asking you" (screen keeps "ask-me limit"), "facilitator" -> "a helper service" (screen keeps the word), "the token asks the card" -> "the digital money asks the card first". These are re-recordings of three short lines, so only if the owner voice is being recorded anyway.
3. **Before the deadline.** Fix two visible glitches: the "what you confirmed" overflow in the Task check tile (about 1:40), and the subtitle sitting on top of the two small labels at about 1:48 and 2:04 (move those labels up or hide them under a 2-line subtitle).
4. **Before the deadline.** Turn on the Chinese line only after the corrections in section 3 (about 12 lines change; u1, x5, x6, r1 are real errors). Otherwise leave it off.
5. **After.** Slow the X-ray to one idea at a time, with a 2 s legend of the four lanes and the words x402 / facilitator / EIP-3009 / ERC-1271 shown as plain-language labels ("payment standard", "helper service"). Also enlarge all mono footers (source lines, proof footer) to at least 18 px at 1920 so they survive a small window.
