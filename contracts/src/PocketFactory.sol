// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Pocket} from "./Pocket.sol";

contract PocketFactory {
    address public immutable usdc;

    event PocketCreated(address indexed pocket, address indexed owner, address indexed agent);

    constructor(address usdc_) {
        usdc = usdc_;
    }

    /// The caller becomes the pocket's owner. Funding is a separate USDC transfer from the owner's wallet.
    function create(address agent, uint256 cap, uint256 askAbove, uint64 expiresAt, address[] calldata sellers)
        external
        returns (address)
    {
        Pocket p = new Pocket(usdc, msg.sender, agent, cap, askAbove, expiresAt, sellers);
        emit PocketCreated(address(p), msg.sender, agent);
        return address(p);
    }
}
