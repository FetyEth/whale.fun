// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ITokenFactory
 * @dev Interface for the token creation factory
 */
interface ITokenFactory {

    function createToken(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        uint256 initialPrice,
        uint256 creatorFeePercent,
        string memory description,
        string memory logoUrl
    ) external payable returns (address);
    
    function getCreatorTokens(address creator) external view returns (address[] memory);
    function getAllTokens() external view returns (address[] memory);
    function isValidToken(address token) external view returns (bool);
    function tokenToCreator(address token) external view returns (address);
    
    function getFactoryStats() external view returns (
        uint256 totalTokensCreated,
        uint256 totalVolumeTraded,
        uint256 totalFeesCollected,
        uint256 launchFee
    );
    
    event TokenCreated(
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        uint256 totalSupply,
        uint256 timestamp
    );
}
