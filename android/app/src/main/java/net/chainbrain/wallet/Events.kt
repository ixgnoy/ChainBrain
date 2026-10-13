package net.chainbrain.wallet

import org.json.JSONObject
import java.math.BigInteger

/** Latest state of each approval (events repeat it on every status change); first-seen order, like a JS Map. */
fun approvalsFrom(events: List<JSONObject>): List<JSONObject> {
    val by = LinkedHashMap<String, JSONObject>()
    for (e in events) e.optJSONObject("approval")?.let { by[it.getString("id")] = it }
    return by.values.toList()
}

fun pocketStatus(revoked: Boolean, expiresAt: BigInteger, nowMs: Long = System.currentTimeMillis()) = when {
    revoked -> "Revoked"
    expiresAt.toLong() * 1000 < nowMs -> "Expired"
    else -> "Active"
}

/** Why a tool call was refused, from a tool_result payload (same lookup as the web and Expo apps). */
fun reasonOf(r: JSONObject?): String? {
    if (r == null) return null
    r.optString("reason").takeIf { it.isNotEmpty() }?.let { return it }
    r.optJSONObject("allowedByPocket")?.optString("reason")?.takeIf { it.isNotEmpty() }?.let { return it }
    r.optJSONObject("intentCheck")?.optString("reason")?.takeIf { it.isNotEmpty() }?.let { return it }
    return r.optJSONArray("refused")?.let { a -> (0 until a.length()).joinToString(", ") { a.getString(it) } }
}
