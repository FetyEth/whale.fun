// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/ITokenFactory.sol";
import "./CreatorToken.sol";
import "./DevProfileManager.sol";
import "./TokenGraduationManager.sol";
import "./StreamingManager.sol";
import "./GovernanceManager.sol";
import "./libraries/FactoryUtils.sol";

/**
 * @title TokenFactoryCore
 * @dev Core factory contract for creating and managing tokens with modular architecture
 */
contract TokenFactoryCore is 
    Initializable, 
    ReentrancyGuardUpgradeable, 
    OwnableUpgradeable, 
    UUPSUpgradeable, 
    ITokenFactory {
    
    using FactoryUtils for mapping(address => uint256);
    
    event LaunchFeeUpdated(uint256 indexed oldFee, uint256 indexed newFee);
    event PoolCreated(address indexed token, address indexed pool, bool indexed isSandbox);
    event EmergencyPaused(address indexed admin);
    event EmergencyUnpaused(address indexed admin);
    
    address public whaleToken;
    DevProfileManager public devProfileManager;
    TokenGraduationManager public graduationManager;
    StreamingManager public streamingManager;
    GovernanceManager public governanceManager;
    
    address[] public allTokens;
    mapping(address => address[]) public creatorTokens;
    mapping(address => bool) public override isValidToken;
    
    uint256 public constant LAUNCH_FEE = 0.1 ether;
    uint256 public maxTokensPerCreator = 10;
    
    uint256 public totalTokensCreated;
    uint256 public totalFeesCollected;
    
    mapping(address => uint256) public creatorTokenCount;
    mapping(address => uint256) public lastTokenCreation;
    
    bool public emergencyPaused;
        
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(
        address _whaleToken,
        address _devProfileManager,
        address _graduationManager,
        address payable _streamingManager,
        address _governanceManager
    ) public initializer {
        __ReentrancyGuard_init();
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        
        whaleToken = _whaleToken;
        devProfileManager = DevProfileManager(_devProfileManager);
        graduationManager = TokenGraduationManager(_graduationManager);
        streamingManager = StreamingManager(_streamingManager);
        governanceManager = GovernanceManager(_governanceManager);
        
        emergencyPaused = false;
    }
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    modifier whenNotEmergencyPaused() {
        require(!emergencyPaused, "Paused");
        _;
    }
    
    /**
     * @dev Create a new token with basic parameters
     */
    function createToken(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        uint256 initialPrice,
        uint256 /* creatorFeePercent */,
        string memory description,
        string memory logoUrl
    ) external payable whenNotEmergencyPaused override returns (address) {
        require(msg.value >= LAUNCH_FEE, "Fee");
        FactoryUtils.validateTokenParams(totalSupply, initialPrice, name, symbol, description, logoUrl);
        FactoryUtils.checkRateLimit(lastTokenCreation, creatorTokenCount, msg.sender, maxTokensPerCreator);
        
        CreatorToken newToken = new CreatorToken(
            name, symbol, totalSupply, initialPrice, msg.sender, whaleToken,
            0, description, logoUrl, 0, 0
        );
        
        address tokenAddress = address(newToken);
        allTokens.push(tokenAddress);
        creatorTokens[msg.sender].push(tokenAddress);
        isValidToken[tokenAddress] = true;
        totalTokensCreated++;
        FactoryUtils.updateCreatorTracking(creatorTokenCount, lastTokenCreation, msg.sender);
        
        devProfileManager.trackCreator(msg.sender);
        devProfileManager.updateDevProfile(msg.sender, tokenAddress);
        graduationManager.initializeToken(tokenAddress);
        
        totalFeesCollected += LAUNCH_FEE;
        if (msg.value > LAUNCH_FEE) {
            payable(msg.sender).transfer(msg.value - LAUNCH_FEE);
        }
        
        emit TokenCreated(tokenAddress, msg.sender, name, symbol, totalSupply, block.timestamp);
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
        return (totalTokensCreated, 0, totalFeesCollected, LAUNCH_FEE);
    }
    
    function tokenToCreator(address token) external view override returns (address) {
        return devProfileManager.getTokenCreator(token);
    }
      
    function updateTokenMetrics(address token, uint256 holders, uint256 volume, uint256 trades) external {
        require(isValidToken[token], "Token");
        graduationManager.updateTokenMetrics(token, holders, volume, trades);
    }
    
    function getTokenGraduationInfo(address token) external view returns (
        TokenGraduationManager.TokenStatus status,
        uint256 age,
        uint256 holders,
        uint256 volume,
        uint256 trades,
        bool canGraduateNext
    ) {
        return graduationManager.getTokenGraduationInfo(token);
    }
    
    function emergencyPause() external onlyOwner {
        emergencyPaused = true;
        emit EmergencyPaused(msg.sender);
    }
    
    function emergencyUnpause() external onlyOwner {
        emergencyPaused = false;
        emit EmergencyUnpaused(msg.sender);
    }
    
    function setMaxTokensPerCreator(uint256 newMax) external onlyOwner {
        require(newMax > 0 && newMax <= 20, "Max");
        maxTokensPerCreator = newMax;
    }
    
    function withdrawFees() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
        
    receive() external payable {}
}
