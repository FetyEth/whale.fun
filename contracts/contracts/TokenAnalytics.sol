// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CreatorToken.sol";
import "./TokenFactoryRoot.sol";

/**
 * @title TokenAnalytics
 * @dev Handles complex analytics and metrics for tokens
 */
contract TokenAnalytics {
    
    TokenFactory public immutable tokenFactory;
    
    constructor(address _tokenFactory) {
        tokenFactory = TokenFactory(payable(_tokenFactory));
    }
    
    function getFactoryAnalytics() external view returns (
        uint256 avgTokensPerCreator,
        uint256 successRate,
        uint256 totalMarketCap
    ) {
        uint256 totalTokensCreated = tokenFactory.totalTokensCreated();
        if (totalTokensCreated == 0) return (0, 0, 0);
        
        address[] memory allTokens = tokenFactory.getAllTokens();
        uint256 uniqueCreatorCount = _getUniqueCreatorCount(allTokens);
        
        avgTokensPerCreator = uniqueCreatorCount > 0 ? 
            (totalTokensCreated * 1000) / uniqueCreatorCount : 0;
        
        uint256 successfulTokens = 0;
        uint256 totalMarketCapValue = 0;
        
        for (uint256 i = 0; i < allTokens.length; i++) {
            address payable tokenAddr = payable(allTokens[i]);
            
            try CreatorToken(tokenAddr).getTokenStats() returns (
                uint256, uint256, uint256, uint256 marketCap, uint256, uint256
            ) {
                totalMarketCapValue += marketCap;
                
                bool hasGoodMarketCap = marketCap > 1 ether;
                bool hasLongevity = (block.timestamp - tokenFactory.tokenToLaunchTime(tokenAddr)) > 7 days;
                
                if (hasGoodMarketCap || hasLongevity) {
                    successfulTokens++;
                }
                
            } catch {
                continue;
            }
        }
        
        successRate = totalTokensCreated > 0 ? (successfulTokens * 100) / totalTokensCreated : 0;
        totalMarketCap = totalMarketCapValue;
        
        return (avgTokensPerCreator, successRate, totalMarketCap);
    }
    
    function getPlatformMetrics() external view returns (
        uint256 totalTokensCreated_,
        uint256 activeTokens,
        uint256 totalVolumeTraded_,
        uint256 avgTokenAge,
        uint256 topTokenMarketCap
    ) {
        address[] memory allTokens = tokenFactory.getAllTokens();
        totalTokensCreated_ = tokenFactory.totalTokensCreated();
        totalVolumeTraded_ = tokenFactory.totalVolumeTraded();
        
        uint256 totalAge = 0;
        uint256 activeCount = 0;
        uint256 maxMarketCap = 0;
        
        for (uint256 i = 0; i < allTokens.length; i++) {
            address payable tokenAddr = payable(allTokens[i]);
            uint256 tokenAge = block.timestamp - tokenFactory.tokenToLaunchTime(tokenAddr);
            totalAge += tokenAge;
            
            try CreatorToken(tokenAddr).getTokenStats() returns (
                uint256, uint256, uint256, uint256 marketCap, uint256, uint256
            ) {
                if (marketCap > maxMarketCap) {
                    maxMarketCap = marketCap;
                }
                
                try CreatorToken(tokenAddr).dailyVolume() returns (uint256 volume) {
                    if (volume > 0) activeCount++;
                } catch {}
            } catch {}
        }
        
        activeTokens = activeCount;
        avgTokenAge = totalTokensCreated_ > 0 ? totalAge / totalTokensCreated_ : 0;
        topTokenMarketCap = maxMarketCap;
        
        return (totalTokensCreated_, activeTokens, totalVolumeTraded_, avgTokenAge, topTokenMarketCap);
    }
    
    function getCreatorMetrics(address creator) external view returns (
        uint256 tokensCreated,
        uint256 successfulTokens,
        uint256 totalMarketCap,
        uint256 averageTokenAge,
        uint256 totalFeesEarned
    ) {
        address[] memory creatorTokenList = tokenFactory.getCreatorTokens(creator);
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
            uint256 tokenAge = block.timestamp - tokenFactory.tokenToLaunchTime(tokenAddr);
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
    
    function _getUniqueCreatorCount(address[] memory allTokens) internal view returns (uint256) {
        address[] memory uniqueCreators = new address[](allTokens.length);
        uint256 uniqueCount = 0;
        
        for (uint256 i = 0; i < allTokens.length; i++) {
            address creator = tokenFactory.tokenToCreator(allTokens[i]);
            bool isUnique = true;
            
            for (uint256 j = 0; j < uniqueCount; j++) {
                if (uniqueCreators[j] == creator) {
                    isUnique = false;
                    break;
                }
            }
            
            if (isUnique) {
                uniqueCreators[uniqueCount] = creator;
                uniqueCount++;
            }
        }
        
        return uniqueCount;
    }
}
