package net.chainbrain.wallet

import java.math.BigInteger

// Same rules as mobile/src/lib/shared.ts: Mock e-HKD has 6 decimals; "never" = max uint256.
object Money {
    val NEVER: BigInteger = BigInteger.TWO.pow(256) - BigInteger.ONE
    private val UNIT = BigInteger.valueOf(1_000_000)
    private val amount = Regex("""^(\d+)(?:\.(\d{1,6}))?$""")

    fun parse(s: String): BigInteger {
        val m = amount.matchEntire(s.trim()) ?: throw IllegalArgumentException("bad amount: $s")
        return BigInteger(m.groupValues[1]) * UNIT + BigInteger(m.groupValues[2].padEnd(6, '0'))
    }

    fun format(n: BigInteger): String {
        if (n == NEVER) return "never"
        val frac = n.mod(UNIT).toString().padStart(6, '0').trimEnd('0').padEnd(2, '0')
        return "${n / UNIT}.$frac"
    }
}

fun shortAddr(a: String?): String = if (a.isNullOrEmpty()) "" else "${a.take(6)}…${a.takeLast(4)}"
/** "HK$2.30" from atomic eHKD units. */
fun money(n: BigInteger, c: ChainInfo = ChainInfo.get()) = if (n == Money.NEVER) "never" else "${c.currency}${Money.format(n)}"
/** FISCO has no public explorer: links open the wallet API's own (/explorer). */
fun txUrl(hash: String) = ChainInfo.get().txUrl + hash
fun addressUrl(a: String) = ChainInfo.get().txUrl.replace("#/tx/", "#/address/") + a

val REASONS = mapOf(
    "SELLER_NOT_ALLOWED" to "Seller not in this pocket's allowlist",
    "OVER_CAP" to "Above the per-payment cap",
    "OVER_BUDGET" to "Not enough left in the pocket",
    "OVER_PERIOD" to "Over this period's allowance; needs your OK",
    "POCKET_REVOKED" to "You revoked this pocket",
    "POCKET_EXPIRED" to "The pocket has expired",
    "PRICE_ABOVE_INTENT" to "Price above the task's max per item",
    "INTENT_TOTAL_REACHED" to "Would exceed the task's total",
    "INTENT_ITEMS_REACHED" to "Task's item count reached",
    "INTENT_EXPIRED" to "Task deadline passed",
    "INTENT_NOT_CONFIRMED" to "You haven't confirmed a task yet",
    "NEEDS_OWNER_APPROVAL" to "Above your ask-me threshold",
    "APPROVAL_EXPIRED" to "Approval window passed",
    "OWNER_DECLINED" to "You declined",
    "QUOTE_MISMATCH" to "Seller changed the payment request",
    "QUOTE_ALREADY_PAID" to "Already paid",
    "DISCLOSURE_REFUSED" to "Seller asked for your data; refused",
    "SIGNATURE_TYPE_NOT_ALLOWED" to "Only in-rule token payments are signed",
    "SETTLEMENT_FAILED" to "Settlement failed",
)
