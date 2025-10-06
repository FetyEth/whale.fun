// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IWethToken
 * @dev Interface for the native WHALE platform token
 */
interface IWethToken is IERC20 {
    
    // Staking functions
    function stake(uint256 amount) external;
    function unstake(uint256 amount) external;
    function claimRewards() external;
    function calculatePendingRewards(address user) external view returns (uint256);
    
    // Governance functions
    function votingPower(address user) external view returns (uint256);
    function vote(bytes32 proposalId, bool support) external;
    
    // Revenue sharing
    function distributeFees() external payable;
    function claimRevenueShare() external;
    
    // Cross-chain functions
    function burn(address from, uint256 amount) external;
    function mint(address to, uint256 amount) external;
    
    // Admin functions
    function pause() external;
    function unpause() external;
    
    // Staking info
    function getStakingInfo(address user) external view returns (
        uint256 staked,
        uint256 earned,
        uint256 pending,
        uint256 voting,
        uint256 revenueShare
    );
    
    // Events
    event Staked(address indexed user, uint256 amount, uint256 timestamp);
    event Unstaked(address indexed user, uint256 amount, uint256 rewards);
    event RewardsClaimed(address indexed user, uint256 amount);
    event FeeDistributed(uint256 totalAmount, uint256 timestamp);
}