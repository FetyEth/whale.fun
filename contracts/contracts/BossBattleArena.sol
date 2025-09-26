// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IWhaleToken.sol";
import "./interfaces/IStreamLaunch.sol";

/**
 * @title BossBattleArena
 * @dev Gamified token competition system with daily battles and rewards
 */
contract BossBattleArena is ReentrancyGuard, Ownable {
    IWhaleToken public whaleToken;
    ITradingEngine public tradingEngine;
    
    // Battle structure
    struct Battle {
        uint256 battleId;
        uint256 startTime;
        uint256 endTime;
        address[] participants;
        address winner;
        uint256 prizePool;
        bool isActive;
        BattleType battleType;
    }
    
    enum BattleType {
        TRADING_VOLUME,
        HOLDER_GROWTH,
        COMMUNITY_ENGAGEMENT,
        MIXED_METRICS
    }
    
    // Token metrics for battles
    struct TokenMetrics {
        uint256 tradingVolume;
        uint256 holderCount;
        uint256 communityScore;
        uint256 liquidityDepth;
        uint256 priceStability;
        uint256 lastUpdated;
    }
    
    // Battle results and scoring
    struct BattleScore {
        address token;
        uint256 volumeScore;
        uint256 holderScore;
        uint256 communityScore;
        uint256 totalScore;
        uint256 rank;
    }
    
    // Achievement system
    struct Achievement {
        string name;
        string description;
        uint256 requirement;
        uint256 reward;
        bool isActive;
    }
    
    // User progress tracking
    struct UserProgress {
        uint256 battlesWon;
        uint256 battlesParticipated;
        uint256 totalRewardsEarned;
        uint256 achievementPoints;
        mapping(uint256 => bool) unlockedAchievements;
        mapping(uint256 => uint256) battleParticipation;
    }
    
    // State variables
    mapping(uint256 => Battle) public battles;
    mapping(address => TokenMetrics) public tokenMetrics;
    mapping(uint256 => BattleScore[]) public battleResults;
    mapping(address => UserProgress) public userProgress;
    mapping(uint256 => Achievement) public achievements;
    
    uint256 public currentBattleId;
    uint256 public dailyBattleReward = 10000 * 10**18; // 10,000 WHALE tokens
    uint256 public constant BATTLE_DURATION = 24 hours;
    uint256 public constant MIN_PARTICIPANTS = 3;
    uint256 public constant MAX_PARTICIPANTS = 50;
    
    // Treasury and rewards
    address public treasuryAddress;
    uint256 public treasuryBalance;
    uint256 public totalRewardsDistributed;
    
    // Enhanced creator tracking system
    mapping(address => address) public tokenToCreator;
    mapping(address => bool) public registeredCreators;
    address[] public allCreators;
    
    // Events
    event BattleStarted(
        uint256 indexed battleId,
        BattleType battleType,
        uint256 startTime,
        uint256 prizePool
    );
    
    event BattleEnded(
        uint256 indexed battleId,
        address indexed winner,
        uint256 prizePool,
        uint256 participantCount
    );
    
    event TokenRegistered(
        address indexed token,
        address indexed creator,
        uint256 timestamp
    );
    
    event AchievementUnlocked(
        address indexed user,
        uint256 indexed achievementId,
        uint256 reward
    );
    
    event MetricsUpdated(
        address indexed token,
        uint256 volume,
        uint256 holders,
        uint256 communityScore
    );
    
    event RewardDistributed(
        address indexed creator,
        address indexed token, 
        uint256 reward,
        uint256 rank
    );
    
    constructor(
        address _whaleToken,
        address _tradingEngine,
        address _treasury
    ) Ownable(msg.sender) {
        whaleToken = IWhaleToken(_whaleToken);
        tradingEngine = ITradingEngine(_tradingEngine);
        treasuryAddress = _treasury;
        
        // Initialize achievements
        initializeAchievements();
        
        // Start first battle
        startNewBattle(BattleType.MIXED_METRICS);
    }
    
    /**
     * @dev Initialize achievement system
     */
    function initializeAchievements() internal {
        achievements[1] = Achievement({
            name: "First Victory",
            description: "Win your first battle",
            requirement: 1,
            reward: 1000 * 10**18,
            isActive: true
        });
        
        achievements[2] = Achievement({
            name: "Volume King",
            description: "Generate 1M+ in trading volume",
            requirement: 1000000 * 10**18,
            reward: 5000 * 10**18,
            isActive: true
        });
        
        achievements[3] = Achievement({
            name: "Community Builder",
            description: "Reach 1000+ token holders",
            requirement: 1000,
            reward: 3000 * 10**18,
            isActive: true
        });
        
        achievements[4] = Achievement({
            name: "Battle Master",
            description: "Win 10 battles",
            requirement: 10,
            reward: 10000 * 10**18,
            isActive: true
        });
        
        achievements[5] = Achievement({
            name: "Whale Slayer",
            description: "Defeat a top 10 token in battle",
            requirement: 1,
            reward: 15000 * 10**18,
            isActive: true
        });
    }
    
    /**
     * @dev Start a new battle
     */
    function startNewBattle(BattleType battleType) public onlyOwner {
        require(!battles[currentBattleId].isActive, "Current battle still active");
        
        currentBattleId++;
        
        battles[currentBattleId] = Battle({
            battleId: currentBattleId,
            startTime: block.timestamp,
            endTime: block.timestamp + BATTLE_DURATION,
            participants: new address[](0),
            winner: address(0),
            prizePool: dailyBattleReward,
            isActive: true,
            battleType: battleType
        });
        
        emit BattleStarted(currentBattleId, battleType, block.timestamp, dailyBattleReward);
    }
    
    /**
     * @dev Register token for current battle
     */
    function registerForBattle(address token) external nonReentrant {
        Battle storage battle = battles[currentBattleId];
        require(battle.isActive, "No active battle");
        require(block.timestamp < battle.endTime, "Battle ended");
        require(battle.participants.length < MAX_PARTICIPANTS, "Battle full");
        
        // Check if token already registered
        for (uint256 i = 0; i < battle.participants.length; i++) {
            require(battle.participants[i] != token, "Already registered");
        }
        
        // Require minimum metrics to participate
        require(tokenMetrics[token].tradingVolume > 0, "No trading volume");
        require(tokenMetrics[token].holderCount >= 10, "Minimum 10 holders required");
        
        battle.participants.push(token);
        userProgress[msg.sender].battleParticipation[currentBattleId]++;
        
        emit TokenRegistered(token, msg.sender, block.timestamp);
    }
    
    /**
     * @dev End current battle and determine winner
     */
    function endBattle() external nonReentrant {
        Battle storage battle = battles[currentBattleId];
        require(battle.isActive, "Battle not active");
        require(block.timestamp >= battle.endTime, "Battle not finished");
        require(battle.participants.length >= MIN_PARTICIPANTS, "Not enough participants");
        
        // Calculate scores for all participants
        BattleScore[] storage scores = battleResults[currentBattleId];
        
        for (uint256 i = 0; i < battle.participants.length; i++) {
            address token = battle.participants[i];
            TokenMetrics memory metrics = tokenMetrics[token];
            
            BattleScore memory score = calculateBattleScore(token, metrics, battle.battleType);
            scores.push(score);
        }
        
        // Sort scores and determine winner
        sortBattleScores(currentBattleId);
        address winner = scores[0].token;
        
        battle.winner = winner;
        battle.isActive = false;
        
        // Distribute rewards
        distributeRewards(currentBattleId);
        
        // Update user progress for winner
        address winnerCreator = getTokenCreator(winner);
        if (winnerCreator != address(0)) {
            userProgress[winnerCreator].battlesWon++;
            checkAchievements(winnerCreator, winner);
        }
        
        emit BattleEnded(currentBattleId, winner, battle.prizePool, battle.participants.length);
        
        // Start next battle
        BattleType nextType = getNextBattleType();
        startNewBattle(nextType);
    }
    
    /**
     * @dev Calculate battle score based on metrics and battle type
     */
    function calculateBattleScore(
        address token,
        TokenMetrics memory metrics,
        BattleType battleType
    ) internal pure returns (BattleScore memory) {
        uint256 volumeScore = 0;
        uint256 holderScore = 0;
        uint256 communityScore = 0;
        uint256 totalScore = 0;
        
        if (battleType == BattleType.TRADING_VOLUME || battleType == BattleType.MIXED_METRICS) {
            volumeScore = metrics.tradingVolume / 1e18; // Normalize volume
        }
        
        if (battleType == BattleType.HOLDER_GROWTH || battleType == BattleType.MIXED_METRICS) {
            holderScore = metrics.holderCount * 100; // Weight holder count
        }
        
        if (battleType == BattleType.COMMUNITY_ENGAGEMENT || battleType == BattleType.MIXED_METRICS) {
            communityScore = metrics.communityScore;
        }
        
        // Calculate total score based on battle type
        if (battleType == BattleType.MIXED_METRICS) {
            totalScore = (volumeScore * 40) / 100 + (holderScore * 30) / 100 + (communityScore * 30) / 100;
        } else if (battleType == BattleType.TRADING_VOLUME) {
            totalScore = volumeScore;
        } else if (battleType == BattleType.HOLDER_GROWTH) {
            totalScore = holderScore;
        } else {
            totalScore = communityScore;
        }
        
        return BattleScore({
            token: token,
            volumeScore: volumeScore,
            holderScore: holderScore,
            communityScore: communityScore,
            totalScore: totalScore,
            rank: 0 // Will be set during sorting
        });
    }
    
    /**
     * @dev Sort battle scores in descending order
     */
    function sortBattleScores(uint256 battleId) internal {
        BattleScore[] storage scores = battleResults[battleId];
        uint256 length = scores.length;
        
        // Simple bubble sort (can be optimized)
        for (uint256 i = 0; i < length - 1; i++) {
            for (uint256 j = 0; j < length - i - 1; j++) {
                if (scores[j].totalScore < scores[j + 1].totalScore) {
                    // Swap
                    BattleScore memory temp = scores[j];
                    scores[j] = scores[j + 1];
                    scores[j + 1] = temp;
                }
            }
        }
        
        // Set ranks
        for (uint256 i = 0; i < length; i++) {
            scores[i].rank = i + 1;
        }
    }
    
    /**
     * @dev Enhanced reward distribution with proper creator tracking
     */
    function distributeRewards(uint256 battleId) internal {
        Battle storage battle = battles[battleId];
        BattleScore[] storage scores = battleResults[battleId];
        
        require(scores.length > 0, "No battle scores available");
        
        uint256 totalPrizePool = battle.prizePool;
        uint256 participantCount = battle.participants.length;
        
        if (totalPrizePool == 0 || participantCount == 0) return;
        
        // Enhanced reward distribution structure:
        // 1st place: 50% of prize pool
        // 2nd place: 25% of prize pool  
        // 3rd place: 15% of prize pool
        // Remaining participants share 10%
        
        // Distribute rewards based on rankings
        for (uint256 i = 0; i < scores.length && i < participantCount; i++) {
            address tokenAddr = scores[i].token;
            address creator = getTokenCreator(tokenAddr);
            
            if (creator == address(0)) continue;
            
            uint256 reward = 0;
            
            if (i == 0) {
                // 1st place - 50%
                reward = (totalPrizePool * 50) / 100;
            } else if (i == 1) {
                // 2nd place - 25%  
                reward = (totalPrizePool * 25) / 100;
            } else if (i == 2) {
                // 3rd place - 15%
                reward = (totalPrizePool * 15) / 100;
            } else {
                // Remaining participants share 10%
                uint256 remainingParticipants = participantCount > 3 ? participantCount - 3 : 0;
                if (remainingParticipants > 0) {
                    reward = (totalPrizePool * 10) / (100 * remainingParticipants);
                }
            }
            
            if (reward > 0 && whaleToken.balanceOf(address(this)) >= reward) {
                // Transfer WHALE tokens to creator
                require(whaleToken.transfer(creator, reward), "Reward transfer failed");
                
                // Update user progress
                userProgress[creator].totalRewardsEarned += reward;
                
                // Check for achievements
                checkAchievements(creator, tokenAddr);
                
                totalRewardsDistributed += reward;
                
                emit RewardDistributed(creator, tokenAddr, reward, i + 1); // rank is 1-indexed
            }
        }
        
        // Update all participants' battle count
        for (uint256 i = 0; i < battle.participants.length; i++) {
            address participant = getTokenCreator(battle.participants[i]);
            if (participant != address(0)) {
                userProgress[participant].battlesParticipated++;
            }
        }
    }
    
    /**
     * @dev Check and unlock achievements for user
     */
    function checkAchievements(address user, address token) internal {
        UserProgress storage progress = userProgress[user];
        TokenMetrics memory metrics = tokenMetrics[token];
        
        // Check "First Victory" achievement
        if (progress.battlesWon == 1 && !progress.unlockedAchievements[1]) {
            unlockAchievement(user, 1);
        }
        
        // Check "Volume King" achievement
        if (metrics.tradingVolume >= achievements[2].requirement && !progress.unlockedAchievements[2]) {
            unlockAchievement(user, 2);
        }
        
        // Check "Community Builder" achievement
        if (metrics.holderCount >= achievements[3].requirement && !progress.unlockedAchievements[3]) {
            unlockAchievement(user, 3);
        }
        
        // Check "Battle Master" achievement
        if (progress.battlesWon >= achievements[4].requirement && !progress.unlockedAchievements[4]) {
            unlockAchievement(user, 4);
        }
    }
    
    /**
     * @dev Unlock achievement for user
     */
    function unlockAchievement(address user, uint256 achievementId) internal {
        Achievement memory achievement = achievements[achievementId];
        require(achievement.isActive, "Achievement not active");
        
        UserProgress storage progress = userProgress[user];
        progress.unlockedAchievements[achievementId] = true;
        progress.achievementPoints += achievement.reward;
        
        // Transfer reward
        whaleToken.transfer(user, achievement.reward);
        
        emit AchievementUnlocked(user, achievementId, achievement.reward);
    }
    
    /**
     * @dev Update token metrics (called by oracles or authorized contracts)
     */
    function updateTokenMetrics(
        address token,
        uint256 tradingVolume,
        uint256 holderCount,
        uint256 communityScore,
        uint256 liquidityDepth,
        uint256 priceStability
    ) external {
        // In production, this would be restricted to authorized oracles
        tokenMetrics[token] = TokenMetrics({
            tradingVolume: tradingVolume,
            holderCount: holderCount,
            communityScore: communityScore,
            liquidityDepth: liquidityDepth,
            priceStability: priceStability,
            lastUpdated: block.timestamp
        });
        
        emit MetricsUpdated(token, tradingVolume, holderCount, communityScore);
    }
    
    /**
     * @dev Get token creator using factory contract integration
     */
    function getTokenCreator(address token) internal view returns (address) {
        // First check our local mapping
        if (tokenToCreator[token] != address(0)) {
            return tokenToCreator[token];
        }
        
        // Try to get creator from the token contract itself
        try ICreatorToken(token).creator() returns (address creator) {
            return creator;
        } catch {}
        
        // Try to get creator from trading engine
        try tradingEngine.getTokenCreator(token) returns (address creator) {
            return creator;
        } catch {}
        
        // Fallback: try to call factory contract directly
        try tradingEngine.tokenFactory() returns (address factoryAddress) {
            try ITokenFactory(factoryAddress).tokenToCreator(token) returns (address creator) {
                return creator;
            } catch {}
        } catch {}
        
        return address(0); // Unknown creator
    }
    
    /**
     * @dev Register token creator for battle participation
     */
    function registerTokenCreator(address token, address creator) external {
        require(msg.sender == address(tradingEngine) || msg.sender == owner(), "Unauthorized");
        
        if (tokenToCreator[token] == address(0)) {
            tokenToCreator[token] = creator;
            
            if (!registeredCreators[creator]) {
                registeredCreators[creator] = true;
                allCreators.push(creator);
            }
        }
    }
    
    /**
     * @dev Get battle information
     */
    function getBattleInfo(uint256 battleId) external view returns (
        uint256 startTime,
        uint256 endTime,
        address[] memory participants,
        address winner,
        uint256 prizePool,
        bool isActive,
        BattleType battleType
    ) {
        Battle memory battle = battles[battleId];
        return (
            battle.startTime,
            battle.endTime,
            battle.participants,
            battle.winner,
            battle.prizePool,
            battle.isActive,
            battle.battleType
        );
    }
    
    /**
     * @dev Get battle results
     */
    function getBattleResults(uint256 battleId) external view returns (BattleScore[] memory) {
        return battleResults[battleId];
    }
    
    /**
     * @dev Get user progress
     */
    function getUserProgress(address user) external view returns (
        uint256 battlesWon,
        uint256 battlesParticipated,
        uint256 totalRewardsEarned,
        uint256 achievementPoints
    ) {
        UserProgress storage progress = userProgress[user];
        return (
            progress.battlesWon,
            progress.battlesParticipated,
            progress.totalRewardsEarned,
            progress.achievementPoints
        );
    }
    
    /**
     * @dev Get next battle type (rotates between types)
     */
    function getNextBattleType() internal view returns (BattleType) {
        uint256 typeIndex = currentBattleId % 4;
        return BattleType(typeIndex);
    }
    
    /**
     * @dev Admin functions
     */
    function setDailyBattleReward(uint256 newReward) external onlyOwner {
        dailyBattleReward = newReward;
    }
    
    function addTreasuryFunds() external payable onlyOwner {
        treasuryBalance += msg.value;
    }
    
    function emergencyEndBattle() external onlyOwner {
        Battle storage battle = battles[currentBattleId];
        battle.isActive = false;
        battle.endTime = block.timestamp;
    }
    
    function withdrawTreasury(uint256 amount) external onlyOwner {
        require(amount <= treasuryBalance, "Insufficient treasury balance");
        treasuryBalance -= amount;
        payable(treasuryAddress).transfer(amount);
    }
    
    function setTreasuryAddress(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury address");
        treasuryAddress = newTreasury;
    }
    
    // Receive ETH
    receive() external payable {
        treasuryBalance += msg.value;
    }
}