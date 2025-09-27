// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IStreamLaunch.sol";
import "./CreatorToken.sol";
import "./libraries/SecurityLibrary.sol";

/**
 * @title TokenFactory
 * @dev Root factory contract for creating and managing tokens
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
    uint256 public maxTokensPerCreator = 5;
    
    // Platform statistics
    uint256 public totalTokensCreated;
    uint256 public totalVolumeTraded;
    uint256 public totalFeesCollected;
    
    // Token creation limits
    mapping(address => uint256) public creatorTokenCount;
    mapping(address => uint256) public lastTokenCreation;
    
    // Enhanced creator tracking
    mapping(address => address) public tokenToCreator;
    mapping(address => uint256) public tokenToLaunchTime;
    mapping(address => uint256) public creatorUniqueTokens;
    address[] public uniqueCreators;
    
    // Gas price tracking removed for size optimization
    
    constructor(address _whaleToken) Ownable(msg.sender) {
        whaleToken = _whaleToken;
    }
    
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
    
    function getCreatorTokens(address creator) external view override returns (address[] memory) {
        return creatorTokens[creator];
    }
    
    function getAllTokens() external view override returns (address[] memory) {
        return allTokens;
    }
    
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
    
    // Analytics functions moved to TokenAnalytics contract for size optimization
    
    function _trackCreator(address creator) internal {
        if (creatorUniqueTokens[creator] == 0) {
            uniqueCreators.push(creator);
        }
        creatorUniqueTokens[creator]++;
    }
    
    // Gas price tracking removed for size optimization
    
    // Admin functions
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
    
    receive() external payable {}
}
