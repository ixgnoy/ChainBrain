package net.chainbrain.wallet

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject

/** The wallet API (server/src/index.ts): config, chat, approvals, and polled events (no EventSource on Android either). */
class Api(private val base: String) {
    private suspend fun get(path: String): String = withContext(Dispatchers.IO) {
        http.newCall(Request.Builder().url(base + path).build()).execute().use { r ->
            if (!r.isSuccessful) throw IllegalStateException("wallet API ${r.code}")
            r.body.string()
        }
    }
    private suspend fun post(path: String, body: JSONObject): JSONObject = withContext(Dispatchers.IO) {
        http.newCall(Request.Builder().url(base + path).post(body.toString().toRequestBody("application/json".toMediaType())).build()).execute().use { r ->
            val text = r.body.string()
            val j = runCatching { JSONObject(text) }.getOrElse { JSONObject().put("error", "HTTP ${r.code}") }
            if (!r.isSuccessful && !j.has("error")) j.put("error", "HTTP ${r.code}")
            j
        }
    }

    suspend fun config(): Config {
        val j = JSONObject(get("/api/config"))
        val s = j.getJSONArray("sellers")
        val c = j.getJSONObject("chain")
        val d = c.getJSONObject("domain")
        // FISCO tx links go to this API's /api/tx (the server's own URL says localhost, which on a phone is the phone)
        val txUrl = if (c.getString("key") == "fisco") "$base/api/tx/" else c.getString("txUrl")
        val chain = ChainInfo(c.getString("key"), c.getLong("id"), c.getString("name"), c.getString("rpc"), d.getString("name"), d.getString("version"), c.getString("currency"), txUrl, j.getString("token"))
        ChainInfo.current = chain
        return Config(j.getString("agent"), j.getString("factory"), j.getString("token"), chain,
            (0 until s.length()).map { s.getJSONObject(it).let { x -> Seller(x.getString("id"), x.getString("name"), x.getString("category"), x.getString("payTo")) } })
    }
    suspend fun chat(pocket: String, text: String): String =
        post("/api/chat", JSONObject().put("pocket", pocket).put("text", text)).let { it.optString("reply").ifEmpty { it.optString("error", "(no reply)") } }
    suspend fun decide(id: String, approved: Boolean, signature: String? = null): String? =
        post("/api/approvals/$id", JSONObject().put("approved", approved).apply { signature?.let { put("signature", it) } }).optString("error").ifEmpty { null }
    suspend fun events(pocket: String, after: Long): List<JSONObject> =
        JSONArray(get("/api/events.json?pocket=$pocket&after=$after")).let { a -> (0 until a.length()).map(a::getJSONObject) }
}
