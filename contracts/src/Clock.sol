// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// FISCO BCOS 3.x gives contracts block.timestamp in MILLISECONDS (its web3 RPC still reports seconds).
/// Everything here, and every signed authorization, is in seconds, so normalise. Seconds never pass 1e11
/// (year 5138), so on Ethereum chains this is a no-op.
library Clock {
    function nowSec() internal view returns (uint256) {
        return block.timestamp > 1e11 ? block.timestamp / 1000 : block.timestamp;
    }
}
