// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ICreatorToken
 * @dev Interface for creator-launched tokens with bonding curve mechanics
 */
interface ICreatorToken is IERC20 {
    // Token info
    function creator() external view returns (address);
    function description() external view returns (string memory);
    function logoUrl() external view returns (string memory);
    function websiteUrl() external view returns (string memory);
    function telegramUrl() external view returns (string memory);
    function twitterUrl() external view returns (string memory);
    
    // Bonding curve functions
    function buyTokens(uint256 tokenAmount) external payable;
    function sellTokens(uint256 tokenAmount) external;
    function calculateBuyCost(uint256 tokenAmount) external view returns (uint256);
    function calculateSellPrice(uint256 tokenAmount) external view returns (uint256);
    function getCurrentPrice() external view returns (uint256);
    
    // Revenue functions
    function claimCreatorFees() external;
    function getTotalFeesCollected() external view returns (uint256);
    
    // Security functions
    function lockLiquidity(uint256 lockPeriod) external;
    function isLiquidityLocked() external view returns (bool);
    
    // Statistics
    function getTokenStats() external view returns (
        uint256 totalSupply_,
        uint256 totalSold,
        uint256 currentPrice,
        uint256 marketCap,
        uint256 holderCount,
        uint256 creatorFees
    );
    
    // Events
    event TokenPurchased(address indexed buyer, uint256 amount, uint256 price, uint256 totalPaid);
    event TokenSold(address indexed seller, uint256 amount, uint256 price, uint256 totalReceived);
    event CreatorFeeClaimed(address indexed creator, uint256 amount);
    event LiquidityLocked(uint256 lockPeriod);
}

/**
 * @title ITokenFactory
 * @dev Interface for the token creation factory
 */
interface ITokenFactory {
    // Factory functions
    function createToken(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        uint256 initialPrice,
        uint256 creatorFeePercent,
        string memory description,
        string memory logoUrl
    ) external payable returns (address);
    
    // Token management
    function getCreatorTokens(address creator) external view returns (address[] memory);
    function getAllTokens() external view returns (address[] memory);
    function isValidToken(address token) external view returns (bool);
    function tokenToCreator(address token) external view returns (address);
    
    // Factory statistics
    function getFactoryStats() external view returns (
        uint256 totalTokensCreated,
        uint256 totalVolumeTraded,
        uint256 totalFeesCollected,
        uint256 launchFee
    );
    
    // Events
    event TokenCreated(
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        uint256 totalSupply,
        uint256 timestamp
    );
}

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
    
    // Fee calculations
    function calculateDynamicFee(address token) external view returns (uint256);
    
    // Token information
    function getTokenCreator(address token) external view returns (address);
    function tokenFactory() external view returns (address);
    
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

/**
 * @title IBossBattleArena
 * @dev Interface for the gamified battle system
 */
interface IBossBattleArena {
    enum BattleType {
        TRADING_VOLUME,
        HOLDER_GROWTH,
        COMMUNITY_ENGAGEMENT,
        MIXED_METRICS
    }
    
    // Battle management
    function registerForBattle(address token) external;
    function endBattle() external;
    function startNewBattle(BattleType battleType) external;
    
    // Battle information
    function getBattleInfo(uint256 battleId) external view returns (
        uint256 startTime,
        uint256 endTime,
        address[] memory participants,
        address winner,
        uint256 prizePool,
        bool isActive,
        BattleType battleType
    );
    
    // User progress
    function getUserProgress(address user) external view returns (
        uint256 battlesWon,
        uint256 battlesParticipated,
        uint256 totalRewardsEarned,
        uint256 achievementPoints
    );
    
    // Metrics updates
    function updateTokenMetrics(
        address token,
        uint256 tradingVolume,
        uint256 holderCount,
        uint256 communityScore,
        uint256 liquidityDepth,
        uint256 priceStability
    ) external;
    
    // Events
    event BattleStarted(
        uint256 indexed battleId,
        BattleType battleType,
        uint256 startTime,
        uint256 prizePool
    );
    
    event BattleEnded(
        uint256 indexed battleId,
        address indexed winner,
        uint256 prizePool,
        uint256 participantCount
    );
    
    event AchievementUnlocked(
        address indexed user,
        uint256 indexed achievementId,
        uint256 reward
    );
}

/**
 * @title ISecurityController
 * @dev Interface for security and emergency controls
 */
interface ISecurityController {
    // Emergency controls
    function activateEmergencyPause() external;
    function deactivateEmergencyPause() external;
    function isSystemPaused() external view returns (bool);
    
    // Security checks
    function isTokenSafe(address token) external view returns (bool);
    function reportRugPull(address token, string memory reason) external;
    function blacklistToken(address token, string memory reason) external;
    
    // Authorization
    function authorizeContract(address contractAddress) external;
    function deauthorizeContract(address contractAddress) external;
    function isAuthorized(address contractAddress) external view returns (bool);
    
    // Events
    event EmergencyPauseActivated(address indexed activator);
    event EmergencyPauseDeactivated(address indexed deactivator);
    event RugPullDetected(address indexed token, string reason);
    event TokenBlacklisted(address indexed token, string reason);
}