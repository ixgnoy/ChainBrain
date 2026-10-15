// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PocketCases, IUSDC} from "./Pocket.fork.t.sol";
import {MockEHKD} from "../src/MockEHKD.sol";

/// The same 20 pocket cases against the mock e-HKD, deployed locally (what runs on FISCO BCOS).
contract PocketEhkdTest is PocketCases {
    function _setUpToken() internal override returns (IUSDC) {
        return IUSDC(address(new MockEHKD(address(this))));
    }
}

/// Same cases with FISCO BCOS's millisecond block.timestamp: expiry and authorization windows still work in seconds.
contract PocketEhkdMsClockTest is PocketCases {
    function _setUpToken() internal override returns (IUSDC) {
        msClock = true;
        vm.warp(1_792_000_000_000);
        return IUSDC(address(new MockEHKD(address(this))));
    }
}
