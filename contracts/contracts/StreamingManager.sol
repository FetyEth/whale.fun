// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title StreamingManager
 * @dev Manages live streaming integration with Huddle01 and whale alerts
 */
contract StreamingManager is 
    Initializable, 
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable, 
    UUPSUpgradeable 
{
    
    // Events
    event StreamStarted(address indexed creator, address indexed token, string roomId, uint256 timestamp);
    event StreamEnded(address indexed creator, address indexed token, uint256 duration, uint256 totalEngagement);
    event WhaleAlert(address indexed token, address indexed trader, uint256 amount, bool isBuy, uint256 timestamp);
    event CommunityEngagement(address indexed token, address indexed user, string action, uint256 timestamp);
    event StreamRewardsDistributed(address indexed creator, uint256 amount);
    
    // Streaming structures
    struct StreamSession {
        address creator;
        address token;
        string roomId;
        uint256 startTime;
        uint256 endTime;
        uint256 viewerCount;
        uint256 totalEngagement;
        uint256 rewardsEarned;
        bool isActive;
    }
    
    struct WhaleTransaction {
        address trader;
        address token;
        uint256 amount;
        bool isBuy;
        uint256 timestamp;
        uint256 priceImpact;
    }
    
    // Storage
    mapping(address => StreamSession) public activeStreams; // token => stream session
    mapping(address => bool) public isStreamingEligible; // token => eligibility
    mapping(address => WhaleTransaction[]) public whaleHistory; // token => whale transactions
    
    // Configuration
    uint256 public constant MIN_HOLDERS_FOR_STREAMING = 10;
    uint256 public constant MIN_VOLUME_FOR_STREAMING = 1 ether;
    uint256 public constant WHALE_THRESHOLD = 0.1 ether;
    uint256 public constant STREAM_REWARD_MULTIPLIER = 150; // 1.5x rewards
    
    address public huddle01Integration;
    address public factoryContract;
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(
        address _factoryContract,
        address _huddle01Integration
    ) public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        factoryContract = _factoryContract;
        huddle01Integration = _huddle01Integration;
    }
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    modifier onlyFactory() {
        require(msg.sender == factoryContract, "Only factory can call");
        _;
    }
    
    /**
     * @dev Start a live stream for a token
     */
    function startStream(address token, string memory roomId) external nonReentrant {
        require(isStreamingEligible[token], "Token not eligible for streaming");
        require(!activeStreams[token].isActive, "Stream already active");
        require(bytes(roomId).length > 0, "Invalid room ID");
        
        StreamSession storage session = activeStreams[token];
        session.creator = msg.sender;
        session.token = token;
        session.roomId = roomId;
        session.startTime = block.timestamp;
        session.isActive = true;
        session.viewerCount = 0;
        session.totalEngagement = 0;
        session.rewardsEarned = 0;
        
        emit StreamStarted(msg.sender, token, roomId, block.timestamp);
    }
    
    /**
     * @dev End a live stream
     */
    function endStream(address token) external nonReentrant {
        StreamSession storage session = activeStreams[token];
        require(session.isActive, "No active stream");
        require(session.creator == msg.sender || msg.sender == owner(), "Not authorized");
        
        uint256 duration = block.timestamp - session.startTime;
        session.endTime = block.timestamp;
        session.isActive = false;
        
        emit StreamEnded(session.creator, token, duration, session.totalEngagement);
    }
    
    /**
     * @dev Record whale transaction for alerts
     */
    function recordWhaleTransaction(
        address token,
        address trader,
        uint256 amount,
        bool isBuy,
        uint256 priceImpact
    ) external onlyFactory {
        require(amount >= WHALE_THRESHOLD, "Below whale threshold");
        
        WhaleTransaction memory whale = WhaleTransaction({
            trader: trader,
            token: token,
            amount: amount,
            isBuy: isBuy,
            timestamp: block.timestamp,
            priceImpact: priceImpact
        });
        
        whaleHistory[token].push(whale);
        emit WhaleAlert(token, trader, amount, isBuy, block.timestamp);
    }
    
    /**
     * @dev Record community engagement during stream
     */
    function recordEngagement(address token, address user, string memory action) external {
        require(activeStreams[token].isActive, "No active stream");
        
        StreamSession storage session = activeStreams[token];
        session.totalEngagement++;
        
        emit CommunityEngagement(token, user, action, block.timestamp);
    }
    
    /**
     * @dev Set streaming eligibility for token
     */
    function setStreamingEligibility(address token, bool eligible) external onlyFactory {
        isStreamingEligible[token] = eligible;
    }
    
    /**
     * @dev Get active stream info
     */
    function getActiveStream(address token) external view returns (
        address creator,
        string memory roomId,
        uint256 startTime,
        uint256 viewerCount,
        uint256 totalEngagement,
        bool isActive
    ) {
        StreamSession storage session = activeStreams[token];
        return (
            session.creator,
            session.roomId,
            session.startTime,
            session.viewerCount,
            session.totalEngagement,
            session.isActive
        );
    }
    
    /**
     * @dev Get whale transaction history for token
     */
    function getWhaleHistory(address token) external view returns (WhaleTransaction[] memory) {
        return whaleHistory[token];
    }
    
    /**
     * @dev Update Huddle01 integration address
     */
    function updateHuddle01Integration(address newIntegration) external onlyOwner {
        huddle01Integration = newIntegration;
    }
    
    /**
     * @dev Update factory contract address
     */
    function updateFactoryContract(address newFactory) external onlyOwner {
        factoryContract = newFactory;
    }
    
    /**
     * @dev Emergency pause streaming
     */
    function emergencyPauseStreaming(address token) external onlyOwner {
        if (activeStreams[token].isActive) {
            activeStreams[token].isActive = false;
            emit StreamEnded(activeStreams[token].creator, token, 0, 0);
        }
    }
    
    receive() external payable {
        // Accept ETH for streaming rewards
    }
}
