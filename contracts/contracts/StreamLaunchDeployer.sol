// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IStreamLaunch.sol";
import "./interfaces/IWhaleToken.sol";
import "./libraries/BondingCurveLibrary.sol";

// Interfaces for additional contracts not in main interfaces
interface IMultiSigWallet {
    function initialize(address[] memory owners, uint256 required) external;
}

interface ITimeLockController {
    function initialize(uint256 delay) external;
}

interface IGovernanceController {
    function initialize(address whaleToken, address timelock) external;
}

/**
 * @title StreamLaunchDeployer
 * @dev Complete deployment script for the whale.fun ecosystem using minimal imports
 */
contract StreamLaunchDeployer {
    // Deployed contract addresses (using interfaces instead of concrete contracts)
    IWhaleToken public whaleToken;
    ITokenFactory public tokenFactory;
    ITradingEngine public tradingEngine;
    IBossBattleArena public bossBattleArena;
    IMultiSigWallet public multiSigWallet;
    ITimeLockController public timeLockController;
    IGovernanceController public governanceController;
    ISecurityController public securityController;
    
    // Deployment parameters
    address public immutable deployer;
    uint256 public constant INITIAL_WHALE_SUPPLY = 1000000000 * 10**18; // 1 billion
    uint256 public constant TIMELOCK_DELAY = 2 days;
    
    // Contract bytecode hashes for deployment verification
    bytes32 public constant WHALE_TOKEN_HASH = keccak256("WhaleToken");
    bytes32 public constant TOKEN_FACTORY_HASH = keccak256("TokenFactory");
    
    // Multi-sig configuration
    address[] public multiSigOwners;
    uint256 public constant REQUIRED_CONFIRMATIONS = 3;
    
    // Pre-deployed contract addresses (can be set if contracts are deployed separately)
    mapping(string => address) public preDeployedContracts;
    
    event SystemDeployed(
        address whaleToken,
        address tokenFactory,
        address tradingEngine,
        address bossBattleArena,
        uint256 timestamp
    );
    
    event AdvancedConfigurationCompleted(uint256 timestamp);
    
    constructor(address[] memory _multiSigOwners) {
        require(_multiSigOwners.length >= 3, "Need at least 3 multi-sig owners");
        require(_multiSigOwners.length <= 10, "Too many multi-sig owners");
        
        deployer = msg.sender;
        
        for (uint i = 0; i < _multiSigOwners.length; i++) {
            require(_multiSigOwners[i] != address(0), "Invalid owner");
            multiSigOwners.push(_multiSigOwners[i]);
        }
    }
    
    function setPreDeployedContract(string memory name, address contractAddress) external {
        require(msg.sender == deployer, "Only deployer");
        require(contractAddress != address(0), "Invalid address");
        preDeployedContracts[name] = contractAddress;
    }
    
    function getPreDeployedContract(string memory name) external view returns (address) {
        return preDeployedContracts[name];
    }
    
    /**
     * @dev Deploy the complete StreamLaunch ecosystem using pre-deployed contracts
     */
    function deploySystem() external returns (address[] memory deployedContracts) {
        require(msg.sender == deployer, "Only deployer");
        
        deployedContracts = new address[](8);
        
        // Use pre-deployed contracts to reduce size
        address _whaleToken = preDeployedContracts["WhaleToken"];
        address _tokenFactory = preDeployedContracts["TokenFactory"];
        address _tradingEngine = preDeployedContracts["TradingEngine"];
        address _battleArena = preDeployedContracts["BossBattleArena"];
        address _multiSig = preDeployedContracts["MultiSig"];
        address _timeLock = preDeployedContracts["TimeLock"];
        address _securityController = preDeployedContracts["SecurityController"];
        address _governance = preDeployedContracts["Governance"];
        
        // Verify all contracts are deployed
        require(_whaleToken != address(0), "WhaleToken not deployed");
        require(_tokenFactory != address(0), "TokenFactory not deployed");
        require(_tradingEngine != address(0), "TradingEngine not deployed");
        require(_battleArena != address(0), "BossBattleArena not deployed");
        require(_multiSig != address(0), "MultiSig not deployed");
        require(_timeLock != address(0), "TimeLock not deployed");
        require(_securityController != address(0), "SecurityController not deployed");
        require(_governance != address(0), "Governance not deployed");
        
        // Assign to storage variables
        whaleToken = IWhaleToken(_whaleToken);
        tokenFactory = ITokenFactory(_tokenFactory);
        tradingEngine = ITradingEngine(_tradingEngine);
        bossBattleArena = IBossBattleArena(_battleArena);
        multiSigWallet = IMultiSigWallet(_multiSig);
        timeLockController = ITimeLockController(_timeLock);
        securityController = ISecurityController(_securityController);
        governanceController = IGovernanceController(_governance);
        
        deployedContracts[0] = _whaleToken;
        deployedContracts[1] = _multiSig;
        deployedContracts[2] = _timeLock;
        deployedContracts[3] = _securityController;
        deployedContracts[4] = _tokenFactory;
        deployedContracts[5] = _tradingEngine;
        deployedContracts[6] = _battleArena;
        deployedContracts[7] = _governance;
        
        // Configure system permissions and integrations
        _configureSystem();
        
        emit SystemDeployed(
            _whaleToken,
            _tokenFactory,
            _tradingEngine,
            _battleArena,
            block.timestamp
        );
        
        return deployedContracts;
    }
    
    /**
     * @dev Configure system permissions and integrations
     */
    function _configureSystem() internal {
        // Note: Configuration calls depend on interfaces having these methods
        // Some calls may need to be done through separate admin functions
        
        // Basic transfer for initial distribution
        // These require standard ERC20 transfer methods in interfaces
        uint256 treasuryAmount = INITIAL_WHALE_SUPPLY * 30 / 100; // 30% to treasury
        uint256 rewardsAmount = INITIAL_WHALE_SUPPLY * 20 / 100;  // 20% to rewards
        uint256 liquidityAmount = INITIAL_WHALE_SUPPLY * 25 / 100; // 25% for liquidity
        // 25% remains with deployer for team and advisors
        
        // Standard ERC20 transfers should be available through IWhaleToken
        whaleToken.transfer(address(multiSigWallet), treasuryAmount);
        whaleToken.transfer(address(bossBattleArena), rewardsAmount);
        whaleToken.transfer(address(tradingEngine), liquidityAmount);
        
        // Advanced configuration may need to be done separately
        // after deployment through admin functions if not in interfaces
    }
    
    /**
     * @dev Advanced configuration function to be called after deployment
     * This function contains calls that might require admin privileges
     */
    function configureAdvancedSettings() external {
        require(msg.sender == deployer, "Only deployer");
        require(address(whaleToken) != address(0), "System not deployed");
        
        // These calls may require admin functions to be added to interfaces
        // or can be done through direct contract calls if needed
        
        // Example: Bridge authorizations (if available in IWhaleToken)
        // whaleToken.setBridgeAuthorization(address(tradingEngine), true);
        // whaleToken.setBridgeAuthorization(address(bossBattleArena), true);
        
        // Example: Contract authorizations (if available in ISecurityController)
        // securityController.authorizeContract(address(tokenFactory));
        // securityController.authorizeContract(address(tradingEngine));
        // securityController.authorizeContract(address(bossBattleArena));
        
        // Example: Ownership transfers (if available in interfaces)
        // whaleToken.transferOwnership(address(timeLockController));
        // tokenFactory.transferOwnership(address(timeLockController));
        // tradingEngine.transferOwnership(address(timeLockController));
        // securityController.transferOwnership(address(timeLockController));
        
        emit AdvancedConfigurationCompleted(block.timestamp);
    }
    
    /**
     * @dev Get all deployed contract addresses
     */
    function getDeployedContracts() external view returns (
        address _whaleToken,
        address _tokenFactory,
        address _tradingEngine,
        address _bossBattleArena,
        address _multiSigWallet,
        address _timeLockController,
        address _governanceController,
        address _securityController
    ) {
        return (
            address(whaleToken),
            address(tokenFactory),
            address(tradingEngine),
            address(bossBattleArena),
            address(multiSigWallet),
            address(timeLockController),
            address(governanceController),
            address(securityController)
        );
    }
    
    /**
     * @dev Emergency function to pause the entire system
     */
    function emergencyPause() external {
        require(msg.sender == deployer, "Only deployer");
        securityController.activateEmergencyPause();
    }
}

/**
 * @title StreamLaunchRegistry
 * @dev Registry contract for tracking all deployed tokens and system state
 */
contract StreamLaunchRegistry {
    // System contracts
    address public whaleToken;
    address public tokenFactory;
    address public tradingEngine;
    address public bossBattleArena;
    address public securityController;
    
    // Token registry
    mapping(address => bool) public isRegisteredToken;
    mapping(address => TokenInfo) public tokenInfo;
    address[] public allRegisteredTokens;
    
    // Creator registry
    mapping(address => CreatorProfile) public creatorProfiles;
    mapping(address => bool) public isVerifiedCreator;
    
    struct TokenInfo {
        address tokenAddress;
        address creator;
        string name;
        string symbol;
        uint256 launchTime;
        uint256 initialMarketCap;
        BondingCurveLibrary.CurveType curveType;
        bool isActive;
        uint256 totalVolume;
        uint256 holderCount;
    }
    
    struct CreatorProfile {
        string name;
        string description;
        string socialLinks;
        uint256 tokensCreated;
        uint256 totalVolume;
        uint256 reputation;
        bool isVerified;
        uint256 joinDate;
    }
    
    // Events
    event TokenRegistered(address indexed token, address indexed creator, string name);
    event CreatorVerified(address indexed creator, string name);
    event SystemContractUpdated(string contractType, address oldAddress, address newAddress);
    
    modifier onlySystemContract() {
        require(
            msg.sender == tokenFactory ||
            msg.sender == tradingEngine ||
            msg.sender == bossBattleArena,
            "Only system contracts can call this"
        );
        _;
    }
    
    /**
     * @dev Initialize registry with system contracts
     */
    function initialize(
        address _whaleToken,
        address _tokenFactory,
        address _tradingEngine,
        address _bossBattleArena,
        address _securityController
    ) external {
        require(whaleToken == address(0), "Already init");
        
        whaleToken = _whaleToken;
        tokenFactory = _tokenFactory;
        tradingEngine = _tradingEngine;
        bossBattleArena = _bossBattleArena;
        securityController = _securityController;
    }
    
    /**
     * @dev Register a new token (called by TokenFactory)
     */
    function registerToken(
        address token,
        address creator,
        string memory name,
        string memory symbol,
        uint256 initialMarketCap,
        BondingCurveLibrary.CurveType curveType
    ) external onlySystemContract {
        require(!isRegisteredToken[token], "Token exists");
        
        tokenInfo[token] = TokenInfo({
            tokenAddress: token,
            creator: creator,
            name: name,
            symbol: symbol,
            launchTime: block.timestamp,
            initialMarketCap: initialMarketCap,
            curveType: curveType,
            isActive: true,
            totalVolume: 0,
            holderCount: 0
        });
        
        isRegisteredToken[token] = true;
        allRegisteredTokens.push(token);
        
        // Update creator profile
        CreatorProfile storage profile = creatorProfiles[creator];
        if (profile.joinDate == 0) {
            profile.joinDate = block.timestamp;
        }
        profile.tokensCreated++;
        
        emit TokenRegistered(token, creator, name);
    }
    
    /**
     * @dev Update token statistics (called by system contracts)
     */
    function updateTokenStats(
        address token,
        uint256 volume,
        uint256 holders
    ) external onlySystemContract {
        require(isRegisteredToken[token], "Token invalid");
        
        TokenInfo storage info = tokenInfo[token];
        info.totalVolume += volume;
        info.holderCount = holders;
        
        // Update creator stats
        creatorProfiles[info.creator].totalVolume += volume;
    }
    
    /**
     * @dev Verify a creator (admin function)
     */
    function verifyCreator(
        address creator,
        string memory name,
        string memory description,
        string memory socialLinks
    ) external {
        require(msg.sender == securityController, "Only security");
        
        CreatorProfile storage profile = creatorProfiles[creator];
        profile.name = name;
        profile.description = description;
        profile.socialLinks = socialLinks;
        profile.isVerified = true;
        profile.reputation = 100; // Start with 100 reputation
        
        isVerifiedCreator[creator] = true;
        
        emit CreatorVerified(creator, name);
    }
    
    /**
     * @dev Get token statistics
     */
    function getTokenStats(address token) external view returns (
        string memory name,
        string memory symbol,
        address creator,
        uint256 launchTime,
        uint256 totalVolume,
        uint256 holderCount,
        bool isActive
    ) {
        require(isRegisteredToken[token], "Token invalid");
        
        TokenInfo memory info = tokenInfo[token];
        return (
            info.name,
            info.symbol,
            info.creator,
            info.launchTime,
            info.totalVolume,
            info.holderCount,
            info.isActive
        );
    }
    
    /**
     * @dev Get creator profile
     */
    function getCreatorProfile(address creator) external view returns (
        string memory name,
        string memory description,
        uint256 tokensCreated,
        uint256 totalVolume,
        uint256 reputation,
        bool isVerified
    ) {
        CreatorProfile memory profile = creatorProfiles[creator];
        return (
            profile.name,
            profile.description,
            profile.tokensCreated,
            profile.totalVolume,
            profile.reputation,
            profile.isVerified
        );
    }
    
    /**
     * @dev Get all registered tokens
     */
    function getAllTokens() external view returns (address[] memory) {
        return allRegisteredTokens;
    }
    
    /**
     * @dev Get platform statistics
     */
    function getPlatformStats() external view returns (
        uint256 totalTokens,
        uint256 totalCreators,
        uint256 totalVolume,
        uint256 verifiedCreators
    ) {
        totalTokens = allRegisteredTokens.length;
        
        // Count unique creators and calculate totals
        address[] memory uniqueCreators = new address[](totalTokens);
        uint256 creatorCount = 0;
        uint256 verifiedCount = 0;
        uint256 platformVolume = 0;
        
        for (uint256 i = 0; i < totalTokens; i++) {
            address creator = tokenInfo[allRegisteredTokens[i]].creator;
            platformVolume += tokenInfo[allRegisteredTokens[i]].totalVolume;
            
            // Check if creator is already counted
            bool found = false;
            for (uint256 j = 0; j < creatorCount; j++) {
                if (uniqueCreators[j] == creator) {
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                uniqueCreators[creatorCount] = creator;
                creatorCount++;
                
                if (isVerifiedCreator[creator]) {
                    verifiedCount++;
                }
            }
        }
        
        return (totalTokens, creatorCount, platformVolume, verifiedCount);
    }
}