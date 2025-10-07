// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ILC Token
 *
 * Features:
 * - Capped supply at 1B tokens
 * - Role-based access control (Minter, Pauser, Coupon creator, Welcome bonus distributor)
 * - Pausable for emergency stops
 * - Welcome bonus distribution for new users
 * - Coupon redemption system for users
 */
contract COIL is ERC20Capped, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ORGS_DISTRIBUTOR_ROLE = keccak256("ORGS_DISTRIBUTOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant COUPON_CREATOR_ROLE = keccak256("COUPON_CREATOR_ROLE");

    uint256 public constant WELCOME_BONUS_ALLOCATION = 300_000_000 * 10 ** 18;
    uint256 public constant ORGS_ALLOCATION = 200_000_000 * 10 ** 18;
    uint256 public constant GOVERNANCE_ALLOCATION = 500_000_000 * 10 ** 18;

    uint256 public welcomeBonusDistributed;
    uint256 public orgsDistributed;
    uint256 public governanceDistributed;

    uint256 public constant WELCOME_BONUS_AMOUNT = 101 * 10 ** 18;
    mapping(address => bool) public hasReceivedWelcomeBonus;

    mapping(bytes32 couponHash => uint256 amount) public coupons;

    event WelcomeBonusDistributed(address indexed user, uint256 amount);
    event CouponCreated(bytes32 indexed couponHash, uint256 amount);
    event CouponRedeemed(bytes32 indexed couponHash, address indexed user, uint256 amount);
    event OrgsDistributed(address indexed user, uint256 amount);
    event GovernanceDistributed(address indexed user, uint256 amount);

    constructor(
        address _owner,
        address _orgsDistributor,
        address _governanceDistributor,
        address _couponCreator,
        address _pauser
    ) ERC20("COIL Token", "COIL") ERC20Capped(1_000_000_000 * 10 ** 18) {
        _grantRole(DEFAULT_ADMIN_ROLE, _owner);
        _grantRole(MINTER_ROLE, _governanceDistributor);
        _grantRole(ORGS_DISTRIBUTOR_ROLE, _orgsDistributor);
        _grantRole(PAUSER_ROLE, _pauser);
        _grantRole(COUPON_CREATOR_ROLE, _couponCreator);
    }

    /**
     * @notice Distribute welcome bonus to new users. Mints tokens directly to the sender.
     * @dev Each user can only receive the welcome bonus once. Total distribution is capped.
     */
    function distributeWelcomeBonus() external whenNotPaused {
        require(!hasReceivedWelcomeBonus[msg.sender], "User already received welcome bonus");
        require(
            welcomeBonusDistributed + WELCOME_BONUS_AMOUNT <= WELCOME_BONUS_ALLOCATION,
            "Welcome bonus allocation exceeded"
        );

        hasReceivedWelcomeBonus[msg.sender] = true;
        welcomeBonusDistributed += WELCOME_BONUS_AMOUNT;

        _mint(msg.sender, WELCOME_BONUS_AMOUNT);
        emit WelcomeBonusDistributed(msg.sender, WELCOME_BONUS_AMOUNT);
    }

    /**
     * @notice Distribute tokens to organizations
     * @param to The address to receive the tokens
     * @param amount The amount of tokens to distribute
     * @dev Can only be called by the minter role
     */
    function distributeOrgs(address to, uint256 amount) external onlyRole(ORGS_DISTRIBUTOR_ROLE) whenNotPaused {
        require(to != address(0), "Invalid address");
        require(amount != 0, "Invalid amount");
        orgsDistributed += amount;
        require(orgsDistributed <= ORGS_ALLOCATION, "Orgs allocation exceeded");
        _mint(to, amount);
        emit OrgsDistributed(to, amount);
    }

    /**
     * @notice Distribute governance tokens
     * @param to The address to receive the governance tokens
     * @param amount The amount of tokens to distribute
     * @dev Can only be called by the minter role
     */
    function distributeGovernance(address to, uint256 amount) external onlyRole(MINTER_ROLE) whenNotPaused {
        require(to != address(0), "Invalid address");
        require(amount != 0, "Invalid amount");
        governanceDistributed += amount;
        require(governanceDistributed <= GOVERNANCE_ALLOCATION, "Governance allocation exceeded");
        _mint(to, amount);
        emit GovernanceDistributed(to, amount);
    }

    /**
     * @notice Update a coupon for redemption. Amount 0 means delete the coupon.
     * @param couponHash The keccak256 hash of the coupon code to update
     * @param amount The amount of tokens to distribute
     * @dev Only coupon creator can update coupons
     */
    function updateCoupon(
        bytes32 couponHash,
        uint256 amount
    ) external onlyRole(COUPON_CREATOR_ROLE) {
        require(couponHash != bytes32(0), "Invalid coupon");
        coupons[couponHash] = amount;
        emit CouponCreated(couponHash, amount);
    }

    /**
     * @notice Redeem a coupon code for tokens
     * @param couponCode The coupon code to redeem
     */
    function redeem(string calldata couponCode) external whenNotPaused {
        bytes32 couponHash = keccak256(abi.encodePacked(couponCode));
        uint256 couponAmount = coupons[couponHash];
        require(couponAmount != 0, "Invalid coupon");

        _mint(msg.sender, couponAmount);
        emit CouponRedeemed(couponHash, msg.sender, couponAmount);
    }

    /**
     * @notice Pause the contract
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @notice Get remaining amount of welcome bonus allocation
     */
    function getRemainingWelcomeBonusAllocation() external view returns (uint256) {
        return WELCOME_BONUS_ALLOCATION - welcomeBonusDistributed;
    }

    /**
     * @notice Get remaining amount of allocation for organizations
     */
    function getRemainingOrgsAllocation() external view returns (uint256) {
        return ORGS_ALLOCATION - orgsDistributed;
    }

    /**
     * @notice Get remaining amount of governance allocation
     */
    function getRemainingGovernanceAllocation() external view returns (uint256) {
        return GOVERNANCE_ALLOCATION - governanceDistributed;
    }

    /**
     * @dev Override to add pause functionality
     */
    function _update(address from, address to, uint256 amount) internal override whenNotPaused {
        super._update(from, to, amount);
    }
}
