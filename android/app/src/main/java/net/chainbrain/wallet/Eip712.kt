package net.chainbrain.wallet

import org.web3j.crypto.ECKeyPair
import org.web3j.crypto.Hash
import org.web3j.crypto.Keys
import org.web3j.crypto.Sign
import org.web3j.utils.Numeric
import java.math.BigInteger

const val USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
const val CHAIN_ID = 84532L

/** The USDC TransferWithAuthorization the wallet tool layer built (from = pocket). */
data class Authorization(val from: String, val to: String, val value: BigInteger, val validAfter: BigInteger, val validBefore: BigInteger, val nonce: String)

/** EIP-712 digest for USDC v2.2 on Base Sepolia, identical to viem's hashTypedData(transferTypedData(auth)). */
object Eip712 {
    private val DOMAIN_TYPEHASH = keccak("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
    private val TRANSFER_TYPEHASH = keccak("TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)")
    val domainSeparator: ByteArray = Hash.sha3(
        DOMAIN_TYPEHASH + keccak("USDC") + keccak("2") + word(BigInteger.valueOf(CHAIN_ID)) + word(USDC)
    )

    fun digest(a: Authorization): ByteArray {
        val struct = Hash.sha3(
            TRANSFER_TYPEHASH + word(a.from) + word(a.to) + word(a.value) + word(a.validAfter) + word(a.validBefore) + Numeric.hexStringToByteArray(a.nonce)
        )
        return Hash.sha3(byteArrayOf(0x19, 0x01) + domainSeparator + struct)
    }

    /** 65-byte r || s || v signature (v = 27/28), the format the pocket's ECDSA.tryRecover expects. */
    fun sign(a: Authorization, key: ECKeyPair): String {
        val s = Sign.signMessage(digest(a), key, false)
        return Numeric.toHexString(s.r + s.s + s.v)
    }

    fun recover(a: Authorization, signature: String): String {
        val b = Numeric.hexStringToByteArray(signature)
        val pub = Sign.signedMessageHashToKey(digest(a), Sign.SignatureData(b[64], b.copyOfRange(0, 32), b.copyOfRange(32, 64)))
        return Keys.toChecksumAddress(Keys.getAddress(pub))
    }

    private fun keccak(s: String) = Hash.sha3(s.toByteArray())
    private fun word(n: BigInteger) = Numeric.toBytesPadded(n, 32)
    private fun word(address: String) = Numeric.toBytesPadded(Numeric.toBigInt(address), 32)
}

fun addressOf(key: ECKeyPair): String = Keys.toChecksumAddress(Keys.getAddress(key))
fun isPrivateKey(s: String) = Regex("^0x[0-9a-fA-F]{64}$").matches(s.trim())
