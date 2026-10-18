package net.chainbrain.wallet

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import org.web3j.abi.FunctionEncoder
import org.web3j.abi.datatypes.Address
import org.web3j.abi.datatypes.Bool
import org.web3j.abi.datatypes.DynamicArray
import org.web3j.abi.datatypes.Function
import org.web3j.abi.datatypes.Type
import org.web3j.abi.datatypes.generated.Uint256
import org.web3j.abi.datatypes.generated.Uint64
import org.web3j.crypto.Credentials
import org.web3j.crypto.Hash
import org.web3j.crypto.RawTransaction
import org.web3j.crypto.TransactionEncoder
import org.web3j.utils.Numeric
import java.math.BigInteger
import java.util.concurrent.TimeUnit

val http: OkHttpClient = OkHttpClient.Builder().connectTimeout(10, TimeUnit.SECONDS).readTimeout(120, TimeUnit.SECONDS).build()
private val JSON = "application/json".toMediaType()

/** Minimal JSON-RPC over OkHttp (web3j-core would add rxjava and jackson for four calls). */
class Rpc(private val url: String) {
    private var id = 0
    suspend fun call(method: String, vararg params: Any): Any = withContext(Dispatchers.IO) {
        val body = JSONObject().put("jsonrpc", "2.0").put("id", ++id).put("method", method).put("params", JSONArray(params.toList()))
        http.newCall(Request.Builder().url(url).post(body.toString().toRequestBody(JSON)).build()).execute().use { r ->
            val j = JSONObject(r.body.string())
            j.optJSONObject("error")?.let { throw IllegalStateException(it.optString("message", "RPC error")) }
            j.get("result")
        }
    }
    suspend fun ethCall(to: String, data: String) = call("eth_call", JSONObject().put("to", to).put("data", data), "latest") as String
}

data class PocketView(val address: String, val owner: String, val agent: String, val cap: BigInteger, val askAbove: BigInteger, val expiresAt: BigInteger, val revoked: Boolean, val balance: BigInteger, val allowed: List<String>)
data class Seller(val id: String, val name: String, val category: String, val payTo: String)
data class Config(val agent: String, val factory: String, val token: String, val chain: ChainInfo, val sellers: List<Seller>)

private fun fn(name: String, vararg args: Type<*>) = FunctionEncoder.encode(Function(name, args.toList(), emptyList()))
private fun word(hex: String) = Numeric.toBigInt(hex.ifEmpty { "0x0" })
private fun addr(hex: String) = org.web3j.crypto.Keys.toChecksumAddress("0x" + Numeric.cleanHexPrefix(hex).takeLast(40))
private val POCKET_CREATED = Numeric.toHexString(Hash.sha3("PocketCreated(address,address,address)".toByteArray()))

/** The owner's main wallet on this phone: reads pockets and sends owner-signed transactions (legacy at gas price 0 on FISCO). */
class OwnerWallet(private val creds: Credentials, rpcUrl: String, private val cfg: Config) {
    val address: String = creds.address.let { org.web3j.crypto.Keys.toChecksumAddress(it) }
    private val rpc = Rpc(rpcUrl)

    suspend fun balances(): Pair<BigInteger, BigInteger> =
        word(rpc.ethCall(cfg.token, fn("balanceOf", Address(address)))) to word(rpc.call("eth_getBalance", address, "latest") as String)

    suspend fun readPocket(p: String): PocketView {
        suspend fun r(name: String, vararg a: Type<*>) = rpc.ethCall(p, fn(name, *a))
        return PocketView(
            address = p, owner = addr(r("owner")), agent = addr(r("agent")), cap = word(r("perPaymentCap")), askAbove = word(r("askAbove")),
            expiresAt = word(r("expiresAt")), revoked = word(r("revoked")) == BigInteger.ONE,
            balance = word(rpc.ethCall(cfg.token, fn("balanceOf", Address(p)))),
            allowed = cfg.sellers.filter { word(r("sellerAllowed", Address(it.payTo))) == BigInteger.ONE }.map { it.id },
        )
    }

    suspend fun createPocket(a: PocketArgs): Pair<String, String> {
        val (hash, receipt) = send(cfg.factory, fn("create", Address(a.agent), Uint256(a.cap), Uint256(a.askAbove), Uint64(a.expiresAt), DynamicArray(Address::class.java, a.sellers.map(::Address))))
        val logs = receipt.getJSONArray("logs")
        for (i in 0 until logs.length()) {
            val t = logs.getJSONObject(i).getJSONArray("topics")
            if (t.getString(0).equals(POCKET_CREATED, true)) return org.web3j.crypto.Keys.toChecksumAddress(addr(t.getString(1))) to hash
        }
        throw IllegalStateException("no PocketCreated event in $hash")
    }
    suspend fun fund(p: String, amount: BigInteger) = send(cfg.token, fn("transfer", Address(p), Uint256(amount))).first
    suspend fun revoke(p: String) = send(p, fn("revoke")).first
    suspend fun returnFunds(p: String) = send(p, fn("returnFunds")).first
    suspend fun setSeller(p: String, seller: String, ok: Boolean) = send(p, fn("setSeller", Address(seller), Bool(ok))).first

    /** Co-sign the exact token transfer the wallet tool layer built (payments above the ask-me threshold). */
    fun signTransfer(a: Authorization) = Eip712.sign(a, creds.ecKeyPair, cfg.chain)

    private suspend fun send(to: String, data: String): Pair<String, JSONObject> {
        val nonce = word(rpc.call("eth_getTransactionCount", address, "pending") as String)
        val gas = word(rpc.call("eth_estimateGas", JSONObject().put("from", address).put("to", to).put("data", data)) as String) * BigInteger.valueOf(12) / BigInteger.TEN
        val chainId = cfg.chain.id
        // FISCO: gas is free (price 0) but the sender needs a non-zero native balance (the faucet or fund.sh); legacy EIP-155 tx.
        val raw = RawTransaction.createTransaction(nonce, BigInteger.ZERO, gas, to, BigInteger.ZERO, data)
        val hash = rpc.call("eth_sendRawTransaction", Numeric.toHexString(TransactionEncoder.signMessage(raw, chainId, creds))) as String
        repeat(120) {
            val rec = rpc.call("eth_getTransactionReceipt", hash)
            if (rec is JSONObject) {
                if (rec.getString("status") != "0x1") throw IllegalStateException("transaction reverted: $hash")
                return hash to rec
            }
            delay(1000)
        }
        throw IllegalStateException("no receipt after 2 min: $hash")
    }
}
