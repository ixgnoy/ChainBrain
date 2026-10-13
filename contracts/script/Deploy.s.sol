// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {PocketFactory} from "../src/PocketFactory.sol";

contract Deploy is Script {
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    function run() external {
        vm.startBroadcast(vm.envUint("OWNER_PK"));
        PocketFactory factory = new PocketFactory(USDC);
        vm.stopBroadcast();
        string memory json = vm.serializeAddress("d", "PocketFactory", address(factory));
        vm.writeJson(json, string.concat("./deployments/", vm.toString(block.chainid), ".json"));
    }
}
