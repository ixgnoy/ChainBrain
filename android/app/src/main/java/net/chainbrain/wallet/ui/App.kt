package net.chainbrain.wallet.ui

import androidx.annotation.DrawableRes
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import net.chainbrain.wallet.Api
import net.chainbrain.wallet.Config
import net.chainbrain.wallet.KeyVault
import net.chainbrain.wallet.OwnerWallet
import net.chainbrain.wallet.R
import org.json.JSONObject
import org.web3j.crypto.Credentials

enum class Tab(val label: String, @DrawableRes val icon: Int, @DrawableRes val iconOn: Int) {
    Wallet("Wallet", R.drawable.ph_wallet, R.drawable.ph_wallet_fill),
    Agent("Agent", R.drawable.ph_chat_circle_dots, R.drawable.ph_chat_circle_dots_fill),
    Pocket("Pocket", R.drawable.ph_vault, R.drawable.ph_vault_fill),
}

/** Same three tabs as the Expo app, held in state (no router). */
@Composable
fun App() {
    val p = LocalPalette.current
    val ctx = LocalContext.current
    val vault = remember { KeyVault(ctx) }
    var creds by remember { mutableStateOf<Credentials?>(runCatching { vault.load() }.getOrNull()) }
    var connection by remember { mutableIntStateOf(0) }
    var cfg by remember { mutableStateOf<Config?>(null) }
    var err by remember { mutableStateOf("") }
    var tab by remember { mutableStateOf(Tab.Wallet) }
    var refresh by remember { mutableIntStateOf(0) }
    val api = remember(connection) { Api(vault.apiUrl) }

    LaunchedEffect(connection) {
        err = ""
        runCatching { api.config() }.onSuccess { cfg = it }.onFailure { err = "Wallet API not reachable at ${vault.apiUrl}. On a phone, use your laptop's LAN IP." }
    }
    val wallet = remember(creds, cfg, connection) { creds?.let { c -> cfg?.let { OwnerWallet(c, vault.rpcUrl, it) } } }
    var pockets by remember(wallet) { mutableStateOf(wallet?.let { vault.pockets(it.address) } ?: emptyList()) }
    var active by remember(wallet) { mutableStateOf(pockets.firstOrNull()) }

    // No EventSource here either: poll /api/events.json for the active pocket every 1.5 s.
    val events = remember(active, connection) { mutableStateListOf<JSONObject>() }
    LaunchedEffect(active, connection) {
        val pk = active ?: return@LaunchedEffect
        var after = 0L
        while (true) {
            runCatching { api.events(pk, after) }.onSuccess { fresh ->
                if (fresh.isNotEmpty()) {
                    after = fresh.last().getLong("at")
                    events.addAll(fresh)
                    if (fresh.any { it.optString("type") == "payment" }) refresh++
                }
            }
            delay(1500)
        }
    }

    fun addPocket(a: String) {
        val next = listOf(a) + pockets.filterNot { it.equals(a, true) }
        pockets = next
        active = a
        wallet?.let { vault.savePockets(it.address, next) }
    }

    Column(Modifier.fillMaxSize().background(p.bg)) {
        Column(Modifier.weight(1f).statusBarsPadding().imePadding().verticalScroll(rememberScrollState()).padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 16.dp)) {
                Icon(painterResource(R.drawable.ph_circles_three_plus), null, Modifier.size(22.dp), tint = p.accent)
                Spacer(Modifier.width(8.dp))
                T("链AI脑 ChainBrain", bold = true, size = 16)
            }
            when {
                creds == null || err.isNotEmpty() -> SetupScreen(vault, err, hasKey = creds != null, onKey = { creds = it }, onConnection = { connection++ })
                cfg == null || wallet == null -> T("Loading…", muted = true)
                tab == Tab.Wallet -> HomeScreen(cfg!!, wallet, vault, pockets, active, refresh, onOpen = { active = it; tab = Tab.Pocket }, onAdd = ::addPocket, onChanged = { refresh++ }, onConnection = { connection++ })
                active == null -> T("Create a pocket first.", muted = true)
                tab == Tab.Agent -> AgentScreen(active!!, wallet, api, events, onChanged = { refresh++ })
                else -> PocketScreen(cfg!!, wallet, active!!, events, refresh, onChanged = { refresh++ })
            }
        }
        if (wallet != null && err.isEmpty()) {
            Row(Modifier.fillMaxWidth().background(p.card).border(1.dp, p.line).navigationBarsPadding()) {
                Tab.entries.forEach { t ->
                    val on = tab == t
                    Column(
                        Modifier.weight(1f).semantics { selected = on }.clickable(role = Role.Tab) { tab = t }.padding(top = 10.dp, bottom = 8.dp),
                        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(2.dp),
                    ) {
                        Icon(painterResource(if (on) t.iconOn else t.icon), null, Modifier.size(24.dp), tint = if (on) p.accent else p.muted)
                        T(t.label, bold = true, size = 12, color = if (on) p.accent else p.muted)
                    }
                }
            }
        }
    }
}
