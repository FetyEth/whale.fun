// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DevProfileManager
 * @dev Manages developer profiles, reputation, and token creation tracking
 */
contract DevProfileManager is Ownable {
    
    // Events
    event DevTokenCreated(address indexed dev, address indexed token, uint256 devTokenCount);
    event DevReputationUpdated(address indexed dev, uint256 oldReputation, uint256 newReputation);
    event DevVerificationStatusChanged(address indexed dev, bool verified, string reason);
    event SuspiciousTokenActivity(address indexed token, address indexed creator, string reason);
    
    // Developer profile structure
    struct DevInfo {
        address dev;
        uint256 tokensCreated;
        uint256 totalValueLocked;
        uint256 successfulGraduations;
        uint256 firstTokenTime;
        bool isVerified;
        string[] pastTokens;    // Track dev's token history
        uint256 reputation;     // 0-100 reputation score
    }
    
    // Storage
    mapping(address => DevInfo) public devProfiles;
    mapping(address => string[]) public devTokenHistory;  // dev => token addresses as strings
    mapping(address => address) public tokenToCreator;
    mapping(address => uint256) public creatorUniqueTokens;
    address[] public uniqueCreators;
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Track a new creator when they create their first token
     */
    function trackCreator(address creator) external {
        if (creatorUniqueTokens[creator] == 0) {
            uniqueCreators.push(creator);
        }
        creatorUniqueTokens[creator]++;
    }
    
    /**
     * @dev Update developer profile when they create a token
     */
    function updateDevProfile(address dev, address tokenAddress) external {
        DevInfo storage devInfo = devProfiles[dev];
        
        if (devInfo.tokensCreated == 0) {
            // First token creation
            devInfo.dev = dev;
            devInfo.firstTokenTime = block.timestamp;
            devInfo.reputation = 50; // Start with neutral reputation
        }
        
        devInfo.tokensCreated++;
        devTokenHistory[dev].push(_addressToString(tokenAddress));
        tokenToCreator[tokenAddress] = dev;
        
        emit DevTokenCreated(dev, tokenAddress, devInfo.tokensCreated);
    }
    
    /**
     * @dev Update developer reputation based on token performance
     */
    function updateDevReputation(address dev, bool successful) public {
        DevInfo storage devInfo = devProfiles[dev];
        uint256 oldReputation = devInfo.reputation;
        
        if (successful) {
            // Increase reputation for successful graduation
            devInfo.reputation = devInfo.reputation + 10 > 100 ? 100 : devInfo.reputation + 10;
            devInfo.successfulGraduations++;
        } else {
            // Decrease reputation for failed/suspicious tokens
            devInfo.reputation = devInfo.reputation > 15 ? devInfo.reputation - 15 : 0;
        }
        
        emit DevReputationUpdated(dev, oldReputation, devInfo.reputation);
    }
    
    /**
     * @dev Flag suspicious activity for a token
     */
    function flagSuspiciousActivity(address tokenAddress, string memory reason) external onlyOwner {
        address creator = tokenToCreator[tokenAddress];
        updateDevReputation(creator, false);
        
        emit SuspiciousTokenActivity(tokenAddress, creator, reason);
    }
    
    /**
     * @dev Verify or unverify a developer
     */
    function verifyDev(address dev, bool verified, string memory reason) external onlyOwner {
        devProfiles[dev].isVerified = verified;
        if (verified) {
            updateDevReputation(dev, true);
        }
        
        emit DevVerificationStatusChanged(dev, verified, reason);
    }
    
    /**
     * @dev Get developer profile information
     */
    function getDevProfile(address dev) external view returns (DevInfo memory) {
        return devProfiles[dev];
    }
    
    /**
     * @dev Get developer's token creation history
     */
    function getDevTokenHistory(address dev) external view returns (string[] memory) {
        return devTokenHistory[dev];
    }
    
    /**
     * @dev Get the creator of a specific token
     */
    function getTokenCreator(address tokenAddress) external view returns (address) {
        return tokenToCreator[tokenAddress];
    }
    
    /**
     * @dev Get list of all unique creators
     */
    function getUniqueCreators() external view returns (address[] memory) {
        return uniqueCreators;
    }
    
    /**
     * @dev Get number of unique tokens created by a creator
     */
    function getCreatorTokenCount(address creator) external view returns (uint256) {
        return creatorUniqueTokens[creator];
    }
    
    /**
     * @dev Convert address to string for storage
     */
    function _addressToString(address addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(addr)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        for (uint256 i = 0; i < 20; i++) {
            str[2+i*2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3+i*2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }
}
