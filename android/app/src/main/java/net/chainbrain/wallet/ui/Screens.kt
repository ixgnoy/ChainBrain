package net.chainbrain.wallet.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import net.chainbrain.wallet.Api
import net.chainbrain.wallet.Authorization
import net.chainbrain.wallet.Config
import net.chainbrain.wallet.KeyVault
import net.chainbrain.wallet.Money
import net.chainbrain.wallet.OwnerWallet
import net.chainbrain.wallet.PocketView
import net.chainbrain.wallet.Presets
import net.chainbrain.wallet.R
import net.chainbrain.wallet.REASONS
import net.chainbrain.wallet.addressUrl
import net.chainbrain.wallet.approvalsFrom
import net.chainbrain.wallet.pocketStatus
import net.chainbrain.wallet.reasonOf
import net.chainbrain.wallet.shortAddr
import net.chainbrain.wallet.txUrl
import org.json.JSONObject
import org.web3j.crypto.Credentials
import java.math.BigInteger
import java.text.DateFormat
import java.util.Date

private fun Throwable.line() = (message ?: toString()).lineSequence().first()

/** First run (or API unreachable): where the wallet API is, then import a testnet key or create one on this phone. */
@Composable
fun SetupScreen(vault: KeyVault, err: String, hasKey: Boolean, onKey: (Credentials) -> Unit, onConnection: () -> Unit) {
    val p = LocalPalette.current
    var api by remember { mutableStateOf(vault.apiUrl) }
    var rpc by remember { mutableStateOf(vault.rpcUrl) }
    var pk by remember { mutableStateOf("") }
    var msg by remember { mutableStateOf("") }
    CbCard {
        T("Give your AI a pocket, not your wallet.", bold = true, size = 26)
        T("Your main wallet key is stored only on this phone, encrypted by the Android Keystore. Testnet only.", muted = true)
    }
    CbCard {
        T("Connection", bold = true)
        if (err.isNotEmpty()) T(err, color = p.danger)
        Field(api, { api = it }, "Wallet API", "http://192.168.1.20:8787")
        Field(rpc, { rpc = it }, "Base Sepolia RPC", "https://sepolia.base.org")
        Btn("Save and connect", { vault.apiUrl = api; vault.rpcUrl = rpc; onConnection() }, kind = Kind.Ghost)
    }
    if (!hasKey) CbCard {
        T("Main wallet key", bold = true)
        Field(pk, { pk = it }, "", "Paste a testnet private key (0x…)", secret = true)
        if (msg.isNotEmpty()) T(msg, color = p.danger)
        Btn("Import key", { runCatching { vault.save(pk) }.onSuccess(onKey).onFailure { msg = it.line() } }, icon = R.drawable.ph_key_bold)
        Btn("Create a new key", { runCatching { vault.create() }.onSuccess(onKey).onFailure { msg = it.line() } }, kind = Kind.Ghost, icon = R.drawable.ph_plus_bold)
    }
}

/** Main wallet, pockets, and New pocket from a preset (create, then fund: one signature each). */
@Composable
fun HomeScreen(cfg: Config, wallet: OwnerWallet, vault: KeyVault, pockets: List<String>, active: String?, refresh: Int,
               onOpen: (String) -> Unit, onAdd: (String) -> Unit, onChanged: () -> Unit, onConnection: () -> Unit) {
    val p = LocalPalette.current
    val scope = rememberCoroutineScope()
    val uri = LocalUriHandler.current
    var bal by remember { mutableStateOf<Pair<BigInteger, BigInteger>?>(null) }
    val views = remember { mutableStateMapOf<String, PocketView>() }
    var busy by remember { mutableStateOf("") }
    var msg by remember { mutableStateOf("") }
    var existing by remember { mutableStateOf("") }
    LaunchedEffect(wallet, refresh) { runCatching { wallet.balances() }.onSuccess { bal = it } }
    LaunchedEffect(pockets, refresh) { for (a in pockets) runCatching { wallet.readPocket(a) }.onSuccess { views[a] = it } }

    CbCard {
        T("Main wallet ${shortAddr(wallet.address)}", muted = true)
        T(bal?.let { "US$${Money.formatUsd(it.first)}" } ?: "…", big = true)
        T(bal?.let { "%.4f ETH for gas".format(it.second.toBigDecimal().movePointLeft(18).toDouble()) } ?: "", muted = true)
    }
    CbCard {
        T("Pockets", bold = true)
        if (pockets.isEmpty()) T("No pockets yet.", muted = true)
        pockets.forEach { a ->
            val v = views[a]
            val on = a == active
            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(if (on) p.accentSoft else p.sunken)
                    .border(1.dp, if (on) p.accent else p.sunken, RoundedCornerShape(12.dp)).clickable { onOpen(a) }.padding(12.dp),
            ) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    T("Pocket ${shortAddr(a)}")
                    T(v?.let { "US$${Money.formatUsd(it.balance)}" } ?: "…", mono = true)
                }
                T(v?.let { "${pocketStatus(it.revoked, it.expiresAt)}, cap US$${Money.formatUsd(it.cap)}, ask above ${Money.formatUsd(it.askAbove)}" } ?: "", muted = true)
            }
        }
    }
    CbCard {
        T("New pocket", bold = true)
        Presets.all.forEach { pr ->
            Btn("${pr.label}, US$${pr.budget}", {
                scope.launch {
                    msg = ""
                    runCatching {
                        val a = Presets.toPocketArgs(pr, cfg.agent, cfg.sellers.associate { it.id to it.payTo })
                        busy = "Creating pocket…"
                        val (pocket, tx) = wallet.createPocket(a)
                        busy = "Funding pocket…"
                        val f = wallet.fund(pocket, a.budget)
                        msg = "Created ${shortAddr(tx)}, funded ${shortAddr(f)}"
                        onAdd(pocket)
                        onChanged()
                    }.onFailure { msg = it.line() }
                    busy = ""
                }
            }, kind = Kind.Ghost, enabled = busy.isEmpty())
        }
        if (busy.isNotEmpty()) T(busy, muted = true)
        if (msg.isNotEmpty()) T(msg, muted = true)
        Field(existing, { existing = it }, "", "Or add an existing pocket address")
        Btn("Add pocket", { onAdd(existing.trim()); existing = "" }, kind = Kind.Ghost, enabled = Regex("^0x[0-9a-fA-F]{40}$").matches(existing.trim()))
        T("View main wallet on Basescan", Modifier.clickable { uri.openUri(addressUrl(wallet.address)) }, color = p.accent)
    }
    CbCard {
        T("Connection", bold = true)
        T("Wallet API ${vault.apiUrl}", muted = true)
        Btn("Reconnect", onConnection, kind = Kind.Ghost)
    }
}

/** Balance, rules, allowed sellers (each toggle is an owner tx), activity trail, Revoke and Return funds. */
@Composable
fun PocketScreen(cfg: Config, wallet: OwnerWallet, pocket: String, events: List<JSONObject>, refresh: Int, onChanged: () -> Unit) {
    val p = LocalPalette.current
    val scope = rememberCoroutineScope()
    val uri = LocalUriHandler.current
    var v by remember(pocket) { mutableStateOf<PocketView?>(null) }
    var busy by remember { mutableStateOf("") }
    var msg by remember { mutableStateOf("") }
    var tx by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(pocket, refresh) { runCatching { wallet.readPocket(pocket) }.onSuccess { v = it }.onFailure { msg = it.line() } }

    fun act(label: String, f: suspend () -> String) = scope.launch {
        busy = label; msg = ""; tx = null
        runCatching { f() }.onSuccess { msg = label; tx = it; onChanged() }.onFailure { msg = it.line() }
        busy = ""
    }

    val x = v ?: return CbCard { T(msg.ifEmpty { "Loading pocket…" }, muted = true) }
    val status = pocketStatus(x.revoked, x.expiresAt)
    CbCard {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            T("Pocket ${shortAddr(x.address)}", bold = true)
            Badge(status, danger = status != "Active")
        }
        T("US$${Money.formatUsd(x.balance)}", big = true)
        T("Cap US$${Money.formatUsd(x.cap)} per payment", muted = true)
        T("Ask me above ${if (x.askAbove == Money.NEVER) "never" else "US$" + Money.formatUsd(x.askAbove)}", muted = true)
        T("Agent ${shortAddr(x.agent)}", muted = true)
        T("Expires ${DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT).format(Date(x.expiresAt.toLong() * 1000))}", muted = true)
    }
    CbCard {
        T("Allowed sellers", bold = true)
        cfg.sellers.forEach { s ->
            val on = s.id in x.allowed
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column { T(s.name); T(s.category, muted = true) }
                Switch(on, { act(if (on) "Removed ${s.name}" else "Allowed ${s.name}") { wallet.setSeller(x.address, s.payTo, !on) } }, enabled = busy.isEmpty(),
                    colors = SwitchDefaults.colors(checkedTrackColor = p.accent, checkedThumbColor = p.accentText, uncheckedTrackColor = p.sunken, uncheckedBorderColor = p.line))
            }
        }
    }
    CbCard {
        Btn("Revoke", { act("Revoked") { wallet.revoke(x.address) } }, kind = Kind.Danger, enabled = busy.isEmpty() && !x.revoked, icon = R.drawable.ph_hand_palm_bold)
        Btn("Return funds", { act("Returned funds") { wallet.returnFunds(x.address) } }, kind = Kind.Ghost, enabled = busy.isEmpty() && x.balance.signum() > 0, icon = R.drawable.ph_arrow_u_down_left_bold)
        if (busy.isNotEmpty()) T("$busy…", muted = true)
        if (msg.isNotEmpty()) tx?.let { h -> T("$msg, view tx", Modifier.clickable { uri.openUri(txUrl(h)) }, color = p.accent) } ?: T(msg, muted = true)
    }
    CbCard {
        T("Activity", bold = true)
        val trail = events.filter { e -> e.optString("type") in setOf("payment", "refusal", "disclosure") || (e.optString("type") == "intent" && e.optJSONObject("approval")?.optString("status") == "approved") }
        if (trail.isEmpty()) T("Nothing yet.", muted = true)
        trail.forEach { e ->
            when (e.optString("type")) {
                "intent" -> T("Task confirmed: ${e.getJSONObject("approval").optString("text").lineSequence().first()}")
                "payment" -> T("Paid US$${Money.formatUsd(BigInteger(e.optString("amount", "0")))} to ${e.optString("sellerId")}${if (e.optBoolean("cosigned")) " (co-signed)" else ""}, view tx",
                    Modifier.clickable { uri.openUri(txUrl(e.optString("tx"))) })
                "refusal" -> T("Refused ${e.optString("sellerId")}: ${e.optString("reason")}. ${REASONS[e.optString("reason")] ?: ""}", color = p.danger)
                "disclosure" -> T("${e.optString("sellerId")} asked for your data: refused", color = p.warn)
            }
        }
    }
}

/** Chat with the agent, confirm the intent card, approve payments above ask-me (signed on this phone), and see the trace. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AgentScreen(pocket: String, wallet: OwnerWallet, api: Api, events: List<JSONObject>, onChanged: () -> Unit) {
    val p = LocalPalette.current
    val scope = rememberCoroutineScope()
    val lines = remember(pocket) { mutableStateListOf<Pair<Boolean, String>>() } // (fromAgent, text)
    var text by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var signing by remember { mutableStateOf(false) }
    var err by remember { mutableStateOf("") }
    val approvals = approvalsFrom(events)
    val intent = approvals.lastOrNull { it.optString("kind") == "intent" && it.optString("status") == "pending" }
    val pay = approvals.firstOrNull { it.optString("kind") == "payment" && it.optString("status") == "pending" }
    val questions = approvals.filter { it.optString("kind") == "question" && it.optString("status") == "pending" }
    val trace = events.filter { it.optString("type") == "trace" && it.optString("phase") in setOf("tool_call", "tool_result") }

    fun send() {
        val t = text.trim()
        if (t.isEmpty() || busy) return
        text = ""
        lines += false to t
        busy = true
        scope.launch {
            lines += true to runCatching { api.chat(pocket, t) }.getOrElse { "Error: ${it.line()}" }
            busy = false
            onChanged()
        }
    }

    events.filter { it.optString("type") == "disclosure" }.forEach { d ->
        Row(Modifier.fillMaxWidth().padding(bottom = 12.dp).clip(RoundedCornerShape(10.dp)).background(p.warnBg).padding(12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Icon(painterResource(R.drawable.ph_warning_fill), null, Modifier.size(18.dp), tint = p.warn)
            val asked = d.optJSONArray("asked")?.let { a -> (0 until a.length()).joinToString(", ") { a.getString(it) } }.orEmpty().ifEmpty { "your data" }
            T("${d.optString("sellerId")} asked for $asked${if (d.optBoolean("signRequest")) " and an approval signature" else ""}. Refused.", color = p.warn)
        }
    }
    CbCard {
        lines.forEach { (agent, t) ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = if (agent) Arrangement.Start else Arrangement.End) {
                T(t, Modifier.widthIn(max = 300.dp).clip(RoundedCornerShape(16.dp)).background(if (agent) p.sunken else p.accent).padding(horizontal = 13.dp, vertical = 9.dp),
                    color = if (agent) p.text else p.accentText)
            }
        }
        questions.forEach { q -> T("Agent asks: ${q.optString("text")}", color = p.accent) }
        if (busy) T("Agent is working…", muted = true)
        intent?.let { i ->
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(p.accentSoft).border(1.dp, p.accent, RoundedCornerShape(12.dp)).padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)) {
                T("Confirm this task (fixed template)", muted = true)
                T(i.optString("text"), mono = true)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Btn("Decline", { scope.launch { api.decide(i.getString("id"), false) } }, Modifier.weight(1f), kind = Kind.Ghost)
                    Btn("Confirm", { scope.launch { api.decide(i.getString("id"), true) } }, Modifier.weight(1f))
                }
            }
        }
        Field(text, { text = it }, "", "Tell the agent what to buy…", pill = true, onDone = ::send)
        Btn("Send", ::send, enabled = !busy && text.isNotBlank(), icon = R.drawable.ph_paper_plane_tilt_fill)
    }
    CbCard {
        T("Trace (${trace.count { it.optString("phase") == "tool_call" }} tool calls)", bold = true)
        trace.forEach { e ->
            if (e.optString("phase") == "tool_call") T(e.optString("tool"), mono = true)
            else {
                val r = e.optJSONObject("result")
                val why = reasonOf(r)
                when {
                    why != null -> T("   $why ${REASONS[why.substringBefore(",")] ?: ""}", color = p.danger, size = 13)
                    r?.has("tx") == true -> T("   paid, tx ${r.getString("tx").take(12)}…", muted = true)
                    else -> T("   ok", muted = true)
                }
            }
        }
    }

    if (pay != null) {
        val d = pay.getJSONObject("data")
        val sheet = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(onDismissRequest = {}, sheetState = sheet, containerColor = p.card) {
            Column(Modifier.padding(horizontal = 16.dp).padding(bottom = 16.dp).navigationBarsPadding(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                T("Approve payment", bold = true)
                T("US$${d.optString("amount")}", big = true)
                T("to ${d.optString("sellerId")} for “${d.optString("description")}”")
                T("Agent: ${pay.optString("text")}")
                T("Task", muted = true)
                T(d.optString("intent"), mono = true)
                T("You sign a USDC transfer authorization from this pocket to ${d.optString("sellerId")}, valid for this one payment for 10 minutes.", muted = true)
                if (err.isNotEmpty()) T(err, color = p.danger)
                Spacer(Modifier.size(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Btn("Decline", { scope.launch { api.decide(pay.getString("id"), false) } }, Modifier.weight(1f), kind = Kind.Ghost, enabled = !signing)
                    Btn(if (signing) "Signing…" else "Approve and sign", {
                        signing = true; err = ""
                        scope.launch {
                            runCatching {
                                val a = d.getJSONObject("auth")
                                val sig = wallet.signTransfer(Authorization(a.getString("from"), a.getString("to"), BigInteger(a.getString("value")),
                                    BigInteger(a.getString("validAfter")), BigInteger(a.getString("validBefore")), a.getString("nonce")))
                                api.decide(pay.getString("id"), true, sig)?.let { throw IllegalStateException(it) }
                                onChanged()
                            }.onFailure { err = it.line() }
                            signing = false
                        }
                    }, Modifier.weight(1f), enabled = !signing, icon = R.drawable.ph_seal_check_bold)
                }
            }
        }
    }
}
