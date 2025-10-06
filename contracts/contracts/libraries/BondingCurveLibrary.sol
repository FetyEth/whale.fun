// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BondingCurveLibrary
 * @dev Optimized hybrid bonding curve: Exponential start (20%) + Linear growth (80%)
 * Gas efficient, user-friendly, and perfect for token launches
 */
library BondingCurveLibrary {
    
    struct CurveConfig {
        uint256 totalSupply;        // Total tokens (e.g., 1M tokens)
        uint256 exponentialPhase;   // 20% of supply gets exponential pricing
        uint256 basePrice;          // Starting price (e.g., 0.0001 ETH)
        uint256 transitionPrice;    // Price at 20% mark (end of exponential)
        uint256 finalPrice;         // Price when curve completes
        uint256 currentSupply;      // Tokens sold so far
    }
    
    uint256 constant PRECISION = 1e18;
    uint256 constant EXPONENTIAL_MULTIPLIER = 15e17; // 1.5x growth factor
    
    /**
     * @dev Get current token price based on supply
     * @param curve Current curve configuration
     * @return price Current token price in wei
     */
    function getCurrentPrice(CurveConfig memory curve) 
        internal pure returns (uint256 price) 
    {
        require(curve.currentSupply <= curve.totalSupply, "Supply exceeds maximum");
        
        if (curve.currentSupply <= curve.exponentialPhase) {
            // Phase 1: Exponential (first 20% of supply)
            return _calculateExponentialPrice(curve);
        } else {
            // Phase 2: Linear (remaining 80% of supply) 
            return _calculateLinearPrice(curve);
        }
    }
    
    /**
     * @dev Calculate cost to buy tokens (simple average price method)
     * @param curve Current curve configuration
     * @param tokenAmount Amount of tokens to buy
     * @return cost Total cost in wei
     */
    function calculateBuyCost(CurveConfig memory curve, uint256 tokenAmount) 
        internal pure returns (uint256 cost) 
    {
        require(curve.currentSupply + tokenAmount <= curve.totalSupply, "Exceeds total supply");
        require(tokenAmount > 0, "Token amount must be greater than 0");
        
        // Get start price
        uint256 startPrice = getCurrentPrice(curve);
        
        // Calculate end price (temporarily update supply)
        CurveConfig memory tempCurve = curve;
        tempCurve.currentSupply = curve.currentSupply + tokenAmount;
        uint256 endPrice = getCurrentPrice(tempCurve);
        
        // Use average price for cost calculation (good approximation, low gas)
        uint256 averagePrice = (startPrice + endPrice) / 2;
        return (averagePrice * tokenAmount) / PRECISION;
    }
    
    /**
     * @dev Calculate proceeds from selling tokens
     * @param curve Current curve configuration  
     * @param tokenAmount Amount of tokens to sell
     * @return proceeds Total proceeds in wei
     */
    function calculateSellProceeds(CurveConfig memory curve, uint256 tokenAmount) 
        internal pure returns (uint256 proceeds) 
    {
        require(curve.currentSupply >= tokenAmount, "Insufficient supply to sell");
        
        // Calculate price range for selling
        CurveConfig memory tempCurve = curve;
        tempCurve.currentSupply = curve.currentSupply - tokenAmount;
        uint256 startPrice = getCurrentPrice(tempCurve);
        uint256 endPrice = getCurrentPrice(curve);
        uint256 averagePrice = (startPrice + endPrice) / 2;
        return (averagePrice * tokenAmount) / PRECISION;
    }
    
    /**
     * @dev Get streaming price with bonus multiplier (Whale.fun optimized)
     * @param curve Current curve configuration
     * @param isStreaming Whether creator is currently streaming
     * @return price Price with streaming bonus applied
     */
    function getStreamingPrice(CurveConfig memory curve, bool isStreaming) 
        internal pure returns (uint256 price) 
    {
        uint256 basePrice = getCurrentPrice(curve);
        
        // Apply 15% bonus during streams (optimized for Whale.fun psychology)
        if (isStreaming) {
            return (basePrice * 115) / 100; // 1.15x boost
        }
        
        return basePrice;
    }
    
    /**
     * @dev Check if purchase qualifies as whale alert
     * @param ethAmount ETH amount being spent
     * @return alertLevel 0=normal, 1=small whale, 2=big whale, 3=mega whale
     */
    function getWhaleAlertLevel(uint256 ethAmount) 
        internal pure returns (uint8 alertLevel) 
    {
        // Whale alert thresholds optimized for $0.000125 base price
        if (ethAmount >= 10 ether) {        // $25,000+ = Mega Whale
            return 3;
        } else if (ethAmount >= 2 ether) {  // $5,000+ = Big Whale  
            return 2;
        } else if (ethAmount >= 0.4 ether) { // $1,000+ = Small Whale
            return 1;
        }
        return 0; // Normal trade
    }
    
    /**
     * @dev Check if token is ready for graduation
     * @param curve Current curve configuration
     * @return isReady True if ready for graduation
     * @return phase Current phase (1 = exponential, 2 = linear, 3 = graduated)
     */
    function getGraduationStatus(CurveConfig memory curve) 
        internal pure returns (bool isReady, uint8 phase) 
    {
        if (curve.currentSupply <= curve.exponentialPhase) {
            return (false, 1); // Still in exponential phase
        } else if (curve.currentSupply < curve.totalSupply * 8 / 10) {
            return (false, 2); // In linear phase, not ready
        } else {
            return (true, 3);  // 80% sold, ready for graduation
        }
    }
    
    /**
     * @dev Initialize curve configuration for a new token with optimal Whale.fun pricing
     * @param totalSupply Total token supply (recommended: 400M tokens)
     * @param targetMarketCap Target market cap at completion (recommended: 50K USD)
     * @return curve initialized curve configuration
     */
    function initializeCurve(uint256 totalSupply, uint256 targetMarketCap) 
        internal pure returns (CurveConfig memory curve) 
    {
        require(totalSupply >= 1000, "Total supply too small");
        require(targetMarketCap >= 1e15, "Target market cap too small");
        
        curve.totalSupply = totalSupply;
        curve.exponentialPhase = totalSupply / 5; // 20% of supply (80M tokens)
        curve.currentSupply = 0;
        
        // WHALE.FUN OPTIMAL PRICING STRATEGY
        // Base price: $0.000125 per token (32x premium over pump.fun)
        // Assumes ETH = $2500, so 0.00005 ETH per token
        uint256 OPTIMAL_BASE_PRICE = 5e13; // 0.00005 ETH in wei
        
        curve.basePrice = OPTIMAL_BASE_PRICE;
        
        // Transition price at 20% mark: ~8x base price (exponential growth)
        curve.transitionPrice = OPTIMAL_BASE_PRICE * 8;
        
        // Final price calculated from target market cap
        curve.finalPrice = targetMarketCap / totalSupply;
        
        // Ensure price progression makes sense
        if (curve.finalPrice < curve.transitionPrice) {
            curve.finalPrice = curve.transitionPrice * 2; // Minimum 2x growth in linear phase
        }
        
        // safety bounds
        uint256 MIN_PRICE = 1e12; // 0.000001 ETH minimum
        uint256 MAX_PRICE = 1e17; // 0.1 ETH maximum
        
        if (curve.basePrice < MIN_PRICE) curve.basePrice = MIN_PRICE;
        if (curve.finalPrice > MAX_PRICE) curve.finalPrice = MAX_PRICE;
        
        return curve;
    }
    
    /**
     */
    function _calculateExponentialPrice(CurveConfig memory curve) 
        private pure returns (uint256) 
    {
        if (curve.currentSupply == 0) return curve.basePrice;
        
        // Simple exponential: price = basePrice * (1.5)^progress
        uint256 progress = (curve.currentSupply * PRECISION) / curve.exponentialPhase;
        uint256 exponential = _simplePow(EXPONENTIAL_MULTIPLIER, progress);
        
        return (curve.basePrice * exponential) / PRECISION;
    }
    
    /**
     * @dev Calculate linear price for later phase (remaining 80% of supply)
     */
    function _calculateLinearPrice(CurveConfig memory curve) 
        private pure returns (uint256) 
    {
        uint256 linearSupply = curve.currentSupply - curve.exponentialPhase;
        uint256 maxLinearSupply = curve.totalSupply - curve.exponentialPhase;
        uint256 progress = (linearSupply * PRECISION) / maxLinearSupply;
        uint256 priceRange = curve.finalPrice - curve.transitionPrice;
        
        return curve.transitionPrice + (priceRange * progress) / PRECISION;
    }
    
    /**
     * @dev Simple power function for exponential calculation (gas efficient)
     */
    function _simplePow(uint256 base, uint256 exponent) 
        private pure returns (uint256) 
    {
        if (exponent == 0) return PRECISION;
        
        uint256 result = PRECISION;
        uint256 baseAccumulator = base;
        
        while (exponent > 0) {
            if (exponent % 2 == 1) {
                result = (result * baseAccumulator) / PRECISION;
            }
            baseAccumulator = (baseAccumulator * baseAccumulator) / PRECISION;
            exponent /= 2;
        }
        
        return result;
    }
}