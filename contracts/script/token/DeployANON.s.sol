// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../../src/token/ANON.sol";

contract DeployANON is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address owner = vm.envAddress("OWNER_ADDRESS");
        address orgsDistributor = vm.envAddress("ORGS_DISTRIBUTOR_ADDRESS");
        address minter = vm.envAddress("MINTER_ADDRESS");
        address couponCreator = vm.envAddress("COUPON_CREATOR_ADDRESS");
        address pauser = vm.envAddress("PAUSER_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        ANON token = new ANON(
            owner,
            orgsDistributor,
            minter,
            couponCreator,
            pauser
        );

        console.log("ANON Token deployed at:", address(token));
        console.log("Owner:", owner);
        console.log("Orgs Distributor:", orgsDistributor);
        console.log("Minter:", minter);
        console.log("Coupon Creator:", couponCreator);
        console.log("Pauser:", pauser);

        vm.stopBroadcast();
    }
}
