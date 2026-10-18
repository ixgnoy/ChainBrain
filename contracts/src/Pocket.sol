// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Clock} from "./Clock.sol";

interface IDomain {
    function DOMAIN_SEPARATOR() external view returns (bytes32);
}

/// A pocket: an isolated Mock e-HKD balance that approves x402 (EIP-3009) transfers only inside the owner's rules.
/// It never sends transactions itself; the token asks it "is this signature valid?" at settlement (ERC-1271).
/// Budget is the balance itself (fund = set budget). isValidSignature is view, so the period allowance is counted by the
/// token: after every authorized transfer out of a pocket, MockEHKD calls onSpend (a real e-HKD would need the same hook).
contract Pocket {
    bytes4 internal constant MAGIC = 0x1626ba7e;
    bytes4 internal constant INVALID = 0xffffffff;
    bytes32 internal constant TRANSFER_TYPEHASH = keccak256(
        "TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
    );

    address public immutable token;
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
    /// A seller's own per-payment cap, in place of perPaymentCap. 0 = the pocket's cap applies.
    mapping(address => uint256) public sellerCap;

    /// The routine allowance: at most periodLimit per calendar period in Hong Kong time (UTC+8, no daylight saving).
    /// 0 = no period, 1 = day (from 00:00), 2 = week (from Monday 00:00), 3 = month (from the 1st). Spend in the current
    /// period counts, nothing carries over. Over it, a payment needs the owner's signature too (the cheque).
    uint8 public periodKind;
    uint256 public periodLimit;
    uint256 internal _spent; // spent in period _spentIn
    uint256 internal _spentIn;

    event Revoked();
    event Frozen(address indexed by, bytes32 reason);
    event Unfrozen();
    event RulesChanged();
    event Spent(address indexed to, uint256 value, uint256 spentThisPeriod);
    /// Every allowlist and seller-cap change, from the constructor on: the allowlist can be rebuilt from logs alone.
    event SellerSet(address indexed seller, bool allowed);
    event SellerCapSet(address indexed seller, uint256 cap);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    constructor(
        address token_, address owner_, address agent_, address guardian_, uint256 cap, uint256 askAbove_, uint64 expiresAt_, address[] memory sellers
    ) {
        token = token_;
        owner = owner_;
        agent = agent_;
        guardian = guardian_;
        perPaymentCap = cap;
        askAbove = askAbove_;
        expiresAt = expiresAt_;
        for (uint256 i; i < sellers.length; i++) {
            sellerAllowed[sellers[i]] = true;
            emit SellerSet(sellers[i], true);
        }
    }

    /// Rule check without signatures, for the tool layer and the app. "OK" = allowed.
    function canPay(address to, uint256 value) public view returns (bytes32) {
        if (revoked) return "POCKET_REVOKED";
        if (frozen) return "POCKET_FROZEN";
        if (Clock.nowSec() >= expiresAt) return "POCKET_EXPIRED";
        if (!sellerAllowed[to]) return "SELLER_NOT_ALLOWED";
        uint256 cap = sellerCap[to];
        if (value > (cap == 0 ? perPaymentCap : cap)) return "OVER_CAP";
        if (value > IERC20(token).balanceOf(address(this))) return "OVER_BUDGET";
        if (periodKind != 0 && spentThisPeriod() + value > periodLimit) return "OVER_PERIOD";
        return "OK";
    }

    /// The calendar period `t` (unix seconds) falls in, for the pocket's periodKind. Hong Kong time.
    function periodOf(uint256 t) public view returns (uint256) {
        uint256 day = (t + 8 hours) / 1 days;
        if (periodKind == 1) return day;
        if (periodKind == 2) return (day + 3) / 7; // 1970-01-01 was a Thursday: +3 starts weeks on Monday
        if (periodKind == 3) {
            (uint256 y, uint256 m) = _yearMonth(day);
            return y * 12 + m;
        }
        return 0;
    }

    function spentThisPeriod() public view returns (uint256) {
        return periodKind != 0 && _spentIn == periodOf(Clock.nowSec()) ? _spent : 0;
    }

    /// Days since 1970-01-01 to a civil year and month (Howard Hinnant's days_from_civil, inverted).
    function _yearMonth(uint256 day) internal pure returns (uint256 y, uint256 m) {
        uint256 z = day + 719468;
        uint256 era = z / 146097;
        uint256 doe = z - era * 146097;
        uint256 yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
        uint256 doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
        uint256 mp = (5 * doy + 2) / 153;
        m = mp < 10 ? mp + 3 : mp - 9;
        y = yoe + era * 400 + (m <= 2 ? 1 : 0);
    }

    function needsOwner(uint256 value) public view returns (bool) {
        return value > askAbove;
    }

    /// Signature = abi.encode(to, value, validAfter, validBefore, nonce, agentSig, ownerSig).
    /// The pocket rebuilds the token's digest from those fields, so it only ever approves an in-rule token transfer
    /// out of itself: permits, Permit2 and any other message hash fail the first check.
    function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4) {
        (address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, bytes memory agentSig, bytes memory ownerSig) =
            abi.decode(signature, (address, uint256, uint256, uint256, bytes32, bytes, bytes));
        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01", IDomain(token).DOMAIN_SEPARATOR(),
            keccak256(abi.encode(TRANSFER_TYPEHASH, address(this), to, value, validAfter, validBefore, nonce))
        ));
        if (digest != hash) return INVALID;
        if (!_signedBy(digest, agentSig, agent)) return INVALID;
        bytes32 rule = canPay(to, value);
        // over the period allowance is the one refusal the owner's signature can lift (the cheque)
        bool ask = rule == "OVER_PERIOD" || needsOwner(value);
        if (rule != "OK" && rule != "OVER_PERIOD") return INVALID;
        if (ask && !_signedBy(digest, ownerSig, owner)) return INVALID;
        return MAGIC;
    }

    /// The token reports every authorized transfer out of this pocket, after making it. Only the token can call this,
    /// and the pocket only authorizes transfers out of itself, so the count is exact.
    function onSpend(address to, uint256 value) external {
        require(msg.sender == token, "NOT_TOKEN");
        if (periodKind == 0) return;
        uint256 p = periodOf(Clock.nowSec());
        if (_spentIn != p) (_spentIn, _spent) = (p, 0);
        _spent += value;
        emit Spent(to, value, _spent);
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
        require(IERC20(token).transfer(owner, IERC20(token).balanceOf(address(this))), "TRANSFER_FAILED");
    }

    function setSeller(address seller, bool ok) external onlyOwner {
        sellerAllowed[seller] = ok;
        emit SellerSet(seller, ok);
        emit RulesChanged();
    }

    function setSellerCap(address seller, uint256 cap) external onlyOwner {
        sellerCap[seller] = cap;
        emit SellerCapSet(seller, cap);
        emit RulesChanged();
    }

    /// kind 0 turns the allowance off. A new kind starts counting from zero.
    function setPeriodLimit(uint8 kind, uint256 limit) external onlyOwner {
        require(kind <= 3, "BAD_PERIOD");
        if (kind != periodKind) (_spentIn, _spent) = (0, 0);
        periodKind = kind;
        periodLimit = limit;
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
