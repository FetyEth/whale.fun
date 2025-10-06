// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FactoryUtils
 * @dev Utility library for TokenFactoryCore to reduce contract size
 */
library FactoryUtils {
    
    /**
     * @dev Validate token creation parameters
     */
    function validateTokenParams(
        uint256 totalSupply,
        uint256 targetMarketCap,
        string memory name,
        string memory symbol,
        string memory description,
        string memory logoUrl
    ) internal pure {
        require(totalSupply >= 1000000 * 1e18 && totalSupply <= 1e27, "Supply");
        require(targetMarketCap >= 1 ether && targetMarketCap <= 1000000 ether, "Cap");
        require(bytes(name).length >= 2 && bytes(name).length <= 32, "Name");
        require(bytes(symbol).length >= 2 && bytes(symbol).length <= 10, "Symbol");
        require(bytes(description).length <= 500, "Desc");
        require(bytes(logoUrl).length <= 200, "Logo");
    }
    
    /**
     * @dev Check rate limiting for creator
     */
    function checkRateLimit(
        mapping(address => uint256) storage lastTokenCreation,
        mapping(address => uint256) storage creatorTokenCount,
        address creator,
        uint256 maxTokensPerCreator
    ) internal view {
        require(
            block.timestamp >= lastTokenCreation[creator] + 1 hours,
            "Rate"
        );
        require(creatorTokenCount[creator] < maxTokensPerCreator, "Max");
    }
    
    /**
     * @dev Update creator tracking
     */
    function updateCreatorTracking(
        mapping(address => uint256) storage creatorTokenCount,
        mapping(address => uint256) storage lastTokenCreation,
        address creator
    ) internal {
        creatorTokenCount[creator]++;
        lastTokenCreation[creator] = block.timestamp;
    }
}
