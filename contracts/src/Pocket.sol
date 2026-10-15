// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IDomain {
    function DOMAIN_SEPARATOR() external view returns (bytes32);
}

/// A pocket: an isolated USDC balance that approves x402 (EIP-3009) transfers only inside the owner's rules.
/// It never sends transactions itself; USDC v2.2 asks it "is this signature valid?" at settlement.
/// ponytail: budget is the balance itself (isValidSignature is view, so a spend counter is impossible); fund = set budget.
contract Pocket {
    bytes4 internal constant MAGIC = 0x1626ba7e;
    bytes4 internal constant INVALID = 0xffffffff;
    bytes32 internal constant TRANSFER_TYPEHASH = keccak256(
        "TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
    );

    address public immutable usdc;
    address public immutable owner;
    address public immutable agent;
    /// ChainBrain's Sentinel key. It can only freeze (stop all payments); only the owner can unfreeze. address(0) = none.
    address public immutable guardian;

    uint256 public perPaymentCap;
    uint256 public askAbove; // payments above this also need the owner's signature; type(uint256).max = never ask
    uint64 public expiresAt;
    bool public revoked;
    bool public frozen;
    mapping(address => bool) public sellerAllowed;

    event Revoked();
    event Frozen(address indexed by, bytes32 reason);
    event Unfrozen();
    event RulesChanged();

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    constructor(
        address usdc_, address owner_, address agent_, address guardian_, uint256 cap, uint256 askAbove_, uint64 expiresAt_, address[] memory sellers
    ) {
        usdc = usdc_;
        owner = owner_;
        agent = agent_;
        guardian = guardian_;
        perPaymentCap = cap;
        askAbove = askAbove_;
        expiresAt = expiresAt_;
        for (uint256 i; i < sellers.length; i++) sellerAllowed[sellers[i]] = true;
    }

    /// Rule check without signatures, for the tool layer and the app. "OK" = allowed.
    function canPay(address to, uint256 value) public view returns (bytes32) {
        if (revoked) return "POCKET_REVOKED";
        if (frozen) return "POCKET_FROZEN";
        if (block.timestamp >= expiresAt) return "POCKET_EXPIRED";
        if (!sellerAllowed[to]) return "SELLER_NOT_ALLOWED";
        if (value > perPaymentCap) return "OVER_CAP";
        if (value > IERC20(usdc).balanceOf(address(this))) return "OVER_BUDGET";
        return "OK";
    }

    function needsOwner(uint256 value) public view returns (bool) {
        return value > askAbove;
    }

    /// Signature = abi.encode(to, value, validAfter, validBefore, nonce, agentSig, ownerSig).
    /// The pocket rebuilds the USDC digest from those fields, so it only ever approves an in-rule USDC transfer
    /// out of itself: permits, Permit2 and any other message hash fail the first check.
    function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4) {
        (address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, bytes memory agentSig, bytes memory ownerSig) =
            abi.decode(signature, (address, uint256, uint256, uint256, bytes32, bytes, bytes));
        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01", IDomain(usdc).DOMAIN_SEPARATOR(),
            keccak256(abi.encode(TRANSFER_TYPEHASH, address(this), to, value, validAfter, validBefore, nonce))
        ));
        if (digest != hash) return INVALID;
        if (!_signedBy(digest, agentSig, agent)) return INVALID;
        if (canPay(to, value) != "OK") return INVALID;
        if (needsOwner(value) && !_signedBy(digest, ownerSig, owner)) return INVALID;
        return MAGIC;
    }

    function _signedBy(bytes32 digest, bytes memory sig, address who) internal pure returns (bool) {
        (address signer, ECDSA.RecoverError err,) = ECDSA.tryRecover(digest, sig);
        return err == ECDSA.RecoverError.NoError && signer == who;
    }

    // ---- the Sentinel's one power: stop payments. It can never move money, unfreeze or change a rule. ----

    function freeze(bytes32 reason) external {
        require(msg.sender == owner || (guardian != address(0) && msg.sender == guardian), "NOT_GUARDIAN");
        frozen = true;
        emit Frozen(msg.sender, reason);
    }

    // ---- owner only: every edit is an owner-signed transaction ----

    function unfreeze() external onlyOwner {
        frozen = false;
        emit Unfrozen();
    }

    function revoke() external onlyOwner {
        revoked = true;
        emit Revoked();
    }

    function returnFunds() external onlyOwner {
        require(IERC20(usdc).transfer(owner, IERC20(usdc).balanceOf(address(this))), "TRANSFER_FAILED");
    }

    function setSeller(address seller, bool ok) external onlyOwner {
        sellerAllowed[seller] = ok;
        emit RulesChanged();
    }

    function setCap(uint256 cap) external onlyOwner {
        perPaymentCap = cap;
        emit RulesChanged();
    }

    function setAskAbove(uint256 x) external onlyOwner {
        askAbove = x;
        emit RulesChanged();
    }

    function setExpiresAt(uint64 t) external onlyOwner {
        expiresAt = t;
        emit RulesChanged();
    }
}
