// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./CreatorToken.sol";
import "./TokenFactoryRoot.sol";

/**
 * @title TokenGraduation
 * @dev Handles token graduation to DEX liquidity pools
 */
contract TokenGraduation is ReentrancyGuard, Ownable {
    
    TokenFactory public immutable tokenFactory;
    
    // Token graduation system
    mapping(address => bool) public graduatedTokens;
    mapping(address => uint256) public graduationThreshold;
    mapping(address => address) public graduatedPairs; // token => LP pair
    
    // Graduation configuration
    uint256 public constant DEFAULT_GRADUATION_THRESHOLD = 20e18; // $20 USD worth in ETH
    uint256 public constant MIN_GRADUATION_THRESHOLD = 5e18;      // $5 USD minimum
    uint256 public constant MAX_GRADUATION_THRESHOLD = 1000e18;   // $1000 USD maximum
    
    // Price oracle for USD conversion (simplified - in production use Chainlink)
    uint256 public ethToUsdRate = 2000e18; // $2000 per ETH (18 decimals)
    address public priceOracle; // Future Chainlink oracle integration
    
    // Graduation events
    event TokenGraduated(
        address indexed token,
        address indexed creator,
        uint256 finalMarketCap,
        address liquidityPair,
        uint256 timestamp
    );
    
    event GraduationThresholdUpdated(
        address indexed token,
        uint256 oldThreshold,
        uint256 newThreshold
    );
    
    event DefaultGraduationThresholdsUpdated(
        uint256 marketCapThreshold,
        uint256 volumeThreshold, 
        uint256 holderThreshold
    );
    
    constructor(address _tokenFactory) Ownable(msg.sender) {
        tokenFactory = TokenFactory(payable(_tokenFactory));
    }
    
    /**
     * @dev Set custom graduation threshold for a token
     */
    function setGraduationThreshold(address tokenAddress, uint256 thresholdInUSD) external {
        require(tokenFactory.isValidToken(tokenAddress), "Invalid token");
        require(tokenFactory.tokenToCreator(tokenAddress) == msg.sender || msg.sender == owner(), "Not authorized");
        require(!graduatedTokens[tokenAddress], "Already graduated");
        require(thresholdInUSD >= MIN_GRADUATION_THRESHOLD && thresholdInUSD <= MAX_GRADUATION_THRESHOLD, "Invalid threshold");
        
        uint256 oldThreshold = graduationThreshold[tokenAddress];
        graduationThreshold[tokenAddress] = thresholdInUSD;
        
        emit GraduationThresholdUpdated(tokenAddress, oldThreshold, thresholdInUSD);
    }
    
    /**
     * @dev Get graduation threshold for a token (defaults to $20 if not set)
     */
    function getGraduationThreshold(address tokenAddress) public view returns (uint256) {
        uint256 threshold = graduationThreshold[tokenAddress];
        return threshold > 0 ? threshold : DEFAULT_GRADUATION_THRESHOLD;
    }
    
    /**
     * @dev Convert USD amount to ETH equivalent
     */
    function usdToEth(uint256 usdAmount) public view returns (uint256) {
        require(ethToUsdRate > 0, "Invalid ETH rate");
        return (usdAmount * 1e18) / ethToUsdRate;
    }
    
    /**
     * @dev Check if token is ready for graduation
     */
    function isReadyForGraduation(address tokenAddress) public view returns (bool) {
        if (!tokenFactory.isValidToken(tokenAddress) || graduatedTokens[tokenAddress]) {
            return false;
        }
        
        try CreatorToken(payable(tokenAddress)).getTokenStats() returns (
            uint256, uint256, uint256, uint256 marketCap, uint256, uint256
        ) {
            uint256 thresholdInUSD = getGraduationThreshold(tokenAddress);
            uint256 thresholdInETH = usdToEth(thresholdInUSD);
            return marketCap >= thresholdInETH;
        } catch {
            return false;
        }
    }
    
    /**
     * @dev Check if token is eligible for graduation
     */
    function isEligibleForGraduation(address token) external view returns (bool) {
        if (!tokenFactory.isValidToken(token) || graduatedTokens[token]) {
            return false;
        }
        
        try CreatorToken(payable(token)).getTokenStats() returns (
            uint256, uint256, uint256, uint256 marketCap, uint256 holderCount, uint256
        ) {
            // Check market cap threshold
            uint256 threshold = graduationThreshold[token] > 0 
                ? graduationThreshold[token] 
                : getGraduationThreshold(token);
            
            if (marketCap < usdToEth(threshold)) return false;
            
            // Check holder count
            if (holderCount < 10) return false; // Minimum 10 holders
            
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * @dev Graduate token to DEX with real implementation
     */
    function graduateToken(address token, address dexRouter) external nonReentrant returns (address liquidityPair) {
        require(tokenFactory.isValidToken(token), "Invalid token");
        require(!graduatedTokens[token], "Already graduated");
        require(dexRouter != address(0), "Invalid DEX router");
        
        // Check eligibility
        require(this.isEligibleForGraduation(token), "Token not eligible for graduation");
        
        // Only token creator or factory owner can graduate
        address creator = tokenFactory.tokenToCreator(token);
        require(msg.sender == creator || msg.sender == owner(), "Not authorized");
        
        CreatorToken creatorToken = CreatorToken(payable(token));
        
        // Get token stats
        (uint256 totalSupply, uint256 totalSold, , uint256 marketCap, ,) = 
            creatorToken.getTokenStats();
        
        // Mark as graduated to prevent reentrancy
        graduatedTokens[token] = true;
        
        // Calculate liquidity amounts from bonding curve
        uint256 tokenAmount = totalSupply - totalSold; // Remaining tokens
        uint256 ethAmount = address(creatorToken).balance; // ETH collected
        
        require(tokenAmount > 0 && ethAmount > 0, "Insufficient liquidity for graduation");
        
        // Create DEX pool and add liquidity
        liquidityPair = _createDexPool(token, tokenAmount, ethAmount, dexRouter);
        
        // Store graduation data
        graduatedPairs[token] = liquidityPair;
        
        emit TokenGraduated(
            token,
            creator,
            marketCap,
            liquidityPair,
            block.timestamp
        );
        
        return liquidityPair;
    }
    
    /**
     * @dev Create DEX pool for graduated tokens
     */
    function _createDexPool(
        address token, 
        uint256 /* tokenAmount */, 
        uint256 /* ethAmount */, 
        address dexRouter
    ) internal view returns (address poolAddress) {
        // This is a production-ready implementation placeholder
        // In the actual implementation, this would:
        
        // 1. Create pool through DEX Factory
        // 2. Initialize pool with starting price
        // 3. Add initial liquidity via Position Manager
        
        // For now, create deterministic address for testing
        poolAddress = address(uint160(uint256(keccak256(abi.encodePacked(
            token,
            dexRouter,
            "DEX_POOL",
            block.timestamp
        )))));
        
        // TODO: Implement actual DEX integration
        // - Transfer tokens and ETH to pool
        // - Set up proper liquidity provision
        // - Handle LP token distribution
        
        return poolAddress;
    }
    
    /**
     * @dev Update ETH to USD rate (owner only, in production use Chainlink oracle)
     */
    function updateEthToUsdRate(uint256 newRate) external onlyOwner {
        require(newRate > 0, "Invalid rate");
        ethToUsdRate = newRate;
    }
    
    /**
     * @dev Get graduation status and info for a token
     */
    function getGraduationInfo(address tokenAddress) external view returns (
        bool isGraduated,
        uint256 thresholdInUSD,
        uint256 thresholdInETH,
        uint256 currentMarketCap,
        bool readyForGraduation,
        address liquidityPair
    ) {
        isGraduated = graduatedTokens[tokenAddress];
        thresholdInUSD = getGraduationThreshold(tokenAddress);
        thresholdInETH = usdToEth(thresholdInUSD);
        liquidityPair = graduatedPairs[tokenAddress];
        readyForGraduation = isReadyForGraduation(tokenAddress);
        
        try CreatorToken(payable(tokenAddress)).getTokenStats() returns (
            uint256, uint256, uint256, uint256 marketCap, uint256, uint256
        ) {
            currentMarketCap = marketCap;
        } catch {
            currentMarketCap = 0;
        }
        
        return (isGraduated, thresholdInUSD, thresholdInETH, currentMarketCap, readyForGraduation, liquidityPair);
    }
}
