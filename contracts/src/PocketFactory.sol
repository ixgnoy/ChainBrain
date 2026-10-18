// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Pocket} from "./Pocket.sol";

contract PocketFactory {
    address public immutable token;
    /// Every pocket from this factory gets this freeze-only guardian (ChainBrain's Sentinel). address(0) = none.
    address public immutable guardian;

    event PocketCreated(address indexed pocket, address indexed owner, address indexed agent);

    constructor(address token_, address guardian_) {
        token = token_;
        guardian = guardian_;
    }

    /// The caller becomes the pocket's owner. Funding is a separate eHKD transfer from the owner's wallet.
    function create(address agent, uint256 cap, uint256 askAbove, uint64 expiresAt, address[] calldata sellers)
        external
        returns (address)
    {
        Pocket p = new Pocket(token, msg.sender, agent, guardian, cap, askAbove, expiresAt, sellers);
        emit PocketCreated(address(p), msg.sender, agent);
        return address(p);
    }
}
