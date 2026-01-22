// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Script} from "forge-std/Script.sol";
import {Counter} from "../src/Counter.sol";
// Import other contracts you want to deploy
// import {Token} from "../src/Token.sol";
// import {Vault} from "../src/Vault.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy all contracts
        Counter counter = new Counter();
        // Token token = new Token();
        // Vault vault = new Vault(/* constructor args */);

        // Log deployed addresses
        console.log("Counter deployed at:", address(counter));
        // console.log("Token deployed at:", address(token));
        // console.log("Vault deployed at:", address(vault));

        vm.stopBroadcast();
    }
}



