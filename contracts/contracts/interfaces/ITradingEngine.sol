// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ITradingEngine
 * @dev Interface for the advanced trading system
 */
interface ITradingEngine {
    // Trading pair management
    function createPair(address tokenA, address tokenB) external returns (bytes32);
    function addLiquidity(
        bytes32 pairId,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) external returns (uint256 liquidity);
    
    function removeLiquidity(
        bytes32 pairId,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin
    ) external returns (uint256 amountA, uint256 amountB);
    
    // Trading functions
    function trade(
        bytes32 pairId,
        address tokenIn,
        uint256 amountIn,
        uint256 amountOutMin
    ) external returns (uint256 amountOut);
    
    // Token information
    function getTokenCreator(address token) external view returns (address);
    function tokenFactory() external view returns (address);
    
    // Fee calculations
    function calculateDynamicFee(address token) external view returns (uint256);
    
    // Statistics
    function getPairInfo(bytes32 pairId) external view returns (
        address tokenA,
        address tokenB,
        uint256 reserveA,
        uint256 reserveB,
        uint256 totalSupply,
        bool isActive
    );
    
    function getTokenStats(address token) external view returns (
        uint256 totalVolume,
        uint256 dailyVolume,
        uint256 priceChange24h,
        uint256 allTimeHigh,
        uint256 allTimeLow,
        uint256 lastPrice
    );
    
    // Events
    event Trade(
        address indexed trader,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee,
        uint256 timestamp
    );
    
    event LiquidityAdded(
        address indexed provider,
        bytes32 indexed pairId,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );
}