import { ContractTransactionResponse } from "ethers";
import {
  BaseContractService,
  TransactionOptions,
} from "@/lib/services/BaseContractService";
import TokenFactoryABI from "../../abi/TokenFactory.json";

/**
 * Token creation parameters
 */
export interface TokenCreationParams {
  name: string;
  symbol: string;
  totalSupply: bigint;
  targetMarketCap: bigint;
  creatorFeePercent: bigint;
  description: string;
  logoUrl: string;
  websiteUrl?: string;
  telegramUrl?: string;
  twitterUrl?: string;
}

/**
 * Factory statistics interface
 */
export interface FactoryStats {
  totalTokensCreated: bigint;
  totalVolumeTraded: bigint;
  totalFeesCollected: bigint;
  launchFee: bigint;
  minInitialLiquidity: bigint;
  maxTokensPerCreator: bigint;
}

/**
 * Factory analytics interface
 */
export interface FactoryAnalytics {
  dailyTokensCreated: bigint;
  weeklyTokensCreated: bigint;
  monthlyTokensCreated: bigint;
  averageMarketCap: bigint;
  topPerformingTokens: string[];
  totalUniqueCreators: bigint;
}

/**
 * Platform metrics interface
 */
export interface PlatformMetrics {
  totalTradingVolume: bigint;
  totalLiquidityLocked: bigint;
  averageTokenHolders: bigint;
  successfulLaunches: bigint;
  averageTimeToLiquidity: bigint;
  platformFeeRevenue: bigint;
}

/**
 * Creator metrics interface
 */
export interface CreatorMetrics {
  totalTokensCreated: bigint;
  totalVolumeGenerated: bigint;
  totalFeesEarned: bigint;
  successRate: bigint;
  averageMarketCap: bigint;
  lastTokenCreated: bigint;
}

/**
 * TokenFactory Service
 * Handles all interactions with the TokenFactory contract
 */
export class TokenFactoryService extends BaseContractService {
  constructor() {
    super({
      name: "TokenFactory",
      abi: TokenFactoryABI,
      deployments: {
        // Add your deployment addresses here
        // 1: { // Ethereum Mainnet
        //   address: "0x...",
        //   deployedAt: 1234567890,
        //   verified: true
        // },
      },
    });
  }

  // ==================== TOKEN CREATION ====================

  /**
   * Create a new token with basic parameters
   */
  async createToken(
    params: TokenCreationParams,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod(
      "createToken",
      [
        params.name,
        params.symbol,
        params.totalSupply,
        params.targetMarketCap,
        params.creatorFeePercent,
        params.description,
        params.logoUrl,
      ],
      options,
      chainId
    );
  }

  /**
   * Create a token with community size data for optimal curve selection
   */
  async createTokenWithCommunityData(
    params: TokenCreationParams,
    expectedCommunitySize: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod(
      "createTokenWithCommunityData",
      [
        params.name,
        params.symbol,
        params.totalSupply,
        params.targetMarketCap,
        params.creatorFeePercent,
        params.description,
        params.logoUrl,
        expectedCommunitySize,
      ],
      options,
      chainId
    );
  }

  // ==================== TOKEN QUERIES ====================

  /**
   * Get all tokens created by a specific creator
   */
  async getCreatorTokens(creator: string, chainId?: number): Promise<string[]> {
    return this.callMethod<string[]>("getCreatorTokens", [creator], chainId);
  }

  /**
   * Get all tokens created in the factory
   */
  async getAllTokens(chainId?: number): Promise<string[]> {
    return this.callMethod<string[]>("getAllTokens", [], chainId);
  }

  /**
   * Get the creator of a specific token
   */
  async getTokenCreator(token: string, chainId?: number): Promise<string> {
    return this.callMethod<string>("tokenToCreator", [token], chainId);
  }

  /**
   * Get the launch time of a specific token
   */
  async getTokenLaunchTime(token: string, chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("tokenToLaunchTime", [token], chainId);
  }

  /**
   * Get number of tokens created by a creator
   */
  async getCreatorTokenCount(
    creator: string,
    chainId?: number
  ): Promise<bigint> {
    return this.callMethod<bigint>("creatorTokenCount", [creator], chainId);
  }

  /**
   * Get last token creation time for a creator
   */
  async getLastTokenCreation(
    creator: string,
    chainId?: number
  ): Promise<bigint> {
    return this.callMethod<bigint>("lastTokenCreation", [creator], chainId);
  }

  // ==================== FACTORY STATISTICS ====================

  /**
   * Get basic factory statistics
   */
  async getFactoryStats(chainId?: number): Promise<FactoryStats> {
    const result = await this.callMethod("getFactoryStats", [], chainId);
    return {
      totalTokensCreated: result[0],
      totalVolumeTraded: result[1],
      totalFeesCollected: result[2],
      launchFee: result[3],
      minInitialLiquidity: result[4],
      maxTokensPerCreator: result[5],
    };
  }

  /**
   * Get advanced factory analytics
   */
  async getFactoryAnalytics(chainId?: number): Promise<FactoryAnalytics> {
    const result = await this.callMethod("getFactoryAnalytics", [], chainId);
    return {
      dailyTokensCreated: result[0],
      weeklyTokensCreated: result[1],
      monthlyTokensCreated: result[2],
      averageMarketCap: result[3],
      topPerformingTokens: result[4],
      totalUniqueCreators: result[5],
    };
  }

  /**
   * Get platform metrics
   */
  async getPlatformMetrics(chainId?: number): Promise<PlatformMetrics> {
    const result = await this.callMethod("getPlatformMetrics", [], chainId);
    return {
      totalTradingVolume: result[0],
      totalLiquidityLocked: result[1],
      averageTokenHolders: result[2],
      successfulLaunches: result[3],
      averageTimeToLiquidity: result[4],
      platformFeeRevenue: result[5],
    };
  }

  /**
   * Get metrics for a specific creator
   */
  async getCreatorMetrics(
    creator: string,
    chainId?: number
  ): Promise<CreatorMetrics> {
    const result = await this.callMethod(
      "getCreatorMetrics",
      [creator],
      chainId
    );
    return {
      totalTokensCreated: result[0],
      totalVolumeGenerated: result[1],
      totalFeesEarned: result[2],
      successRate: result[3],
      averageMarketCap: result[4],
      lastTokenCreated: result[5],
    };
  }

  // ==================== FACTORY CONFIGURATION ====================

  /**
   * Get current launch fee
   */
  async getLaunchFee(chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("launchFee", [], chainId);
  }

  /**
   * Get minimum initial liquidity requirement
   */
  async getMinInitialLiquidity(chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("minInitialLiquidity", [], chainId);
  }

  /**
   * Get maximum tokens per creator limit
   */
  async getMaxTokensPerCreator(chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("maxTokensPerCreator", [], chainId);
  }

  /**
   * Get creation cooldown period
   */
  async getCreationCooldown(chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("CREATION_COOLDOWN", [], chainId);
  }

  /**
   * Get WhaleToken contract address
   */
  async getWhaleTokenAddress(chainId?: number): Promise<string> {
    return this.callMethod<string>("whaleToken", [], chainId);
  }

  // ==================== ADMIN FUNCTIONS ====================

  /**
   * Set launch fee (admin only)
   */
  async setLaunchFee(
    newFee: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod("setLaunchFee", [newFee], options, chainId);
  }

  /**
   * Set minimum initial liquidity (admin only)
   */
  async setMinInitialLiquidity(
    newMin: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod(
      "setMinInitialLiquidity",
      [newMin],
      options,
      chainId
    );
  }

  /**
   * Set maximum tokens per creator (admin only)
   */
  async setMaxTokensPerCreator(
    newMax: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod(
      "setMaxTokensPerCreator",
      [newMax],
      options,
      chainId
    );
  }

  /**
   * Withdraw platform fees (admin only)
   */
  async withdrawFees(
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod("withdrawFees", [], options, chainId);
  }

  // ==================== FACTORY TOTALS ====================

  /**
   * Get total tokens created
   */
  async getTotalTokensCreated(chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("totalTokensCreated", [], chainId);
  }

  /**
   * Get total volume traded
   */
  async getTotalVolumeTraded(chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("totalVolumeTraded", [], chainId);
  }

  /**
   * Get total fees collected by the factory
   */
  async getTotalFeesCollected(chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("totalFeesCollected", [], chainId);
  }

  /**
   * Get unique creators array
   */
  async getUniqueCreators(chainId?: number): Promise<string[]> {
    return this.callMethod<string[]>("uniqueCreators", [], chainId);
  }

  /**
   * Get unique token count for a creator
   */
  async getCreatorUniqueTokens(
    creator: string,
    chainId?: number
  ): Promise<bigint> {
    return this.callMethod<bigint>("creatorUniqueTokens", [creator], chainId);
  }

  // ==================== HELPER FUNCTIONS ====================

  /**
   * Check if a creator can create a new token (considering cooldown and limits)
   */
  async canCreatorCreateToken(
    creator: string,
    chainId?: number
  ): Promise<boolean> {
    const [tokenCount, maxTokens, lastCreation, cooldown] = await Promise.all([
      this.getCreatorTokenCount(creator, chainId),
      this.getMaxTokensPerCreator(chainId),
      this.getLastTokenCreation(creator, chainId),
      this.getCreationCooldown(chainId),
    ]);

    const now = BigInt(Math.floor(Date.now() / 1000));
    const canCreateByCount = tokenCount < maxTokens;
    const canCreateByCooldown = now >= lastCreation + cooldown;

    return canCreateByCount && canCreateByCooldown;
  }

  /**
   * Calculate total cost to create a token (including fees and minimum liquidity)
   */
  async calculateTokenCreationCost(chainId?: number): Promise<bigint> {
    const [launchFee, minLiquidity] = await Promise.all([
      this.getLaunchFee(chainId),
      this.getMinInitialLiquidity(chainId),
    ]);

    return launchFee + minLiquidity;
  }

  // ==================== EVENTS ====================

  /**
   * Listen to TokenCreated events
   */
  async onTokenCreated(
    callback: (
      token: string,
      creator: string,
      name: string,
      symbol: string,
      totalSupply: bigint,
      timestamp: bigint
    ) => void,
    chainId?: number
  ) {
    return this.listenToEvent(
      "TokenCreated",
      (event: any) => {
        callback(
          event.args.token,
          event.args.creator,
          event.args.name,
          event.args.symbol,
          event.args.totalSupply,
          event.args.timestamp
        );
      },
      chainId
    );
  }

  /**
   * Listen to LaunchFeeUpdated events
   */
  async onLaunchFeeUpdated(
    callback: (oldFee: bigint, newFee: bigint) => void,
    chainId?: number
  ) {
    return this.listenToEvent(
      "LaunchFeeUpdated",
      (event: any) => {
        callback(event.args.oldFee, event.args.newFee);
      },
      chainId
    );
  }

  /**
   * Get TokenCreated events
   */
  async getTokenCreatedEvents(
    fromBlock: number = -10000,
    toBlock?: number,
    chainId?: number
  ) {
    return this.getEvents("TokenCreated", { fromBlock, toBlock }, chainId);
  }
}
