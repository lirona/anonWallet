// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {COIL} from "../../src/token/COIL.sol";

contract COILTest is Test {
    COIL public token;
    address public owner;
    address public user1;
    address public user2;
    address public pauser;
    address public minter;
    address public couponCreator;
    address public orgsDistributor;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant COUPON_CREATOR_ROLE = keccak256("COUPON_CREATOR_ROLE");
    bytes32 public constant ORGS_DISTRIBUTOR_ROLE = keccak256("ORGS_DISTRIBUTOR_ROLE");

    string public couponCode = "GET50";
    bytes32 public couponHash = keccak256(abi.encodePacked(couponCode));


    function setUp() public {
        owner = makeAddr("owner");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        pauser = makeAddr("pauser");
        minter = makeAddr("minter");
        couponCreator = makeAddr("couponCreator");
        orgsDistributor = makeAddr("orgsDistributor");

        vm.prank(owner);
        token = new COIL(owner, orgsDistributor, minter, couponCreator, pauser);
    }

    // ===== CONSTRUCTOR TESTS =====
    function test_Constructor() public view {
        assertEq(token.name(), "COIL Token");
        assertEq(token.symbol(), "COIL");
        assertEq(token.decimals(), 18);
        assertEq(token.cap(), 1_000_000_000 * 10 ** 18);
        assertEq(token.totalSupply(), 0);

        assertTrue(token.hasRole(token.DEFAULT_ADMIN_ROLE(), owner));
        assertTrue(token.hasRole(MINTER_ROLE, minter));
        assertTrue(token.hasRole(ORGS_DISTRIBUTOR_ROLE, orgsDistributor));
        assertTrue(token.hasRole(PAUSER_ROLE, pauser));
        assertTrue(token.hasRole(COUPON_CREATOR_ROLE, couponCreator));
    }

    // ===== WELCOME BONUS DISTRIBUTION TESTS =====
    function test_DistributeWelcomeBonus_Success() public {
        vm.prank(user1);
        token.distributeWelcomeBonus();

        assertEq(token.balanceOf(user1), token.WELCOME_BONUS_AMOUNT());
        assertTrue(token.hasReceivedWelcomeBonus(user1));
        assertEq(token.welcomeBonusDistributed(), token.WELCOME_BONUS_AMOUNT());
    }

    function test_DistributeWelcomeBonus_Event() public {
        vm.expectEmit(true, false, false, true);
        emit COIL.WelcomeBonusDistributed(user1, token.WELCOME_BONUS_AMOUNT());

        vm.prank(user1);
        token.distributeWelcomeBonus();
    }

    function test_DistributeWelcomeBonus_RevertIfAlreadyReceived() public {
        vm.startPrank(user1);
        token.distributeWelcomeBonus();

        vm.expectRevert("User already received welcome bonus");
        token.distributeWelcomeBonus();
        vm.stopPrank();
    }

    function test_DistributeWelcomeBonus_RevertWhenPaused() public {
        vm.prank(pauser);
        token.pause();

        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("EnforcedPause()"))));
        vm.prank(user1);
        token.distributeWelcomeBonus();
    }

    function test_DistributeWelcomeBonus_RevertIfAllocationExceeded() public {
        uint256 allocation = token.WELCOME_BONUS_ALLOCATION();
        uint256 bonusAmount = token.WELCOME_BONUS_AMOUNT();

        uint256 almostFullAllocation = allocation - bonusAmount;

        // Find the storage slot for welcomeBonusDistributed
        // From storage layout: welcomeBonusDistributed is in slot 7
        bytes32 slot = bytes32(uint256(7));

        vm.store(address(token), slot, bytes32(almostFullAllocation));

        assertEq(token.welcomeBonusDistributed(), almostFullAllocation);

        vm.prank(user1);
        token.distributeWelcomeBonus();

        assertEq(token.welcomeBonusDistributed(), allocation);

        vm.expectRevert("Welcome bonus allocation exceeded");
        vm.prank(user2);
        token.distributeWelcomeBonus();
    }

    // ===== ORGS DISTRIBUTION TESTS =====
    function test_DistributeOrgs_Success() public {
        uint256 amount = 1000 * 10 ** 18;

        vm.expectEmit(true, false, false, true);
        emit COIL.OrgsDistributed(user1, amount);
        vm.prank(orgsDistributor);
        token.distributeOrgs(user1, amount);

        assertEq(token.balanceOf(user1), amount);
        assertEq(token.orgsDistributed(), amount);
    }

    function test_DistributeOrgs_RevertIfNotAuthorized() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")), user1, ORGS_DISTRIBUTOR_ROLE
            )
        );
        vm.prank(user1);
        token.distributeOrgs(user2, 1000 * 10 ** 18);
    }

    function test_DistributeOrgs_RevertWhenPaused() public {
        vm.prank(pauser);
        token.pause();

        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("EnforcedPause()"))));
        vm.prank(orgsDistributor);
        token.distributeOrgs(user1, 1000 * 10 ** 18);
    }

    function test_DistributeOrgs_RevertIfAllocationExceeded() public {
        uint256 allocation = token.ORGS_ALLOCATION();

        vm.startPrank(orgsDistributor);
        token.distributeOrgs(user1, allocation);

        vm.expectRevert("Orgs allocation exceeded");
        token.distributeOrgs(user2, 1);
        vm.stopPrank();
    }

    // ===== GOVERNANCE DISTRIBUTION TESTS =====
    function test_DistributeGovernance_Success() public {
        uint256 amount = 1000 * 10 ** 18;

        vm.expectEmit(true, false, false, true);
        emit COIL.GovernanceDistributed(user1, amount);
        vm.prank(minter);
        token.distributeGovernance(user1, amount);

        assertEq(token.balanceOf(user1), amount);
        assertEq(token.governanceDistributed(), amount);
    }

    function test_DistributeGovernance_RevertIfNotAuthorized() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")), user1, MINTER_ROLE
            )
        );
        vm.prank(user1);
        token.distributeGovernance(user2, 1000 * 10 ** 18);
    }

    function test_DistributeGovernance_RevertWhenPaused() public {
        vm.prank(pauser);
        token.pause();

        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("EnforcedPause()"))));
        vm.prank(minter);
        token.distributeGovernance(user1, 1000 * 10 ** 18);
    }

    function test_DistributeGovernance_RevertIfAllocationExceeded() public {
        uint256 allocation = token.GOVERNANCE_ALLOCATION();

        vm.startPrank(minter);
        token.distributeGovernance(user1, allocation);

        vm.expectRevert("Governance allocation exceeded");
        token.distributeGovernance(user2, 1);
        vm.stopPrank();
    }

    // ===== COUPON TESTS =====
    function test_UpdateCoupon_Success() public {
        uint256 amount = 50 * 10 ** 18;

        vm.expectEmit(true, false, false, true);
        emit COIL.CouponCreated(couponHash, amount);

        vm.prank(couponCreator);
        token.updateCoupon(couponHash, amount);

        assertEq(token.coupons(couponHash), amount);
    }

    function test_UpdateCoupon_DeleteCoupon() public {
        uint256 amount = 50 * 10 ** 18;
        assertEq(token.coupons(couponHash), 0);

        vm.startPrank(couponCreator);
        token.updateCoupon(couponHash, amount);
        assertEq(token.coupons(couponHash), amount);

        token.updateCoupon(couponHash, 0);
        assertEq(token.coupons(couponHash), 0);
        vm.stopPrank();
        }

    function test_UpdateCoupon_RevertIfNotAuthorized() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")), user1, COUPON_CREATOR_ROLE
            )
        );
        vm.prank(user1);
        token.updateCoupon(couponHash, 50 * 10 ** 18);
    }

    function test_RedeemCoupon_Success() public {
        uint256 amount = 50 * 10 ** 18;

        vm.prank(couponCreator);
        token.updateCoupon(couponHash, amount);

        vm.expectEmit(true, true, false, true);
        emit COIL.CouponRedeemed(couponHash, user1, amount);

        vm.prank(user1);
        token.redeem(couponCode);

        assertEq(token.balanceOf(user1), amount);

        vm.prank(user1);
        token.redeem(couponCode);
        assertEq(token.balanceOf(user1), amount * 2);
    }

    function test_RedeemCoupon_RevertIfInvalidCoupon() public {
        vm.expectRevert("Invalid coupon");
        vm.prank(user1);
        token.redeem("INVALID");
    }

    function test_RedeemCoupon_RevertWhenPaused() public {
        uint256 amount = 50 * 10 ** 18;

        vm.prank(couponCreator);
        token.updateCoupon(couponHash, amount);

        vm.prank(pauser);
        token.pause();

        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("EnforcedPause()"))));
        vm.prank(user1);
        token.redeem(couponCode);
    }

    function test_RedeemCoupon_MultipleUsers() public {
        uint256 amount = 50 * 10 ** 18;

        vm.prank(couponCreator);
        token.updateCoupon(couponHash, amount);

        vm.prank(user1);
        token.redeem(couponCode);

        vm.prank(user2);
        token.redeem(couponCode);

        assertEq(token.balanceOf(user1), amount);
        assertEq(token.balanceOf(user2), amount);
    }

    // ===== PAUSE/UNPAUSE TESTS =====
    function test_Pause_Success() public {
        assertFalse(token.paused());

        vm.prank(pauser);
        token.pause();

        assertTrue(token.paused());
    }

    function test_Pause_RevertIfNotAuthorized() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")), user1, PAUSER_ROLE
            )
        );
        vm.prank(user1);
        token.pause();
    }

    function test_Unpause_Success() public {
        vm.prank(pauser);
        token.pause();
        assertTrue(token.paused());

        vm.prank(pauser);
        token.unpause();
        assertFalse(token.paused());
    }

    function test_Unpause_RevertIfNotAuthorized() public {
        vm.prank(pauser);
        token.pause();

        vm.expectRevert(
            abi.encodeWithSelector(
                bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")), user1, PAUSER_ROLE
            )
        );
        vm.prank(user1);
        token.unpause();
    }

    // ===== TRANSFER TESTS =====
    function test_Transfer_RevertWhenPaused() public {
        vm.prank(user1);
        token.distributeWelcomeBonus();

        vm.prank(pauser);
        token.pause();

        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("EnforcedPause()"))));
        vm.prank(user1);
        token.transfer(user2, 100 * 10 ** 18);
    }

    function test_Transfer_SuccessWhenNotPaused() public {
        uint256 transferAmount = 100 * 10 ** 18;

        vm.prank(user1);
        token.distributeWelcomeBonus();

        vm.prank(user1);
        token.transfer(user2, transferAmount);

        assertEq(token.balanceOf(user1), token.WELCOME_BONUS_AMOUNT() - transferAmount);
        assertEq(token.balanceOf(user2), transferAmount);
    }

    // ===== VIEW FUNCTION TESTS =====
    function test_GetRemainingWelcomeBonusAllocation() public {
        uint256 initialAllocation = token.WELCOME_BONUS_ALLOCATION();
        assertEq(token.getRemainingWelcomeBonusAllocation(), initialAllocation);

        vm.prank(user1);
        token.distributeWelcomeBonus();

        uint256 bonusAmount = token.WELCOME_BONUS_AMOUNT();
        assertEq(token.getRemainingWelcomeBonusAllocation(), initialAllocation - bonusAmount);
    }

    function test_GetRemainingOrgsAllocation() public {
        uint256 initialAllocation = token.ORGS_ALLOCATION();
        assertEq(token.getRemainingOrgsAllocation(), initialAllocation);

        uint256 amount = 1000 * 10 ** 18;
        vm.prank(orgsDistributor);
        token.distributeOrgs(user1, amount);

        assertEq(token.getRemainingOrgsAllocation(), initialAllocation - amount);
    }

    function test_GetRemainingGovernanceAllocation() public {
        uint256 initialAllocation = token.GOVERNANCE_ALLOCATION();
        assertEq(token.getRemainingGovernanceAllocation(), initialAllocation);

        uint256 amount = 1000 * 10 ** 18;
        vm.prank(minter);
        token.distributeGovernance(user1, amount);

        assertEq(token.getRemainingGovernanceAllocation(), initialAllocation - amount);
    }

    // ===== FUZZ TESTS =====
    function testFuzz_UpdateCoupon(string calldata _couponCode, uint256 amount) public {
        vm.assume(bytes(_couponCode).length > 0);

        vm.prank(couponCreator);
        token.updateCoupon(keccak256(abi.encodePacked(_couponCode)), amount);

        assertEq(token.coupons(keccak256(abi.encodePacked(_couponCode))), amount);
    }

    function testFuzz_Redeem(string calldata _couponCode) public {
        vm.assume(bytes(_couponCode).length > 0);

        uint256 amount = 100 * 10 ** 18;
        vm.prank(couponCreator);
        token.updateCoupon(keccak256(abi.encodePacked(_couponCode)), amount);

        vm.prank(user1);
        token.redeem(_couponCode);

        assertEq(token.balanceOf(user1), amount);
    }

    // ===== CONSTANTS TESTS =====
    function test_Constants() public view {
        assertEq(token.WELCOME_BONUS_ALLOCATION(), 300_000_000 * 10 ** 18);
        assertEq(token.ORGS_ALLOCATION(), 200_000_000 * 10 ** 18);
        assertEq(token.GOVERNANCE_ALLOCATION(), 500_000_000 * 10 ** 18);
        assertEq(token.WELCOME_BONUS_AMOUNT(), 101 * 10 ** 18);
    }

    function test_TotalAllocation() public view {
        uint256 totalAllocated =
            token.WELCOME_BONUS_ALLOCATION() + token.ORGS_ALLOCATION() + token.GOVERNANCE_ALLOCATION();

        assertEq(totalAllocated, 1_000_000_000 * 10 ** 18);

        assertEq(totalAllocated, token.cap());
    }
}
