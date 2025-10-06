// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/ICreatorToken.sol";
// IWhaleToken interface removed - functionality integrated directly
import "./libraries/BondingCurveLibrary.sol";
import "./libraries/MEVProtectionLibrary.sol";
import "./libraries/SecurityLibrary.sol";

/**
 * @title CreatorToken
 * @dev Enhanced creator token with dynamic bonding curves and MEV protection
 */
contract CreatorToken is ERC20, ReentrancyGuard, ICreatorToken {
    // Removed complex bonding curve - using hybrid approach
    using MEVProtectionLibrary for MEVProtectionLibrary.MEVConfig;
    using SecurityLibrary for SecurityLibrary.RiskMetrics;
    
    // Core token information
    address public immutable creator;
    address public immutable factory;
    address public immutable whaleToken;
    uint256 public immutable tokenLaunchTime;
    
    // MAINNET: AMM reserves for x*y=k
    uint256 public ethReserve;    // ETH in the pool
    uint256 public tokenReserve; // Tokens in the pool
    uint256 public constant TRADING_FEE = 30; // 0.3% in basis points
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant MAX_TRADE_PERCENT = 500; // 5% max trade size
    
    // Token metadata
    string public override description;
    string public override logoUrl;
    string public override websiteUrl;
    string public override telegramUrl;
    string public override twitterUrl;
    
    // Hybrid bonding curve configuration
    BondingCurveLibrary.CurveConfig public curveConfig;
    uint256 public totalSupply_;
    uint256 public totalSold;
    uint256 public currentPrice;
    uint256 public marketCap;
    
    // MEV Protection
    MEVProtectionLibrary.MEVConfig public mevConfig;
    mapping(address => MEVProtectionLibrary.RateLimit) public userRateLimits;
    mapping(bytes32 => MEVProtectionLibrary.TransactionCommit) public transactionCommits;
    mapping(address => uint256) public lastTransactionBlock;
    
    // Security and liquidity
    uint256 public liquidityLockPeriod;
    bool public override isLiquidityLocked;
    uint256 public totalFeeCollected;
    uint256 public creatorFeePercent;
    
    // Advanced metrics for graduation and transparency
    mapping(address => uint256) public holderBalances;
    uint256 public holderCount;
    uint256 public dailyVolume;
    uint256 public lastVolumeReset;
    uint256[] public priceHistory;
    uint256[] public timestampHistory;
    
    // MAINNET: Enhanced tracking for holders, trades, and top traders
    struct TradeInfo {
        address trader;
        uint256 amount;
        uint256 ethValue;
        uint256 timestamp;
        bool isBuy;
    }
    
    struct TopTrader {
        address trader;
        uint256 totalVolume;     // Total ETH volume traded
        uint256 currentBalance;  // Current token balance
        uint256 tradeCount;      // Number of trades
        uint256 firstTradeTime; // When they first traded
    }
    
    // Trade tracking
    TradeInfo[] public allTrades;
    mapping(address => uint256) public traderTotalVolume;
    mapping(address => uint256) public traderTradeCount;
    mapping(address => uint256) public traderFirstTrade;
    
    // Top traders (maintain top 10)
    TopTrader[10] public topTraders;
    uint256 public totalTrades;
    uint256 public totalUniqueTraders;
    
    // Security: Track suspicious activity
    mapping(address => bool) public flaggedTraders;
    mapping(address => uint256) public rapidTradeCount;
    mapping(address => uint256) public lastTradeBlock;
    
    // Events
    event BondingCurveUpdated(uint8 newPhase, uint256 timestamp);
    event MEVAttemptBlocked(address indexed user, string reason, uint256 timestamp);
    event PriceImpactWarning(address indexed user, uint256 impact, uint256 timestamp);
    
    // FIXED: Add comprehensive security events
    event PriceUpdate(uint256 oldPrice, uint256 newPrice, uint256 timestamp);
    event LargeTrade(address indexed trader, uint256 amount, uint256 price, string tradeType);
    event SuspiciousActivity(address indexed user, string activityType, uint256 severity);
    event LiquidityChange(uint256 oldLiquidity, uint256 newLiquidity, int256 change);
    event CreatorAction(address indexed creator, string action, uint256 value);
    
    // MAINNET: New tracking events
    event TradeRecorded(address indexed trader, uint256 tokenAmount, uint256 ethValue, bool indexed isBuy, uint256 tradeId);
    event TopTraderUpdated(address indexed trader, uint256 totalVolume, uint256 rank);
    event SuspiciousTraderFlagged(address indexed trader, string reason);
    event HolderMilestone(uint256 holderCount, uint256 timestamp);
    
    // Modifiers
    modifier mevProtected(uint256 amount) {
        require(_checkMEVProtection(msg.sender, amount), "MEV protection triggered");
        _;
        _updateTransactionData(msg.sender, amount);
    }
    
    modifier validCommitReveal(uint256 amount, uint256 nonce) {
        bytes32 commitHash = MEVProtectionLibrary.generateCommitHash(
            msg.sender, amount, nonce, address(this)
        );
        require(
            MEVProtectionLibrary.verifyCommitReveal(
                transactionCommits[commitHash],
                msg.sender,
                amount,
                nonce,
                address(this)
            ),
            "Invalid commit-reveal"
        );
        _;
        transactionCommits[commitHash].revealed = true;
    }
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 _totalSupply,
        uint256 targetMarketCap,
        address _creator,
        address _whaleToken,
        uint256 /* _creatorFeePercent */,
        string memory _description,
        string memory _logoUrl,
        uint256 /* communitySize */,
        uint256 /* liquidityDepth */
    ) ERC20(name, symbol) {
        creator = _creator;
        factory = msg.sender;
        whaleToken = _whaleToken;
        totalSupply_ = _totalSupply;
        creatorFeePercent = 0; // No creator fee for mainnet AMM flow
        description = _description;
        logoUrl = _logoUrl;
        tokenLaunchTime = block.timestamp;
        liquidityLockPeriod = 30 days;
        
        // Initialize MEV protection
        mevConfig = MEVProtectionLibrary.getDefaultMEVConfig();
        
        // Initialize hybrid bonding curve
        curveConfig = BondingCurveLibrary.initializeCurve(_totalSupply, targetMarketCap);
        currentPrice = BondingCurveLibrary.getCurrentPrice(curveConfig);
        
        // Mint total supply to this contract for bonding curve
        _mint(address(this), _totalSupply);
        
        // Initialize price tracking
        priceHistory.push(currentPrice);
        timestampHistory.push(block.timestamp);
    }
    
    function commitTokenPurchase(bytes32 commitHash) external {
        require(commitHash != bytes32(0), "Invalid commit hash");
        require(transactionCommits[commitHash].commitHash == bytes32(0), "Commit already exists");
        
        transactionCommits[commitHash] = MEVProtectionLibrary.TransactionCommit({
            commitHash: commitHash,
            commitTime: block.timestamp,
            user: msg.sender,
            revealed: false,
            executed: false
        });
        
        emit MEVProtectionLibrary.TransactionCommitted(msg.sender, commitHash, block.timestamp);
    }
    
    function buyTokens(uint256 minTokensOut) 
        external 
        payable 
        override
        nonReentrant 
    {
        require(msg.value > 0, "Must send ETH");
        
        uint256 ethIn = msg.value;
        
        // SECURITY: Check for rapid trading (potential bot/manipulation)
        _checkRapidTrading(msg.sender);
        
        // Calculate 0.3% fee in ETH
        uint256 fee = (ethIn * TRADING_FEE) / FEE_DENOMINATOR;
        uint256 ethAfterFee = ethIn - fee;
        
        // AMM calculation: x * y = k
        // tokensOut = tokenReserve - (ethReserve * tokenReserve) / (ethReserve + ethAfterFee)
        uint256 tokensOut = tokenReserve - 
            (ethReserve * tokenReserve) / (ethReserve + ethAfterFee);
        
        require(tokensOut >= minTokensOut, "Insufficient output amount");
        require(tokensOut <= tokenReserve, "Insufficient token liquidity");
        
        // SECURITY: Check for whale manipulation
        if (tokensOut > totalSupply_ / 20) { // More than 5% of supply
            emit SuspiciousActivity(msg.sender, "large_buy_whale_alert", 3);
        }
        
        // Update reserves
        ethReserve += ethAfterFee;
        tokenReserve -= tokensOut;
        
        // Update tracking
        bool wasNewHolder = (holderBalances[msg.sender] == 0);
        totalSold += tokensOut;
        totalFeeCollected += fee;
        
        if (wasNewHolder) {
            holderCount++;
            // Emit milestone events
            if (holderCount % 10 == 0) {
                emit HolderMilestone(holderCount, block.timestamp);
            }
        }
        holderBalances[msg.sender] += tokensOut;
        
        // Update price from new reserves
        uint256 oldPrice = currentPrice;
        currentPrice = (ethReserve * 1e18) / tokenReserve;
        marketCap = totalSold * currentPrice / 1e18;
        
        // MAINNET: Record trade and update metrics
        _recordTrade(msg.sender, tokensOut, ethIn, true);
        _updateTopTraders(msg.sender, ethIn);
        
        _updateDailyVolume(ethIn);
        _updatePriceHistory();
        
        // Transfer tokens to buyer
        _transfer(address(this), msg.sender, tokensOut);
        
        // Emit events
        if (currentPrice != oldPrice) {
            emit PriceUpdate(oldPrice, currentPrice, block.timestamp);
        }
        
        if (ethIn > 1 ether) {
            emit LargeTrade(msg.sender, tokensOut, currentPrice, "buy");
        }
        
        emit TokenPurchased(msg.sender, tokensOut, currentPrice, ethIn);
    }
    
    function buyTokensWithCommit(
        uint256 tokenAmount, 
        uint256 nonce
    ) 
        external 
        payable 
        nonReentrant 
        validCommitReveal(tokenAmount, nonce)
    {
        _executeBuyTokens(msg.sender, tokenAmount, msg.value);
    }
    
    function _executeBuyTokens(address buyer, uint256 tokenAmount, uint256 ethSent) internal {
        require(tokenAmount > 0, "Invalid amount");
        
        // Debug: Check actual balances
        uint256 contractBalance = balanceOf(address(this));
        uint256 totalSupplyCheck = totalSupply();
        
        // More detailed error message for debugging
        require(contractBalance >= tokenAmount, 
            string(abi.encodePacked(
                "Contract balance: ", 
                _toString(contractBalance),
                ", requested: ",
                _toString(tokenAmount),
                ", total supply: ",
                _toString(totalSupplyCheck)
            ))
        );
        
        // FIXED: Add minimum purchase to prevent manipulation
        require(tokenAmount >= 1e15, "Minimum purchase amount"); // Minimum purchase to prevent manipulation
        
        // Use hybrid bonding curve for cost calculation with streaming bonus
        uint256 cost = BondingCurveLibrary.calculateBuyCost(curveConfig, tokenAmount);
        
        // Check for whale alert
        uint8 whaleLevel = BondingCurveLibrary.getWhaleAlertLevel(ethSent);
        if (whaleLevel > 0) {
            string[4] memory whaleTypes = ["", "Small Whale", "Big Whale", "MEGA WHALE"];
            emit LargeTrade(buyer, tokenAmount, currentPrice, whaleTypes[whaleLevel]);
        }
        
        require(ethSent >= cost, "Insufficient ETH sent");
        
        // FIXED: Implement slippage protection
        uint256 maxSlippage = cost * 105 / 100; // 5% max slippage
        require(ethSent <= maxSlippage, "Excessive slippage");
        
        uint256 fee = (cost * creatorFeePercent) / 10000;
        
        // FIXED: Add minimum time between purchases to prevent MEV
        require(block.timestamp >= lastTransactionBlock[buyer] + 1, "Rate limited");
        lastTransactionBlock[buyer] = block.timestamp;
        
        totalSold += tokenAmount;
        curveConfig.currentSupply = totalSold;
        // Update price using hybrid bonding curve
        currentPrice = BondingCurveLibrary.getCurrentPrice(curveConfig);
        marketCap = totalSold * currentPrice / 1e18;
        totalFeeCollected += fee;
        
        if (holderBalances[buyer] == 0) {
            holderCount++;
        }
        holderBalances[buyer] += tokenAmount;
        
        _updateDailyVolume(cost);
        
        if (priceHistory.length >= 100) {
            _shiftArray(priceHistory);
            _shiftArray(timestampHistory);
        }
        priceHistory.push(currentPrice);
        timestampHistory.push(block.timestamp);
        
        _transfer(address(this), buyer, tokenAmount);
        
        if (ethSent > cost) {
            payable(buyer).transfer(ethSent - cost);
        }
        
        emit TokenPurchased(buyer, tokenAmount, currentPrice, cost);
    }
    
    function sellTokens(uint256 tokenAmount, uint256 minEthOut) 
        external 
        override
        nonReentrant 
        mevProtected(tokenAmount)
    {
        require(tokenAmount > 0, "Invalid amount");
        require(balanceOf(msg.sender) >= tokenAmount, "Insufficient balance");
        
        // SECURITY: Check for rapid trading
        _checkRapidTrading(msg.sender);
        
        // AMM calculation: x * y = k
        // ethOut = ethReserve - (ethReserve * tokenReserve) / (tokenReserve + tokenAmount)
        uint256 ethOut = ethReserve - 
            (ethReserve * tokenReserve) / (tokenReserve + tokenAmount);
        
        // Calculate 0.3% fee in ETH
        uint256 fee = (ethOut * TRADING_FEE) / FEE_DENOMINATOR;
        uint256 ethAfterFee = ethOut - fee;
        
        require(ethAfterFee >= minEthOut, "Insufficient output amount");
        require(ethAfterFee <= ethReserve, "Insufficient ETH liquidity");
        
        // SECURITY: Check for large sells (potential dump)
        if (tokenAmount > totalSupply_ / 10) { // More than 10% of supply
            emit SuspiciousActivity(msg.sender, "large_sell_dump_alert", 3);
        }
        
        // Update reserves
        ethReserve -= ethOut;
        tokenReserve += tokenAmount;
        
        // Update tracking
        totalSold -= tokenAmount;
        totalFeeCollected += fee;
        
        holderBalances[msg.sender] -= tokenAmount;
        if (holderBalances[msg.sender] == 0) {
            holderCount--;
        }
        
        // Update price from new reserves
        uint256 oldPrice = currentPrice;
        currentPrice = (ethReserve * 1e18) / tokenReserve;
        marketCap = totalSold * currentPrice / 1e18;
        
        // MAINNET: Record trade and update metrics
        _recordTrade(msg.sender, tokenAmount, ethOut, false);
        _updateTopTraders(msg.sender, ethOut);
        
        _updateDailyVolume(ethOut);
        _updatePriceHistory();
        
        // Transfer tokens from seller
        _transfer(msg.sender, address(this), tokenAmount);
        
        // Send ETH to seller
        payable(msg.sender).transfer(ethAfterFee);
        
        // Emit events
        if (currentPrice != oldPrice) {
            emit PriceUpdate(oldPrice, currentPrice, block.timestamp);
        }
        
        if (ethOut > 1 ether) {
            emit LargeTrade(msg.sender, tokenAmount, currentPrice, "sell");
        }
        
        emit TokenSold(msg.sender, tokenAmount, currentPrice, ethAfterFee);
    }
    
    function calculateBuyCost(uint256 tokenAmount) external view override returns (uint256) {
        if (tokenAmount >= tokenReserve) return type(uint256).max;
        
        // Calculate ETH needed using AMM formula
        uint256 ethNeeded = (ethReserve * tokenAmount) / (tokenReserve - tokenAmount);
        
        // Add 0.3% fee
        uint256 fee = (ethNeeded * TRADING_FEE) / FEE_DENOMINATOR;
        return ethNeeded + fee;
    }
    
    function calculateSellPrice(uint256 tokenAmount) external view override returns (uint256) {
        if (tokenAmount == 0) return 0;
        
        // Calculate ETH received using AMM formula
        uint256 ethOut = ethReserve - 
            (ethReserve * tokenReserve) / (tokenReserve + tokenAmount);
        
        // Subtract 0.3% fee
        uint256 fee = (ethOut * TRADING_FEE) / FEE_DENOMINATOR;
        return ethOut - fee;
    }
    
    function getCurrentPrice() external view override returns (uint256) {
        return currentPrice;
    }
    
    /**
     * @dev Get current price with streaming bonus if creator is live
     * @param isStreaming Whether creator is currently streaming
     * @return price Current price with potential streaming bonus
     */
    function getStreamingPrice(bool isStreaming) external view returns (uint256) {
        return BondingCurveLibrary.getStreamingPrice(curveConfig, isStreaming);
    }
    
    // MAINNET: Enhanced tracking functions
    function _recordTrade(address trader, uint256 tokenAmount, uint256 ethValue, bool isBuy) internal {
        // Record the trade
        allTrades.push(TradeInfo({
            trader: trader,
            amount: tokenAmount,
            ethValue: ethValue,
            timestamp: block.timestamp,
            isBuy: isBuy
        }));
        
        // Update trader stats
        if (traderTradeCount[trader] == 0) {
            totalUniqueTraders++;
            traderFirstTrade[trader] = block.timestamp;
        }
        
        traderTradeCount[trader]++;
        traderTotalVolume[trader] += ethValue;
        totalTrades++;
        
        emit TradeRecorded(trader, tokenAmount, ethValue, isBuy, allTrades.length - 1);
    }
    
    function _updateTopTraders(address trader, uint256 /* ethValue */) internal {
        uint256 traderVolume = traderTotalVolume[trader];
        
        // Find trader in top traders array
        int256 currentRank = -1;
        for (uint256 i = 0; i < 10; i++) {
            if (topTraders[i].trader == trader) {
                currentRank = int256(i);
                break;
            }
        }
        
        // Update or add trader
        if (currentRank >= 0) {
            // Update existing trader
            topTraders[uint256(currentRank)] = TopTrader({
                trader: trader,
                totalVolume: traderVolume,
                currentBalance: balanceOf(trader),
                tradeCount: traderTradeCount[trader],
                firstTradeTime: traderFirstTrade[trader]
            });
        } else {
            // Check if trader should be in top 10
            uint256 lowestRank = 9;
            for (uint256 i = 0; i < 10; i++) {
                if (topTraders[i].trader == address(0) || 
                    traderVolume > topTraders[i].totalVolume) {
                    lowestRank = i;
                    break;
                }
            }
            
            if (lowestRank < 10) {
                // Shift traders down
                for (uint256 i = 9; i > lowestRank; i--) {
                    topTraders[i] = topTraders[i-1];
                }
                
                // Insert new trader
                topTraders[lowestRank] = TopTrader({
                    trader: trader,
                    totalVolume: traderVolume,
                    currentBalance: balanceOf(trader),
                    tradeCount: traderTradeCount[trader],
                    firstTradeTime: traderFirstTrade[trader]
                });
                
                emit TopTraderUpdated(trader, traderVolume, lowestRank + 1);
            }
        }
    }
    
    function _checkRapidTrading(address trader) internal {
        // Reset counter if different block
        if (lastTradeBlock[trader] != block.number) {
            rapidTradeCount[trader] = 0;
            lastTradeBlock[trader] = block.number;
        }
        
        rapidTradeCount[trader]++;
        
        // Flag suspicious rapid trading
        if (rapidTradeCount[trader] > 3) {
            flaggedTraders[trader] = true;
            emit SuspiciousTraderFlagged(trader, "rapid_trading_same_block");
        }
        
        // Additional MEV protection
        require(rapidTradeCount[trader] <= 5, "Too many trades in same block");
    }
    
    // MAINNET: Public view functions for analytics
    function getHolderInfo() external view returns (uint256 count, uint256 avgBalance) {
        if (holderCount == 0) return (0, 0);
        return (holderCount, totalSold / holderCount);
    }
    
    function getTradeInfo() external view returns (uint256 total, uint256 uniqueTraders, uint256 volume24h) {
        uint256 volume24hValue = _getVolume24h();
        return (totalTrades, totalUniqueTraders, volume24hValue);
    }
    
    function getTopTrader(uint256 rank) external view returns (TopTrader memory) {
        require(rank < 10, "Invalid rank");
        return topTraders[rank];
    }
    
    function getTopTraders() external view returns (TopTrader[10] memory) {
        return topTraders;
    }
    
    function getTradeHistory(uint256 limit) external view returns (TradeInfo[] memory) {
        uint256 totalTradesCount = allTrades.length;
        if (totalTradesCount == 0) {
            return new TradeInfo[](0);
        }
        
        uint256 actualLimit = limit > totalTradesCount ? totalTradesCount : limit;
        TradeInfo[] memory recentTrades = new TradeInfo[](actualLimit);
        
        for (uint256 i = 0; i < actualLimit; i++) {
            recentTrades[i] = allTrades[totalTradesCount - 1 - i];
        }
        
        return recentTrades;
    }
    
    function _getVolume24h() internal view returns (uint256) {
        uint256 volume = 0;
        uint256 cutoff = block.timestamp - 24 hours;
        
        for (int256 i = int256(allTrades.length) - 1; i >= 0; i--) {
            if (allTrades[uint256(i)].timestamp < cutoff) break;
            volume += allTrades[uint256(i)].ethValue;
        }
        
        return volume;
    }
    
    function isTraderFlagged(address trader) external view returns (bool) {
        return flaggedTraders[trader];
    }
    
    function getTotalFeesCollected() external view override returns (uint256) {
        return totalFeeCollected;
    }
    
    // Helper function to convert uint256 to string for debugging
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    function claimCreatorFees() external override {
        require(msg.sender == creator, "Only creator");
        require(totalFeeCollected > 0, "No fees");
        
        uint256 feeAmount = totalFeeCollected;
        totalFeeCollected = 0;
        
        payable(creator).transfer(feeAmount);
        
        emit CreatorFeeClaimed(creator, feeAmount);
        emit CreatorAction(creator, "fee_claimed", feeAmount); // FIXED: Additional logging
    }
    
    function lockLiquidity(uint256 lockPeriod) external override {
        require(msg.sender == creator, "Only creator");
        require(!isLiquidityLocked, "Already locked");
        require(lockPeriod >= 7 days, "Min 7 days");
        
        liquidityLockPeriod = lockPeriod;
        isLiquidityLocked = true;
        
        emit LiquidityLocked(lockPeriod);
    }
    
    function getTokenStats() external view override returns (
        uint256 _totalSupply,
        uint256 _totalSold,
        uint256 _currentPrice,
        uint256 _marketCap,
        uint256 _holderCount,
        uint256 _creatorFees
    ) {
        return (
            totalSupply_,
            totalSold,
            currentPrice,
            marketCap,
            holderCount,
            totalFeeCollected
        );
    }
    
    function getRiskAssessment() external view returns (
        SecurityLibrary.RiskLevel riskLevel,
        uint256 riskScore
    ) {
        uint256 liquidityRatio = address(this).balance > 0 ? 
            (marketCap * 100) / address(this).balance : 0;
        
        uint256 holderConcentration = totalSupply_ > 0 ? 
            (balanceOf(creator) * 100) / totalSupply_ : 0;
        
        uint256 tradingVolumeRatio = marketCap > 0 ? 
            (dailyVolume * 100) / marketCap : 0;
        
        SecurityLibrary.RiskMetrics memory metrics = SecurityLibrary.RiskMetrics({
            liquidityRatio: liquidityRatio,
            holderConcentration: holderConcentration,
            tradingVolumeRatio: tradingVolumeRatio,
            priceVolatility: _calculatePriceVolatility(),
            contractAge: block.timestamp - tokenLaunchTime,
            auditScore: 75,
            hasTimelock: isLiquidityLocked,
            hasMultisig: false
        });
        
        return SecurityLibrary.calculateRiskScore(metrics);
    }
    
    function updateBondingCurve(
        uint256 newTargetMarketCap
    ) external {
        require(msg.sender == creator, "Only creator");
        require(block.timestamp <= tokenLaunchTime + 24 hours, "Curve update period expired");
        
        // Reinitialize curve with new target market cap
        curveConfig = BondingCurveLibrary.initializeCurve(totalSupply_, newTargetMarketCap);
        curveConfig.currentSupply = totalSold;
        currentPrice = BondingCurveLibrary.getCurrentPrice(curveConfig);
        
        (, uint8 phase) = BondingCurveLibrary.getGraduationStatus(curveConfig);
        emit BondingCurveUpdated(phase, block.timestamp);
    }
    
    // Internal helper functions
    function _checkMEVProtection(address user, uint256 amount) internal returns (bool) {
        if (MEVProtectionLibrary.checkRateLimit(userRateLimits[user], amount, mevConfig)) {
            emit MEVAttemptBlocked(user, "Rate limit", block.timestamp);
            return false;
        }
        
        if (MEVProtectionLibrary.detectFrontRunning(user, tx.gasprice, _getAverageGasPrice())) {
            emit MEVAttemptBlocked(user, "Front-run", block.timestamp);
            return false;
        }
        
        if (lastTransactionBlock[user] > 0 && 
            block.number < lastTransactionBlock[user] + mevConfig.commitRevealDelay) {
            emit MEVAttemptBlocked(user, "Block delay", block.timestamp);
            return false;
        }
        
        return true;
    }
    
    function _updateTransactionData(address user, uint256 /* amount */) internal {
        lastTransactionBlock[user] = block.number;
        _updateGasPriceHistory();
    }
    
    function _updateDailyVolume(uint256 amount) internal {
        if (block.timestamp > lastVolumeReset + 24 hours) {
            dailyVolume = amount;
            lastVolumeReset = block.timestamp;
        } else {
            dailyVolume += amount;
        }
    }
    
    function _updatePriceHistory() internal {
        priceHistory.push(currentPrice);
        timestampHistory.push(block.timestamp);
        
        // Keep only last 100 price points to avoid excessive gas costs
        if (priceHistory.length > 100) {
            _shiftArray(priceHistory);
            _shiftArray(timestampHistory);
        }
    }
    
    function _calculatePriceVolatility() internal view returns (uint256) {
        if (priceHistory.length < 2) return 0;
        
        uint256 maxPrice = 0;
        uint256 minPrice = type(uint256).max;
        
        for (uint256 i = 0; i < priceHistory.length; i++) {
            if (priceHistory[i] > maxPrice) maxPrice = priceHistory[i];
            if (priceHistory[i] < minPrice) minPrice = priceHistory[i];
        }
        
        if (maxPrice == 0) return 0;
        return ((maxPrice - minPrice) * 100) / maxPrice;
    }
    
    // Gas price tracking
    uint256[] private recentGasPrices;
    uint256[] private gasPriceTimestamps;
    uint256 private constant MAX_GAS_HISTORY = 20;
    
    function _getAverageGasPrice() internal view returns (uint256) {
        if (recentGasPrices.length == 0) {
            return tx.gasprice;
        }
        
        uint256 sum = 0;
        uint256 validPrices = 0;
        uint256 currentTime = block.timestamp;
        
        for (uint256 i = 0; i < recentGasPrices.length; i++) {
            if (currentTime - gasPriceTimestamps[i] <= 300) {
                sum += recentGasPrices[i];
                validPrices++;
            }
        }
        
        if (validPrices == 0) {
            return tx.gasprice;
        }
        
        uint256 avgGasPrice = sum / validPrices;
        return (avgGasPrice * 70 + tx.gasprice * 30) / 100;
    }
    
    function _updateGasPriceHistory() internal {
        if (recentGasPrices.length >= MAX_GAS_HISTORY) {
            for (uint256 i = 0; i < MAX_GAS_HISTORY - 1; i++) {
                recentGasPrices[i] = recentGasPrices[i + 1];
                gasPriceTimestamps[i] = gasPriceTimestamps[i + 1];
            }
            recentGasPrices[MAX_GAS_HISTORY - 1] = tx.gasprice;
            gasPriceTimestamps[MAX_GAS_HISTORY - 1] = block.timestamp;
        } else {
            recentGasPrices.push(tx.gasprice);
            gasPriceTimestamps.push(block.timestamp);
        }
    }
    
    function _shiftArray(uint256[] storage arr) internal {
        for (uint256 i = 0; i < arr.length - 1; i++) {
            arr[i] = arr[i + 1];
        }
        arr.pop();
    }
    
    receive() external payable {}
}
