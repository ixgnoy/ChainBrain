package net.chainbrain.wallet

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertThrows
import org.junit.Test
import org.web3j.crypto.ECKeyPair
import org.web3j.utils.Numeric
import java.math.BigInteger
import java.time.ZoneId
import java.time.ZonedDateTime

// Mirrors mobile/src/lib/logic.test.ts. Reference values come from viem 2.57.4 (hashTypedData / signTypedData).
class LogicTest {
    private val pk = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" // anvil dev key 0 (public)
    private val key = ECKeyPair.create(Numeric.toBigInt(pk))
    private val auth = Authorization(
        from = "0x00000000000000000000000000000000000000aa", to = "0x00000000000000000000000000000000000000bb",
        value = BigInteger.valueOf(1_500_000), validAfter = BigInteger.ZERO, validBefore = BigInteger.valueOf(1_900_000_000),
        nonce = "0x" + "11".repeat(32),
    )

    @Test fun `digest and signature are byte-identical to viem`() {
        assertEquals("0xb7395702a99b199c320cb5ce804a8ec100a8d9d542b5667d3547f08dd3f74eeb", Numeric.toHexString(Eip712.digest(auth)))
        assertEquals(
            "0x4e67a78ffe5addd465ad6a2002939d27b50bfa1294fb6e87633018e5e61e87856aa2fac13eccc79d967347075e914d69499cfe800ba5202efdb5bf3db958589d1c",
            Eip712.sign(auth, key),
        )
    }

    @Test fun `owner co-sign recovers to the owner and is bound to this exact payment`() {
        val sig = Eip712.sign(auth, key)
        assertEquals("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", addressOf(key))
        assertEquals(addressOf(key), Eip712.recover(auth, sig))
        assertNotEquals(addressOf(key), Eip712.recover(auth.copy(value = BigInteger.valueOf(1_900_000)), sig))
    }

    @Test fun `presets match the spec and the web app`() {
        val payTo = mapOf("datalite" to "0x00000000000000000000000000000000000000d1", "datapro" to "0x00000000000000000000000000000000000000d2")
        val a = Presets.toPocketArgs(Presets.research, "0x00000000000000000000000000000000000000aa", payTo)
        assertEquals(listOf(5_000_000L, 2_000_000L, 1_000_000L).map(BigInteger::valueOf), listOf(a.budget, a.cap, a.askAbove))
        assertEquals(Money.NEVER, Presets.toPocketArgs(Presets.onePurchase, a.agent, payTo).askAbove)
        assertThrows(IllegalArgumentException::class.java) { Presets.toPocketArgs(Presets.research.copy(sellers = listOf("nope")), a.agent, payTo) }
        val noon = ZonedDateTime.of(2026, 10, 14, 12, 0, 0, 0, ZoneId.of("Asia/Hong_Kong"))
        assertEquals(ZonedDateTime.of(2026, 10, 14, 23, 59, 0, 0, ZoneId.of("Asia/Hong_Kong")).toEpochSecond(), Presets.expiryFor(Lifetime.UNTIL_TONIGHT, noon).toLong())
    }

    @Test fun `money and status helpers`() {
        assertEquals(BigInteger.valueOf(300_000), Money.parseUsd("0.3"))
        assertEquals("2.15", Money.formatUsd(BigInteger.valueOf(2_150_000)))
        assertEquals("0.30", Money.formatUsd(BigInteger.valueOf(300_000)))
        assertEquals("never", Money.formatUsd(Money.NEVER))
        assertThrows(IllegalArgumentException::class.java) { Money.parseUsd("1.2345678") }
        assertEquals("Active", pocketStatus(false, BigInteger.valueOf(100), 50_000))
        assertEquals("Expired", pocketStatus(false, BigInteger.valueOf(100), 200_000))
        assertEquals("Revoked", pocketStatus(true, BigInteger.valueOf(100), 0))
    }

    @Test fun `approvalsFrom keeps the latest status per approval`() {
        fun ev(status: String) = JSONObject("""{"type":"approval","at":1,"approval":{"id":"a1","kind":"payment","status":"$status"}}""")
        assertEquals(listOf("approved"), approvalsFrom(listOf(ev("pending"), ev("approved"))).map { it.getString("status") })
    }

    @Test fun `refusal reasons are found wherever the tool layer puts them`() {
        assertEquals("OVER_CAP", reasonOf(JSONObject("""{"allowedByPocket":{"reason":"OVER_CAP"}}""")))
        assertEquals("email, phone", reasonOf(JSONObject("""{"refused":["email","phone"]}""")))
        assertEquals(null, reasonOf(JSONObject("""{"tx":"0x1"}""")))
    }
}
