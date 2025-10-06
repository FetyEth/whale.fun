// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ICreatorToken
 * @dev Interface for creator-launched tokens with bonding curve mechanics
 */
interface ICreatorToken is IERC20 {
    function creator() external view returns (address);
    function description() external view returns (string memory);
    function logoUrl() external view returns (string memory);
    function websiteUrl() external view returns (string memory);
    function telegramUrl() external view returns (string memory);
    function twitterUrl() external view returns (string memory);
    
    function buyTokens(uint256 minTokensOut) external payable;
    function sellTokens(uint256 tokenAmount, uint256 minEthOut) external;
    function calculateBuyCost(uint256 tokenAmount) external view returns (uint256);
    function calculateSellPrice(uint256 tokenAmount) external view returns (uint256);
    function getCurrentPrice() external view returns (uint256);
    
    function claimCreatorFees() external;
    function getTotalFeesCollected() external view returns (uint256);
    
    function lockLiquidity(uint256 lockPeriod) external;
    function isLiquidityLocked() external view returns (bool);
    
    function getTokenStats() external view returns (
        uint256 totalSupply_,
        uint256 totalSold,
        uint256 currentPrice,
        uint256 marketCap,
        uint256 holderCount,
        uint256 creatorFees
    );
    
    event TokenPurchased(address indexed buyer, uint256 amount, uint256 price, uint256 totalPaid);
    event TokenSold(address indexed seller, uint256 amount, uint256 price, uint256 totalReceived);
    event CreatorFeeClaimed(address indexed creator, uint256 amount);
    event LiquidityLocked(uint256 lockPeriod);
}
