// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {MockEHKD} from "../src/MockEHKD.sol";
import {PocketFactory} from "../src/PocketFactory.sol";

/// Local FISCO BCOS: deploy the mock e-HKD (OWNER is the issuer) and the pocket factory on it,
/// mint HK$10,000 of test eHKD to OWNER. Senders need native balance first: scripts/fisco/fund.sh.
contract DeployFisco is Script {
    function run() external {
        uint256 pk = vm.envUint("OWNER_PK");
        address owner = vm.addr(pk);
        vm.startBroadcast(pk);
        MockEHKD token = new MockEHKD(owner);
        PocketFactory factory = new PocketFactory(address(token));
        token.mint(owner, 10_000e6);
        vm.stopBroadcast();
        vm.serializeAddress("d", "Token", address(token));
        string memory json = vm.serializeAddress("d", "PocketFactory", address(factory));
        vm.writeJson(json, string.concat("./deployments/", vm.toString(block.chainid), ".json"));
    }
}
