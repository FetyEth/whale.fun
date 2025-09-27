import { Contract, ContractTransactionResponse, EventLog } from "ethers";
import {
  BaseContractService,
  TransactionOptions,
  EventFilterOptions,
  ContractConfig,
} from "./BaseContractService";
// Note: TokenAnalytics ABI will need to be generated and placed in config/abi/
// import TokenAnalyticsABI from "@/config/abi/TokenAnalytics.json";

// Temporary placeholder - replace with actual ABI
const TokenAnalyticsABI: any[] = [];

/**
 * Factory analytics interface
 */
export interface FactoryAnalytics {
  avgTokensPerCreator: bigint;
  successRate: bigint;
  totalMarketCap: bigint;
}

/**
 * Platform metrics interface
 */
export interface PlatformMetrics {
  totalTokensCreated: bigint;
  activeTokens: bigint;
  totalVolumeTraded: bigint;
  avgTokenAge: bigint;
  topTokenMarketCap: bigint;
}

/**
 * Creator metrics interface
 */
export interface CreatorMetrics {
  tokensCreated: bigint;
  successfulTokens: bigint;
  totalMarketCap: bigint;
  averageTokenAge: bigint;
  totalFeesEarned: bigint;
}

/**
 * Analytics summary interface
 */
export interface AnalyticsSummary {
  factoryAnalytics: FactoryAnalytics;
  platformMetrics: PlatformMetrics;
  topCreators: Array<{
    address: string;
    metrics: CreatorMetrics;
  }>;
  performanceIndicators: {
    platformGrowthRate: number;
    tokenSuccessRate: number;
    averageTokenLifespan: number;
    totalValueLocked: bigint;
  };
}

/**
 * TokenAnalytics contract deployment configuration
 */
const TOKEN_ANALYTICS_CONFIG: ContractConfig = {
  name: "TokenAnalytics",
  abi: TokenAnalyticsABI,
  deployments: {
    80002: {
      // Polygon Amoy Testnet
      address: "0x554cd9ad6b3c3be1f8cd122496609d2defb12629",
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
 * TokenAnalytics Service
 * Provides comprehensive analytics and metrics for the token platform
 */
export class TokenAnalyticsService extends BaseContractService {
  constructor() {
    super(TOKEN_ANALYTICS_CONFIG);
  }

  // ==================== Factory Analytics ====================

  /**
   * Get comprehensive factory analytics
   */
  async getFactoryAnalytics(chainId?: number): Promise<FactoryAnalytics> {
    try {
      const [avgTokensPerCreator, successRate, totalMarketCap] =
        await this.callMethod("getFactoryAnalytics", [], chainId);

      return {
        avgTokensPerCreator: BigInt(avgTokensPerCreator.toString()),
        successRate: BigInt(successRate.toString()),
        totalMarketCap: BigInt(totalMarketCap.toString()),
      };
    } catch (error) {
      throw new Error(`Failed to get factory analytics: ${error}`);
    }
  }

  /**
   * Get platform-wide metrics
   */
  async getPlatformMetrics(chainId?: number): Promise<PlatformMetrics> {
    try {
      const [
        totalTokensCreated,
        activeTokens,
        totalVolumeTraded,
        avgTokenAge,
        topTokenMarketCap,
      ] = await this.callMethod("getPlatformMetrics", [], chainId);

      return {
        totalTokensCreated: BigInt(totalTokensCreated.toString()),
        activeTokens: BigInt(activeTokens.toString()),
        totalVolumeTraded: BigInt(totalVolumeTraded.toString()),
        avgTokenAge: BigInt(avgTokenAge.toString()),
        topTokenMarketCap: BigInt(topTokenMarketCap.toString()),
      };
    } catch (error) {
      throw new Error(`Failed to get platform metrics: ${error}`);
    }
  }

  /**
   * Get creator-specific metrics
   */
  async getCreatorMetrics(
    creator: string,
    chainId?: number
  ): Promise<CreatorMetrics> {
    try {
      const [
        tokensCreated,
        successfulTokens,
        totalMarketCap,
        averageTokenAge,
        totalFeesEarned,
      ] = await this.callMethod("getCreatorMetrics", [creator], chainId);

      return {
        tokensCreated: BigInt(tokensCreated.toString()),
        successfulTokens: BigInt(successfulTokens.toString()),
        totalMarketCap: BigInt(totalMarketCap.toString()),
        averageTokenAge: BigInt(averageTokenAge.toString()),
        totalFeesEarned: BigInt(totalFeesEarned.toString()),
      };
    } catch (error) {
      throw new Error(`Failed to get creator metrics: ${error}`);
    }
  }

  // ==================== Advanced Analytics ====================

  /**
   * Get comprehensive analytics summary
   */
  async getAnalyticsSummary(chainId?: number): Promise<AnalyticsSummary> {
    try {
      const [factoryAnalytics, platformMetrics] = await Promise.all([
        this.getFactoryAnalytics(chainId),
        this.getPlatformMetrics(chainId),
      ]);

      // Get top creators (this would require additional contract methods in production)
      const topCreators: Array<{ address: string; metrics: CreatorMetrics }> =
        [];

      // Calculate performance indicators
      const platformGrowthRate = this.calculateGrowthRate(
        platformMetrics.totalTokensCreated,
        platformMetrics.avgTokenAge
      );

      const tokenSuccessRate = Number(factoryAnalytics.successRate);

      const averageTokenLifespan =
        Number(platformMetrics.avgTokenAge) / (24 * 60 * 60); // Convert to days

      return {
        factoryAnalytics,
        platformMetrics,
        topCreators,
        performanceIndicators: {
          platformGrowthRate,
          tokenSuccessRate,
          averageTokenLifespan,
          totalValueLocked: platformMetrics.totalVolumeTraded,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get analytics summary: ${error}`);
    }
  }

  /**
   * Get token factory address
   */
  async getTokenFactory(chainId?: number): Promise<string> {
    try {
      return await this.callMethod("tokenFactory", [], chainId);
    } catch (error) {
      throw new Error(`Failed to get token factory address: ${error}`);
    }
  }

  // ==================== Utility Functions ====================

  /**
   * Calculate platform growth rate based on token creation
   */
  private calculateGrowthRate(totalTokens: bigint, avgAge: bigint): number {
    if (avgAge === BigInt(0)) return 0;

    // Calculate tokens per day
    const avgAgeDays = Number(avgAge) / (24 * 60 * 60);
    const tokensPerDay = Number(totalTokens) / avgAgeDays;

    // Return as percentage growth rate (simplified calculation)
    return Math.round((tokensPerDay / Number(totalTokens)) * 100 * 100) / 100;
  }

  /**
   * Format metrics for display
   */
  formatAnalyticsForDisplay(analytics: AnalyticsSummary): {
    factory: Record<string, string>;
    platform: Record<string, string>;
    performance: Record<string, string>;
  } {
    return {
      factory: {
        avgTokensPerCreator: `${
          Number(analytics.factoryAnalytics.avgTokensPerCreator) / 1000
        }`,
        successRate: `${analytics.factoryAnalytics.successRate}%`,
        totalMarketCap: `${this.formatEther(
          analytics.factoryAnalytics.totalMarketCap
        )} ETH`,
      },
      platform: {
        totalTokensCreated:
          analytics.platformMetrics.totalTokensCreated.toString(),
        activeTokens: analytics.platformMetrics.activeTokens.toString(),
        totalVolumeTraded: `${this.formatEther(
          analytics.platformMetrics.totalVolumeTraded
        )} ETH`,
        avgTokenAge: `${Math.round(
          Number(analytics.platformMetrics.avgTokenAge) / (24 * 60 * 60)
        )} days`,
        topTokenMarketCap: `${this.formatEther(
          analytics.platformMetrics.topTokenMarketCap
        )} ETH`,
      },
      performance: {
        platformGrowthRate: `${analytics.performanceIndicators.platformGrowthRate}%`,
        tokenSuccessRate: `${analytics.performanceIndicators.tokenSuccessRate}%`,
        averageTokenLifespan: `${Math.round(
          analytics.performanceIndicators.averageTokenLifespan
        )} days`,
        totalValueLocked: `${this.formatEther(
          analytics.performanceIndicators.totalValueLocked
        )} ETH`,
      },
    };
  }

  /**
   * Format Wei to Ether string
   */
  private formatEther(wei: bigint): string {
    const ether = Number(wei) / 1e18;
    if (ether < 0.001) return ether.toExponential(2);
    if (ether < 1) return ether.toFixed(4);
    if (ether < 1000) return ether.toFixed(2);
    if (ether < 1000000) return `${(ether / 1000).toFixed(1)}K`;
    return `${(ether / 1000000).toFixed(1)}M`;
  }

  /**
   * Compare creator performance
   */
  async compareCreators(
    creators: string[],
    chainId?: number
  ): Promise<
    Array<{ address: string; metrics: CreatorMetrics; rank: number }>
  > {
    try {
      const creatorMetrics = await Promise.all(
        creators.map(async (creator) => ({
          address: creator,
          metrics: await this.getCreatorMetrics(creator, chainId),
        }))
      );

      // Sort by total market cap (could be customized)
      creatorMetrics.sort(
        (a, b) =>
          Number(b.metrics.totalMarketCap) - Number(a.metrics.totalMarketCap)
      );

      // Add rankings
      return creatorMetrics.map((creator, index) => ({
        ...creator,
        rank: index + 1,
      }));
    } catch (error) {
      throw new Error(`Failed to compare creators: ${error}`);
    }
  }

  /**
   * Get success rate by time period
   */
  async getSuccessRateTrend(
    periodDays: number = 30,
    chainId?: number
  ): Promise<
    Array<{ date: string; successRate: number; tokensCreated: number }>
  > {
    // This would require additional contract functionality to track historical data
    // For now, return current success rate
    try {
      const analytics = await this.getFactoryAnalytics(chainId);
      const currentDate = new Date().toISOString().split("T")[0];

      return [
        {
          date: currentDate,
          successRate: Number(analytics.successRate),
          tokensCreated: Number(analytics.avgTokensPerCreator),
        },
      ];
    } catch (error) {
      throw new Error(`Failed to get success rate trend: ${error}`);
    }
  }

  /**
   * Calculate creator success score
   */
  calculateCreatorScore(metrics: CreatorMetrics): number {
    const tokensCreated = Number(metrics.tokensCreated);
    const successfulTokens = Number(metrics.successfulTokens);
    const totalMarketCap = Number(metrics.totalMarketCap) / 1e18; // Convert to Ether
    const totalFeesEarned = Number(metrics.totalFeesEarned) / 1e18;

    if (tokensCreated === 0) return 0;

    // Weighted scoring system
    const successRateScore = (successfulTokens / tokensCreated) * 30; // 30% weight
    const marketCapScore = Math.min(totalMarketCap / 1000, 30); // 30% weight, capped at 1000 ETH
    const feesScore = Math.min(totalFeesEarned / 100, 25); // 25% weight, capped at 100 ETH
    const volumeScore = Math.min(tokensCreated / 10, 15); // 15% weight, capped at 10 tokens

    return Math.round(
      successRateScore + marketCapScore + feesScore + volumeScore
    );
  }

  /**
   * Get analytics health check
   */
  async getAnalyticsHealth(chainId?: number): Promise<{
    isHealthy: boolean;
    issues: string[];
    lastUpdate: number;
  }> {
    try {
      const platformMetrics = await this.getPlatformMetrics(chainId);
      const issues: string[] = [];

      // Check for potential issues
      if (platformMetrics.activeTokens === BigInt(0)) {
        issues.push("No active tokens detected");
      }

      if (platformMetrics.totalVolumeTraded === BigInt(0)) {
        issues.push("No trading volume recorded");
      }

      const activeRatio =
        Number(platformMetrics.activeTokens) /
        Number(platformMetrics.totalTokensCreated);
      if (activeRatio < 0.1) {
        issues.push("Low token activity ratio (< 10%)");
      }

      return {
        isHealthy: issues.length === 0,
        issues,
        lastUpdate: Math.floor(Date.now() / 1000),
      };
    } catch (error) {
      return {
        isHealthy: false,
        issues: [`Analytics service error: ${error}`],
        lastUpdate: Math.floor(Date.now() / 1000),
      };
    }
  }
}

// Export singleton instance
export const tokenAnalyticsService = new TokenAnalyticsService();
export default tokenAnalyticsService;
