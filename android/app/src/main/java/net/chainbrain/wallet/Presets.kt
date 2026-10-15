package net.chainbrain.wallet

import java.math.BigInteger
import java.time.ZonedDateTime

enum class Lifetime { ONE_TASK, UNTIL_TONIGHT, ONGOING }

data class PresetValues(val label: String, val budget: String, val sellers: List<String>, val cap: String, val askAbove: String, val lifetime: Lifetime)

data class PocketArgs(val agent: String, val cap: BigInteger, val askAbove: BigInteger, val expiresAt: BigInteger, val sellers: List<String>, val budget: BigInteger)

// Spec "Presets": same values as web/src/presets.ts and mobile/src/lib/presets.ts. HK$ on FISCO, US$ on Base.
object Presets {
    private val base = listOf(
        PresetValues("Research data", "5", listOf("datalite", "datapro"), "2", "1", Lifetime.UNTIL_TONIGHT),
        PresetValues("One purchase", "0.30", listOf("datalite"), "0.30", "never", Lifetime.ONE_TASK),
        PresetValues("Ask every time", "5", listOf("datalite", "datapro"), "2", "0", Lifetime.ONGOING),
    )
    private val fisco = listOf(
        base[0].copy(budget = "40", cap = "15", askAbove = "8"),
        base[1].copy(budget = "2.30", cap = "2.30"), // one purchase = DataLite's exact price
        base[2].copy(budget = "40", cap = "15"),
    )
    /** research, onePurchase, askEveryTime for the chain */
    fun forChain(key: String = ChainInfo.get().key) = if (key == "fisco") fisco else base

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
