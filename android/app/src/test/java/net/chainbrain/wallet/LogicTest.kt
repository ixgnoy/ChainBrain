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

    private val fisco = ChainInfo("fisco", 20200, "FISCO BCOS (local)", "http://127.0.0.1:8545", "Mock e-HKD", "1", "HK$", "http://10.0.2.2:8787/api/tx/", "0x0355c0c5Afe2A35369056FBB854903A4aF07781A")
    private val base = ChainInfo("base-sepolia", 84532, "Base Sepolia", "https://sepolia.base.org", "USDC", "2", "US$", "https://sepolia.basescan.org/tx/", "0x036CbD53842c5426634e7929541eC2318f3dCF7e")

    @Test fun `digest and signature are byte-identical to viem on Base Sepolia (USDC v2)`() {
        assertEquals("0xb7395702a99b199c320cb5ce804a8ec100a8d9d542b5667d3547f08dd3f74eeb", Numeric.toHexString(Eip712.digest(auth, base)))
        assertEquals(
            "0x4e67a78ffe5addd465ad6a2002939d27b50bfa1294fb6e87633018e5e61e87856aa2fac13eccc79d967347075e914d69499cfe800ba5202efdb5bf3db958589d1c",
            Eip712.sign(auth, key, base),
        )
    }

    @Test fun `digest and signature are byte-identical to viem on FISCO (Mock e-HKD v1, chain 20200)`() {
        assertEquals("0x8740fe0aa2ae6a1abab87db938b3254e5f4935caeee2cdd08487c539ba962d5c", Numeric.toHexString(Eip712.digest(auth, fisco)))
        assertEquals(
            "0xe8976796f4b190c6f50566f5a918c1a7e768b47a37b6ccfb2d8575bfa431402e32092f02b50416a6222b79ebc5865d23f6bf422e09af3ccb8321e03b617202071c",
            Eip712.sign(auth, key, fisco),
        )
    }

    @Test fun `owner co-sign recovers to the owner and is bound to this exact payment`() {
        val sig = Eip712.sign(auth, key, fisco)
        assertEquals("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", addressOf(key))
        assertEquals(addressOf(key), Eip712.recover(auth, sig, fisco))
        assertNotEquals(addressOf(key), Eip712.recover(auth.copy(value = BigInteger.valueOf(1_900_000)), sig, fisco))
        assertNotEquals(addressOf(key), Eip712.recover(auth, sig, base)) // a FISCO co-sign is useless on another chain
    }

    @Test fun `presets match the spec and the web app (HK$ on FISCO, US$ on Base)`() {
        val payTo = mapOf("datalite" to "0x00000000000000000000000000000000000000d1", "datapro" to "0x00000000000000000000000000000000000000d2")
        val (research, onePurchase) = Presets.forChain("fisco")
        val a = Presets.toPocketArgs(research, "0x00000000000000000000000000000000000000aa", payTo)
        assertEquals(listOf(40_000_000L, 15_000_000L, 8_000_000L).map(BigInteger::valueOf), listOf(a.budget, a.cap, a.askAbove))
        val one = Presets.toPocketArgs(onePurchase, a.agent, payTo)
        assertEquals(listOf(BigInteger.valueOf(2_300_000), BigInteger.valueOf(2_300_000), Money.NEVER), listOf(one.budget, one.cap, one.askAbove))
        val b = Presets.toPocketArgs(Presets.forChain("base-sepolia")[0], a.agent, payTo)
        assertEquals(listOf(5_000_000L, 2_000_000L, 1_000_000L).map(BigInteger::valueOf), listOf(b.budget, b.cap, b.askAbove))
        assertThrows(IllegalArgumentException::class.java) { Presets.toPocketArgs(research.copy(sellers = listOf("nope")), a.agent, payTo) }
        val noon = ZonedDateTime.of(2026, 10, 14, 12, 0, 0, 0, ZoneId.of("Asia/Hong_Kong"))
        assertEquals(ZonedDateTime.of(2026, 10, 14, 23, 59, 0, 0, ZoneId.of("Asia/Hong_Kong")).toEpochSecond(), Presets.expiryFor(Lifetime.UNTIL_TONIGHT, noon).toLong())
    }

    @Test fun `money and status helpers`() {
        assertEquals(BigInteger.valueOf(300_000), Money.parse("0.3"))
        assertEquals("2.15", Money.format(BigInteger.valueOf(2_150_000)))
        assertEquals("0.30", Money.format(BigInteger.valueOf(300_000)))
        assertEquals("never", Money.format(Money.NEVER))
        assertEquals("HK$2.30", money(BigInteger.valueOf(2_300_000), fisco))
        assertEquals("US$0.30", money(BigInteger.valueOf(300_000), base))
        assertThrows(IllegalArgumentException::class.java) { Money.parse("1.2345678") }
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
