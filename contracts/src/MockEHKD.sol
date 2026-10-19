// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Clock} from "./Clock.sol";

/// What a contract payer (a pocket) is told after the token moved its money on its ERC-1271 approval.
interface ISpendHook {
    function onSpend(address to, uint256 value) external;
}

/// MOCK e-HKD for the ChainBrain demo on a local FISCO BCOS chain. Not the HKMA e-HKD, not money.
/// A plain ERC-20 (6 decimals) plus EIP-3009 transferWithAuthorization, including the bytes-signature overload
/// (from EIP-3009 as extended for smart-contract payers): for a contract payer it asks the payer (ERC-1271), which is how a pocket approves its payments.
contract MockEHKD is ERC20, EIP712, Ownable {
    bytes32 public constant TRANSFER_WITH_AUTHORIZATION_TYPEHASH = keccak256(
        "TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
    );
    bytes32 public constant CANCEL_AUTHORIZATION_TYPEHASH = keccak256("CancelAuthorization(address authorizer,bytes32 nonce)");

    mapping(address => mapping(bytes32 => bool)) private _usedAuthorizations;
    uint256 internal constant SPEND_HOOK_GAS = 100_000;

    event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce);
    event AuthorizationCanceled(address indexed authorizer, bytes32 indexed nonce);

    constructor(address owner_) ERC20("Mock e-HKD", "eHKD") EIP712("Mock e-HKD", "1") Ownable(owner_) {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    function authorizationState(address authorizer, bytes32 nonce) external view returns (bool) {
        return _usedAuthorizations[authorizer][nonce];
    }

    function transferWithAuthorization(
        address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce,
        uint8 v, bytes32 r, bytes32 s
    ) external {
        transferWithAuthorization(from, to, value, validAfter, validBefore, nonce, abi.encodePacked(r, s, v));
    }

    /// EOA: ECDSA signature. Contract (e.g. a pocket): ERC-1271 isValidSignature(digest, signature).
    function transferWithAuthorization(
        address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce,
        bytes memory signature
    ) public {
        require(Clock.nowSec() > validAfter, "EHKD: authorization is not yet valid");
        require(Clock.nowSec() < validBefore, "EHKD: authorization is expired");
        require(!_usedAuthorizations[from][nonce], "EHKD: authorization is used or canceled");
        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(TRANSFER_WITH_AUTHORIZATION_TYPEHASH, from, to, value, validAfter, validBefore, nonce))
        );
        require(_validSignature(from, digest, signature), "EHKD: invalid signature");
        _usedAuthorizations[from][nonce] = true;
        emit AuthorizationUsed(from, nonce);
        _transfer(from, to, value);
        // a contract signer (a pocket) is told what it just paid, so it can count its period allowance on-chain. The call
        // gets a fixed SPEND_HOOK_GAS and the payment reverts unless that much is left, so a caller cannot starve the
        // count; a contract without the hook (any other ERC-1271 wallet) reverts it, which is ignored.
        if (_byContract(from, digest, signature)) {
            require(gasleft() > SPEND_HOOK_GAS + SPEND_HOOK_GAS / 63 + 10_000, "EHKD: out of gas for the spend hook");
            (bool ok,) = from.call{gas: SPEND_HOOK_GAS}(abi.encodeCall(ISpendHook.onSpend, (to, value)));
            ok;
        }
    }

    function _byContract(address signer, bytes32 digest, bytes memory signature) internal pure returns (bool) {
        (address recovered, ECDSA.RecoverError err,) = ECDSA.tryRecover(digest, signature);
        return !(err == ECDSA.RecoverError.NoError && recovered == signer);
    }

    /// ECDSA by `signer` itself first, then ERC-1271. Not OpenZeppelin's code-length switch: FISCO BCOS gives funded EOAs
    /// pseudo-code ("[PRECOMPILED],…"), which would send an EOA down the ERC-1271 path and reject its own signature.
    /// A pocket's envelope is not a 65-byte signature, so pockets still go through ERC-1271.
    function _validSignature(address signer, bytes32 digest, bytes memory signature) internal view returns (bool) {
        (address recovered, ECDSA.RecoverError err,) = ECDSA.tryRecover(digest, signature);
        if (err == ECDSA.RecoverError.NoError && recovered == signer) return true;
        return signer.code.length > 0 && SignatureChecker.isValidERC1271SignatureNow(signer, digest, signature);
    }

    function cancelAuthorization(address authorizer, bytes32 nonce, bytes memory signature) external {
        require(!_usedAuthorizations[authorizer][nonce], "EHKD: authorization is used or canceled");
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(CANCEL_AUTHORIZATION_TYPEHASH, authorizer, nonce)));
        require(_validSignature(authorizer, digest, signature), "EHKD: invalid signature");
        _usedAuthorizations[authorizer][nonce] = true;
        emit AuthorizationCanceled(authorizer, nonce);
    }
}
