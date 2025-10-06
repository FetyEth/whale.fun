// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CreatorToken.sol";

/**
 * @title CreatorTokenFactory
 * @dev Separate factory contract to deploy CreatorTokens and keep TokenFactoryCore small
 */
contract CreatorTokenFactory {
    event TokenDeployed(address indexed tokenAddress, address indexed creator);
    
    function deployToken(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        uint256 initialPrice,
        address creator,
        address whaleToken,
        uint256 creatorFeePercent,
        string memory description,
        string memory logoUrl,
        uint256 websiteUrl,
        uint256 telegramUrl
    ) external returns (address) {
        CreatorToken newToken = new CreatorToken(
            name,
            symbol,
            totalSupply,
            initialPrice,
            creator,
            whaleToken,
            creatorFeePercent,
            description,
            logoUrl,
            websiteUrl,
            telegramUrl
        );
        
        address tokenAddress = address(newToken);
        emit TokenDeployed(tokenAddress, creator);
        
        return tokenAddress;
    }
}
