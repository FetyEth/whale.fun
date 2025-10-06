// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title TokenGraduationManager
 * @dev Manages token graduation system with three stages
 */
contract TokenGraduationManager is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    
    // Graduation system
    enum TokenStatus {
        NEWLY_CREATED,      // Stage 1: Sandbox trading only
        ABOUT_TO_GRADUATE,  // Stage 2: Enhanced features unlocked
        GRADUATED           // Stage 3: DEX integration complete
    }
    
    struct GraduationCriteria {
        uint256 minHolders;
        uint256 minVolume;
        uint256 minTrades;
        uint256 minAge;
    }
    
    // Events
    event TokenStatusUpdated(address indexed token, TokenStatus oldStatus, TokenStatus newStatus);
    event TokenGraduated(address indexed token, uint256 timestamp, uint256 finalVolume);
    event GraduationCriteriaUpdated(bool isAboutToGraduate, uint256 holders, uint256 volume, uint256 trades);
    event PoolCreated(address indexed token, address indexed pool, bool indexed isSandbox);
    
    // Storage
    GraduationCriteria public aboutToGraduateCriteria;
    GraduationCriteria public graduatedCriteria;
    
    mapping(address => TokenStatus) public tokenStatus;
    mapping(address => uint256) public tokenLaunchTime;
    mapping(address => uint256) public tokenVolume;
    mapping(address => uint256) public tokenTrades;
    mapping(address => uint256) public tokenHolders;
    
    address public factoryContract;
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(address _factoryContract) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        
        factoryContract = _factoryContract;
        
        // Set default graduation criteria
        aboutToGraduateCriteria = GraduationCriteria({
            minHolders: 15,
            minVolume: 2.5 ether,
            minTrades: 100,
            minAge: 24 hours
        });
        
        graduatedCriteria = GraduationCriteria({
            minHolders: 30,
            minVolume: 5 ether,
            minTrades: 200,
            minAge: 72 hours
        });
    }
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    modifier onlyFactory() {
        require(msg.sender == factoryContract, "Only factory can call");
        _;
    }
    
    /**
     * @dev Initialize token graduation tracking
     */
    function initializeToken(address token) external onlyFactory {
        tokenStatus[token] = TokenStatus.NEWLY_CREATED;
        tokenLaunchTime[token] = block.timestamp;
        tokenVolume[token] = 0;
        tokenTrades[token] = 0;
        tokenHolders[token] = 0;
    }
    
    /**
     * @dev Update token metrics and check graduation eligibility
     */
    function updateTokenMetrics(
        address token,
        uint256 holders,
        uint256 volume,
        uint256 trades
    ) external onlyFactory {
        tokenHolders[token] = holders;
        tokenVolume[token] = volume;
        tokenTrades[token] = trades;
        
        _checkGraduationEligibility(token);
    }
    
    /**
     * @dev Check and update graduation status
     */
    function _checkGraduationEligibility(address token) internal {
        TokenStatus currentStatus = tokenStatus[token];
        uint256 tokenAge = block.timestamp - tokenLaunchTime[token];
        uint256 holders = tokenHolders[token];
        uint256 volume = tokenVolume[token];
        uint256 trades = tokenTrades[token];
        
        if (currentStatus == TokenStatus.NEWLY_CREATED) {
            // Check for About to Graduate
            if (holders >= aboutToGraduateCriteria.minHolders &&
                volume >= aboutToGraduateCriteria.minVolume &&
                trades >= aboutToGraduateCriteria.minTrades &&
                tokenAge >= aboutToGraduateCriteria.minAge) {
                
                _updateTokenStatus(token, TokenStatus.ABOUT_TO_GRADUATE);
            }
        } else if (currentStatus == TokenStatus.ABOUT_TO_GRADUATE) {
            // Check for Graduated
            if (holders >= graduatedCriteria.minHolders &&
                volume >= graduatedCriteria.minVolume &&
                trades >= graduatedCriteria.minTrades &&
                tokenAge >= graduatedCriteria.minAge) {
                
                _updateTokenStatus(token, TokenStatus.GRADUATED);
                _initiateLiquidityMigration(token);
            }
        }
    }
    
    /**
     * @dev Update token status and emit events
     */
    function _updateTokenStatus(address token, TokenStatus newStatus) internal {
        TokenStatus oldStatus = tokenStatus[token];
        tokenStatus[token] = newStatus;
        
        emit TokenStatusUpdated(token, oldStatus, newStatus);
        
        if (newStatus == TokenStatus.GRADUATED) {
            emit TokenGraduated(token, block.timestamp, tokenVolume[token]);
        }
    }
    
    /**
     * @dev Initiate liquidity migration to DEX
     */
    function _initiateLiquidityMigration(address token) internal {
        // TODO: Implement automatic liquidity migration to Uniswap V2
        // This would involve:
        // 1. Calculate bonding curve liquidity
        // 2. Create Uniswap pair
        // 3. Add liquidity
        // 4. Burn LP tokens
        // 5. Disable bonding curve trading
        
        // For now, just emit an event
        emit PoolCreated(token, address(0), false);
    }
    
    /**
     * @dev Get token graduation info
     */
    function getTokenGraduationInfo(address token) external view returns (
        TokenStatus status,
        uint256 age,
        uint256 holders,
        uint256 volume,
        uint256 trades,
        bool canGraduateNext
    ) {
        status = tokenStatus[token];
        age = block.timestamp - tokenLaunchTime[token];
        holders = tokenHolders[token];
        volume = tokenVolume[token];
        trades = tokenTrades[token];
        
        if (status == TokenStatus.NEWLY_CREATED) {
            canGraduateNext = (holders >= aboutToGraduateCriteria.minHolders &&
                             volume >= aboutToGraduateCriteria.minVolume &&
                             trades >= aboutToGraduateCriteria.minTrades &&
                             age >= aboutToGraduateCriteria.minAge);
        } else if (status == TokenStatus.ABOUT_TO_GRADUATE) {
            canGraduateNext = (holders >= graduatedCriteria.minHolders &&
                             volume >= graduatedCriteria.minVolume &&
                             trades >= graduatedCriteria.minTrades &&
                             age >= graduatedCriteria.minAge);
        } else {
            canGraduateNext = false; // Already graduated
        }
    }
    
    /**
     * @dev Set graduation criteria (admin only)
     */
    function setGraduationCriteria(
        bool isAboutToGraduate,
        uint256 minHolders,
        uint256 minVolume,
        uint256 minTrades,
        uint256 minAge
    ) external onlyOwner {
        if (isAboutToGraduate) {
            aboutToGraduateCriteria = GraduationCriteria({
                minHolders: minHolders,
                minVolume: minVolume,
                minTrades: minTrades,
                minAge: minAge
            });
        } else {
            graduatedCriteria = GraduationCriteria({
                minHolders: minHolders,
                minVolume: minVolume,
                minTrades: minTrades,
                minAge: minAge
            });
        }
        
        emit GraduationCriteriaUpdated(isAboutToGraduate, minHolders, minVolume, minTrades);
    }
    
    /**
     * @dev Update factory contract address
     */
    function updateFactoryContract(address newFactory) external onlyOwner {
        factoryContract = newFactory;
    }
}
