// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./WhaleToken.sol";
import "./TokenFactoryRoot.sol";

/**
 * @title TradingEngine
 * @dev Advanced trading system with dynamic fees and AMM functionality
 */
contract TradingEngine is ReentrancyGuard, Ownable {
    WhaleToken public whaleToken;
    TokenFactory public tokenFactory;
    
    // Trading pairs and liquidity
    struct TradingPair {
        address tokenA;
        address tokenB;
        uint256 reserveA;
        uint256 reserveB;
        uint256 totalSupply;
        uint256 lastTradeTime;
        bool isActive;
    }
    
    mapping(bytes32 => TradingPair) public tradingPairs;
    mapping(bytes32 => mapping(address => uint256)) public liquidityBalances;
    bytes32[] public allPairs;
    
    // Fee structure
    struct FeeStructure {
        uint256 baseFee;        // Base trading fee (0.05%)
        uint256 maxFee;         // Maximum fee (0.95%)
        uint256 creatorShare;   // Creator's share of fees (0.3% to 0.95%)
        uint256 platformShare; // Platform's share
        uint256 stakingShare;   // Staking rewards share
    }
    
    FeeStructure public fees;
    
    // Dynamic fee parameters
    mapping(address => uint256) public tokenVolume24h;
    mapping(address => uint256) public tokenHolderCount;
    mapping(address => uint256) public lastVolumeReset;
    
    // Revenue tracking
    mapping(address => uint256) public creatorEarnings;
    mapping(address => uint256) public totalFeesGenerated;
    uint256 public platformRevenue;
    uint256 public stakingRewards;
    
    // Trading statistics
    struct TokenStats {
        uint256 totalVolume;
        uint256 dailyVolume;
        uint256 priceChange24h;
        uint256 allTimeHigh;
        uint256 allTimeLow;
        uint256 lastPrice;
        uint256 marketCap;
    }
    
    mapping(address => TokenStats) public tokenStats;
    
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
    
    event LiquidityRemoved(
        address indexed provider,
        bytes32 indexed pairId,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );
    
    event FeeUpdated(string feeType, uint256 oldFee, uint256 newFee);
    
    constructor(address payable _whaleToken, address payable _tokenFactory) Ownable(msg.sender) {
        whaleToken = WhaleToken(_whaleToken);
        tokenFactory = TokenFactory(_tokenFactory);
        
        // Initialize fee structure
        fees = FeeStructure({
            baseFee: 5,      // 0.05%
            maxFee: 95,      // 0.95%
            creatorShare: 70, // 70% of fees go to creator
            platformShare: 20, // 20% to platform
            stakingShare: 10  // 10% to staking rewards
        });
    }
    
    /**
     * @dev Create a new trading pair
     */
    function createPair(address tokenA, address tokenB) external returns (bytes32) {
        require(tokenA != tokenB, "Identical tokens");
        require(tokenA != address(0) && tokenB != address(0), "Zero address");
        
        bytes32 pairId = keccak256(abi.encodePacked(tokenA, tokenB));
        require(!tradingPairs[pairId].isActive, "Pair already exists");
        
        tradingPairs[pairId] = TradingPair({
            tokenA: tokenA,
            tokenB: tokenB,
            reserveA: 0,
            reserveB: 0,
            totalSupply: 0,
            lastTradeTime: block.timestamp,
            isActive: true
        });
        
        allPairs.push(pairId);
        return pairId;
    }
    
    /**
     * @dev Add liquidity to a trading pair
     */
    function addLiquidity(
        bytes32 pairId,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) external nonReentrant returns (uint256 liquidity) {
        TradingPair storage pair = tradingPairs[pairId];
        require(pair.isActive, "Pair not active");
        
        uint256 amountA;
        uint256 amountB;
        
        if (pair.reserveA == 0 && pair.reserveB == 0) {
            // First liquidity provision
            amountA = amountADesired;
            amountB = amountBDesired;
        } else {
            // Calculate optimal amounts
            uint256 amountBOptimal = (amountADesired * pair.reserveB) / pair.reserveA;
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, "Insufficient B amount");
                amountA = amountADesired;
                amountB = amountBOptimal;
            } else {
                uint256 amountAOptimal = (amountBDesired * pair.reserveA) / pair.reserveB;
                require(amountAOptimal <= amountADesired && amountAOptimal >= amountAMin, "Insufficient A amount");
                amountA = amountAOptimal;
                amountB = amountBDesired;
            }
        }
        
        // Transfer tokens
        IERC20(pair.tokenA).transferFrom(msg.sender, address(this), amountA);
        IERC20(pair.tokenB).transferFrom(msg.sender, address(this), amountB);
        
        // Calculate liquidity
        if (pair.totalSupply == 0) {
            liquidity = sqrt(amountA * amountB) - 1000; // Minimum liquidity lock
        } else {
            liquidity = min(
                (amountA * pair.totalSupply) / pair.reserveA,
                (amountB * pair.totalSupply) / pair.reserveB
            );
        }
        
        require(liquidity > 0, "Insufficient liquidity minted");
        
        // Update reserves and balances
        pair.reserveA += amountA;
        pair.reserveB += amountB;
        pair.totalSupply += liquidity;
        liquidityBalances[pairId][msg.sender] += liquidity;
        
        emit LiquidityAdded(msg.sender, pairId, amountA, amountB, liquidity);
    }
    
    /**
     * @dev Remove liquidity from a trading pair
     */
    function removeLiquidity(
        bytes32 pairId,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin
    ) external nonReentrant returns (uint256 amountA, uint256 amountB) {
        TradingPair storage pair = tradingPairs[pairId];
        require(pair.isActive, "Pair not active");
        require(liquidityBalances[pairId][msg.sender] >= liquidity, "Insufficient liquidity balance");
        
        // Calculate token amounts
        amountA = (liquidity * pair.reserveA) / pair.totalSupply;
        amountB = (liquidity * pair.reserveB) / pair.totalSupply;
        
        require(amountA >= amountAMin && amountB >= amountBMin, "Insufficient output amounts");
        
        // Update state
        liquidityBalances[pairId][msg.sender] -= liquidity;
        pair.reserveA -= amountA;
        pair.reserveB -= amountB;
        pair.totalSupply -= liquidity;
        
        // Transfer tokens
        IERC20(pair.tokenA).transfer(msg.sender, amountA);
        IERC20(pair.tokenB).transfer(msg.sender, amountB);
        
        emit LiquidityRemoved(msg.sender, pairId, amountA, amountB, liquidity);
    }
    
    /**
     * @dev Execute a trade with dynamic fees
     */
    function trade(
        bytes32 pairId,
        address tokenIn,
        uint256 amountIn,
        uint256 amountOutMin
    ) external nonReentrant returns (uint256 amountOut) {
        TradingPair storage pair = tradingPairs[pairId];
        require(pair.isActive, "Pair not active");
        require(tokenIn == pair.tokenA || tokenIn == pair.tokenB, "Invalid token");
        require(amountIn > 0, "Amount must be greater than 0");
        
        // Calculate dynamic fee based on token performance
        uint256 dynamicFee = calculateDynamicFee(tokenIn);
        
        // Calculate output amount with fee
        (uint256 reserveIn, uint256 reserveOut) = tokenIn == pair.tokenA
            ? (pair.reserveA, pair.reserveB)
            : (pair.reserveB, pair.reserveA);
        
        uint256 amountInWithFee = amountIn * (10000 - dynamicFee) / 10000;
        amountOut = (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee);
        
        require(amountOut >= amountOutMin, "Insufficient output amount");
        require(amountOut < reserveOut, "Insufficient liquidity");
        
        // Update reserves
        if (tokenIn == pair.tokenA) {
            pair.reserveA += amountIn;
            pair.reserveB -= amountOut;
        } else {
            pair.reserveB += amountIn;
            pair.reserveA -= amountOut;
        }
        
        // Calculate and distribute fees
        uint256 totalFee = amountIn * dynamicFee / 10000;
        distributeFees(tokenIn, totalFee);
        
        // Update statistics
        updateTokenStats(tokenIn, amountIn, amountOut);
        updateTokenStats(tokenIn == pair.tokenA ? pair.tokenB : pair.tokenA, amountOut, amountIn);
        
        // Transfer tokens
        address tokenOut = tokenIn == pair.tokenA ? pair.tokenB : pair.tokenA;
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        pair.lastTradeTime = block.timestamp;
        
        emit Trade(msg.sender, tokenIn, tokenOut, amountIn, amountOut, totalFee, block.timestamp);
    }
    
    /**
     * @dev Calculate dynamic trading fee based on token performance
     */
    function calculateDynamicFee(address token) public view returns (uint256) {
        // Reset daily volume if 24h passed
        if (block.timestamp > lastVolumeReset[token] + 24 hours) {
            // Volume would be reset in actual implementation
        }
        
        uint256 volume24h = tokenVolume24h[token];
        uint256 holderCount = tokenHolderCount[token];
        
        // Base fee starts at 0.95% and decreases based on performance
        uint256 dynamicFee = fees.maxFee;
        
        // Reduce fee based on 24h volume (more volume = lower fees)
        if (volume24h > 100 ether) {
            dynamicFee = dynamicFee * 80 / 100; // 20% reduction
        }
        if (volume24h > 1000 ether) {
            dynamicFee = dynamicFee * 80 / 100; // Additional 20% reduction
        }
        
        // Reduce fee based on holder count (more holders = lower fees)
        if (holderCount > 100) {
            dynamicFee = dynamicFee * 90 / 100; // 10% reduction
        }
        if (holderCount > 1000) {
            dynamicFee = dynamicFee * 90 / 100; // Additional 10% reduction
        }
        
        // Ensure fee stays within bounds
        if (dynamicFee < fees.baseFee) {
            dynamicFee = fees.baseFee;
        }
        
        return dynamicFee;
    }
    
    /**
     * @dev Distribute trading fees among stakeholders
     */
    function distributeFees(address token, uint256 totalFee) internal {
        // Get token creator
        address creator = getTokenCreator(token);
        
        uint256 creatorFee = totalFee * fees.creatorShare / 100;
        uint256 platformFee = totalFee * fees.platformShare / 100;
        uint256 stakingFee = totalFee * fees.stakingShare / 100;
        
        // Update earnings
        if (creator != address(0)) {
            creatorEarnings[creator] += creatorFee;
        }
        platformRevenue += platformFee;
        stakingRewards += stakingFee;
        totalFeesGenerated[token] += totalFee;
    }
    
    /**
     * @dev Update token trading statistics
     */
    function updateTokenStats(address token, uint256 volumeIn, uint256 volumeOut) internal {
        TokenStats storage stats = tokenStats[token];
        
        // Reset daily volume if needed
        if (block.timestamp > lastVolumeReset[token] + 24 hours) {
            stats.dailyVolume = 0;
            lastVolumeReset[token] = block.timestamp;
        }
        
        // Update volumes
        stats.totalVolume += volumeIn;
        stats.dailyVolume += volumeIn;
        tokenVolume24h[token] += volumeIn;
        
        // Update price tracking
        uint256 currentPrice = volumeOut * 1e18 / volumeIn; // Simplified price calculation
        if (currentPrice > stats.allTimeHigh) {
            stats.allTimeHigh = currentPrice;
        }
        if (stats.allTimeLow == 0 || currentPrice < stats.allTimeLow) {
            stats.allTimeLow = currentPrice;
        }
        
        // Calculate 24h price change
        if (stats.lastPrice > 0) {
            stats.priceChange24h = ((currentPrice - stats.lastPrice) * 100) / stats.lastPrice;
        }
        
        stats.lastPrice = currentPrice;
    }
    
    /**
     * @dev Get token creator from factory
     */
    function getTokenCreator(address token) internal view returns (address) {
        // Query the TokenFactory contract to get the creator of the token
        return tokenFactory.tokenToCreator(token);
    }
    
    /**
     * @dev Get trading pair information
     */
    function getPairInfo(bytes32 pairId) external view returns (
        address tokenA,
        address tokenB,
        uint256 reserveA,
        uint256 reserveB,
        uint256 totalSupply,
        bool isActive
    ) {
        TradingPair storage pair = tradingPairs[pairId];
        return (
            pair.tokenA,
            pair.tokenB,
            pair.reserveA,
            pair.reserveB,
            pair.totalSupply,
            pair.isActive
        );
    }
    
    /**
     * @dev Get token statistics
     */
    function getTokenStats(address token) external view returns (
        uint256 totalVolume,
        uint256 dailyVolume,
        uint256 priceChange24h,
        uint256 allTimeHigh,
        uint256 allTimeLow,
        uint256 lastPrice
    ) {
        TokenStats storage stats = tokenStats[token];
        return (
            stats.totalVolume,
            stats.dailyVolume,
            stats.priceChange24h,
            stats.allTimeHigh,
            stats.allTimeLow,
            stats.lastPrice
        );
    }
    
    /**
     * @dev Admin functions
     */
    function updateFees(
        uint256 _baseFee,
        uint256 _maxFee,
        uint256 _creatorShare,
        uint256 _platformShare,
        uint256 _stakingShare
    ) external onlyOwner {
        require(_baseFee <= _maxFee, "Base fee cannot exceed max fee");
        require(_creatorShare + _platformShare + _stakingShare == 100, "Shares must sum to 100");
        
        fees.baseFee = _baseFee;
        fees.maxFee = _maxFee;
        fees.creatorShare = _creatorShare;
        fees.platformShare = _platformShare;
        fees.stakingShare = _stakingShare;
    }
    
    function withdrawPlatformRevenue() external onlyOwner {
        uint256 amount = platformRevenue;
        platformRevenue = 0;
        payable(owner()).transfer(amount);
    }
    
    function distributeStakingRewards() external onlyOwner {
        uint256 amount = stakingRewards;
        stakingRewards = 0;
        whaleToken.distributeFees{value: amount}();
    }
    
    // Helper functions
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
    
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
    
    // Receive ETH
    receive() external payable {}
}