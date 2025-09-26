// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MEVProtectionLibrary
 * @dev Advanced MEV protection mechanisms for fair token trading
 */
library MEVProtectionLibrary {
    // MEV protection parameters
    struct MEVConfig {
        uint256 maxSlippage;           // Maximum allowed slippage (e.g., 5% = 500 basis points)
        uint256 priceImpactThreshold;  // Price impact threshold for large orders
        uint256 timeWindow;            // Time window for rate limiting (seconds)
        uint256 maxTransactionSize;    // Maximum transaction size per user per time window
        uint256 commitRevealDelay;     // Delay between commit and reveal phases
        bool sandwichProtectionEnabled; // Enable sandwich attack protection
        bool frontRunningProtectionEnabled; // Enable front-running protection
    }
    
    // Transaction commitment structure
    struct TransactionCommit {
        bytes32 commitHash;
        uint256 commitTime;
        address user;
        bool revealed;
        bool executed;
    }
    
    // Rate limiting structure
    struct RateLimit {
        uint256 totalVolume;
        uint256 lastResetTime;
        uint256 transactionCount;
    }
    
    // Price impact calculation
    struct PriceImpact {
        uint256 priceBeforeTrade;
        uint256 priceAfterTrade;
        uint256 impactPercentage;
        bool exceedsThreshold;
    }
    
    // Constants for MEV protection
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant MAX_PRICE_IMPACT = 1000; // 10% max price impact
    uint256 private constant MIN_BLOCK_DELAY = 1; // Minimum blocks between transactions
    uint256 private constant MAX_GAS_PRICE_MULTIPLIER = 150; // 1.5x current gas price
    
    // Events
    event TransactionCommitted(address indexed user, bytes32 commitHash, uint256 timestamp);
    event TransactionRevealed(address indexed user, bytes32 commitHash, uint256 timestamp);
    event MEVAttemptDetected(address indexed user, string attackType, uint256 timestamp);
    event PriceImpactExceeded(address indexed user, uint256 impact, uint256 threshold);
    
    /**
     * @dev Initialize MEV protection configuration
     */
    function getDefaultMEVConfig() internal pure returns (MEVConfig memory config) {
        config.maxSlippage = 500; // 5%
        config.priceImpactThreshold = 300; // 3%
        config.timeWindow = 300; // 5 minutes
        config.maxTransactionSize = 100 ether;
        config.commitRevealDelay = 2; // 2 blocks
        config.sandwichProtectionEnabled = true;
        config.frontRunningProtectionEnabled = true;
        
        return config;
    }
    
    /**
     * @dev Check if transaction exceeds rate limits
     * @param userLimit Current user rate limit data
     * @param amount Transaction amount
     * @param config MEV protection configuration
     * @return exceeded True if rate limit is exceeded
     */
    function checkRateLimit(
        RateLimit storage userLimit,
        uint256 amount,
        MEVConfig memory config
    ) internal returns (bool exceeded) {
        // Reset rate limit window if expired
        if (block.timestamp >= userLimit.lastResetTime + config.timeWindow) {
            userLimit.totalVolume = 0;
            userLimit.transactionCount = 0;
            userLimit.lastResetTime = block.timestamp;
        }
        
        // Check volume and transaction count limits
        if (userLimit.totalVolume + amount > config.maxTransactionSize ||
            userLimit.transactionCount >= 10) { // Max 10 transactions per window
            return true;
        }
        
        // Update rate limit data
        userLimit.totalVolume += amount;
        userLimit.transactionCount++;
        
        return false;
    }
    
    /**
     * @dev Calculate price impact of a trade
     * @param reserveIn Input token reserve
     * @param reserveOut Output token reserve
     * @param amountIn Input amount
     * @return impact Price impact structure
     */
    function calculatePriceImpact(
        uint256 reserveIn,
        uint256 reserveOut,
        uint256 amountIn
    ) internal pure returns (PriceImpact memory impact) {
        require(reserveIn > 0 && reserveOut > 0, "Invalid reserves");
        
        // Calculate price before trade
        impact.priceBeforeTrade = (reserveOut * 1e18) / reserveIn;
        
        // Calculate output amount using constant product formula
        uint256 amountInWithFee = amountIn * 997 / 1000; // 0.3% fee
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn + amountInWithFee;
        uint256 amountOut = numerator / denominator;
        
        // Calculate price after trade
        uint256 newReserveIn = reserveIn + amountIn;
        uint256 newReserveOut = reserveOut - amountOut;
        impact.priceAfterTrade = (newReserveOut * 1e18) / newReserveIn;
        
        // Calculate impact percentage
        if (impact.priceAfterTrade >= impact.priceBeforeTrade) {
            impact.impactPercentage = 0;
        } else {
            impact.impactPercentage = ((impact.priceBeforeTrade - impact.priceAfterTrade) * BASIS_POINTS) / impact.priceBeforeTrade;
        }
        
        impact.exceedsThreshold = impact.impactPercentage > MAX_PRICE_IMPACT;
        
        return impact;
    }
    
    // Advanced transaction analysis structure
    struct TransactionData {
        address from;
        address to;
        uint256 value;
        uint256 gasPrice;
        uint256 gasLimit;
        bytes4 functionSelector;
        uint256 blockNumber;
        uint256 transactionIndex;
        uint256 timestamp;
    }

    /**
     * @dev Advanced sandwich attack detection using comprehensive transaction analysis
     * @param previousTxData Previous transaction comprehensive data
     * @param currentTxData Current transaction comprehensive data  
     * @param nextTxData Next pending transaction comprehensive data
     * @return isSandwich True if sandwich attack pattern detected
     * @return confidence Confidence level of detection (0-100)
     */
    function detectSandwichAttack(
        TransactionData memory previousTxData,
        TransactionData memory currentTxData,
        TransactionData memory nextTxData
    ) internal pure returns (bool isSandwich, uint256 confidence) {
        if (previousTxData.from == address(0) || nextTxData.from == address(0)) {
            return (false, 0);
        }
        
        uint256 suspiciousScore = 0;
        
        // Check 1: Same attacker for front and back transactions (highest weight)
        if (previousTxData.from == nextTxData.from && 
            previousTxData.from != currentTxData.from) {
            suspiciousScore += 35; // Critical indicator
        }
        
        // Check 2: Gas price sandwich pattern analysis
        if (previousTxData.gasPrice > currentTxData.gasPrice * 110 / 100 && // Front-run with 10%+ higher gas
            nextTxData.gasPrice < currentTxData.gasPrice * 90 / 100) {      // Back-run with 10%+ lower gas
            suspiciousScore += 25;
        }
        
        // Check 3: Extreme gas price patterns (MEV bot behavior)
        uint256 avgGas = (previousTxData.gasPrice + currentTxData.gasPrice + nextTxData.gasPrice) / 3;
        if (previousTxData.gasPrice > avgGas * 150 / 100) { // 50% above average
            suspiciousScore += 15;
        }
        
        // Check 4: Transaction timing analysis
        if (previousTxData.blockNumber == currentTxData.blockNumber &&
            currentTxData.blockNumber == nextTxData.blockNumber) {
            // Same block - check transaction index sequence
            if (previousTxData.transactionIndex + 1 == currentTxData.transactionIndex &&
                currentTxData.transactionIndex + 1 == nextTxData.transactionIndex) {
                suspiciousScore += 20; // Perfect sequence = very suspicious
            } else if (previousTxData.transactionIndex < currentTxData.transactionIndex &&
                      currentTxData.transactionIndex < nextTxData.transactionIndex) {
                suspiciousScore += 10; // Sequential but not perfect
            }
        }
        
        // Check 5: Target contract consistency (attacking same pool)
        if (previousTxData.to == currentTxData.to && 
            currentTxData.to == nextTxData.to &&
            previousTxData.to != address(0)) {
            suspiciousScore += 12;
        }
        
        // Check 6: Function signature pattern analysis
        bytes4 swapETHForTokens = 0x7ff36ab5;
        bytes4 swapTokensForETH = 0x18cbafe5; 
        bytes4 swapExactTokens = 0x38ed1739;
    
        
        // Detect buy -> victim trade -> sell pattern
        if ((previousTxData.functionSelector == swapETHForTokens || 
             previousTxData.functionSelector == swapExactTokens) &&
            (nextTxData.functionSelector == swapTokensForETH ||
             nextTxData.functionSelector == swapExactTokens)) {
            suspiciousScore += 18; // Classic sandwich pattern
        }
        
        // Check 7: Value and transaction amount analysis
        if (previousTxData.value > 0 && nextTxData.value == 0 &&
            previousTxData.value > currentTxData.value * 50 / 100) { // Front-run is 50%+ of victim trade
            suspiciousScore += 8;
        }
        
        // Check 8: Time-based clustering (transactions within seconds)
        if (nextTxData.timestamp <= previousTxData.timestamp + 60) { // Within 1 minute
            suspiciousScore += 5;
        }
        
        // Advanced pattern: Check for contract interaction complexity
        if (previousTxData.gasLimit > 200000 && nextTxData.gasLimit > 200000) {
            // Complex transactions often indicate MEV operations
            suspiciousScore += 3;
        }
        
        // Determine final result
        confidence = suspiciousScore > 100 ? 100 : suspiciousScore;
        isSandwich = confidence >= 65; // 65% threshold for production security
        
        return (isSandwich, confidence);
    }
    
    /**
     * @dev Generate commit hash for commit-reveal scheme
     * @param user User address
     * @param amount Transaction amount
     * @param nonce Random nonce
     * @param tokenAddress Token contract address
     * @return commitHash Generated commit hash
     */
    function generateCommitHash(
        address user,
        uint256 amount,
        uint256 nonce,
        address tokenAddress
    ) internal view returns (bytes32 commitHash) {
        return keccak256(abi.encodePacked(
            user,
            amount,
            nonce,
            tokenAddress,
            block.chainid
        ));
    }
    
    /**
     * @dev Verify commit-reveal transaction
     * @param commit Transaction commitment
     * @param user User address
     * @param amount Transaction amount
     * @param nonce Original nonce
     * @param tokenAddress Token contract address
     * @return valid True if commit is valid
     */
    function verifyCommitReveal(
        TransactionCommit memory commit,
        address user,
        uint256 amount,
        uint256 nonce,
        address tokenAddress
    ) internal view returns (bool valid) {
        // Check if commit exists and hasn't been revealed
        if (commit.commitHash == bytes32(0) || commit.revealed) {
            return false;
        }
        
        // Check if enough time has passed since commit
        if (block.timestamp < commit.commitTime + 2 * 12) { // 2 blocks minimum delay
            return false;
        }
        
        // Verify the hash matches
        bytes32 expectedHash = generateCommitHash(user, amount, nonce, tokenAddress);
        return commit.commitHash == expectedHash && commit.user == user;
    }
    
    /**
     * @dev Check for front-running patterns
     * @param userAddress User attempting transaction
     * @param gasPrice Gas price of transaction
     * @param avgGasPrice Average gas price in recent blocks
     * @return isFrontRunning True if front-running detected
     */
    function detectFrontRunning(
        address userAddress,
        uint256 gasPrice,
        uint256 avgGasPrice
    ) internal pure returns (bool isFrontRunning) {
        // Check for suspiciously high gas prices
        if (gasPrice > avgGasPrice * MAX_GAS_PRICE_MULTIPLIER / 100) {
            return true;
        }
        
        // Check for known MEV bot addresses (this would be maintained off-chain)
        // Simplified check using address characteristics
        uint256 addressValue = uint256(uint160(userAddress));
        if (addressValue % 10000 < 10) { // Placeholder for MEV bot detection
            return true;
        }
        
        return false;
    }
    
    /**
     * @dev Apply slippage protection
     * @param expectedAmount Expected output amount
     * @param actualAmount Actual output amount
     * @param maxSlippage Maximum allowed slippage in basis points
     * @return protected True if slippage is within acceptable range
     */
    function applySlippageProtection(
        uint256 expectedAmount,
        uint256 actualAmount,
        uint256 maxSlippage
    ) internal pure returns (bool protected) {
        if (actualAmount >= expectedAmount) {
            return true; // Better than expected
        }
        
        uint256 slippage = ((expectedAmount - actualAmount) * BASIS_POINTS) / expectedAmount;
        return slippage <= maxSlippage;
    }
    
    /**
     * @dev Calculate fair price using time-weighted average
     * @param prices Array of recent prices
     * @param timestamps Array of corresponding timestamps
     * @param timeWindow Time window for calculation
     * @return fairPrice Time-weighted average price
     */
    function calculateTWAP(
        uint256[] memory prices,
        uint256[] memory timestamps,
        uint256 timeWindow
    ) internal view returns (uint256 fairPrice) {
        require(prices.length == timestamps.length, "Array length mismatch");
        require(prices.length > 0, "No price data");
        
        uint256 totalWeight = 0;
        uint256 weightedSum = 0;
        uint256 currentTime = block.timestamp;
        
        for (uint256 i = 0; i < prices.length; i++) {
            if (currentTime - timestamps[i] <= timeWindow) {
                uint256 weight = timeWindow - (currentTime - timestamps[i]);
                weightedSum += prices[i] * weight;
                totalWeight += weight;
            }
        }
        
        require(totalWeight > 0, "No recent price data");
        return weightedSum / totalWeight;
    }
    
    /**
     * @dev Implement time-based transaction ordering
     * @param commitTime Time when transaction was committed
     * @param executionTime Time when transaction is being executed
     * @param minDelay Minimum required delay
     * @return canExecute True if transaction can be executed
     */
    function checkTimeBasedOrdering(
        uint256 commitTime,
        uint256 executionTime,
        uint256 minDelay
    ) internal pure returns (bool canExecute) {
        return executionTime >= commitTime + minDelay;
    }
}

/**
 * @title StreamingLibrary
 * @dev Library for handling live streaming interactions and community features
 */
library StreamingLibrary {
    // Stream state structure
    struct StreamState {
        bool isActive;
        uint256 startTime;
        uint256 viewerCount;
        uint256 totalTips;
        address streamer;
        string streamTitle;
        string streamCategory;
    }
    
    // Viewer interaction structure
    struct ViewerInteraction {
        address viewer;
        uint256 tipAmount;
        uint256 timestamp;
        string message;
        InteractionType interactionType;
    }
    
    enum InteractionType {
        TIP,
        VOTE,
        CHAT,
        REACTION
    }
    
    // Community voting structure
    struct CommunityVote {
        string proposal;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 totalVoters;
        uint256 endTime;
        bool executed;
    }
    
    /**
     * @dev Calculate engagement score based on viewer interactions
     * @param totalViewers Total number of viewers
     * @param totalTips Total tips received
     * @param interactionCount Number of interactions
     * @param streamDuration Duration of the stream in seconds
     * @return engagementScore Calculated engagement score (0-100)
     */
    function calculateEngagementScore(
        uint256 totalViewers,
        uint256 totalTips,
        uint256 interactionCount,
        uint256 streamDuration
    ) internal pure returns (uint256 engagementScore) {
        if (totalViewers == 0 || streamDuration == 0) return 0;
        
        // Base score from viewer count
        uint256 viewerScore = (totalViewers * 30) / 100; // Max 30 points
        if (viewerScore > 30) viewerScore = 30;
        
        // Tip score based on total tips
        uint256 tipScore = (totalTips * 25) / (1 ether); // Max 25 points for 1 ETH
        if (tipScore > 25) tipScore = 25;
        
        // Interaction frequency score
        uint256 interactionRate = (interactionCount * 3600) / streamDuration; // Interactions per hour
        uint256 interactionScore = (interactionRate * 25) / 100; // Max 25 points for 100 interactions/hour
        if (interactionScore > 25) interactionScore = 25;
        
        // Duration bonus (max 20 points for 4+ hours)
        uint256 durationScore = streamDuration >= 14400 ? 20 : (streamDuration * 20) / 14400;
        
        engagementScore = viewerScore + tipScore + interactionScore + durationScore;
        return engagementScore > 100 ? 100 : engagementScore;
    }
    
    /**
     * @dev Process community voting for token parameters
     * @param vote Current vote state
     * @param votingPower Voter's voting power
     * @param support True for support, false for against
     * @return updated Updated vote state
     */
    function processCommunityVote(
    CommunityVote memory vote,
    address voter,
    uint256 votingPower,
    bool support
    ) internal pure returns (CommunityVote memory updated) {
        updated = vote;
        
        // Use the voter parameter for validation or logging
        require(voter != address(0), "Invalid voter address");
        
        if (support) {
            updated.votesFor += votingPower;
        } else {
            updated.votesAgainst += votingPower;
        }
        
        updated.totalVoters += 1;
        
        return updated;
    }
}