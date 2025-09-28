// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
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
    
    // Events
    event BondingCurveUpdated(BondingCurveLibrary.CurveType newCurveType, uint256 timestamp);
    event MEVAttemptBlocked(address indexed user, string reason, uint256 timestamp);
    event PriceImpactWarning(address indexed user, uint256 impact, uint256 timestamp);
    
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
    
    function buyTokens(uint256 tokenAmount) 
        external 
        payable 
        override
        nonReentrant 
    {
        _executeBuyTokens(msg.sender, tokenAmount, msg.value);
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
        
        // Check if we have enough tokens available (total supply minus already sold)
        uint256 availableTokens = totalSupply_ - totalSold;
        require(availableTokens >= tokenAmount, "Not enough tokens available");
        require(balanceOf(address(this)) >= tokenAmount, "Contract token balance insufficient");
        
        uint256 cost = BondingCurveLibrary.calculateBuyCost(totalSold, tokenAmount, curveParams);
        require(ethSent >= cost, "Insufficient ETH");
        
        MEVProtectionLibrary.PriceImpact memory impact = MEVProtectionLibrary.calculatePriceImpact(
            address(this).balance,
            totalSold * currentPrice / 1e18,
            cost
        );
        
        if (impact.exceedsThreshold) {
            emit PriceImpactWarning(buyer, impact.impactPercentage, block.timestamp);
            require(impact.impactPercentage <= mevConfig.priceImpactThreshold, "Price impact high");
        }
        
        uint256 fee = (cost * creatorFeePercent) / 10000;
        
        totalSold += tokenAmount;
        currentPrice = BondingCurveLibrary.calculatePrice(totalSold, curveParams);
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
    
    function sellTokens(uint256 tokenAmount) 
        external 
        override
        nonReentrant 
        mevProtected(tokenAmount)
    {
        require(tokenAmount > 0, "Invalid amount");
        require(balanceOf(msg.sender) >= tokenAmount, "Insufficient balance");
        
        uint256 salePrice = BondingCurveLibrary.calculateSellProceeds(totalSold, tokenAmount, curveParams);
        uint256 fee = (salePrice * creatorFeePercent) / 10000;
        uint256 netPrice = salePrice - fee;
        
        require(address(this).balance >= netPrice, "Insufficient contract balance");
        
        totalSold -= tokenAmount;
        currentPrice = BondingCurveLibrary.calculatePrice(totalSold, curveParams);
        marketCap = totalSold * currentPrice / 1e18;
        totalFeeCollected += fee;
        
        holderBalances[msg.sender] -= tokenAmount;
        if (holderBalances[msg.sender] == 0) {
            holderCount--;
        }
        
        _updateDailyVolume(salePrice);
        
        if (priceHistory.length >= 100) {
            _shiftArray(priceHistory);
            _shiftArray(timestampHistory);
        }
        priceHistory.push(currentPrice);
        timestampHistory.push(block.timestamp);
        
        _transfer(msg.sender, address(this), tokenAmount);
        payable(msg.sender).transfer(netPrice);
        
        emit TokenSold(msg.sender, tokenAmount, currentPrice, netPrice);
    }
    
    function calculateBuyCost(uint256 tokenAmount) external view override returns (uint256) {
        return BondingCurveLibrary.calculateBuyCost(totalSold, tokenAmount, curveParams);
    }
    
    function calculateSellPrice(uint256 tokenAmount) external view override returns (uint256) {
        return BondingCurveLibrary.calculateSellProceeds(totalSold, tokenAmount, curveParams);
    }
    
    function getCurrentPrice() external view override returns (uint256) {
        return currentPrice;
    }
    
    function getTotalFeesCollected() external view override returns (uint256) {
        return totalFeeCollected;
    }
    
    function claimCreatorFees() external override {
        require(msg.sender == creator, "Only creator");
        require(totalFeeCollected > 0, "No fees");
        
        uint256 feeAmount = totalFeeCollected;
        totalFeeCollected = 0;
        
        payable(creator).transfer(feeAmount);
        
        emit CreatorFeeClaimed(creator, feeAmount);
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
        BondingCurveLibrary.CurveType newCurveType,
        uint256 newSteepness
    ) external {
        require(msg.sender == creator, "Only creator");
        require(block.timestamp < tokenLaunchTime + 24 hours, "Window expired");
        
        curveParams.curveType = newCurveType;
        curveParams.steepness = newSteepness;
        
        currentPrice = BondingCurveLibrary.calculatePrice(totalSold, curveParams);
        
        emit BondingCurveUpdated(newCurveType, block.timestamp);
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
