// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockEHKD} from "../src/MockEHKD.sol";
import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// A contract payer that approves exactly one digest (stands in for a pocket).
contract OneDigestWallet is IERC1271 {
    bytes32 public allowed;
    function allow(bytes32 d) external { allowed = d; }
    function isValidSignature(bytes32 hash, bytes memory) external view returns (bytes4) {
        return hash == allowed ? IERC1271.isValidSignature.selector : bytes4(0xffffffff);
    }
}

contract MockEHKDTest is Test {
    MockEHKD t;
    address issuer = makeAddr("issuer");
    address alice;
    uint256 alicePk;
    address bob = makeAddr("bob");

    function setUp() public {
        (alice, alicePk) = makeAddrAndKey("alice");
        t = new MockEHKD(issuer);
        vm.prank(issuer);
        t.mint(alice, 100e6);
    }

    function _digest(address from, address to, uint256 value, uint256 before, bytes32 nonce) internal view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", t.DOMAIN_SEPARATOR(),
            keccak256(abi.encode(t.TRANSFER_WITH_AUTHORIZATION_TYPEHASH(), from, to, value, uint256(0), before, nonce))));
    }

    function _sig(uint256 pk, bytes32 d) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, d);
        return abi.encodePacked(r, s, v);
    }

    function test_metadata() public view {
        assertEq(t.name(), "Mock e-HKD");
        assertEq(t.symbol(), "eHKD");
        assertEq(t.decimals(), 6);
        assertEq(t.balanceOf(alice), 100e6);
    }

    function test_only_owner_mints() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        vm.prank(alice);
        t.mint(alice, 1);
    }

    function test_eoa_authorization_bytes_and_vrs() public {
        uint256 before = block.timestamp + 60;
        bytes32 d = _digest(alice, bob, 2.3e6, before, bytes32(uint256(1)));
        t.transferWithAuthorization(alice, bob, 2.3e6, 0, before, bytes32(uint256(1)), _sig(alicePk, d));
        assertEq(t.balanceOf(bob), 2.3e6);
        assertTrue(t.authorizationState(alice, bytes32(uint256(1))));

        bytes32 d2 = _digest(alice, bob, 1e6, before, bytes32(uint256(2)));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(alicePk, d2);
        t.transferWithAuthorization(alice, bob, 1e6, 0, before, bytes32(uint256(2)), v, r, s);
        assertEq(t.balanceOf(bob), 3.3e6);
    }

    /// FISCO BCOS reports accounts it tracks (native balance, nonce) with pseudo-code "[PRECOMPILED],…", so EXTCODESIZE of a
    /// funded EOA is not 0. An ECDSA signature from the EOA itself must still be accepted (found on the local chain, 17 Oct).
    function test_eoa_with_fisco_account_pseudo_code_still_signs() public {
        vm.etch(alice, bytes("[PRECOMPILED],0000000000000000000000000000000000010004,/usr/alice"));
        assertGt(alice.code.length, 0);
        uint256 before = block.timestamp + 60;
        bytes32 d = _digest(alice, bob, 1e6, before, bytes32(uint256(5)));
        t.transferWithAuthorization(alice, bob, 1e6, 0, before, bytes32(uint256(5)), _sig(alicePk, d));
        assertEq(t.balanceOf(bob), 1e6);
        // and a signature by anyone else for that account is still refused
        (, uint256 malloryPk) = makeAddrAndKey("mallory");
        bytes32 d2 = _digest(alice, bob, 1e6, before, bytes32(uint256(6)));
        bytes memory forged = _sig(malloryPk, d2);
        vm.expectRevert(bytes("EHKD: invalid signature"));
        t.transferWithAuthorization(alice, bob, 1e6, 0, before, bytes32(uint256(6)), forged);
    }

    function test_replay_wrong_signer_and_expiry_revert() public {
        uint256 before = block.timestamp + 60;
        bytes32 d = _digest(alice, bob, 1e6, before, bytes32(uint256(7)));
        bytes memory sig = _sig(alicePk, d);
        t.transferWithAuthorization(alice, bob, 1e6, 0, before, bytes32(uint256(7)), sig);
        vm.expectRevert(bytes("EHKD: authorization is used or canceled"));
        t.transferWithAuthorization(alice, bob, 1e6, 0, before, bytes32(uint256(7)), sig);

        (, uint256 mallory) = makeAddrAndKey("mallory");
        bytes32 d2 = _digest(alice, bob, 1e6, before, bytes32(uint256(8)));
        vm.expectRevert(bytes("EHKD: invalid signature"));
        t.transferWithAuthorization(alice, bob, 1e6, 0, before, bytes32(uint256(8)), _sig(mallory, d2));

        vm.warp(before);
        vm.expectRevert(bytes("EHKD: authorization is expired"));
        t.transferWithAuthorization(alice, bob, 1e6, 0, before, bytes32(uint256(8)), _sig(alicePk, d2));
    }

    function test_contract_payer_uses_erc1271() public {
        OneDigestWallet w = new OneDigestWallet();
        vm.prank(issuer);
        t.mint(address(w), 10e6);
        uint256 before = block.timestamp + 60;
        bytes32 d = _digest(address(w), bob, 2e6, before, bytes32(uint256(3)));
        vm.expectRevert(bytes("EHKD: invalid signature")); // wallet hasn't approved this digest yet
        t.transferWithAuthorization(address(w), bob, 2e6, 0, before, bytes32(uint256(3)), hex"00");
        w.allow(d);
        t.transferWithAuthorization(address(w), bob, 2e6, 0, before, bytes32(uint256(3)), hex"00");
        assertEq(t.balanceOf(bob), 2e6);
    }

    function test_cancel_authorization() public {
        bytes32 nonce = bytes32(uint256(9));
        bytes32 c = keccak256(abi.encodePacked("\x19\x01", t.DOMAIN_SEPARATOR(), keccak256(abi.encode(t.CANCEL_AUTHORIZATION_TYPEHASH(), alice, nonce))));
        t.cancelAuthorization(alice, nonce, _sig(alicePk, c));
        uint256 before = block.timestamp + 60;
        bytes32 d = _digest(alice, bob, 1e6, before, nonce);
        vm.expectRevert(bytes("EHKD: authorization is used or canceled"));
        t.transferWithAuthorization(alice, bob, 1e6, 0, before, nonce, _sig(alicePk, d));
    }
}
