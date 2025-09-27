import { ContractTransactionResponse } from "ethers";
import { TransactionOptions } from "@/lib/services/BaseContractService";
import {
  TokenFactoryService,
  GraduationInfo,
  GraduationThresholds,
} from "./TokenFactoryService";
import {
  Zer0dexV3Service,
  createZer0dexV3Service,
  SupportedChainId,
} from "./zer0dexV3Service";

/**
 * Default graduation thresholds in USD
 */
export const DEFAULT_GRADUATION_CONFIG = {
  MARKET_CAP_USD: 20, // $20 market cap for graduation
  VOLUME_USD: 10, // $10 daily volume requirement
  HOLDERS: 50, // 50 unique holders requirement
  ETH_PRICE_USD: 2000, // Default ETH price for conversions
};

/**
 * Token Graduation Service
 * Handles token graduation from bonding curve to full AMM
 *
 * Features:
 * - $20 default graduation threshold (configurable)
 * - Dynamic threshold adjustment
 * - Graduation eligibility checking
 * - Progress tracking
 * - Event monitoring
 */
export class TokenGraduationService {
  private tokenFactoryService: TokenFactoryService;
  private zer0dexService: Zer0dexV3Service;
  private chainId: SupportedChainId;

  constructor(chainId: SupportedChainId = 16661) {
    // Default to 0G mainnet
    this.tokenFactoryService = new TokenFactoryService();
    this.zer0dexService = createZer0dexV3Service(chainId);
    this.chainId = chainId;
  }

  // ==================== GRADUATION CORE ====================

  /**
   * Check if a token can graduate (meets all criteria)
   */
  async canTokenGraduate(
    tokenAddress: string,
    chainId?: SupportedChainId
  ): Promise<{
    eligible: boolean;
    reasons: string[];
    info: GraduationInfo;
  }> {
    const info = await this.tokenFactoryService.getGraduationInfo(
      tokenAddress,
      chainId
    );
    const reasons: string[] = [];

    if (info.isGraduated) {
      return {
        eligible: false,
        reasons: ["Token has already graduated"],
        info,
      };
    }

    // Check market cap
    if (info.currentMarketCap < info.thresholdMarketCap) {
      const needed = info.thresholdMarketCap - info.currentMarketCap;
      reasons.push(
        `Market cap too low. Need ${this.formatEther(needed)} ETH more`
      );
    }

    // Check holder count
    if (info.currentHolders < info.thresholdHolders) {
      const needed = info.thresholdHolders - info.currentHolders;
      reasons.push(`Need ${needed} more holders`);
    }

    // Check volume
    if (info.currentVolume < info.thresholdVolume) {
      const needed = info.thresholdVolume - info.currentVolume;
      reasons.push(`Need ${this.formatEther(needed)} ETH more daily volume`);
    }

    return {
      eligible: info.isEligible,
      reasons:
        reasons.length > 0 ? reasons : ["Token meets all graduation criteria!"],
      info,
    };
  }

  /**
   * Graduate a token with comprehensive validation and Zer0dex integration
   */
  async graduateTokenSafely(
    tokenAddress: string,
    options: TransactionOptions = {},
    chainId?: SupportedChainId
  ): Promise<{
    success: boolean;
    txHash?: string;
    liquidityPair?: string;
    poolAddress?: string;
    zer0dexIntegrated?: boolean;
    error?: string;
  }> {
    try {
      // Pre-flight checks
      const eligibilityCheck = await this.canTokenGraduate(
        tokenAddress,
        chainId
      );

      if (!eligibilityCheck.eligible) {
        return {
          success: false,
          error: `Token not eligible for graduation: ${eligibilityCheck.reasons.join(
            ", "
          )}`,
        };
      }

      // Check Zer0dex integration approval
      const zer0dexApproval = await this.zer0dexService.checkInternalApproval();
      if (!zer0dexApproval.approved) {
        console.warn(
          "Zer0dex integration not fully approved:",
          zer0dexApproval.reasons
        );
      }

      // Execute graduation on TokenFactory with Zer0dex router
      const zer0dexRouter = this.zer0dexService.getContractAddresses().router;
      if (!zer0dexRouter) {
        throw new Error("Zer0dex router address not found for current network");
      }

      const tx = await this.tokenFactoryService.graduateToken(
        tokenAddress,
        zer0dexRouter,
        options,
        chainId
      );

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      let poolAddress: string | undefined;
      let zer0dexIntegrated = false;

      // Create Zer0dex pool if approved
      if (zer0dexApproval.approved) {
        try {
          const tokenAddresses = this.zer0dexService.getTokenAddresses(chainId);
          const poolResult = await this.zer0dexService.createGraduationPool(
            tokenAddress,
            tokenAddresses.ETH, // Use ETH as base pair
            3000, // 0.3% fee
            undefined, // Let market determine initial price
            options,
            chainId
          );
          poolAddress = poolResult.poolAddress;
          zer0dexIntegrated = true;
          console.log(`Zer0dex pool created at: ${poolAddress}`);
        } catch (error) {
          console.warn("Failed to create Zer0dex pool:", error);
        }
      }

      // Extract liquidity pair from events
      const graduationEvent = receipt?.logs?.find(
        (log: any) => log.topics && log.topics[0] === "0x..." // TokenGraduated event signature
      );

      const liquidityPair =
        graduationEvent && "args" in graduationEvent
          ? (graduationEvent as any).args?.liquidityPair
          : undefined;

      return {
        success: true,
        txHash: receipt?.hash,
        liquidityPair,
        poolAddress,
        zer0dexIntegrated,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Unknown error during graduation",
      };
    }
  }

  /**
   * Set custom graduation threshold (in USD equivalent)
   * Default is $20 USD for token graduation
   */
  async setCustomGraduationThreshold(
    tokenAddress: string,
    thresholdUSD: number = 20, // Default $20 USD graduation threshold
    ethPriceUSD: number = 2000, // Current ETH price for conversion
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    // Validate threshold amount
    if (thresholdUSD <= 0) {
      throw new Error("Graduation threshold must be positive");
    }

    if (thresholdUSD < 10) {
      console.warn(
        "Graduation threshold below $10 may cause frequent graduations"
      );
    }

    // Convert USD to ETH (with 18 decimals)
    const thresholdETH = BigInt(
      Math.floor((thresholdUSD / ethPriceUSD) * 1e18)
    );

    // Log the conversion for transparency
    console.log(
      `Setting graduation threshold: $${thresholdUSD} USD = ${
        Number(thresholdETH) / 1e18
      } ETH`
    );

    return this.tokenFactoryService.setGraduationThreshold(
      tokenAddress,
      thresholdETH,
      options,
      chainId
    );
  }

  /**
   * Set dynamic graduation threshold based on market conditions
   */
  async setDynamicGraduationThreshold(
    tokenAddress: string,
    config: {
      baseUSD: number; // Base threshold in USD (default $20)
      volatilityMultiplier?: number; // Adjust based on market volatility
      volumeMultiplier?: number; // Adjust based on trading volume
      communityMultiplier?: number; // Adjust based on community size
    },
    ethPriceUSD: number = 2000,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<{
    finalThresholdUSD: number;
    finalThresholdETH: bigint;
    txResponse: ContractTransactionResponse;
  }> {
    const {
      baseUSD = 20,
      volatilityMultiplier = 1.0,
      volumeMultiplier = 1.0,
      communityMultiplier = 1.0,
    } = config;

    // Calculate dynamic threshold
    let finalThresholdUSD =
      baseUSD * volatilityMultiplier * volumeMultiplier * communityMultiplier;

    // Apply bounds to prevent extreme values
    finalThresholdUSD = Math.max(10, Math.min(1000, finalThresholdUSD)); // Between $10 and $1000

    const finalThresholdETH = BigInt(
      Math.floor((finalThresholdUSD / ethPriceUSD) * 1e18)
    );

    console.log(
      `Dynamic graduation threshold calculated: $${finalThresholdUSD.toFixed(
        2
      )} USD`
    );
    console.log(
      `Factors: volatility=${volatilityMultiplier}, volume=${volumeMultiplier}, community=${communityMultiplier}`
    );

    const txResponse = await this.tokenFactoryService.setGraduationThreshold(
      tokenAddress,
      finalThresholdETH,
      options,
      chainId
    );

    return {
      finalThresholdUSD,
      finalThresholdETH,
      txResponse,
    };
  }

  // ==================== GRADUATION ANALYTICS ====================

  /**
   * Get detailed graduation progress with analytics
   */
  async getGraduationProgress(
    tokenAddress: string,
    chainId?: number
  ): Promise<{
    progress: {
      marketCapProgress: number;
      holderProgress: number;
      volumeProgress: number;
      overallProgress: number;
    };
    info: GraduationInfo;
    timeToGraduation?: string;
    recommendedActions: string[];
  }> {
    const progress = await this.tokenFactoryService.getGraduationProgress(
      tokenAddress,
      chainId
    );
    const info = await this.tokenFactoryService.getGraduationInfo(
      tokenAddress,
      chainId
    );

    const recommendedActions: string[] = [];

    if (progress.marketCapProgress < 100) {
      recommendedActions.push("Increase trading activity and token price");
    }
    if (progress.holderProgress < 100) {
      recommendedActions.push("Engage more community members to buy tokens");
    }
    if (progress.volumeProgress < 100) {
      recommendedActions.push("Encourage more frequent trading");
    }

    // Estimate time to graduation (simplified)
    let timeToGraduation: string | undefined;
    if (progress.overallProgress < 100) {
      const daysRemaining = Math.ceil((100 - progress.overallProgress) / 2); // Rough estimate
      timeToGraduation = `Approximately ${daysRemaining} days at current pace`;
    }

    return {
      progress,
      info,
      timeToGraduation,
      recommendedActions,
    };
  }

  /**
   * Get all tokens nearing graduation
   */
  async getTokensNearingGraduation(
    minProgress: number = 70, // Tokens that are 70%+ towards graduation
    chainId?: number
  ): Promise<
    Array<{
      tokenAddress: string;
      progress: number;
      info: GraduationInfo;
    }>
  > {
    const allTokens = await this.tokenFactoryService.getAllTokens(chainId);
    const nearingGraduation: Array<{
      tokenAddress: string;
      progress: number;
      info: GraduationInfo;
    }> = [];

    for (const tokenAddress of allTokens) {
      try {
        const info = await this.tokenFactoryService.getGraduationInfo(
          tokenAddress,
          chainId
        );

        if (!info.isGraduated) {
          const progress = await this.tokenFactoryService.getGraduationProgress(
            tokenAddress,
            chainId
          );

          if (progress.overallProgress >= minProgress) {
            nearingGraduation.push({
              tokenAddress,
              progress: progress.overallProgress,
              info,
            });
          }
        }
      } catch (error) {
        // Skip tokens with errors
        console.warn(
          `Error checking graduation for token ${tokenAddress}:`,
          error
        );
      }
    }

    // Sort by progress (highest first)
    return nearingGraduation.sort((a, b) => b.progress - a.progress);
  }

  // ==================== THRESHOLD MANAGEMENT ====================

  /**
   * Get current default graduation thresholds in USD
   * Now defaults to $20 USD graduation threshold
   */
  async getDefaultThresholdsUSD(
    ethPriceUSD: number = DEFAULT_GRADUATION_CONFIG.ETH_PRICE_USD,
    chainId?: number
  ): Promise<{
    marketCapUSD: number;
    volumeUSD: number;
    holders: number;
    recommendedUSD: typeof DEFAULT_GRADUATION_CONFIG;
  }> {
    const thresholds =
      await this.tokenFactoryService.getDefaultGraduationThresholds(chainId);

    return {
      marketCapUSD:
        (Number(thresholds.defaultMarketCapThreshold) * ethPriceUSD) / 1e18,
      volumeUSD:
        (Number(thresholds.defaultVolumeThreshold) * ethPriceUSD) / 1e18,
      holders: Number(thresholds.defaultHolderThreshold),
      recommendedUSD: DEFAULT_GRADUATION_CONFIG, // Include recommended $20 thresholds
    };
  }

  /**
   * Update default graduation thresholds (admin only)
   * Use recommended $20 USD graduation threshold by default
   */
  async updateDefaultThresholds(
    marketCapUSD: number = DEFAULT_GRADUATION_CONFIG.MARKET_CAP_USD,
    volumeUSD: number = DEFAULT_GRADUATION_CONFIG.VOLUME_USD,
    holders: number = DEFAULT_GRADUATION_CONFIG.HOLDERS,
    ethPriceUSD: number = DEFAULT_GRADUATION_CONFIG.ETH_PRICE_USD,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    // Validate inputs
    if (marketCapUSD < 5) {
      throw new Error("Market cap threshold too low, minimum $5 USD required");
    }

    if (holders < 10) {
      throw new Error("Holder threshold too low, minimum 10 holders required");
    }

    const marketCapETH = BigInt(
      Math.floor((marketCapUSD / ethPriceUSD) * 1e18)
    );
    const volumeETH = BigInt(Math.floor((volumeUSD / ethPriceUSD) * 1e18));

    console.log(
      `Updating graduation thresholds to: $${marketCapUSD} market cap, $${volumeUSD} volume, ${holders} holders`
    );

    return this.tokenFactoryService.setDefaultGraduationThresholds(
      marketCapETH,
      volumeETH,
      BigInt(holders),
      options,
      chainId
    );
  }

  // ==================== EVENT MONITORING ====================

  /**
   * Listen for token graduations with rich data
   */
  async onTokenGraduation(
    callback: (graduationData: {
      tokenAddress: string;
      creator: string;
      finalMarketCapUSD: number;
      liquidityPair: string;
      timestamp: Date;
    }) => void,
    ethPriceUSD: number = 2000,
    chainId?: number
  ) {
    return this.tokenFactoryService.onTokenGraduated(
      (token, creator, finalMarketCap, liquidityPair, timestamp) => {
        const finalMarketCapUSD = (Number(finalMarketCap) * ethPriceUSD) / 1e18;

        callback({
          tokenAddress: token,
          creator,
          finalMarketCapUSD,
          liquidityPair,
          timestamp: new Date(Number(timestamp) * 1000),
        });
      },
      chainId
    );
  }

  // ==================== HELPER METHODS ====================

  private formatEther(value: bigint): string {
    return (Number(value) / 1e18).toFixed(4);
  }

  /**
   * Quick helper to check if any token is ready to graduate
   */
  async hasTokensReadyToGraduate(chainId?: number): Promise<boolean> {
    const allTokens = await this.tokenFactoryService.getAllTokens(chainId);

    for (const tokenAddress of allTokens.slice(0, 10)) {
      // Check first 10 for performance
      try {
        const eligible = await this.tokenFactoryService.isEligibleForGraduation(
          tokenAddress,
          chainId
        );
        if (eligible) return true;
      } catch (error) {
        // Continue checking other tokens
      }
    }

    return false;
  }
}

// Export singleton instance
export const tokenGraduationService = new TokenGraduationService();
export default tokenGraduationService;
