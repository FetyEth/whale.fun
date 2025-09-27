import { EventLog } from "ethers";
import {
  BaseContractService,
  TransactionOptions,
  EventFilterOptions,
  ContractConfig,
} from "./BaseContractService";
// Note: BossBattleArena ABI will need to be generated and placed in config/abi/
// import BossBattleArenaABI from "@/config/abi/BossBattleArena.json";

// Temporary placeholder - replace with actual ABI
const BossBattleArenaABI: any[] = [];

/**
 * Battle type enumeration
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
 * Battle registration parameters
 */
export interface BattleRegistrationParams {
  token: string;
  gasLimit?: bigint;
}

/**
 * Battle results summary
 */
export interface BattleResultsSummary {
  battle: Battle;
  scores: BattleScore[];
  totalParticipants: number;
  rewardsDistributed: bigint;
}

/**
 * BossBattleArena contract deployment configuration
 */
const BOSS_BATTLE_ARENA_CONFIG: ContractConfig = {
  name: "BossBattleArena",
  abi: BossBattleArenaABI,
  deployments: {
    80002: {
      // Polygon Amoy Testnet
      address: "0x5fc1ebb7e12d02d15af064dc389aeb9ce4974992",
      deployedAt: 0,
      verified: false,
    },

    84532: {
      // Base Sepolia
      address: "0x...", // Replace with actual deployment address
      deployedAt: 0,
      verified: false,
    },
    16661: {
      // 0G Mainnet
      address: "0x...", // Replace with actual deployment address
      deployedAt: 0,
      verified: false,
    },
    16600: {
      // 0G Testnet
      address: "0x...", // Replace with actual deployment address
      deployedAt: 0,
      verified: false,
    },
  },
};

/**
 * BossBattleArena Service
 * Provides comprehensive functionality for the gamified token competition system
 */
export class BossBattleArenaService extends BaseContractService {
  constructor() {
    super(BOSS_BATTLE_ARENA_CONFIG);
  }

  // ==================== Battle Management ====================

  /**
   * Start a new battle (admin only)
   */
  async startNewBattle(
    battleType: BattleType,
    options?: TransactionOptions
  ): Promise<{ battleId: bigint; txHash: string }> {
    try {
      const tx = await this.executeMethod(
        "startNewBattle",
        [battleType],
        options
      );
      const receipt = await this.waitForConfirmation(tx);

      // Parse battle started event to get battle ID
      const battleStartedEvent = receipt.logs.find(
        (log) => (log as EventLog).eventName === "BattleStarted"
      ) as EventLog;

      let battleId = BigInt(0);
      if (battleStartedEvent) {
        battleId = BigInt(battleStartedEvent.args[0].toString());
      } else {
        // Fallback: get current battle ID
        battleId = await this.getCurrentBattleId();
      }

      return {
        battleId,
        txHash: receipt.hash,
      };
    } catch (error) {
      throw new Error(`Failed to start new battle: ${error}`);
    }
  }

  /**
   * Register token for current battle
   */
  async registerForBattle(
    params: BattleRegistrationParams,
    options?: TransactionOptions
  ): Promise<string> {
    try {
      const tx = await this.executeMethod("registerForBattle", [params.token], {
        gasLimit: params.gasLimit || BigInt(200000),
        ...options,
      });

      const receipt = await this.waitForConfirmation(tx);
      return receipt.hash;
    } catch (error) {
      throw new Error(`Failed to register for battle: ${error}`);
    }
  }

  /**
   * End current battle and determine winner
   */
  async endBattle(
    options?: TransactionOptions
  ): Promise<{ winner: string; txHash: string }> {
    try {
      const tx = await this.executeMethod("endBattle", [], {
        gasLimit: BigInt(500000), // Higher gas limit for complex calculations
        ...options,
      });

      const receipt = await this.waitForConfirmation(tx);

      // Parse battle ended event
      const battleEndedEvent = receipt.logs.find(
        (log) => (log as EventLog).eventName === "BattleEnded"
      ) as EventLog;

      let winner = "0x0000000000000000000000000000000000000000";
      if (battleEndedEvent) {
        winner = battleEndedEvent.args[1];
      }

      return {
        winner,
        txHash: receipt.hash,
      };
    } catch (error) {
      throw new Error(`Failed to end battle: ${error}`);
    }
  }

  /**
   * Get current battle ID
   */
  async getCurrentBattleId(chainId?: number): Promise<bigint> {
    try {
      const battleId = await this.callMethod("currentBattleId", [], chainId);
      return BigInt(battleId.toString());
    } catch (error) {
      throw new Error(`Failed to get current battle ID: ${error}`);
    }
  }

  /**
   * Get battle information
   */
  async getBattleInfo(battleId: bigint, chainId?: number): Promise<Battle> {
    try {
      const [
        startTime,
        endTime,
        participants,
        winner,
        prizePool,
        isActive,
        battleType,
      ] = await this.callMethod("getBattleInfo", [battleId], chainId);

      return {
        battleId,
        startTime: BigInt(startTime.toString()),
        endTime: BigInt(endTime.toString()),
        participants,
        winner,
        prizePool: BigInt(prizePool.toString()),
        isActive,
        battleType: Number(battleType),
      };
    } catch (error) {
      throw new Error(`Failed to get battle info: ${error}`);
    }
  }

  /**
   * Get battle results
   */
  async getBattleResults(
    battleId: bigint,
    chainId?: number
  ): Promise<BattleScore[]> {
    try {
      const results = await this.callMethod(
        "getBattleResults",
        [battleId],
        chainId
      );

      return results.map((result: any) => ({
        token: result.token,
        volumeScore: BigInt(result.volumeScore.toString()),
        holderScore: BigInt(result.holderScore.toString()),
        communityScore: BigInt(result.communityScore.toString()),
        totalScore: BigInt(result.totalScore.toString()),
        rank: BigInt(result.rank.toString()),
      }));
    } catch (error) {
      throw new Error(`Failed to get battle results: ${error}`);
    }
  }

  // ==================== Token Metrics ====================

  /**
   * Update token metrics (admin/oracle only)
   */
  async updateTokenMetrics(
    token: string,
    tradingVolume: bigint,
    holderCount: bigint,
    communityScore: bigint,
    liquidityDepth: bigint,
    priceStability: bigint,
    options?: TransactionOptions
  ): Promise<string> {
    try {
      const tx = await this.executeMethod(
        "updateTokenMetrics",
        [
          token,
          tradingVolume,
          holderCount,
          communityScore,
          liquidityDepth,
          priceStability,
        ],
        options
      );

      const receipt = await this.waitForConfirmation(tx);
      return receipt.hash;
    } catch (error) {
      throw new Error(`Failed to update token metrics: ${error}`);
    }
  }

  /**
   * Get token metrics
   */
  async getTokenMetrics(
    token: string,
    chainId?: number
  ): Promise<TokenMetrics> {
    try {
      const metrics = await this.callMethod("tokenMetrics", [token], chainId);

      return {
        tradingVolume: BigInt(metrics.tradingVolume.toString()),
        holderCount: BigInt(metrics.holderCount.toString()),
        communityScore: BigInt(metrics.communityScore.toString()),
        liquidityDepth: BigInt(metrics.liquidityDepth.toString()),
        priceStability: BigInt(metrics.priceStability.toString()),
        lastUpdated: BigInt(metrics.lastUpdated.toString()),
      };
    } catch (error) {
      throw new Error(`Failed to get token metrics: ${error}`);
    }
  }

  // ==================== User Progress & Achievements ====================

  /**
   * Get user progress
   */
  async getUserProgress(user: string, chainId?: number): Promise<UserProgress> {
    try {
      const [
        battlesWon,
        battlesParticipated,
        totalRewardsEarned,
        achievementPoints,
      ] = await this.callMethod("getUserProgress", [user], chainId);

      return {
        battlesWon: BigInt(battlesWon.toString()),
        battlesParticipated: BigInt(battlesParticipated.toString()),
        totalRewardsEarned: BigInt(totalRewardsEarned.toString()),
        achievementPoints: BigInt(achievementPoints.toString()),
      };
    } catch (error) {
      throw new Error(`Failed to get user progress: ${error}`);
    }
  }

  /**
   * Get achievement information
   */
  async getAchievement(
    achievementId: bigint,
    chainId?: number
  ): Promise<Achievement> {
    try {
      const achievement = await this.callMethod(
        "achievements",
        [achievementId],
        chainId
      );

      return {
        name: achievement.name,
        description: achievement.description,
        requirement: BigInt(achievement.requirement.toString()),
        reward: BigInt(achievement.reward.toString()),
        isActive: achievement.isActive,
      };
    } catch (error) {
      throw new Error(`Failed to get achievement: ${error}`);
    }
  }

  /**
   * Check if user has unlocked an achievement
   */
  async hasUnlockedAchievement(
    user: string,
    achievementId: bigint,
    chainId?: number
  ): Promise<boolean> {
    try {
      // This would require accessing the nested mapping in the contract
      // For now, we'll need to implement this via events or additional contract methods
      const events = await this.getEvents(
        "AchievementUnlocked",
        {
          fromBlock: -10000,
        },
        chainId
      );

      return events.some(
        (event: EventLog) =>
          event.args[0].toLowerCase() === user.toLowerCase() &&
          BigInt(event.args[1].toString()) === achievementId
      );
    } catch (error) {
      throw new Error(`Failed to check achievement unlock status: ${error}`);
    }
  }

  // ==================== Creator Management ====================

  /**
   * Register token creator
   */
  async registerTokenCreator(
    token: string,
    creator: string,
    options?: TransactionOptions
  ): Promise<string> {
    try {
      const tx = await this.executeMethod(
        "registerTokenCreator",
        [token, creator],
        options
      );
      const receipt = await this.waitForConfirmation(tx);
      return receipt.hash;
    } catch (error) {
      throw new Error(`Failed to register token creator: ${error}`);
    }
  }

  /**
   * Get token creator
   */
  async getTokenCreator(token: string, chainId?: number): Promise<string> {
    try {
      return await this.callMethod("tokenToCreator", [token], chainId);
    } catch (error) {
      throw new Error(`Failed to get token creator: ${error}`);
    }
  }

  /**
   * Check if creator is registered
   */
  async isCreatorRegistered(
    creator: string,
    chainId?: number
  ): Promise<boolean> {
    try {
      return await this.callMethod("registeredCreators", [creator], chainId);
    } catch (error) {
      throw new Error(`Failed to check creator registration: ${error}`);
    }
  }

  // ==================== Treasury & Configuration ====================

  /**
   * Get daily battle reward amount
   */
  async getDailyBattleReward(chainId?: number): Promise<bigint> {
    try {
      const reward = await this.callMethod("dailyBattleReward", [], chainId);
      return BigInt(reward.toString());
    } catch (error) {
      throw new Error(`Failed to get daily battle reward: ${error}`);
    }
  }

  /**
   * Set daily battle reward (admin only)
   */
  async setDailyBattleReward(
    newReward: bigint,
    options?: TransactionOptions
  ): Promise<string> {
    try {
      const tx = await this.executeMethod(
        "setDailyBattleReward",
        [newReward],
        options
      );
      const receipt = await this.waitForConfirmation(tx);
      return receipt.hash;
    } catch (error) {
      throw new Error(`Failed to set daily battle reward: ${error}`);
    }
  }

  /**
   * Get treasury balance
   */
  async getTreasuryBalance(chainId?: number): Promise<bigint> {
    try {
      const balance = await this.callMethod("treasuryBalance", [], chainId);
      return BigInt(balance.toString());
    } catch (error) {
      throw new Error(`Failed to get treasury balance: ${error}`);
    }
  }

  /**
   * Add funds to treasury (admin only)
   */
  async addTreasuryFunds(
    amount: bigint,
    options?: TransactionOptions
  ): Promise<string> {
    try {
      const tx = await this.executeMethod("addTreasuryFunds", [], {
        value: amount,
        ...options,
      });
      const receipt = await this.waitForConfirmation(tx);
      return receipt.hash;
    } catch (error) {
      throw new Error(`Failed to add treasury funds: ${error}`);
    }
  }

  /**
   * Get total rewards distributed
   */
  async getTotalRewardsDistributed(chainId?: number): Promise<bigint> {
    try {
      const total = await this.callMethod(
        "totalRewardsDistributed",
        [],
        chainId
      );
      return BigInt(total.toString());
    } catch (error) {
      throw new Error(`Failed to get total rewards distributed: ${error}`);
    }
  }

  // ==================== Event Listeners ====================

  /**
   * Listen for battle started events
   */
  async onBattleStarted(
    callback: (
      battleId: bigint,
      battleType: BattleType,
      startTime: bigint,
      prizePool: bigint
    ) => void,
    options?: EventFilterOptions
  ): Promise<void> {
    await this.listenToEvent("BattleStarted", (event: EventLog) => {
      const args = event.args;
      callback(
        BigInt(args[0].toString()),
        Number(args[1]),
        BigInt(args[2].toString()),
        BigInt(args[3].toString())
      );
    });
  }

  /**
   * Listen for battle ended events
   */
  async onBattleEnded(
    callback: (
      battleId: bigint,
      winner: string,
      prizePool: bigint,
      participantCount: bigint
    ) => void,
    options?: EventFilterOptions
  ): Promise<void> {
    await this.listenToEvent("BattleEnded", (event: EventLog) => {
      const args = event.args;
      callback(
        BigInt(args[0].toString()),
        args[1],
        BigInt(args[2].toString()),
        BigInt(args[3].toString())
      );
    });
  }

  /**
   * Listen for token registration events
   */
  async onTokenRegistered(
    callback: (token: string, creator: string, timestamp: bigint) => void,
    options?: EventFilterOptions
  ): Promise<void> {
    await this.listenToEvent("TokenRegistered", (event: EventLog) => {
      const args = event.args;
      callback(args[0], args[1], BigInt(args[2].toString()));
    });
  }

  /**
   * Listen for achievement unlocked events
   */
  async onAchievementUnlocked(
    callback: (user: string, achievementId: bigint, reward: bigint) => void,
    options?: EventFilterOptions
  ): Promise<void> {
    await this.listenToEvent("AchievementUnlocked", (event: EventLog) => {
      const args = event.args;
      callback(args[0], BigInt(args[1].toString()), BigInt(args[2].toString()));
    });
  }

  /**
   * Listen for reward distributed events
   */
  async onRewardDistributed(
    callback: (
      creator: string,
      token: string,
      reward: bigint,
      rank: bigint
    ) => void,
    options?: EventFilterOptions
  ): Promise<void> {
    await this.listenToEvent("RewardDistributed", (event: EventLog) => {
      const args = event.args;
      callback(
        args[0],
        args[1],
        BigInt(args[2].toString()),
        BigInt(args[3].toString())
      );
    });
  }

  // ==================== Analytics & Reporting ====================

  /**
   * Get comprehensive battle results summary
   */
  async getBattleResultsSummary(
    battleId: bigint,
    chainId?: number
  ): Promise<BattleResultsSummary> {
    try {
      const [battle, scores] = await Promise.all([
        this.getBattleInfo(battleId, chainId),
        this.getBattleResults(battleId, chainId),
      ]);

      const totalParticipants = battle.participants.length;
      const rewardsDistributed = battle.prizePool;

      return {
        battle,
        scores,
        totalParticipants,
        rewardsDistributed,
      };
    } catch (error) {
      throw new Error(`Failed to get battle results summary: ${error}`);
    }
  }

  /**
   * Get current battle status
   */
  async getCurrentBattleStatus(chainId?: number): Promise<{
    battleId: bigint;
    battle: Battle;
    timeRemaining: number; // in seconds
    canEnd: boolean;
    participantCount: number;
  }> {
    try {
      const battleId = await this.getCurrentBattleId(chainId);
      const battle = await this.getBattleInfo(battleId, chainId);

      const currentTime = Math.floor(Date.now() / 1000);
      const endTime = Number(battle.endTime);
      const timeRemaining = Math.max(0, endTime - currentTime);
      const canEnd = currentTime >= endTime && battle.isActive;

      return {
        battleId,
        battle,
        timeRemaining,
        canEnd,
        participantCount: battle.participants.length,
      };
    } catch (error) {
      throw new Error(`Failed to get current battle status: ${error}`);
    }
  }

  /**
   * Get leaderboard for all time
   */
  async getLeaderboard(
    limit: number = 10,
    chainId?: number
  ): Promise<
    Array<{
      creator: string;
      progress: UserProgress;
      rank: number;
    }>
  > {
    try {
      // This would require additional contract functionality to get all users
      // For now, return empty array as placeholder
      return [];
    } catch (error) {
      throw new Error(`Failed to get leaderboard: ${error}`);
    }
  }

  /**
   * Get battle history for a user
   */
  async getUserBattleHistory(
    user: string,
    limit: number = 20,
    chainId?: number
  ): Promise<
    Array<{
      battleId: bigint;
      battle: Battle;
      userRank?: number;
      rewardEarned?: bigint;
    }>
  > {
    try {
      // This would require querying events and battle results
      // For now, return empty array as placeholder
      return [];
    } catch (error) {
      throw new Error(`Failed to get user battle history: ${error}`);
    }
  }

  // ==================== Utility Functions ====================

  /**
   * Format battle time remaining
   */
  formatTimeRemaining(seconds: number): string {
    if (seconds <= 0) return "Battle ended";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  /**
   * Get battle type name
   */
  getBattleTypeName(battleType: BattleType): string {
    switch (battleType) {
      case BattleType.TRADING_VOLUME:
        return "Trading Volume";
      case BattleType.HOLDER_GROWTH:
        return "Holder Growth";
      case BattleType.COMMUNITY_ENGAGEMENT:
        return "Community Engagement";
      case BattleType.MIXED_METRICS:
        return "Mixed Metrics";
      default:
        return "Unknown";
    }
  }

  /**
   * Calculate user battle score
   */
  calculateUserBattleScore(progress: UserProgress): number {
    const winRate =
      Number(progress.battlesParticipated) > 0
        ? Number(progress.battlesWon) / Number(progress.battlesParticipated)
        : 0;

    const participationScore = Math.min(
      Number(progress.battlesParticipated) * 5,
      100
    );
    const winScore = winRate * 200;
    const rewardScore = Math.min(
      Number(progress.totalRewardsEarned) / 1e18,
      300
    );
    const achievementScore = Math.min(
      (Number(progress.achievementPoints) / 1e18) * 10,
      100
    );

    return Math.round(
      participationScore + winScore + rewardScore + achievementScore
    );
  }

  /**
   * Emergency end battle (admin only)
   */
  async emergencyEndBattle(options?: TransactionOptions): Promise<string> {
    try {
      const tx = await this.executeMethod("emergencyEndBattle", [], options);
      const receipt = await this.waitForConfirmation(tx);
      return receipt.hash;
    } catch (error) {
      throw new Error(`Failed to emergency end battle: ${error}`);
    }
  }
}

// Export singleton instance
export const bossBattleArenaService = new BossBattleArenaService();
export default bossBattleArenaService;
