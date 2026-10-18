// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Pocket} from "../src/Pocket.sol";
import {PocketFactory} from "../src/PocketFactory.sol";
import {MockEHKD} from "../src/MockEHKD.sol";

/// Shared setup: a pocket on Mock e-HKD with two allowed sellers, cap 2, ask above 1, a weekly allowance of 3,
/// funded with 50, owned by `owner`, spent by `agent`, freezable by `sentinel`.
abstract contract PocketWorld is Test {
    bytes32 constant TRANSFER_TYPEHASH = keccak256(
        "TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
    );
    uint256 constant CAP = 2e6;
    uint256 constant ASK = 1e6;
    uint256 constant WEEKLY = 3e6;
    uint256 constant FUNDED = 50e6;

    MockEHKD token;
    Pocket pocket;
    address owner;
    uint256 ownerPk;
    address agent;
    uint256 agentPk;
    address sentinel = makeAddr("sentinel");
    address dataLite = makeAddr("datalite");
    address dataPro = makeAddr("datapro");
    uint256 seq;

    function _world() internal {
        vm.warp(1_792_000_000);
        (owner, ownerPk) = makeAddrAndKey("owner");
        (agent, agentPk) = makeAddrAndKey("agent");
        token = new MockEHKD(address(this));
        address[] memory sellers = new address[](2);
        sellers[0] = dataLite;
        sellers[1] = dataPro;
        PocketFactory factory = new PocketFactory(address(token), sentinel);
        vm.startPrank(owner);
        pocket = Pocket(factory.create(agent, CAP, ASK, type(uint64).max, sellers));
        pocket.setPeriodLimit(2, WEEKLY);
        vm.stopPrank();
        token.mint(address(pocket), FUNDED);
    }

    function _digest(address to, uint256 value, uint256 validBefore, bytes32 nonce) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(
            "\x19\x01", token.DOMAIN_SEPARATOR(),
            keccak256(abi.encode(TRANSFER_TYPEHASH, address(pocket), to, value, uint256(0), validBefore, nonce))
        ));
    }

    function _sig(uint256 pk, bytes32 d) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, d);
        return abi.encodePacked(r, s, v);
    }

    /// Tries one payment; true if it settled.
    function _pay(address to, uint256 value, bool ownerSigns) internal returns (bool) {
        uint256 validBefore = block.timestamp + 600;
        bytes32 nonce = bytes32(++seq);
        bytes32 d = _digest(to, value, validBefore, nonce);
        bytes memory env = abi.encode(to, value, uint256(0), validBefore, nonce, _sig(agentPk, d), ownerSigns ? _sig(ownerPk, d) : bytes(""));
        try token.transferWithAuthorization(address(pocket), to, value, 0, validBefore, nonce, env) {
            return true;
        } catch {
            return false;
        }
    }
}

/// Stateless fuzz: one payment at a time, any value, any recipient.
contract PocketFuzzTest is PocketWorld {
    function setUp() public {
        _world();
    }

    function testFuzz_no_payment_above_cap(uint256 value, bool ownerSigns) public {
        value = bound(value, CAP + 1, FUNDED);
        assertFalse(_pay(dataLite, value, ownerSigns));
        assertEq(token.balanceOf(address(pocket)), FUNDED);
    }

    function testFuzz_no_payment_to_a_seller_not_allowed(address to, uint256 value, bool ownerSigns) public {
        vm.assume(to != dataLite && to != dataPro && to != address(0) && to != address(pocket));
        value = bound(value, 1, CAP);
        assertFalse(_pay(to, value, ownerSigns));
        assertEq(token.balanceOf(to), 0);
    }

    function testFuzz_above_ask_needs_the_owner(uint256 value) public {
        value = bound(value, ASK + 1, CAP);
        assertFalse(_pay(dataPro, value, false));
        assertTrue(_pay(dataPro, value, true));
    }

    function testFuzz_period_cap_holds_for_the_agent_alone(uint256[8] memory values) public {
        uint256 spent;
        for (uint256 i; i < values.length; i++) {
            uint256 v = bound(values[i], 1, ASK); // under the ask: only the period allowance can stop these
            if (_pay(dataLite, v, false)) spent += v;
            else assertGt(spent + v, WEEKLY); // refused only because it would pass the allowance
        }
        assertLe(spent, WEEKLY);
        assertEq(pocket.spentThisPeriod(), spent);
    }

    /// The guardian (and the agent, and strangers) cannot move funds or change a rule; only the owner can.
    function testFuzz_only_the_owner_moves_funds_or_edits(address who, uint256 x) public {
        vm.assume(who != owner && who != address(pocket));
        bytes[7] memory calls = [
            abi.encodeCall(Pocket.returnFunds, ()),
            abi.encodeCall(Pocket.setCap, (x)),
            abi.encodeCall(Pocket.setSeller, (who, true)),
            abi.encodeCall(Pocket.setSellerCap, (dataLite, x)),
            abi.encodeCall(Pocket.setPeriodLimit, (0, x)),
            abi.encodeCall(Pocket.setAskAbove, (x)),
            abi.encodeCall(Pocket.unfreeze, ())
        ];
        for (uint256 i; i < calls.length; i++) {
            vm.prank(who);
            (bool ok,) = address(pocket).call(calls[i]);
            assertFalse(ok);
        }
        assertEq(token.balanceOf(address(pocket)), FUNDED);
        assertEq(token.balanceOf(who), 0);
    }
}

/// Drives random sequences of payments, owner co-signs, time passing, freezes and unfreezes; records what settled.
contract Handler is PocketWorld {
    uint256 public paidOut;
    uint256 public strayPaid; // anything that reached an address not on the list
    uint256 public overCapWithoutOwner;
    uint256 public overAllowanceWithoutOwner;
    uint256 public settledWhileFrozen;
    uint256 public agentSpendThisPeriod; // what the agent paid alone (no owner signature) in the current week
    uint256 internal week;

    constructor(MockEHKD token_, Pocket pocket_, uint256 ownerPk_, uint256 agentPk_, address dataLite_, address dataPro_, address sentinel_) {
        (token, pocket, ownerPk, agentPk, dataLite, dataPro, sentinel) = (token_, pocket_, ownerPk_, agentPk_, dataLite_, dataPro_, sentinel_);
        owner = vm.addr(ownerPk_);
        agent = vm.addr(agentPk_);
        week = pocket.periodOf(block.timestamp);
    }

    function pay(uint256 sellerSeed, uint256 value, bool ownerSigns) external {
        address to = sellerSeed % 5 == 0 ? address(uint160(sellerSeed)) : (sellerSeed % 2 == 0 ? dataLite : dataPro);
        if (to == address(0) || to == address(pocket)) return;
        value = bound(value, 1, 3 * CAP);
        _roll();
        bool frozen = pocket.frozen();
        if (!_pay(to, value, ownerSigns)) return;
        paidOut += value;
        if (to != dataLite && to != dataPro) strayPaid += value;
        if (frozen) settledWhileFrozen += value;
        if (!ownerSigns) {
            if (value > CAP || value > ASK) overCapWithoutOwner += value;
            agentSpendThisPeriod += value;
            if (agentSpendThisPeriod > WEEKLY) overAllowanceWithoutOwner += value;
        }
    }

    function wait(uint256 secs) external {
        vm.warp(block.timestamp + bound(secs, 1, 3 days));
        _roll();
    }

    function freeze() external {
        vm.prank(sentinel);
        pocket.freeze("FUZZ");
    }

    function unfreeze() external {
        vm.prank(owner);
        pocket.unfreeze();
    }

    function _roll() internal {
        uint256 w = pocket.periodOf(block.timestamp);
        if (w != week) (week, agentSpendThisPeriod) = (w, 0);
    }
}

/// Whatever the sequence, the pocket's rules hold.
contract PocketInvariantTest is PocketWorld {
    Handler handler;

    function setUp() public {
        _world();
        handler = new Handler(token, pocket, ownerPk, agentPk, dataLite, dataPro, sentinel);
        targetContract(address(handler));
    }

    function invariant_money_is_conserved() public view {
        assertEq(token.balanceOf(address(pocket)) + handler.paidOut(), FUNDED);
    }

    function invariant_no_payment_to_a_seller_not_allowed() public view {
        assertEq(handler.strayPaid(), 0);
    }

    function invariant_no_payment_above_cap_or_ask_without_the_owner() public view {
        assertEq(handler.overCapWithoutOwner(), 0);
    }

    function invariant_period_allowance_holds_for_the_agent_alone() public view {
        assertEq(handler.overAllowanceWithoutOwner(), 0);
    }

    function invariant_nothing_settles_while_frozen() public view {
        assertEq(handler.settledWhileFrozen(), 0);
    }

    function invariant_the_guardian_never_holds_funds() public view {
        assertEq(token.balanceOf(sentinel), 0);
    }

    /// Not vacuous: every run really settles payments (and the allowance really refuses some).
    function afterInvariant() public view {
        assertGt(handler.paidOut(), 0);
    }
}
