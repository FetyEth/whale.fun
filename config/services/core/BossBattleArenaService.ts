import { ContractTransactionResponse } from "ethers";
import {
  BaseContractService,
  TransactionOptions,
} from "@/lib/services/BaseContractService";
import BossBattleArenaABI from "../../abi/BossBattleArena.json";

/**
 * Battle types enum
 */
export enum BattleType {
  TRADING_VOLUME = 0,
  HOLDER_GROWTH = 1,
  COMMUNITY_ENGAGEMENT = 2,
  MIXED_METRICS = 3,
}

/**
 * Battle information interface
 */
export interface Battle {
  battleId: bigint;
  startTime: bigint;
  endTime: bigint;
  participants: string[];
  winner: string;
  prizePool: bigint;
  isActive: boolean;
  battleType: BattleType;
}

/**
 * Token metrics interface
 */
export interface TokenMetrics {
  tradingVolume: bigint;
  holderCount: bigint;
  communityScore: bigint;
  liquidityDepth: bigint;
  priceStability: bigint;
  lastUpdated: bigint;
}

/**
 * Battle score interface
 */
export interface BattleScore {
  token: string;
  volumeScore: bigint;
  holderScore: bigint;
  communityScore: bigint;
  totalScore: bigint;
  rank: bigint;
}

/**
 * Achievement interface
 */
export interface Achievement {
  name: string;
  description: string;
  requirement: bigint;
  reward: bigint;
  isActive: boolean;
}

/**
 * User progress interface
 */
export interface UserProgress {
  battlesWon: bigint;
  battlesParticipated: bigint;
  totalRewardsEarned: bigint;
  achievementPoints: bigint;
}

/**
 * Boss Battle Arena Service
 * Handles all interactions with the BossBattleArena contract for gamified token competitions
 */
export class BossBattleArenaService extends BaseContractService {
  constructor() {
    super({
      name: "BossBattleArena",
      abi: BossBattleArenaABI,
      deployments: {
        // Add your deployment addresses here
        // 1: { // Ethereum Mainnet
        //   address: "0x...",
        //   deployedAt: 1234567890,
        //   verified: true
        // },
        // 137: { // Polygon
        //   address: "0x...",
        //   deployedAt: 1234567890,
        //   verified: true
        // }
      },
    });
  }

  // ==================== BATTLE MANAGEMENT ====================

  /**
   * Start a new battle (admin only)
   */
  async startNewBattle(
    battleType: BattleType,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod("startNewBattle", [battleType], options, chainId);
  }

  /**
   * Register token for current battle
   */
  async registerForBattle(
    token: string,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod("registerForBattle", [token], options, chainId);
  }

  /**
   * End current battle and determine winner
   */
  async endBattle(
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod("endBattle", [], options, chainId);
  }

  /**
   * Emergency end battle (admin only)
   */
  async emergencyEndBattle(
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod("emergencyEndBattle", [], options, chainId);
  }

  /**
   * Get current battle ID
   */
  async getCurrentBattleId(chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("currentBattleId", [], chainId);
  }

  /**
   * Get battle information
   */
  async getBattleInfo(battleId: bigint, chainId?: number): Promise<Battle> {
    const result = await this.callMethod("getBattleInfo", [battleId], chainId);
    return {
      battleId: result[0],
      startTime: result[1],
      endTime: result[2],
      participants: result[3],
      winner: result[4],
      prizePool: result[5],
      isActive: result[6],
      battleType: result[7],
    };
  }

  /**
   * Get battle results with scores
   */
  async getBattleResults(
    battleId: bigint,
    chainId?: number
  ): Promise<BattleScore[]> {
    const results = await this.callMethod<any[]>(
      "getBattleResults",
      [battleId],
      chainId
    );
    return results.map((result) => ({
      token: result.token,
      volumeScore: result.volumeScore,
      holderScore: result.holderScore,
      communityScore: result.communityScore,
      totalScore: result.totalScore,
      rank: result.rank,
    }));
  }

  /**
   * Get battle details by ID
   */
  async getBattle(battleId: bigint, chainId?: number): Promise<Battle> {
    const battle = await this.callMethod("battles", [battleId], chainId);
    return {
      battleId: battle.battleId,
      startTime: battle.startTime,
      endTime: battle.endTime,
      participants: battle.participants,
      winner: battle.winner,
      prizePool: battle.prizePool,
      isActive: battle.isActive,
      battleType: battle.battleType,
    };
  }

  // ==================== METRICS MANAGEMENT ====================

  /**
   * Update token metrics (oracle function)
   */
  async updateTokenMetrics(
    token: string,
    tradingVolume: bigint,
    holderCount: bigint,
    communityScore: bigint,
    liquidityDepth: bigint,
    priceStability: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod(
      "updateTokenMetrics",
      [
        token,
        tradingVolume,
        holderCount,
        communityScore,
        liquidityDepth,
        priceStability,
      ],
      options,
      chainId
    );
  }

  /**
   * Get token metrics
   */
  async getTokenMetrics(
    token: string,
    chainId?: number
  ): Promise<TokenMetrics> {
    const metrics = await this.callMethod("tokenMetrics", [token], chainId);
    return {
      tradingVolume: metrics.tradingVolume,
      holderCount: metrics.holderCount,
      communityScore: metrics.communityScore,
      liquidityDepth: metrics.liquidityDepth,
      priceStability: metrics.priceStability,
      lastUpdated: metrics.lastUpdated,
    };
  }

  // ==================== USER PROGRESS & ACHIEVEMENTS ====================

  /**
   * Get user progress information
   */
  async getUserProgress(user: string, chainId?: number): Promise<UserProgress> {
    const result = await this.callMethod("getUserProgress", [user], chainId);
    return {
      battlesWon: result[0],
      battlesParticipated: result[1],
      totalRewardsEarned: result[2],
      achievementPoints: result[3],
    };
  }

  /**
   * Get user progress details (direct mapping access)
   */
  async getUserProgressDetails(
    user: string,
    chainId?: number
  ): Promise<UserProgress> {
    const progress = await this.callMethod("userProgress", [user], chainId);
    return {
      battlesWon: progress.battlesWon,
      battlesParticipated: progress.battlesParticipated,
      totalRewardsEarned: progress.totalRewardsEarned,
      achievementPoints: progress.achievementPoints,
    };
  }

  /**
   * Check if user has unlocked achievement
   */
  async hasUnlockedAchievement(
    user: string,
    achievementId: bigint,
    chainId?: number
  ): Promise<boolean> {
    // Note: This would need to be implemented as a view function in the contract
    // For now, we'll try to call it directly
    try {
      return await this.callMethod<boolean>(
        "userProgress",
        [user, "unlockedAchievements", achievementId],
        chainId
      );
    } catch {
      return false;
    }
  }

  /**
   * Get user battle participation count for specific battle
   */
  async getUserBattleParticipation(
    user: string,
    battleId: bigint,
    chainId?: number
  ): Promise<bigint> {
    try {
      return await this.callMethod<bigint>(
        "userProgress",
        [user, "battleParticipation", battleId],
        chainId
      );
    } catch {
      return BigInt(0);
    }
  }

  // ==================== ACHIEVEMENTS SYSTEM ====================

  /**
   * Get achievement details
   */
  async getAchievement(
    achievementId: bigint,
    chainId?: number
  ): Promise<Achievement> {
    const achievement = await this.callMethod(
      "achievements",
      [achievementId],
      chainId
    );
    return {
      name: achievement.name,
      description: achievement.description,
      requirement: achievement.requirement,
      reward: achievement.reward,
      isActive: achievement.isActive,
    };
  }

  /**
   * Get all achievements (helper function)
   */
  async getAllAchievements(chainId?: number): Promise<Achievement[]> {
    const achievements: Achievement[] = [];

    // Get first 10 achievements (adjust based on contract implementation)
    for (let i = 1; i <= 10; i++) {
      try {
        const achievement = await this.getAchievement(BigInt(i), chainId);
        if (achievement.isActive) {
          achievements.push(achievement);
        }
      } catch {
        break; // No more achievements
      }
    }

    return achievements;
  }

  // ==================== CREATOR & TOKEN MANAGEMENT ====================

  /**
   * Register token creator
   */
  async registerTokenCreator(
    token: string,
    creator: string,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod(
      "registerTokenCreator",
      [token, creator],
      options,
      chainId
    );
  }

  /**
   * Get token creator
   */
  async getTokenCreator(token: string, chainId?: number): Promise<string> {
    return this.callMethod<string>("tokenToCreator", [token], chainId);
  }

  /**
   * Check if creator is registered
   */
  async isRegisteredCreator(
    creator: string,
    chainId?: number
  ): Promise<boolean> {
    return this.callMethod<boolean>("registeredCreators", [creator], chainId);
  }

  /**
   * Get all registered creators
   */
  async getAllCreators(chainId?: number): Promise<string[]> {
    // This would need to be implemented as a view function or we need to track the count
    try {
      return await this.callMethod<string[]>("allCreators", [], chainId);
    } catch {
      return [];
    }
  }

  // ==================== TREASURY & REWARDS ====================

  /**
   * Get daily battle reward amount
   */
  async getDailyBattleReward(chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("dailyBattleReward", [], chainId);
  }

  /**
   * Set daily battle reward (admin only)
   */
  async setDailyBattleReward(
    newReward: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod(
      "setDailyBattleReward",
      [newReward],
      options,
      chainId
    );
  }

  /**
   * Get treasury balance
   */
  async getTreasuryBalance(chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("treasuryBalance", [], chainId);
  }

  /**
   * Get treasury address
   */
  async getTreasuryAddress(chainId?: number): Promise<string> {
    return this.callMethod<string>("treasuryAddress", [], chainId);
  }

  /**
   * Get total rewards distributed
   */
  async getTotalRewardsDistributed(chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("totalRewardsDistributed", [], chainId);
  }

  /**
   * Add treasury funds (admin only)
   */
  async addTreasuryFunds(
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod("addTreasuryFunds", [], options, chainId);
  }

  /**
   * Withdraw from treasury (admin only)
   */
  async withdrawTreasury(
    amount: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod("withdrawTreasury", [amount], options, chainId);
  }

  /**
   * Set treasury address (admin only)
   */
  async setTreasuryAddress(
    newTreasury: string,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod(
      "setTreasuryAddress",
      [newTreasury],
      options,
      chainId
    );
  }

  // ==================== EXTERNAL CONTRACT REFERENCES ====================

  /**
   * Get Whale Token contract address
   */
  async getWhaleToken(chainId?: number): Promise<string> {
    return this.callMethod<string>("whaleToken", [], chainId);
  }

  /**
   * Get Trading Engine contract address
   */
  async getTradingEngine(chainId?: number): Promise<string> {
    return this.callMethod<string>("tradingEngine", [], chainId);
  }

  // ==================== CONSTANTS ====================

  /**
   * Get battle duration constant
   */
  async getBattleDuration(chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("BATTLE_DURATION", [], chainId);
  }

  /**
   * Get minimum participants constant
   */
  async getMinParticipants(chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("MIN_PARTICIPANTS", [], chainId);
  }

  /**
   * Get maximum participants constant
   */
  async getMaxParticipants(chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("MAX_PARTICIPANTS", [], chainId);
  }

  // ==================== BATTLE ANALYTICS ====================

  /**
   * Get battle statistics
   */
  async getBattleStats(chainId?: number) {
    const [currentBattleId, dailyReward, totalRewards, treasuryBalance] =
      await Promise.all([
        this.getCurrentBattleId(chainId),
        this.getDailyBattleReward(chainId),
        this.getTotalRewardsDistributed(chainId),
        this.getTreasuryBalance(chainId),
      ]);

    return {
      currentBattleId,
      dailyReward,
      totalRewards,
      treasuryBalance,
      totalBattles: currentBattleId > BigInt(0) ? currentBattleId : BigInt(0),
    };
  }

  /**
   * Get leaderboard data for a specific battle
   */
  async getBattleLeaderboard(
    battleId: bigint,
    chainId?: number
  ): Promise<BattleScore[]> {
    return this.getBattleResults(battleId, chainId);
  }

  /**
   * Check if battle is active
   */
  async isBattleActive(battleId?: bigint, chainId?: number): Promise<boolean> {
    const currentId = battleId || (await this.getCurrentBattleId(chainId));
    const battle = await this.getBattle(currentId, chainId);
    return battle.isActive && BigInt(Date.now() / 1000) < battle.endTime;
  }

  /**
   * Get time remaining in current battle
   */
  async getTimeRemainingInBattle(chainId?: number): Promise<bigint> {
    const currentId = await this.getCurrentBattleId(chainId);
    const battle = await this.getBattle(currentId, chainId);

    if (!battle.isActive) return BigInt(0);

    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    return battle.endTime > currentTime
      ? battle.endTime - currentTime
      : BigInt(0);
  }

  // ==================== EVENTS ====================

  /**
   * Get BattleStarted events
   */
  async getBattleStartedEvents(
    fromBlock: number = -10000,
    toBlock?: number,
    chainId?: number
  ) {
    return this.getEvents("BattleStarted", { fromBlock, toBlock }, chainId);
  }

  /**
   * Get BattleEnded events
   */
  async getBattleEndedEvents(
    fromBlock: number = -10000,
    toBlock?: number,
    chainId?: number
  ) {
    return this.getEvents("BattleEnded", { fromBlock, toBlock }, chainId);
  }

  /**
   * Get TokenRegistered events
   */
  async getTokenRegisteredEvents(
    fromBlock: number = -10000,
    toBlock?: number,
    chainId?: number
  ) {
    return this.getEvents("TokenRegistered", { fromBlock, toBlock }, chainId);
  }

  /**
   * Get AchievementUnlocked events
   */
  async getAchievementUnlockedEvents(
    fromBlock: number = -10000,
    toBlock?: number,
    chainId?: number
  ) {
    return this.getEvents(
      "AchievementUnlocked",
      { fromBlock, toBlock },
      chainId
    );
  }

  /**
   * Get MetricsUpdated events
   */
  async getMetricsUpdatedEvents(
    fromBlock: number = -10000,
    toBlock?: number,
    chainId?: number
  ) {
    return this.getEvents("MetricsUpdated", { fromBlock, toBlock }, chainId);
  }

  /**
   * Get RewardDistributed events
   */
  async getRewardDistributedEvents(
    fromBlock: number = -10000,
    toBlock?: number,
    chainId?: number
  ) {
    return this.getEvents("RewardDistributed", { fromBlock, toBlock }, chainId);
  }

  // ==================== EVENT LISTENERS ====================

  /**
   * Listen to BattleStarted events
   */
  async onBattleStarted(
    callback: (
      battleId: bigint,
      battleType: BattleType,
      startTime: bigint,
      prizePool: bigint
    ) => void,
    chainId?: number
  ) {
    return this.listenToEvent(
      "BattleStarted",
      (event: any) => {
        callback(
          event.args.battleId,
          event.args.battleType,
          event.args.startTime,
          event.args.prizePool
        );
      },
      chainId
    );
  }

  /**
   * Listen to BattleEnded events
   */
  async onBattleEnded(
    callback: (
      battleId: bigint,
      winner: string,
      prizePool: bigint,
      participantCount: bigint
    ) => void,
    chainId?: number
  ) {
    return this.listenToEvent(
      "BattleEnded",
      (event: any) => {
        callback(
          event.args.battleId,
          event.args.winner,
          event.args.prizePool,
          event.args.participantCount
        );
      },
      chainId
    );
  }

  /**
   * Listen to TokenRegistered events
   */
  async onTokenRegistered(
    callback: (token: string, creator: string, timestamp: bigint) => void,
    chainId?: number
  ) {
    return this.listenToEvent(
      "TokenRegistered",
      (event: any) => {
        callback(event.args.token, event.args.creator, event.args.timestamp);
      },
      chainId
    );
  }

  /**
   * Listen to AchievementUnlocked events
   */
  async onAchievementUnlocked(
    callback: (user: string, achievementId: bigint, reward: bigint) => void,
    chainId?: number
  ) {
    return this.listenToEvent(
      "AchievementUnlocked",
      (event: any) => {
        callback(event.args.user, event.args.achievementId, event.args.reward);
      },
      chainId
    );
  }

  /**
   * Listen to RewardDistributed events
   */
  async onRewardDistributed(
    callback: (
      creator: string,
      token: string,
      reward: bigint,
      rank: bigint
    ) => void,
    chainId?: number
  ) {
    return this.listenToEvent(
      "RewardDistributed",
      (event: any) => {
        callback(
          event.args.creator,
          event.args.token,
          event.args.reward,
          event.args.rank
        );
      },
      chainId
    );
  }

  /**
   * Listen to MetricsUpdated events
   */
  async onMetricsUpdated(
    callback: (
      token: string,
      volume: bigint,
      holders: bigint,
      communityScore: bigint
    ) => void,
    chainId?: number
  ) {
    return this.listenToEvent(
      "MetricsUpdated",
      (event: any) => {
        callback(
          event.args.token,
          event.args.volume,
          event.args.holders,
          event.args.communityScore
        );
      },
      chainId
    );
  }
}
