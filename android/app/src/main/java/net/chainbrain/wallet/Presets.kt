package net.chainbrain.wallet

import java.math.BigInteger
import java.time.ZonedDateTime

enum class Lifetime { ONE_TASK, UNTIL_TONIGHT, ONGOING }

data class PresetValues(val label: String, val budget: String, val sellers: List<String>, val cap: String, val askAbove: String, val lifetime: Lifetime)

data class PocketArgs(val agent: String, val cap: BigInteger, val askAbove: BigInteger, val expiresAt: BigInteger, val sellers: List<String>, val budget: BigInteger)

// Spec "Presets", in HK$: same values as mobile/src/lib/presets.ts (DataLite HK$2.30, DataPro HK$11.70).
object Presets {
    /** research, onePurchase, askEveryTime */
    val all = listOf(
        PresetValues("Research data", "40", listOf("datalite", "datapro"), "15", "8", Lifetime.UNTIL_TONIGHT),
        PresetValues("One purchase", "2.30", listOf("datalite"), "2.30", "never", Lifetime.ONE_TASK), // DataLite's exact price
        PresetValues("Ask every time", "40", listOf("datalite", "datapro"), "15", "0", Lifetime.ONGOING),
    )

    fun expiryFor(l: Lifetime, now: ZonedDateTime = ZonedDateTime.now()): BigInteger = BigInteger.valueOf(
        when (l) {
            Lifetime.ONGOING -> now.toEpochSecond() + 365L * 86_400
            Lifetime.ONE_TASK -> now.toEpochSecond() + 86_400
            Lifetime.UNTIL_TONIGHT -> now.withHour(23).withMinute(59).withSecond(0).withNano(0).toEpochSecond()
        }
    )

    fun toPocketArgs(v: PresetValues, agent: String, payTo: Map<String, String>, now: ZonedDateTime = ZonedDateTime.now()) = PocketArgs(
        agent = agent,
        cap = Money.parse(v.cap),
        askAbove = if (v.askAbove == "never") Money.NEVER else Money.parse(v.askAbove),
        expiresAt = expiryFor(v.lifetime, now),
        sellers = v.sellers.map { payTo[it] ?: throw IllegalArgumentException("unknown seller $it") },
        budget = Money.parse(v.budget),
    )
}
