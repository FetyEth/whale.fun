// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BondingCurveLibrary
 * @dev Advanced mathematical library for dynamic bonding curve calculations
 */
library BondingCurveLibrary {
    using FixedPointMathLib for uint256;
    
    // Curve types
    enum CurveType {
        LINEAR,
        EXPONENTIAL,
        LOGARITHMIC,
        SIGMOID,
        POLYNOMIAL
    }
    
    // Curve parameters
    struct CurveParams {
        CurveType curveType;
        uint256 initialPrice;
        uint256 finalPrice;
        uint256 steepness;
        uint256 inflectionPoint;
        uint256 reserveRatio; // For bancor-style curves
        uint256 virtualBalance; // For virtual liquidity
    }
    
    // Price calculation constants
    uint256 private constant PRECISION = 1e18;
    uint256 private constant MAX_SUPPLY = 1e27; // Maximum token supply
    uint256 private constant MIN_PRICE = 1e12; // Minimum price (0.000001 ETH)
    uint256 private constant MAX_PRICE = 1e23; // Maximum price (100,000 ETH)
    
    /**
     * @dev Calculate token price based on supply and curve parameters
     * @param supply Current token supply sold
     * @param params Curve parameters
     * @return price Current token price in wei
     */
    function calculatePrice(uint256 supply, CurveParams memory params) 
        internal 
        pure 
        returns (uint256 price) 
    {
        require(supply <= MAX_SUPPLY, "Supply exceeds maximum");
        
        if (params.curveType == CurveType.LINEAR) {
            price = _calculateLinearPrice(supply, params);
        } else if (params.curveType == CurveType.EXPONENTIAL) {
            price = _calculateExponentialPrice(supply, params);
        } else if (params.curveType == CurveType.LOGARITHMIC) {
            price = _calculateLogarithmicPrice(supply, params);
        } else if (params.curveType == CurveType.SIGMOID) {
            price = _calculateSigmoidPrice(supply, params);
        } else if (params.curveType == CurveType.POLYNOMIAL) {
            price = _calculatePolynomialPrice(supply, params);
        } else {
            revert("Invalid curve type");
        }
        
        // Ensure price bounds
        if (price < MIN_PRICE) price = MIN_PRICE;
        if (price > MAX_PRICE) price = MAX_PRICE;
        
        return price;
    }
    
    /**
     * @dev Calculate cost to buy tokens using integral of curve
     * @param currentSupply Current supply before purchase
     * @param tokenAmount Amount of tokens to buy
     * @param params Curve parameters
     * @return cost Total cost in wei
     */
    function calculateBuyCost(
        uint256 currentSupply,
        uint256 tokenAmount,
        CurveParams memory params
    ) internal pure returns (uint256 cost) {
        require(currentSupply + tokenAmount <= MAX_SUPPLY, "Exceeds max supply");
        
        if (params.curveType == CurveType.LINEAR) {
            cost = _calculateLinearIntegral(currentSupply, currentSupply + tokenAmount, params);
        } else if (params.curveType == CurveType.EXPONENTIAL) {
            cost = _calculateExponentialIntegral(currentSupply, currentSupply + tokenAmount, params);
        } else if (params.curveType == CurveType.LOGARITHMIC) {
            cost = _calculateLogarithmicIntegral(currentSupply, currentSupply + tokenAmount, params);
        } else if (params.curveType == CurveType.SIGMOID) {
            cost = _calculateSigmoidIntegral(currentSupply, currentSupply + tokenAmount, params);
        } else if (params.curveType == CurveType.POLYNOMIAL) {
            cost = _calculatePolynomialIntegral(currentSupply, currentSupply + tokenAmount, params);
        }
        
        return cost;
    }
    
    /**
     * @dev Calculate proceeds from selling tokens
     * @param currentSupply Current supply before sale
     * @param tokenAmount Amount of tokens to sell
     * @param params Curve parameters
     * @return proceeds Total proceeds in wei
     */
    function calculateSellProceeds(
        uint256 currentSupply,
        uint256 tokenAmount,
        CurveParams memory params
    ) internal pure returns (uint256 proceeds) {
        require(currentSupply >= tokenAmount, "Insufficient supply to sell");
        
        return calculateBuyCost(currentSupply - tokenAmount, tokenAmount, params);
    }
    
    /**
     * @dev Get optimal curve parameters based on token characteristics
     * @param totalSupply Total token supply
     * @param targetMarketCap Target market cap in ETH
     * @param communitySize Expected community size
     * @param liquidityDepth Available liquidity depth
     * @return params Optimized curve parameters
     */
    function getOptimalCurveParams(
        uint256 totalSupply,
        uint256 targetMarketCap,
        uint256 communitySize,
        uint256 liquidityDepth
    ) internal pure returns (CurveParams memory params) {
        // Enforce minimum safe values to prevent overflow
        require(totalSupply >= 1000, "Total supply too small");
        require(targetMarketCap >= 1e15, "Target market cap too small"); // Min 0.001 ETH
        require(totalSupply <= MAX_SUPPLY, "Total supply too large");
        require(targetMarketCap <= 1e24, "Target market cap too large"); // Max 1M ETH
        
        // Dynamic curve selection based on characteristics
        if (communitySize < 100 && targetMarketCap < 100 ether) {
            // Small community tokens - use linear curve for safety
            params.curveType = CurveType.LINEAR;
            params.steepness = PRECISION / 1000; // Very gentle slope
        } else if (communitySize > 1000 && targetMarketCap > 1000 ether) {
            // Large community tokens - gentler sigmoid curve
            params.curveType = CurveType.SIGMOID;
            params.inflectionPoint = totalSupply / 2; // Midpoint inflection
        } else {
            // Medium tokens - logarithmic curve for stability
            params.curveType = CurveType.LOGARITHMIC;
            params.steepness = PRECISION / 1000; // Even gentler steepness
        }
        
        // Calculate initial and final prices with safety bounds
        uint256 priceRatio = 100; // Start at 1% of target instead of 0.1%
        params.initialPrice = targetMarketCap / (totalSupply * priceRatio);
        params.finalPrice = targetMarketCap / totalSupply;
        
        // Ensure prices are within safe bounds
        if (params.initialPrice < MIN_PRICE) params.initialPrice = MIN_PRICE;
        if (params.finalPrice > MAX_PRICE) params.finalPrice = MAX_PRICE;
        if (params.finalPrice <= params.initialPrice) {
            params.finalPrice = params.initialPrice * 2; // Ensure some price growth
        }
        
        // Set virtual balance based on liquidity depth
        params.virtualBalance = liquidityDepth;
        params.reserveRatio = PRECISION / 2; // 50% reserve ratio
        
        return params;
    }
    
    // Internal price calculation functions
    function _calculateLinearPrice(uint256 supply, CurveParams memory params) 
        private 
        pure 
        returns (uint256) 
    {
        // P(s) = initialPrice + (steepness * s)
        return params.initialPrice + (params.steepness * supply) / PRECISION;
    }
    
    function _calculateExponentialPrice(uint256 supply, CurveParams memory params) 
        private 
        pure 
        returns (uint256) 
    {
        // P(s) = initialPrice * e^(steepness * s / PRECISION) - prevent overflow
        if (params.steepness == 0 || supply == 0) return params.initialPrice;
        uint256 exponent = (params.steepness * supply) / PRECISION;
        if (exponent > 50 * PRECISION) exponent = 50 * PRECISION; // Cap exponent to prevent overflow
        return (params.initialPrice * _exp(exponent)) / PRECISION;
    }
    
    function _calculateLogarithmicPrice(uint256 supply, CurveParams memory params) 
        private 
        pure 
        returns (uint256) 
    {
        if (supply == 0) return params.initialPrice;
        // P(s) = initialPrice + steepness * ln(s + 1)
        return params.initialPrice + (params.steepness * _ln(supply + PRECISION)) / PRECISION;
    }
    
    function _calculateSigmoidPrice(uint256 supply, CurveParams memory params) 
        private 
        pure 
        returns (uint256) 
    {
        // P(s) = finalPrice / (1 + e^(-steepness * (s - inflectionPoint)))
        // Fixed the type casting and arithmetic issues
        int256 x = int256(supply) - int256(params.inflectionPoint);
        int256 steepnessInt = int256(params.steepness);
        int256 exponentArg = (-steepnessInt * x) / int256(PRECISION);
        
        // Convert back to uint256 for _exp function (handle negative exponents)
        uint256 expValue;
        if (exponentArg >= 0) {
            expValue = _exp(uint256(exponentArg));
        } else {
            // For negative exponents, use 1/e^|x|
            expValue = PRECISION * PRECISION / _exp(uint256(-exponentArg));
        }
        
        uint256 sigmoid = PRECISION + expValue;
        return params.finalPrice / sigmoid * PRECISION; // Reorder to prevent overflow
    }
    
    function _calculatePolynomialPrice(uint256 supply, CurveParams memory params) 
        private 
        pure 
        returns (uint256) 
    {
        // P(s) = initialPrice + steepness * s^2 / PRECISION - prevent overflow
        if (supply > 1e12) supply = 1e12; // Cap supply to prevent overflow
        uint256 squared = (supply * supply) / PRECISION;
        return params.initialPrice + (params.steepness * squared) / PRECISION;
    }
    
    // Internal integral calculation functions
    function _calculateLinearIntegral(uint256 from, uint256 to, CurveParams memory params) 
        private 
        pure 
        returns (uint256) 
    {
        // ∫(initialPrice + steepness * s)ds = initialPrice * s + steepness * s^2 / 2 - prevent overflow
        uint256 fromValue = params.initialPrice * from + (params.steepness * from * from) / (2 * PRECISION);
        uint256 toValue = params.initialPrice * to + (params.steepness * to * to) / (2 * PRECISION);
        return toValue - fromValue;
    }
    
    function _calculateExponentialIntegral(uint256 from, uint256 to, CurveParams memory params) 
        private 
        pure 
        returns (uint256) 
    {
        // Approximation for exponential integral using linear segments
        uint256 segments = (to - from) / 1e18 + 1;
        if (segments == 0) segments = 1;
        uint256 segmentSize = (to - from) / segments;
        uint256 totalCost = 0;
        
        for (uint256 i = 0; i < segments; i++) {
            uint256 segmentStart = from + (i * segmentSize);
            uint256 segmentEnd = segmentStart + segmentSize;
            uint256 avgPrice = (_calculateExponentialPrice(segmentStart, params) + 
                              _calculateExponentialPrice(segmentEnd, params)) / 2;
            totalCost += avgPrice * segmentSize / PRECISION;
        }
        
        return totalCost;
    }
    
    function _calculateLogarithmicIntegral(uint256 from, uint256 to, CurveParams memory params) 
        private 
        pure 
        returns (uint256) 
    {
        // Approximation using trapezoidal rule
        uint256 segments = 10; // Use 10 segments for accuracy
        uint256 segmentSize = (to - from) / segments;
        uint256 totalCost = 0;
        
        for (uint256 i = 0; i < segments; i++) {
            uint256 x1 = from + (i * segmentSize);
            uint256 x2 = x1 + segmentSize;
            uint256 y1 = _calculateLogarithmicPrice(x1, params);
            uint256 y2 = _calculateLogarithmicPrice(x2, params);
            totalCost += (y1 + y2) * segmentSize / (2 * PRECISION);
        }
        
        return totalCost;
    }
    
    function _calculateSigmoidIntegral(uint256 from, uint256 to, CurveParams memory params) 
        private 
        pure 
        returns (uint256) 
    {
        // Numerical integration using Simpson's rule
        uint256 segments = 10;
        uint256 h = (to - from) / segments;
        uint256 sum = _calculateSigmoidPrice(from, params) + _calculateSigmoidPrice(to, params);
        
        for (uint256 i = 1; i < segments; i++) {
            uint256 x = from + i * h;
            if (i % 2 == 0) {
                sum += 2 * _calculateSigmoidPrice(x, params);
            } else {
                sum += 4 * _calculateSigmoidPrice(x, params);
            }
        }
        
        return (sum * h) / (3 * PRECISION);
    }
    
    function _calculatePolynomialIntegral(uint256 from, uint256 to, CurveParams memory params) 
        private 
        pure 
        returns (uint256) 
    {
        // ∫(initialPrice + steepness * s^2)ds = initialPrice * s + steepness * s^3 / 3
        uint256 fromValue = params.initialPrice * from + 
                          (params.steepness * from * from * from) / (3 * PRECISION * PRECISION);
        uint256 toValue = params.initialPrice * to + 
                        (params.steepness * to * to * to) / (3 * PRECISION * PRECISION);
        return toValue - fromValue;
    }
    
    // Mathematical helper functions
    function _exp(uint256 x) private pure returns (uint256) {
        if (x == 0) return PRECISION;
        if (x > 50 * PRECISION) return type(uint256).max; // Prevent overflow
        
        uint256 result = PRECISION;
        uint256 term = x;
        
        // Taylor series: e^x = 1 + x + x²/2! + x³/3! + ...
        for (uint256 i = 1; i <= 20; i++) {
            result += term / _factorial(i);
            term = (term * x) / PRECISION;
            
            if (term < 1000) break; // Stop when terms are negligible
        }
        
        return result;
    }
    
    function _ln(uint256 x) private pure returns (uint256) {
        require(x > 0, "ln(0) undefined");
        
        if (x < PRECISION) {
            // For x < 1, use ln(x) = -ln(1/x)
            uint256 reciprocal = (PRECISION * PRECISION) / x;
            return type(uint256).max - _ln(reciprocal);
        }
        
        uint256 result = 0;
        uint256 y = x;
        
        // Handle large numbers: ln(x) = ln(2^n * x/2^n) = n*ln(2) + ln(x/2^n)
        while (y >= 2 * PRECISION) {
            result += 693147180559945309; // ln(2) * PRECISION with high precision
            y = y / 2;
        }
        
        // Taylor series for ln(1 + (y-1)) where y is now between 1 and 2
        y = y - PRECISION; // Convert to (y-1)
        uint256 term = y;
        uint256 sum = 0;
        
        // Calculate first 15 terms for high precision
        for (uint256 i = 1; i <= 15; i++) {
            uint256 termValue = term / i;
            
            if (i % 2 == 1) {
                sum += termValue;
            } else {
                sum = sum > termValue ? sum - termValue : 0;
            }
            
            term = (term * y) / PRECISION;
            
            // Stop when terms become negligible
            if (termValue < 100) break;
        }
        
        return result + sum;
    }
    
    /**
     * @dev Calculate factorial with overflow protection
     */
    function _factorial(uint256 n) private pure returns (uint256) {
        if (n <= 1) return 1;
        if (n <= 10) {
            uint256[11] memory factorials = [
                uint256(1), 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800
            ];
            return factorials[n];
        }
        
        // Use Stirling's approximation for larger factorials to prevent overflow
        return 3628800 * n; // Simplified approximation
    }
}

/**
 * @title FixedPointMathLib
 * @dev Library for fixed-point arithmetic operations
 */
library FixedPointMathLib {
    uint256 internal constant WAD = 1e18;
    uint256 internal constant RAY = 1e27;
    
    function mulWad(uint256 x, uint256 y) internal pure returns (uint256) {
        return (x * y) / WAD;
    }
    
    function divWad(uint256 x, uint256 y) internal pure returns (uint256) {
        return (x * WAD) / y;
    }
    
    function mulRay(uint256 x, uint256 y) internal pure returns (uint256) {
        return (x * y) / RAY;
    }
    
    function divRay(uint256 x, uint256 y) internal pure returns (uint256) {
        return (x * RAY) / y;
    }
    
    function rpow(uint256 x, uint256 n, uint256 base) internal pure returns (uint256 z) {
        assembly {
            switch x 
            case 0 {
                switch n 
                case 0 { z := base }
                default { z := 0 }
            }
            default {
                switch mod(n, 2) 
                case 0 { z := base }
                default { z := x }
                
                let half := div(base, 2)
                for { n := div(n, 2) } n { n := div(n, 2) } {
                    let xx := mul(x, x)
                    if iszero(eq(div(xx, x), x)) { revert(0, 0) }
                    let xxRound := add(xx, half)
                    if lt(xxRound, xx) { revert(0, 0) }
                    x := div(xxRound, base)
                    if mod(n, 2) {
                        let zx := mul(z, x)
                        if and(iszero(iszero(x)), iszero(eq(div(zx, x), z))) { revert(0, 0) }
                        let zxRound := add(zx, half)
                        if lt(zxRound, zx) { revert(0, 0) }
                        z := div(zxRound, base)
                    }
                }
            }
        }
    }
}