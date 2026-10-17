// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Pocket} from "../src/Pocket.sol";
import {PocketFactory} from "../src/PocketFactory.sol";

interface IToken {
    function balanceOf(address) external view returns (uint256);
    function DOMAIN_SEPARATOR() external view returns (bytes32);
    function authorizationState(address, bytes32) external view returns (bool);
    function transferWithAuthorization(
        address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, bytes calldata signature
    ) external;
}

/// The pocket cases against the Mock e-HKD (Pocket.ehkd.t.sol runs them on a seconds clock and on FISCO's millisecond clock).
abstract contract PocketCases is Test {
    IToken token; // the payment token: MockEHKD (Mock e-HKD), as deployed on FISCO BCOS
    bytes32 constant TRANSFER_TYPEHASH = keccak256(
        "TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
    );

    struct Auth { address to; uint256 value; uint256 validBefore; bytes32 nonce; bytes32 digest; bytes agentSig; }

    Pocket pocket;
    address owner;
    uint256 ownerPk;
    address agent;
    uint256 agentPk;
    address dataLite = makeAddr("datalite");
    address dataPro = makeAddr("datapro");
    address wines = makeAddr("harbour-wines");
    address attacker = makeAddr("0xABC");
    address facilitator = makeAddr("facilitator");
    address sentinel = makeAddr("sentinel");
    uint256 salt;
    bool msClock; // FISCO BCOS: contracts see block.timestamp in milliseconds

    function _now() internal view returns (uint256) {
        return msClock ? block.timestamp / 1000 : block.timestamp;
    }

    function _warpBy(uint256 secs) internal {
        vm.warp(block.timestamp + (msClock ? secs * 1000 : secs));
    }

    function setUp() public {
        token = _setUpToken();
        (owner, ownerPk) = makeAddrAndKey("owner");
        (agent, agentPk) = makeAddrAndKey("agent");
        address[] memory sellers = new address[](2);
        sellers[0] = dataLite;
        sellers[1] = dataPro;
        PocketFactory factory = new PocketFactory(address(token), sentinel);
        vm.prank(owner);
        // Research preset from the spec: budget 5, cap 2, ask above 1
        pocket = Pocket(factory.create(agent, 2e6, 1e6, uint64(_now() + 1 days), sellers));
        deal(address(token), address(pocket), 5e6);
    }

    /// Deploy the token (deal() must work on it).
    function _setUpToken() internal virtual returns (IToken);

    function _auth(address to, uint256 value, uint256 pk) internal returns (Auth memory a) {
        a.to = to;
        a.value = value;
        a.validBefore = _now() + 600;
        a.nonce = keccak256(abi.encode(keccak256("intent"), salt++)); // nonce = hash(intentHash, seq)
        a.digest = keccak256(abi.encodePacked(
            "\x19\x01", token.DOMAIN_SEPARATOR(),
            keccak256(abi.encode(TRANSFER_TYPEHASH, address(pocket), to, value, uint256(0), a.validBefore, a.nonce))
        ));
        a.agentSig = _sign(pk, a.digest);
    }

    function _sign(uint256 pk, bytes32 digest) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    function _env(Auth memory a, bytes memory ownerSig) internal pure returns (bytes memory) {
        return abi.encode(a.to, a.value, uint256(0), a.validBefore, a.nonce, a.agentSig, ownerSig);
    }

    function _submit(Auth memory a, bytes memory ownerSig) internal {
        vm.prank(facilitator);
        token.transferWithAuthorization(address(pocket), a.to, a.value, 0, a.validBefore, a.nonce, _env(a, ownerSig));
    }

    // ---- what a pocket allows ----

    function test_scene2_small_payment_settles_without_owner() public {
        _submit(_auth(dataLite, 3e5, agentPk), "");
        assertEq(token.balanceOf(dataLite), 3e5);
        assertEq(token.balanceOf(address(pocket)), 5e6 - 3e5);
    }

    function test_scene3_above_ask_settles_with_owner_cosign() public {
        Auth memory a = _auth(dataPro, 1.5e6, agentPk);
        _submit(a, _sign(ownerPk, a.digest));
        assertEq(token.balanceOf(dataPro), 1.5e6);
    }

    function test_payment_exactly_at_ask_needs_no_owner() public {
        _submit(_auth(dataPro, 1e6, agentPk), "");
        assertEq(token.balanceOf(dataPro), 1e6);
    }

    // ---- what a pocket stops ----

    function test_above_ask_without_owner_reverts() public {
        Auth memory a = _auth(dataPro, 1.5e6, agentPk);
        vm.expectRevert();
        _submit(a, "");
    }

    function test_above_ask_with_agent_as_owner_reverts() public {
        Auth memory a = _auth(dataPro, 1.5e6, agentPk);
        bytes memory fakeOwner = _sign(agentPk, a.digest);
        vm.expectRevert();
        _submit(a, fakeOwner);
    }

    function test_owner_cosign_for_other_payment_reverts() public {
        Auth memory approved = _auth(dataPro, 1.5e6, agentPk);
        Auth memory other = _auth(dataPro, 1.9e6, agentPk);
        bytes memory ownerSig = _sign(ownerPk, approved.digest);
        vm.expectRevert();
        _submit(other, ownerSig);
    }

    function test_scene5_injected_recipient_reverts() public {
        Auth memory a = _auth(attacker, 50e6, agentPk);
        vm.expectRevert();
        _submit(a, "");
    }

    function test_scene4_not_allowlisted_seller_reverts() public {
        Auth memory a = _auth(wines, 4e5, agentPk);
        vm.expectRevert();
        _submit(a, "");
    }

    function test_over_cap_reverts_even_with_owner_cosign() public {
        Auth memory a = _auth(dataPro, 2.5e6, agentPk);
        bytes memory ownerSig = _sign(ownerPk, a.digest);
        vm.expectRevert();
        _submit(a, ownerSig);
    }

    function test_wrong_agent_key_reverts() public {
        (, uint256 rogue) = makeAddrAndKey("rogue");
        Auth memory a = _auth(dataLite, 3e5, rogue);
        vm.expectRevert();
        _submit(a, "");
    }

    function test_scene7_revoked_reverts() public {
        vm.prank(owner);
        pocket.revoke();
        Auth memory a = _auth(dataLite, 3e5, agentPk);
        vm.expectRevert();
        _submit(a, "");
    }

    function test_expired_reverts() public {
        _warpBy(2 days);
        Auth memory a = _auth(dataLite, 3e5, agentPk);
        vm.expectRevert();
        _submit(a, "");
    }

    function test_replay_reverts() public {
        Auth memory a = _auth(dataLite, 3e5, agentPk);
        _submit(a, "");
        assertTrue(token.authorizationState(address(pocket), a.nonce));
        vm.expectRevert();
        _submit(a, "");
    }

    function test_permit_or_other_digest_rejected() public {
        Auth memory a = _auth(dataLite, 3e5, agentPk);
        assertEq(pocket.isValidSignature(keccak256("permit or approval"), _env(a, "")), bytes4(0xffffffff));
    }

    function test_garbage_signature_reverts_cleanly() public {
        vm.expectRevert();
        vm.prank(facilitator);
        token.transferWithAuthorization(address(pocket), dataLite, 1, 0, _now() + 60, bytes32(uint256(1)), hex"deadbeef");
    }

    // ---- rules, reasons, owner-only edits ----

    function test_canPay_reasons() public {
        assertEq(pocket.canPay(dataLite, 3e5), bytes32("OK"));
        assertEq(pocket.canPay(wines, 3e5), bytes32("SELLER_NOT_ALLOWED"));
        assertEq(pocket.canPay(dataPro, 2.5e6), bytes32("OVER_CAP"));
        assertTrue(pocket.needsOwner(1.5e6));
        assertFalse(pocket.needsOwner(1e6));
        vm.startPrank(owner);
        pocket.setCap(10e6);
        assertEq(pocket.canPay(dataPro, 6e6), bytes32("OVER_BUDGET"));
        pocket.revoke();
        vm.stopPrank();
        assertEq(pocket.canPay(dataLite, 3e5), bytes32("POCKET_REVOKED"));
    }

    function test_owner_edits_take_effect() public {
        vm.startPrank(owner);
        pocket.setSeller(wines, true);
        pocket.setAskAbove(type(uint256).max); // "never ask"
        vm.stopPrank();
        _submit(_auth(wines, 1.5e6, agentPk), "");
        assertEq(token.balanceOf(wines), 1.5e6);
    }

    function test_only_owner_edits() public {
        vm.startPrank(agent);
        vm.expectRevert(bytes("NOT_OWNER"));
        pocket.setSeller(attacker, true);
        vm.expectRevert(bytes("NOT_OWNER"));
        pocket.setCap(100e6);
        vm.expectRevert(bytes("NOT_OWNER"));
        pocket.returnFunds();
        vm.stopPrank();
    }

    function test_scene7_return_funds() public {
        vm.prank(owner);
        pocket.returnFunds();
        assertEq(token.balanceOf(owner), 5e6);
        assertEq(token.balanceOf(address(pocket)), 0);
    }

    function test_scene8_one_purchase_preset_budget_is_exact_price() public {
        address[] memory one = new address[](1);
        one[0] = dataLite;
        PocketFactory f = new PocketFactory(address(token), sentinel);
        vm.prank(owner);
        Pocket p = Pocket(f.create(agent, 2e5, type(uint256).max, uint64(_now() + 1 days), one));
        deal(address(token), address(p), 2e5);
        assertEq(p.canPay(dataLite, 3e5), bytes32("OVER_CAP")); // every seller costs more: dead end
        assertEq(p.canPay(dataPro, 2e5), bytes32("SELLER_NOT_ALLOWED"));
    }

    // ---- the Sentinel's freeze ----

    function test_guardian_freeze_stops_payments_owner_unfreezes() public {
        vm.prank(sentinel);
        pocket.freeze("REFUSAL_BURST");
        assertTrue(pocket.frozen());
        assertEq(pocket.canPay(dataLite, 3e5), bytes32("POCKET_FROZEN"));
        Auth memory a = _auth(dataLite, 3e5, agentPk);
        vm.prank(facilitator);
        vm.expectRevert();
        token.transferWithAuthorization(address(pocket), a.to, a.value, 0, a.validBefore, a.nonce, _env(a, ""));
        assertEq(token.balanceOf(address(pocket)), 5e6);
        vm.prank(owner);
        pocket.unfreeze();
        _submit(_auth(dataLite, 3e5, agentPk), "");
        assertEq(token.balanceOf(dataLite), 3e5);
    }

    function test_guardian_can_only_freeze() public {
        vm.startPrank(sentinel);
        vm.expectRevert(bytes("NOT_OWNER"));
        pocket.unfreeze();
        vm.expectRevert(bytes("NOT_OWNER"));
        pocket.setCap(100e6);
        vm.expectRevert(bytes("NOT_OWNER"));
        pocket.setSeller(attacker, true);
        vm.expectRevert(bytes("NOT_OWNER"));
        pocket.returnFunds();
        vm.stopPrank();
    }

    function test_agent_and_strangers_cannot_freeze_owner_can() public {
        vm.prank(agent);
        vm.expectRevert(bytes("NOT_GUARDIAN"));
        pocket.freeze("X");
        vm.prank(attacker);
        vm.expectRevert(bytes("NOT_GUARDIAN"));
        pocket.freeze("X");
        vm.prank(owner);
        pocket.freeze("OWNER");
        assertTrue(pocket.frozen());
    }

    function test_no_guardian_factory() public {
        PocketFactory f = new PocketFactory(address(token), address(0));
        address[] memory one = new address[](1);
        one[0] = dataLite;
        vm.prank(owner);
        Pocket p = Pocket(f.create(agent, 2e5, type(uint256).max, uint64(block.timestamp + 1 days), one));
        assertEq(p.guardian(), address(0));
        vm.prank(address(0));
        vm.expectRevert(bytes("NOT_GUARDIAN"));
        p.freeze("X");
    }
}
