package net.chainbrain.wallet

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONArray
import org.web3j.crypto.Credentials
import org.web3j.utils.Numeric
import java.math.BigInteger
import java.security.KeyStore
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * The owner key never leaves this phone: it is encrypted with an AES-GCM key that lives in the Android Keystore
 * (hardware-backed where available) and only the ciphertext is stored in app-private preferences. Testnet keys only.
 * Pocket lists and the API/RPC URLs are not secret and are stored in plain preferences.
 */
class KeyVault(ctx: Context) {
    private val prefs = ctx.getSharedPreferences("chainbrain", Context.MODE_PRIVATE)
    private val alias = "chainbrain.owner_wrap"

    private fun wrapKey(): SecretKey {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (ks.getKey(alias, null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
        }.generateKey()
    }

    fun load(): Credentials? {
        val stored = prefs.getString("owner_pk", null) ?: return null
        val (iv, ct) = stored.split(":").map { Base64.decode(it, Base64.NO_WRAP) }
        val c = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.DECRYPT_MODE, wrapKey(), GCMParameterSpec(128, iv)) }
        return Credentials.create(Numeric.toHexString(c.doFinal(ct)))
    }

    fun save(pk: String): Credentials {
        require(isPrivateKey(pk)) { "Not a private key (0x + 64 hex characters)" }
        val c = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, wrapKey()) }
        val ct = c.doFinal(Numeric.hexStringToByteArray(pk.trim()))
        prefs.edit().putString("owner_pk", Base64.encodeToString(c.iv, Base64.NO_WRAP) + ":" + Base64.encodeToString(ct, Base64.NO_WRAP)).apply()
        return Credentials.create(pk.trim())
    }

    /** New key from the OS CSPRNG, rejected and redrawn if outside the secp256k1 range. */
    fun create(): Credentials {
        val n = BigInteger("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141", 16)
        val rnd = SecureRandom()
        while (true) {
            val k = BigInteger(1, ByteArray(32).also(rnd::nextBytes))
            if (k.signum() > 0 && k < n) return save(Numeric.toHexStringWithPrefixZeroPadded(k, 64))
        }
    }

    fun pockets(owner: String): List<String> = runCatching {
        JSONArray(prefs.getString("pockets.${owner.lowercase()}", "[]")).let { a -> (0 until a.length()).map(a::getString) }
    }.getOrDefault(emptyList())
    fun savePockets(owner: String, list: List<String>) = prefs.edit().putString("pockets.${owner.lowercase()}", JSONArray(list).toString()).apply()

    var apiUrl: String
        get() = prefs.getString("api_url", BuildConfig.API_URL)!!
        set(v) = prefs.edit().putString("api_url", v.trim().trimEnd('/')).apply()
    var rpcUrl: String
        get() = prefs.getString("rpc_url", BuildConfig.RPC_URL)!!
        set(v) = prefs.edit().putString("rpc_url", v.trim()).apply()
}
