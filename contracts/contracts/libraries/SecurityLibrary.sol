// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SecurityLibrary
 * @dev Security utilities and rug pull detection algorithms
 */
library SecurityLibrary {
    // Risk assessment structure
    struct RiskMetrics {
        uint256 liquidityRatio;        // Liquidity to market cap ratio
        uint256 holderConcentration;   // Percentage held by top holders
        uint256 tradingVolumeRatio;    // Trading volume to market cap ratio
        uint256 priceVolatility;       // Price volatility over time
        uint256 contractAge;           // Age of the contract in blocks
        uint256 auditScore;            // Audit score (0-100)
        bool hasTimelock;              // Whether contract has timelocks
        bool hasMultisig;              // Whether contract uses multisig
    }
    
    // Risk levels
    enum RiskLevel {
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL
    }
    
    /**
     * @dev Calculate comprehensive risk score for a token
     * @param metrics Risk metrics for the token
     * @return riskLevel Overall risk level
     * @return riskScore Numerical risk score (0-100)
     */
    function calculateRiskScore(RiskMetrics memory metrics) 
        internal 
        pure 
        returns (RiskLevel riskLevel, uint256 riskScore) 
    {
        uint256 score = 0;
        
        // Liquidity risk (25% weight)
        if (metrics.liquidityRatio < 5) score += 25;
        else if (metrics.liquidityRatio < 10) score += 15;
        else if (metrics.liquidityRatio < 20) score += 5;
        
        // Holder concentration risk (20% weight)
        if (metrics.holderConcentration > 50) score += 20;
        else if (metrics.holderConcentration > 30) score += 15;
        else if (metrics.holderConcentration > 20) score += 10;
        else if (metrics.holderConcentration > 10) score += 5;
        
        // Trading volume risk (15% weight)
        if (metrics.tradingVolumeRatio > 500) score += 15; // Suspiciously high volume
        else if (metrics.tradingVolumeRatio < 1) score += 10; // Very low volume
        
        // Price volatility risk (15% weight)
        if (metrics.priceVolatility > 50) score += 15;
        else if (metrics.priceVolatility > 30) score += 10;
        else if (metrics.priceVolatility > 20) score += 5;
        
        // Contract maturity risk (10% weight)
        if (metrics.contractAge < 1000) score += 10; // Less than ~4 hours
        else if (metrics.contractAge < 5000) score += 5; // Less than ~20 hours
        
        // Security features (15% weight)
        if (!metrics.hasTimelock) score += 8;
        if (!metrics.hasMultisig) score += 7;
        if (metrics.auditScore < 50) score += 15;
        else if (metrics.auditScore < 80) score += 5;
        
        riskScore = score > 100 ? 100 : score;
        
        // Determine risk level
        if (riskScore >= 75) riskLevel = RiskLevel.CRITICAL;
        else if (riskScore >= 50) riskLevel = RiskLevel.HIGH;
        else if (riskScore >= 25) riskLevel = RiskLevel.MEDIUM;
        else riskLevel = RiskLevel.LOW;
        
        return (riskLevel, riskScore);
    }
    
    /**
     * @dev Detect potential rug pull indicators
     * @param liquidityBefore Liquidity before suspicious activity
     * @param liquidityAfter Liquidity after suspicious activity
     * @param priceChange Price change percentage
     * @param volumeSpike Volume spike indicator
     * @return isRugPull True if rug pull patterns detected
     * @return confidence Confidence level (0-100)
     */
    function detectRugPull(
        uint256 liquidityBefore,
        uint256 liquidityAfter,
        int256 priceChange,
        bool volumeSpike
    ) internal pure returns (bool isRugPull, uint256 confidence) {
        uint256 confidenceScore = 0;
        
        // Calculate liquidity drop percentage
        uint256 liquidityDropPercent = liquidityBefore > 0 ? 
            ((liquidityBefore - liquidityAfter) * 100) / liquidityBefore : 0;
        
        // Check liquidity removal
        if (liquidityDropPercent >= 90) {
            confidenceScore += 40; // Major liquidity removal
        } else if (liquidityDropPercent >= 70) {
            confidenceScore += 25;
        } else if (liquidityDropPercent >= 50) {
            confidenceScore += 15;
        }
        
        // Check price dump
        if (priceChange <= -80) {
            confidenceScore += 35; // Major price dump
        } else if (priceChange <= -60) {
            confidenceScore += 25;
        } else if (priceChange <= -40) {
            confidenceScore += 15;
        }
        
        // Check volume patterns
        if (volumeSpike) {
            confidenceScore += 15; // Unusual volume activity
        }
        
        // Additional suspicious patterns - combined indicators
        if (liquidityDropPercent >= 80 && priceChange <= -70) {
            confidenceScore += 10; // Combined indicators
        }
        
        confidence = confidenceScore > 100 ? 100 : confidenceScore;
        isRugPull = confidence >= 70; // 70% confidence threshold
        
        return (isRugPull, confidence);
    }
    
    /**
     * @dev Check if a contract has standard security features
     * @param contractAddr Address of the contract to check
     * @return hasOwnership True if contract has ownership functions
     * @return hasTimelock True if contract has timelock functions
     * @return isRenouncedOwnership True if ownership has been renounced
     */
    function checkSecurityFeatures(address contractAddr) 
        internal 
        view 
        returns (
            bool hasOwnership,
            bool hasTimelock, 
            bool isRenouncedOwnership
        ) 
    {
        // Check if contract has owner() function
        (bool successOwner, bytes memory ownerData) = contractAddr.staticcall(
            abi.encodeWithSignature("owner()")
        );
        hasOwnership = successOwner && ownerData.length == 32;
        
        if (hasOwnership) {
            address owner = abi.decode(ownerData, (address));
            isRenouncedOwnership = (owner == address(0));
        }
        
        // Check if contract has timelock functions
        (bool successTimelock, ) = contractAddr.staticcall(
            abi.encodeWithSignature("timelock()")
        );
        hasTimelock = successTimelock;
        
        return (hasOwnership, hasTimelock, isRenouncedOwnership);
    }
}