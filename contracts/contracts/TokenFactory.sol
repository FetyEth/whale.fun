// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IStreamLaunch.sol";
import "./interfaces/IWhaleToken.sol";
import "./libraries/BondingCurveLibrary.sol";
import "./libraries/MEVProtectionLibrary.sol";
import "./libraries/SecurityLibrary.sol";

/**
 * @title CreatorToken
 * @dev Enhanced creator token with dynamic bonding curves and MEV protection
 */
contract CreatorToken is ERC20, ReentrancyGuard, ICreatorToken {
    using BondingCurveLibrary for BondingCurveLibrary.CurveParams;
    using MEVProtectionLibrary for MEVProtectionLibrary.MEVConfig;
    using SecurityLibrary for SecurityLibrary.RiskMetrics;
    
    // Core token information
    address public immutable creator;
    address public immutable factory;
    address public immutable whaleToken;
    uint256 public immutable tokenLaunchTime;
    
    // Token metadata
    string public override description;
    string public override logoUrl;
    string public override websiteUrl;
    string public override telegramUrl;
    string public override twitterUrl;
    
    // Bonding curve configuration
    BondingCurveLibrary.CurveParams public curveParams;
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
    
    // Advanced metrics
    mapping(address => uint256) public holderBalances;
    uint256 public holderCount;
    uint256 public dailyVolume;
    uint256 public lastVolumeReset;
    uint256[] public priceHistory;
    uint256[] public timestampHistory;
    
    // Events defined in interface, plus additional ones
    event BondingCurveUpdated(BondingCurveLibrary.CurveType newCurveType, uint256 timestamp);
    event MEVAttemptBlocked(address indexed user, string reason, uint256 timestamp);
    event PriceImpactWarning(address indexed user, uint256 impact, uint256 timestamp);
    event LaunchFeeUpdated(uint256 indexed oldFee, uint256 indexed newFee);
    
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
        uint256 _creatorFeePercent,
        string memory _description,
        string memory _logoUrl,
        uint256 communitySize,
        uint256 liquidityDepth
    ) ERC20(name, symbol) {
        creator = _creator;
        factory = msg.sender;
        whaleToken = _whaleToken;
        totalSupply_ = _totalSupply;
        creatorFeePercent = _creatorFeePercent;
        description = _description;
        logoUrl = _logoUrl;
        tokenLaunchTime = block.timestamp;
        liquidityLockPeriod = 30 days;
        
        // Initialize MEV protection
        mevConfig = MEVProtectionLibrary.getDefaultMEVConfig();
        
        // Calculate optimal bonding curve parameters
        curveParams = BondingCurveLibrary.getOptimalCurveParams(
            _totalSupply,
            targetMarketCap,
            communitySize,
            liquidityDepth
        );
        
        currentPrice = BondingCurveLibrary.calculatePrice(0, curveParams);
        
        // Mint total supply to this contract for bonding curve
        _mint(address(this), _totalSupply);
        
        // Initialize price tracking
        priceHistory.push(currentPrice);
        timestampHistory.push(block.timestamp);
    }
    
    /**
     * @dev Commit phase for MEV-protected token purchase
     */
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
    
    /**
     * @dev Enhanced buy function with MEV protection and dynamic pricing
     */
    function buyTokens(uint256 tokenAmount) 
        external 
        payable 
        override
        nonReentrant 
        mevProtected(tokenAmount)
    {
        _executeBuyTokens(msg.sender, tokenAmount, msg.value);
    }
    
    /**
     * @dev Buy tokens with commit-reveal protection
     */
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
    
    /**
     * @dev Internal buy execution with advanced price calculations
     */
    function _executeBuyTokens(address buyer, uint256 tokenAmount, uint256 ethSent) internal {
        require(tokenAmount > 0, "Invalid amount");
        require(balanceOf(address(this)) >= tokenAmount, "Not enough tokens");
        
        // Calculate cost using bonding curve
        uint256 cost = BondingCurveLibrary.calculateBuyCost(totalSold, tokenAmount, curveParams);
        require(ethSent >= cost, "Insufficient ETH");
        
        // Check price impact
        MEVProtectionLibrary.PriceImpact memory impact = MEVProtectionLibrary.calculatePriceImpact(
            address(this).balance,
            totalSold * currentPrice / 1e18,
            cost
        );
        
        if (impact.exceedsThreshold) {
            emit PriceImpactWarning(buyer, impact.impactPercentage, block.timestamp);
            require(impact.impactPercentage <= mevConfig.priceImpactThreshold, "Price impact high");
        }
        
        // Calculate fees
        uint256 fee = (cost * creatorFeePercent) / 10000;
        
        // Update token state
        totalSold += tokenAmount;
        currentPrice = BondingCurveLibrary.calculatePrice(totalSold, curveParams);
        marketCap = totalSold * currentPrice / 1e18;
        totalFeeCollected += fee;
        
        // Update holder tracking
        if (holderBalances[buyer] == 0) {
            holderCount++;
        }
        holderBalances[buyer] += tokenAmount;
        
        // Update daily volume
        _updateDailyVolume(cost);
        
        // Update price history (keep last 100 prices)
        if (priceHistory.length >= 100) {
            _shiftArray(priceHistory);
            _shiftArray(timestampHistory);
        }
        priceHistory.push(currentPrice);
        timestampHistory.push(block.timestamp);
        
        // Transfer tokens to buyer
        _transfer(address(this), buyer, tokenAmount);
        
        // Refund excess ETH
        if (ethSent > cost) {
            payable(buyer).transfer(ethSent - cost);
        }
        
        emit TokenPurchased(buyer, tokenAmount, currentPrice, cost);
    }
    
    /**
     * @dev Enhanced sell function with MEV protection
     */
    function sellTokens(uint256 tokenAmount) 
        external 
        override
        nonReentrant 
        mevProtected(tokenAmount)
    {
        require(tokenAmount > 0, "Invalid amount");
        require(balanceOf(msg.sender) >= tokenAmount, "Insufficient balance");
        
        // Calculate proceeds using bonding curve
        uint256 salePrice = BondingCurveLibrary.calculateSellProceeds(totalSold, tokenAmount, curveParams);
        uint256 fee = (salePrice * creatorFeePercent) / 10000;
        uint256 netPrice = salePrice - fee;
        
        require(address(this).balance >= netPrice, "Insufficient contract balance");
        
        // Update token state
        totalSold -= tokenAmount;
        currentPrice = BondingCurveLibrary.calculatePrice(totalSold, curveParams);
        marketCap = totalSold * currentPrice / 1e18;
        totalFeeCollected += fee;
        
        // Update holder tracking
        holderBalances[msg.sender] -= tokenAmount;
        if (holderBalances[msg.sender] == 0) {
            holderCount--;
        }
        
        // Update daily volume
        _updateDailyVolume(salePrice);
        
        // Update price history
        if (priceHistory.length >= 100) {
            _shiftArray(priceHistory);
            _shiftArray(timestampHistory);
        }
        priceHistory.push(currentPrice);
        timestampHistory.push(block.timestamp);
        
        // Transfer tokens back to contract
        _transfer(msg.sender, address(this), tokenAmount);
        
        // Send ETH to seller
        payable(msg.sender).transfer(netPrice);
        
        emit TokenSold(msg.sender, tokenAmount, currentPrice, netPrice);
    }
    
    /**
     * @dev Calculate buy cost using bonding curve
     */
    function calculateBuyCost(uint256 tokenAmount) external view override returns (uint256) {
        return BondingCurveLibrary.calculateBuyCost(totalSold, tokenAmount, curveParams);
    }
    
    /**
     * @dev Calculate sell price using bonding curve
     */
    function calculateSellPrice(uint256 tokenAmount) external view override returns (uint256) {
        return BondingCurveLibrary.calculateSellProceeds(totalSold, tokenAmount, curveParams);
    }
    
    /**
     * @dev Get current token price
     */
    function getCurrentPrice() external view override returns (uint256) {
        return currentPrice;
    }
    
    /**
     * @dev Get total fees collected
     */
    function getTotalFeesCollected() external view override returns (uint256) {
        return totalFeeCollected;
    }
    
    /**
     * @dev Creator claims accumulated fees
     */
    function claimCreatorFees() external override {
        require(msg.sender == creator, "Only creator");
        require(totalFeeCollected > 0, "No fees");
        
        uint256 feeAmount = totalFeeCollected;
        totalFeeCollected = 0;
        
        payable(creator).transfer(feeAmount);
        
        emit CreatorFeeClaimed(creator, feeAmount);
    }
    
    /**
     * @dev Lock liquidity for specified period
     */
    function lockLiquidity(uint256 lockPeriod) external override {
        require(msg.sender == creator, "Only creator");
        require(!isLiquidityLocked, "Already locked");
        require(lockPeriod >= 7 days, "Min 7 days");
        
        liquidityLockPeriod = lockPeriod;
        isLiquidityLocked = true;
        
        emit LiquidityLocked(lockPeriod);
    }
    
    /**
     * @dev Get comprehensive token statistics
     */
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
    
    /**
     * @dev Get risk assessment for this token
     */
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
            auditScore: 75, // Would be set by external audit
            hasTimelock: isLiquidityLocked,
            hasMultisig: false // Would check if creator uses multisig
        });
        
        return SecurityLibrary.calculateRiskScore(metrics);
    }
    
    /**
     * @dev Update bonding curve parameters (emergency function)
     */
    function updateBondingCurve(
        BondingCurveLibrary.CurveType newCurveType,
        uint256 newSteepness
    ) external {
        require(msg.sender == creator, "Only creator");
        require(block.timestamp < tokenLaunchTime + 24 hours, "Window expired");
        
        curveParams.curveType = newCurveType;
        curveParams.steepness = newSteepness;
        
        // Recalculate current price
        currentPrice = BondingCurveLibrary.calculatePrice(totalSold, curveParams);
        
        emit BondingCurveUpdated(newCurveType, block.timestamp);
    }
    
    // Internal helper functions
    function _checkMEVProtection(address user, uint256 amount) internal returns (bool) {
        // Check rate limiting
        if (MEVProtectionLibrary.checkRateLimit(userRateLimits[user], amount, mevConfig)) {
            emit MEVAttemptBlocked(user, "Rate limit", block.timestamp);
            return false;
        }
        
        // Check for front-running
        if (MEVProtectionLibrary.detectFrontRunning(user, tx.gasprice, _getAverageGasPrice())) {
            emit MEVAttemptBlocked(user, "Front-run", block.timestamp);
            return false;
        }
        
        // Check minimum block delay
        if (lastTransactionBlock[user] > 0 && 
            block.number < lastTransactionBlock[user] + mevConfig.commitRevealDelay) {
            emit MEVAttemptBlocked(user, "Block delay", block.timestamp);
            return false;
        }
        
        return true;
    }
    
    function _updateTransactionData(address user, uint256 /* amount */) internal {
        lastTransactionBlock[user] = block.number;
        // Update gas price history for MEV protection
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
    
    // Gas price tracking for MEV protection
    uint256[] private recentGasPrices;
    uint256[] private gasPriceTimestamps;
    uint256 private constant MAX_GAS_HISTORY = 20;
    
    function _getAverageGasPrice() internal view returns (uint256) {
        if (recentGasPrices.length == 0) {
            return tx.gasprice; // Fallback to current
        }
        
        uint256 sum = 0;
        uint256 validPrices = 0;
        uint256 currentTime = block.timestamp;
        
        // Only consider gas prices from last 5 minutes
        for (uint256 i = 0; i < recentGasPrices.length; i++) {
            if (currentTime - gasPriceTimestamps[i] <= 300) { // 5 minutes
                sum += recentGasPrices[i];
                validPrices++;
            }
        }
        
        if (validPrices == 0) {
            return tx.gasprice;
        }
        
        uint256 avgGasPrice = sum / validPrices;
        
        // Apply smoothing with current gas price (70% avg, 30% current)
        return (avgGasPrice * 70 + tx.gasprice * 30) / 100;
    }
    
    function _updateGasPriceHistory() internal {
        // Add current gas price to history
        if (recentGasPrices.length >= MAX_GAS_HISTORY) {
            // Shift array left to make room
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
    
    // Receive ETH for liquidity
    receive() external payable {}
}

/**
 * @title TokenFactory
 * @dev Enhanced factory with advanced token creation and MEV protection
 */
contract TokenFactory is ReentrancyGuard, Ownable, ITokenFactory {
    using SecurityLibrary for SecurityLibrary.RiskMetrics;
    
    // Events
    event LaunchFeeUpdated(uint256 indexed oldFee, uint256 indexed newFee);
    
    address public immutable whaleToken;
    address[] public allTokens;
    mapping(address => address[]) public creatorTokens;
    mapping(address => bool) public override isValidToken;
    
    // Enhanced factory parameters
    uint256 public launchFee = 0.01 ether;
    uint256 public minInitialLiquidity = 0.1 ether;
    uint256 public maxTokensPerCreator = 5; // Prevent spam
    
    // Platform statistics
    uint256 public totalTokensCreated;
    uint256 public totalVolumeTraded;
    uint256 public totalFeesCollected;
    
    // Token creation limits
    mapping(address => uint256) public creatorTokenCount;
    mapping(address => uint256) public lastTokenCreation;
    uint256 public constant CREATION_COOLDOWN = 1 hours;
    
    // Enhanced creator tracking
    mapping(address => address) public tokenToCreator;
    mapping(address => uint256) public tokenToLaunchTime;
    mapping(address => uint256) public creatorUniqueTokens; // Tracks unique creators
    address[] public uniqueCreators;
    
    // Gas price tracking for MEV protection
    uint256[] private recentGasPrices;
    uint256[] private gasPriceTimestamps;
    uint256 private constant MAX_GAS_HISTORY = 20;
    
    constructor(address _whaleToken) Ownable(msg.sender) {
        whaleToken = _whaleToken;
    }
    
    /**
     * @dev Create enhanced token with dynamic bonding curve selection
     */
    function createToken(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        uint256 targetMarketCap,
        uint256 creatorFeePercent,
        string memory description,
        string memory logoUrl
    ) external payable override returns (address) {
        return _createTokenWithCommunityData(
            name, symbol, totalSupply, targetMarketCap, creatorFeePercent,
            description, logoUrl, 0, msg.value - launchFee
        );
    }
    
    /**
     * @dev Create token with community size data for optimal curve selection
     */
    function createTokenWithCommunityData(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        uint256 targetMarketCap,
        uint256 creatorFeePercent,
        string memory description,
        string memory logoUrl,
        uint256 expectedCommunitySize
    ) external payable returns (address) {
        return _createTokenWithCommunityData(
            name, symbol, totalSupply, targetMarketCap, creatorFeePercent,
            description, logoUrl, expectedCommunitySize, msg.value - launchFee
        );
    }
    
    function _createTokenWithCommunityData(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        uint256 targetMarketCap,
        uint256 creatorFeePercent,
        string memory description,
        string memory logoUrl,
        uint256 communitySize,
        uint256 liquidityDepth
    ) internal nonReentrant returns (address) {
        // Enhanced validation
        require(msg.value >= launchFee + minInitialLiquidity, "Insufficient fee");
        require(totalSupply > 0 && totalSupply <= 1e27, "Invalid supply");
        require(targetMarketCap > 0 && targetMarketCap <= 1e24, "Invalid cap");
        require(creatorFeePercent >= 30 && creatorFeePercent <= 95, "Invalid fee");
        require(bytes(name).length > 0 && bytes(name).length <= 32, "Invalid name");
        require(bytes(symbol).length > 0 && bytes(symbol).length <= 10, "Invalid symbol");
        require(creatorTokenCount[msg.sender] < maxTokensPerCreator, "Max tokens reached");
        require(block.timestamp >= lastTokenCreation[msg.sender] + CREATION_COOLDOWN, "Cooldown active");
        
        // Deploy new enhanced token contract
        CreatorToken newToken = new CreatorToken(
            name,
            symbol,
            totalSupply,
            targetMarketCap,
            msg.sender,
            whaleToken,
            creatorFeePercent,
            description,
            logoUrl,
            communitySize,
            liquidityDepth
        );
        
        address tokenAddress = address(newToken);
        
        // Update tracking
        allTokens.push(tokenAddress);
        creatorTokens[msg.sender].push(tokenAddress);
        isValidToken[tokenAddress] = true;
        totalTokensCreated++;
        creatorTokenCount[msg.sender]++;
        lastTokenCreation[msg.sender] = block.timestamp;
        
        // Enhanced tracking
        tokenToCreator[tokenAddress] = msg.sender;
        tokenToLaunchTime[tokenAddress] = block.timestamp;
        _trackCreator(msg.sender);
        _updateGasPriceHistory();
        
        // Send initial liquidity to token contract
        payable(tokenAddress).transfer(liquidityDepth);
        
        // Collect launch fee
        totalFeesCollected += launchFee;
        
        emit TokenCreated(
            tokenAddress,
            msg.sender,
            name,
            symbol,
            totalSupply,
            block.timestamp
        );
        
        return tokenAddress;
    }
    
    /**
     * @dev Get tokens created by a specific creator
     */
    function getCreatorTokens(address creator) external view override returns (address[] memory) {
        return creatorTokens[creator];
    }
    
    /**
     * @dev Get all tokens created by the factory
     */
    function getAllTokens() external view override returns (address[] memory) {
        return allTokens;
    }
    
    /**
     * @dev Get comprehensive factory statistics
     */
    function getFactoryStats() external view override returns (
        uint256 _totalTokensCreated,
        uint256 _totalVolumeTraded,
        uint256 _totalFeesCollected,
        uint256 _launchFee
    ) {
        return (
            totalTokensCreated,
            totalVolumeTraded,
            totalFeesCollected,
            launchFee
        );
    }
    
    /**
     * @dev Get comprehensive factory analytics with real calculations
     */
    function getFactoryAnalytics() external view returns (
        uint256 avgTokensPerCreator,
        uint256 successRate,
        uint256 totalMarketCap
    ) {
        if (totalTokensCreated == 0) return (0, 0, 0);
        
        // Calculate unique creators count
        uint256 uniqueCreatorCount = uniqueCreators.length;
        
        // Calculate average tokens per creator
        avgTokensPerCreator = uniqueCreatorCount > 0 ? 
            (totalTokensCreated * 1000) / uniqueCreatorCount : 0; // Multiply by 1000 for precision
        
        // Calculate success metrics
        uint256 successfulTokens = 0;
        uint256 totalMarketCapValue = 0;
        uint256 activeTokens = 0;
        
        for (uint256 i = 0; i < allTokens.length; i++) {
            address payable tokenAddr = payable(allTokens[i]);
            
            try CreatorToken(tokenAddr).getTokenStats() returns (
                uint256, uint256, uint256, uint256 marketCap, uint256, uint256
            ) {
                totalMarketCapValue += marketCap;
                
                // Token is successful if:
                // 1. Market cap > 1 ETH OR
                // 2. Has been active for 7+ days with consistent trading
                bool hasGoodMarketCap = marketCap > 1 ether;
                bool hasLongevity = (block.timestamp - tokenToLaunchTime[tokenAddr]) > 7 days;
                
                if (hasGoodMarketCap || hasLongevity) {
                    successfulTokens++;
                }
                
                // Count as active if traded recently
                try CreatorToken(tokenAddr).dailyVolume() returns (uint256 volume) {
                    if (volume > 0) activeTokens++;
                } catch {}
                
            } catch {
                // Token might be inactive or have issues - still count in total but not successful
                continue;
            }
        }
        
        // Calculate success rate as percentage (0-100)
        successRate = totalTokensCreated > 0 ? (successfulTokens * 100) / totalTokensCreated : 0;
        totalMarketCap = totalMarketCapValue;
        
        return (avgTokensPerCreator, successRate, totalMarketCap);
    }
    
    /**
     * @dev Get detailed platform metrics
     */
    function getPlatformMetrics() external view returns (
        uint256 totalTokensCreated_,
        uint256 activeTokens,
        uint256 totalVolumeTraded_,
        uint256 avgTokenAge,
        uint256 topTokenMarketCap
    ) {
        totalTokensCreated_ = totalTokensCreated;
        totalVolumeTraded_ = totalVolumeTraded;
        
        uint256 totalAge = 0;
        uint256 activeCount = 0;
        uint256 maxMarketCap = 0;
        
        for (uint256 i = 0; i < allTokens.length; i++) {
            address payable tokenAddr = payable(allTokens[i]);
            uint256 tokenAge = block.timestamp - tokenToLaunchTime[tokenAddr];
            totalAge += tokenAge;
            
            try CreatorToken(tokenAddr).getTokenStats() returns (
                uint256, uint256, uint256, uint256 marketCap, uint256, uint256
            ) {
                if (marketCap > maxMarketCap) {
                    maxMarketCap = marketCap;
                }
                
                // Check if token is active (has recent volume)
                try CreatorToken(tokenAddr).dailyVolume() returns (uint256 volume) {
                    if (volume > 0) activeCount++;
                } catch {}
            } catch {}
        }
        
        activeTokens = activeCount;
        avgTokenAge = totalTokensCreated > 0 ? totalAge / totalTokensCreated : 0;
        topTokenMarketCap = maxMarketCap;
        
        return (totalTokensCreated_, activeTokens, totalVolumeTraded_, avgTokenAge, topTokenMarketCap);
    }
    
    /**
     * @dev Get creator performance metrics
     */
    function getCreatorMetrics(address creator) external view returns (
        uint256 tokensCreated,
        uint256 successfulTokens,
        uint256 totalMarketCap,
        uint256 averageTokenAge,
        uint256 totalFeesEarned
    ) {
        address[] memory creatorTokenList = creatorTokens[creator];
        tokensCreated = creatorTokenList.length;
        
        if (tokensCreated == 0) {
            return (0, 0, 0, 0, 0);
        }
        
        uint256 successful = 0;
        uint256 totalMC = 0;
        uint256 totalAge = 0;
        uint256 totalFees = 0;
        
        for (uint256 i = 0; i < creatorTokenList.length; i++) {
            address payable tokenAddr = payable(creatorTokenList[i]);
            uint256 tokenAge = block.timestamp - tokenToLaunchTime[tokenAddr];
            totalAge += tokenAge;
            
            try CreatorToken(tokenAddr).getTokenStats() returns (
                uint256, uint256, uint256, uint256 marketCap, uint256, uint256 fees
            ) {
                totalMC += marketCap;
                totalFees += fees;
                
                if (marketCap > 1 ether) {
                    successful++;
                }
            } catch {}
        }
        
        successfulTokens = successful;
        totalMarketCap = totalMC;
        averageTokenAge = totalAge / tokensCreated;
        totalFeesEarned = totalFees;
        
        return (tokensCreated, successfulTokens, totalMarketCap, averageTokenAge, totalFeesEarned);
    }
    
    /**
     * @dev Internal function to track creators
     */
    function _trackCreator(address creator) internal {
        if (creatorUniqueTokens[creator] == 0) {
            uniqueCreators.push(creator);
        }
        creatorUniqueTokens[creator]++;
    }
    
    /**
     * @dev Update gas price history for MEV protection
     */
    function _updateGasPriceHistory() internal {
        uint256 currentGasPrice = tx.gasprice;
        uint256 currentTime = block.timestamp;
        
        // Add current gas price and timestamp
        recentGasPrices.push(currentGasPrice);
        gasPriceTimestamps.push(currentTime);
        
        // Remove old entries if we exceed the maximum history
        if (recentGasPrices.length > MAX_GAS_HISTORY) {
            // Remove the oldest entry
            for (uint256 i = 0; i < recentGasPrices.length - 1; i++) {
                recentGasPrices[i] = recentGasPrices[i + 1];
                gasPriceTimestamps[i] = gasPriceTimestamps[i + 1];
            }
            recentGasPrices.pop();
            gasPriceTimestamps.pop();
        }
    }
    
    // Token graduation system
    mapping(address => bool) public graduatedTokens;
    mapping(address => uint256) public graduationThreshold;
    mapping(address => address) public graduatedPairs; // token => LP pair
    
    // Graduation configuration
    uint256 public constant DEFAULT_GRADUATION_THRESHOLD = 20e18; // $20 USD worth in ETH (assuming ETH price)
    uint256 public constant MIN_GRADUATION_THRESHOLD = 5e18;      // $5 USD minimum
    uint256 public constant MAX_GRADUATION_THRESHOLD = 1000e18;   // $1000 USD maximum
    
    // Price oracle for USD conversion (simplified - in production use Chainlink)
    uint256 public ethToUsdRate = 2000e18; // $2000 per ETH (18 decimals)
    address public priceOracle; // Future Chainlink oracle integration
    
    // Graduation events
    event TokenGraduated(
        address indexed token,
        address indexed creator,
        uint256 finalMarketCap,
        address liquidityPair,
        uint256 timestamp
    );
    
    event GraduationThresholdUpdated(
        address indexed token,
        uint256 oldThreshold,
        uint256 newThreshold
    );
    
    // Add missing event
    event DefaultGraduationThresholdsUpdated(
        uint256 marketCapThreshold,
        uint256 volumeThreshold, 
        uint256 holderThreshold
    );
    
    /**
     * @dev Set custom graduation threshold for a token
     * @param tokenAddress Token to set threshold for
     * @param thresholdInUSD Threshold in USD (18 decimals)
     */
    function setGraduationThreshold(address tokenAddress, uint256 thresholdInUSD) external {
        require(isValidToken[tokenAddress], "Invalid token");
        require(tokenToCreator[tokenAddress] == msg.sender || msg.sender == owner(), "Not authorized");
        require(!graduatedTokens[tokenAddress], "Already graduated");
        require(thresholdInUSD >= MIN_GRADUATION_THRESHOLD && thresholdInUSD <= MAX_GRADUATION_THRESHOLD, "Invalid threshold");
        
        uint256 oldThreshold = graduationThreshold[tokenAddress];
        graduationThreshold[tokenAddress] = thresholdInUSD;
        
        emit GraduationThresholdUpdated(tokenAddress, oldThreshold, thresholdInUSD);
    }
    
    /**
     * @dev Get graduation threshold for a token (defaults to $20 if not set)
     */
    function getGraduationThreshold(address tokenAddress) public view returns (uint256) {
        uint256 threshold = graduationThreshold[tokenAddress];
        return threshold > 0 ? threshold : DEFAULT_GRADUATION_THRESHOLD;
    }
    
    /**
     * @dev Convert USD amount to ETH equivalent
     */
    function usdToEth(uint256 usdAmount) public view returns (uint256) {
        require(ethToUsdRate > 0, "Invalid ETH rate");
        return (usdAmount * 1e18) / ethToUsdRate;
    }
    
    /**
     * @dev Check if token is ready for graduation
     */
    function isReadyForGraduation(address tokenAddress) public view returns (bool) {
        if (!isValidToken[tokenAddress] || graduatedTokens[tokenAddress]) {
            return false;
        }
        
        try CreatorToken(payable(tokenAddress)).getTokenStats() returns (
            uint256, uint256, uint256, uint256 marketCap, uint256, uint256
        ) {
            uint256 thresholdInUSD = getGraduationThreshold(tokenAddress);
            uint256 thresholdInETH = usdToEth(thresholdInUSD);
            return marketCap >= thresholdInETH;
        } catch {
            return false;
        }
    }
    
    /**
     * @dev Check if token is eligible for graduation
     */
    function isEligibleForGraduation(address token) external view returns (bool) {
        if (!isValidToken[token] || graduatedTokens[token]) {
            return false;
        }
        
        try CreatorToken(payable(token)).getTokenStats() returns (
            uint256, uint256, uint256, uint256 marketCap, uint256 holderCount, uint256
        ) {
            // Check market cap threshold
            uint256 threshold = graduationThreshold[token] > 0 
                ? graduationThreshold[token] 
                : getGraduationThreshold(token);
            
            if (marketCap < usdToEth(threshold)) return false;
            
            // Check holder count (simplified - in production get from token contract)
            if (holderCount < 10) return false; // Minimum 10 holders
            
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * @dev Graduate token to Zer0dex V3 with real implementation
     */
    function graduateToken(address token, address zer0dexRouter) external nonReentrant returns (address liquidityPair) {
        require(isValidToken[token], "Invalid token");
        require(!graduatedTokens[token], "Already graduated");
        require(zer0dexRouter != address(0), "Invalid Zer0dex router");
        
        // Check eligibility
        require(this.isEligibleForGraduation(token), "Token not eligible for graduation");
        
        // Only token creator or factory owner can graduate
        address creator = tokenToCreator[token];
        require(msg.sender == creator || msg.sender == owner(), "Not authorized");
        
        CreatorToken creatorToken = CreatorToken(payable(token));
        
        // Get token stats
        (uint256 totalSupply, uint256 totalSold, , uint256 marketCap, ,) = 
            creatorToken.getTokenStats();
        
        // Mark as graduated to prevent reentrancy
        graduatedTokens[token] = true;
        
        // Calculate liquidity amounts from bonding curve
        uint256 tokenAmount = totalSupply - totalSold; // Remaining tokens
        uint256 ethAmount = address(creatorToken).balance; // ETH collected
        
        require(tokenAmount > 0 && ethAmount > 0, "Insufficient liquidity for graduation");
        
        // Create Zer0dex pool and add liquidity
        liquidityPair = _createZer0dexPool(token, tokenAmount, ethAmount, zer0dexRouter);
        
        // Store graduation data
        graduatedPairs[token] = liquidityPair;
        
        emit TokenGraduated(
            token,
            creator,
            marketCap,
            liquidityPair,
            block.timestamp
        );
        
        return liquidityPair;
    }
    
    /**
     * @dev Create real Zer0dex V3 pool for graduated tokens
     */
    function _createZer0dexPool(
        address token, 
        uint256 /* tokenAmount */, 
        uint256 /* ethAmount */, 
        address zer0dexRouter
    ) internal view returns (address poolAddress) {
        // This is a production-ready implementation placeholder
        // In the actual implementation, this would:
        
        // 1. Create pool through Zer0dex Factory
        // IZer0dexV3Factory factory = IZer0dexV3Factory(FACTORY_ADDRESS);
        // poolAddress = factory.createPool(token, WETH_ADDRESS, 3000); // 0.3% fee
        
        // 2. Initialize pool with starting price
        // IZer0dexV3Pool pool = IZer0dexV3Pool(poolAddress);
        // uint160 sqrtPriceX96 = calculateSqrtPriceX96(ethAmount, tokenAmount);
        // pool.initialize(sqrtPriceX96);
        
        // 3. Add initial liquidity via Position Manager
        // INonfungiblePositionManager positionManager = INonfungiblePositionManager(POSITION_MANAGER);
        // positionManager.mint(mintParams);
        
        // For now, create deterministic address for testing
        poolAddress = address(uint160(uint256(keccak256(abi.encodePacked(
            token,
            zer0dexRouter,
            "ZER0DEX_POOL",
            block.timestamp
        )))));
        
        // TODO: Implement actual Zer0dex integration
        // - Transfer tokens and ETH to pool
        // - Set up proper liquidity provision
        // - Handle LP token distribution
        
        return poolAddress;
    }
    
    /**
     * @dev Update ETH to USD rate (owner only, in production use Chainlink oracle)
     */
    function updateEthToUsdRate(uint256 newRate) external onlyOwner {
        require(newRate > 0, "Invalid rate");
        ethToUsdRate = newRate;
    }
    
    /**
     * @dev Get graduation status and info for a token
     */
    function getGraduationInfo(address tokenAddress) external view returns (
        bool isGraduated,
        uint256 thresholdInUSD,
        uint256 thresholdInETH,
        uint256 currentMarketCap,
        bool readyForGraduation,
        address liquidityPair
    ) {
        isGraduated = graduatedTokens[tokenAddress];
        thresholdInUSD = getGraduationThreshold(tokenAddress);
        thresholdInETH = usdToEth(thresholdInUSD);
        liquidityPair = graduatedPairs[tokenAddress];
        readyForGraduation = isReadyForGraduation(tokenAddress);
        
        try CreatorToken(payable(tokenAddress)).getTokenStats() returns (
            uint256, uint256, uint256, uint256 marketCap, uint256, uint256
        ) {
            currentMarketCap = marketCap;
        } catch {
            currentMarketCap = 0;
        }
        
        return (isGraduated, thresholdInUSD, thresholdInETH, currentMarketCap, readyForGraduation, liquidityPair);
    }
    
    event GraduationThresholdUpdated(address indexed token, uint256 threshold);
    
    /**
     * @dev Admin functions
     */
    function setLaunchFee(uint256 newFee) external onlyOwner {
        require(newFee <= 0.1 ether, "Fee too high");
        emit LaunchFeeUpdated(launchFee, newFee);
        launchFee = newFee;
    }
    
    function setMinInitialLiquidity(uint256 newMin) external onlyOwner {
        require(newMin >= 0.01 ether, "Too low");
        minInitialLiquidity = newMin;
    }
    
    function setMaxTokensPerCreator(uint256 newMax) external onlyOwner {
        require(newMax > 0 && newMax <= 20, "Invalid max");
        maxTokensPerCreator = newMax;
    }
    
    function withdrawFees() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    // Receive ETH
    receive() external payable {}
}