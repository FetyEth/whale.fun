import { Contract, ContractTransactionResponse, EventLog } from "ethers";
import {
  BaseContractService,
  TransactionOptions,
  EventFilterOptions,
  ContractConfig,
} from "./BaseContractService";
import CreatorTokenABI from "@/config/abi/CreatorToken.json";

/**
 * Token statistics interface
 */
export interface TokenStats {
  totalSupply: bigint;
  totalSold: bigint;
  currentPrice: bigint;
  marketCap: bigint;
  holderCount: bigint;
  creatorFees: bigint;
}

/**
 * Risk assessment interface
 */
export interface RiskAssessment {
  riskLevel: RiskLevel;
  riskScore: bigint;
}

/**
 * Risk level enumeration
 */
export enum RiskLevel {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  CRITICAL = 3,
}

/**
 * Curve parameters interface
 */
export interface CurveParams {
  curveType: CurveType;
  initialPrice: bigint;
  finalPrice: bigint;
  steepness: bigint;
  inflectionPoint: bigint;
  reserveRatio: bigint;
  virtualBalance: bigint;
}

/**
 * Curve type enumeration
 */
export enum CurveType {
  LINEAR = 0,
  EXPONENTIAL = 1,
  LOGARITHMIC = 2,
  POLYNOMIAL = 3,
  SIGMOID = 4,
}

/**
 * MEV configuration interface
 */
export interface MEVConfig {
  maxSlippage: bigint;
  priceImpactThreshold: bigint;
  timeWindow: bigint;
  maxTransactionSize: bigint;
  commitRevealDelay: bigint;
  sandwichProtectionEnabled: boolean;
  frontRunningProtectionEnabled: boolean;
}

/**
 * Rate limit interface
 */
export interface RateLimit {
  totalVolume: bigint;
  lastResetTime: bigint;
  transactionCount: bigint;
}

/**
 * Transaction commit interface
 */
export interface TransactionCommit {
  commitHash: string;
  commitTime: bigint;
  user: string;
  revealed: boolean;
  executed: boolean;
}

/**
 * CreatorToken contract deployment configuration
 */
const CREATOR_TOKEN_CONFIG: ContractConfig = {
  name: "CreatorToken",
  abi: CreatorTokenABI,
  deployments: {
    // Note: CreatorToken is deployed dynamically by TokenFactory
    // These are placeholder entries for common networks
    84532: {
      address: "0x0000000000000000000000000000000000000000", // Placeholder
      deployedAt: 0,
      verified: false,
    },
  },
};

/**
 * CreatorToken Service
 * Provides functionality for individual creator tokens including:
 * - Token trading with bonding curves
 * - MEV protection
 * - Risk assessment
 * - Fee management
 * - Liquidity operations
 */
export class CreatorTokenService extends BaseContractService {
  private tokenAddress: string;

  constructor(tokenAddress: string) {
    super(CREATOR_TOKEN_CONFIG);
    this.tokenAddress = tokenAddress;
  }

  /**
   * Override getContract to use the specific token address
   */
  protected async getContract(chainId?: number): Promise<Contract> {
    const instance = await this.initialize(chainId);
    // Create contract with the specific token address
    return new Contract(this.tokenAddress, this.config.abi, instance.signer);
  }

  // ==================== ERC20 Operations ====================

  /**
   * Get token name
   */
  async getName(chainId?: number): Promise<string> {
    return await this.callMethod("name", [], chainId);
  }

  /**
   * Get token symbol
   */
  async getSymbol(chainId?: number): Promise<string> {
    return await this.callMethod("symbol", [], chainId);
  }

  /**
   * Get token decimals
   */
  async getDecimals(chainId?: number): Promise<number> {
    return await this.callMethod("decimals", [], chainId);
  }

  /**
   * Get total supply
   */
  async getTotalSupply(chainId?: number): Promise<bigint> {
    return await this.callMethod("totalSupply", [], chainId);
  }

  /**
   * Get balance of address
   */
  async getBalance(address: string, chainId?: number): Promise<bigint> {
    return await this.callMethod("balanceOf", [address], chainId);
  }

  // ==================== Token Information ====================

  /**
   * Get creator address
   */
  async getCreator(chainId?: number): Promise<string> {
    return await this.callMethod("creator", [], chainId);
  }

  /**
   * Get factory address
   */
  async getFactory(chainId?: number): Promise<string> {
    return await this.callMethod("factory", [], chainId);
  }

  /**
   * Get whale token address
   */
  async getWhaleToken(chainId?: number): Promise<string> {
    return await this.callMethod("whaleToken", [], chainId);
  }

  /**
   * Get token launch time
   */
  async getTokenLaunchTime(chainId?: number): Promise<bigint> {
    return await this.callMethod("tokenLaunchTime", [], chainId);
  }

  /**
   * Get token description
   */
  async getDescription(chainId?: number): Promise<string> {
    return await this.callMethod("description", [], chainId);
  }

  /**
   * Get logo URL
   */
  async getLogoUrl(chainId?: number): Promise<string> {
    return await this.callMethod("logoUrl", [], chainId);
  }

  /**
   * Get website URL
   */
  async getWebsiteUrl(chainId?: number): Promise<string> {
    return await this.callMethod("websiteUrl", [], chainId);
  }

  /**
   * Get telegram URL
   */
  async getTelegramUrl(chainId?: number): Promise<string> {
    return await this.callMethod("telegramUrl", [], chainId);
  }

  /**
   * Get twitter URL
   */
  async getTwitterUrl(chainId?: number): Promise<string> {
    return await this.callMethod("twitterUrl", [], chainId);
  }

  // ==================== Bonding Curve Operations ====================

  /**
   * Buy tokens using bonding curve
   */
  async buyTokens(
    tokenAmount: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    const cost = await this.calculateBuyCost(tokenAmount, chainId);
    const txOptions = { ...options, value: cost };
    return await this.executeMethod(
      "buyTokens",
      [tokenAmount],
      txOptions,
      chainId
    );
  }

  /**
   * Buy tokens with commit-reveal scheme
   */
  async buyTokensWithCommit(
    tokenAmount: bigint,
    nonce: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    const cost = await this.calculateBuyCost(tokenAmount, chainId);
    const txOptions = { ...options, value: cost };
    return await this.executeMethod(
      "buyTokensWithCommit",
      [tokenAmount, nonce],
      txOptions,
      chainId
    );
  }

  /**
   * Sell tokens back to bonding curve
   */
  async sellTokens(
    tokenAmount: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return await this.executeMethod(
      "sellTokens",
      [tokenAmount],
      options,
      chainId
    );
  }

  /**
   * Calculate cost to buy tokens
   */
  async calculateBuyCost(
    tokenAmount: bigint,
    chainId?: number
  ): Promise<bigint> {
    return await this.callMethod("calculateBuyCost", [tokenAmount], chainId);
  }

  /**
   * Calculate proceeds from selling tokens
   */
  async calculateSellPrice(
    tokenAmount: bigint,
    chainId?: number
  ): Promise<bigint> {
    return await this.callMethod("calculateSellPrice", [tokenAmount], chainId);
  }

  /**
   * Get current token price
   */
  async getCurrentPrice(chainId?: number): Promise<bigint> {
    return await this.callMethod("getCurrentPrice", [], chainId);
  }

  // ==================== Token Statistics ====================

  /**
   * Get comprehensive token statistics
   */
  async getTokenStats(chainId?: number): Promise<TokenStats> {
    const result = await this.callMethod("getTokenStats", [], chainId);
    return {
      totalSupply: result[0],
      totalSold: result[1],
      currentPrice: result[2],
      marketCap: result[3],
      holderCount: result[4],
      creatorFees: result[5],
    };
  }

  /**
   * Get total sold tokens
   */
  async getTotalSold(chainId?: number): Promise<bigint> {
    return await this.callMethod("totalSold", [], chainId);
  }

  /**
   * Get market cap
   */
  async getMarketCap(chainId?: number): Promise<bigint> {
    return await this.callMethod("marketCap", [], chainId);
  }

  /**
   * Get holder count
   */
  async getHolderCount(chainId?: number): Promise<bigint> {
    return await this.callMethod("holderCount", [], chainId);
  }

  /**
   * Get daily volume
   */
  async getDailyVolume(chainId?: number): Promise<bigint> {
    return await this.callMethod("dailyVolume", [], chainId);
  }

  /**
   * Get holder balance
   */
  async getHolderBalance(holder: string, chainId?: number): Promise<bigint> {
    return await this.callMethod("holderBalances", [holder], chainId);
  }

  // ==================== Fee Management ====================

  /**
   * Get total fees collected
   */
  async getTotalFeesCollected(chainId?: number): Promise<bigint> {
    return await this.callMethod("getTotalFeesCollected", [], chainId);
  }

  /**
   * Get creator fee percentage
   */
  async getCreatorFeePercent(chainId?: number): Promise<bigint> {
    return await this.callMethod("creatorFeePercent", [], chainId);
  }

  /**
   * Claim creator fees
   */
  async claimCreatorFees(
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return await this.executeMethod("claimCreatorFees", [], options, chainId);
  }

  // ==================== Liquidity Management ====================

  /**
   * Lock liquidity
   */
  async lockLiquidity(
    lockPeriod: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return await this.executeMethod(
      "lockLiquidity",
      [lockPeriod],
      options,
      chainId
    );
  }

  /**
   * Check if liquidity is locked
   */
  async isLiquidityLocked(chainId?: number): Promise<boolean> {
    return await this.callMethod("isLiquidityLocked", [], chainId);
  }

  /**
   * Get liquidity lock period
   */
  async getLiquidityLockPeriod(chainId?: number): Promise<bigint> {
    return await this.callMethod("liquidityLockPeriod", [], chainId);
  }

  // ==================== Risk Assessment ====================

  /**
   * Get risk assessment
   */
  async getRiskAssessment(chainId?: number): Promise<RiskAssessment> {
    const result = await this.callMethod("getRiskAssessment", [], chainId);
    return {
      riskLevel: result[0],
      riskScore: result[1],
    };
  }

  // ==================== Bonding Curve Configuration ====================

  /**
   * Get curve parameters
   */
  async getCurveParams(chainId?: number): Promise<CurveParams> {
    const result = await this.callMethod("curveParams", [], chainId);
    return {
      curveType: result[0],
      initialPrice: result[1],
      finalPrice: result[2],
      steepness: result[3],
      inflectionPoint: result[4],
      reserveRatio: result[5],
      virtualBalance: result[6],
    };
  }

  /**
   * Update bonding curve (creator only)
   */
  async updateBondingCurve(
    newCurveType: CurveType,
    newSteepness: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return await this.executeMethod(
      "updateBondingCurve",
      [newCurveType, newSteepness],
      options,
      chainId
    );
  }

  // ==================== MEV Protection ====================

  /**
   * Get MEV configuration
   */
  async getMEVConfig(chainId?: number): Promise<MEVConfig> {
    const result = await this.callMethod("mevConfig", [], chainId);
    return {
      maxSlippage: result[0],
      priceImpactThreshold: result[1],
      timeWindow: result[2],
      maxTransactionSize: result[3],
      commitRevealDelay: result[4],
      sandwichProtectionEnabled: result[5],
      frontRunningProtectionEnabled: result[6],
    };
  }

  /**
   * Get user rate limits
   */
  async getUserRateLimit(user: string, chainId?: number): Promise<RateLimit> {
    const result = await this.callMethod("userRateLimits", [user], chainId);
    return {
      totalVolume: result[0],
      lastResetTime: result[1],
      transactionCount: result[2],
    };
  }

  /**
   * Get last transaction block for user
   */
  async getLastTransactionBlock(
    user: string,
    chainId?: number
  ): Promise<bigint> {
    return await this.callMethod("lastTransactionBlock", [user], chainId);
  }

  /**
   * Commit token purchase
   */
  async commitTokenPurchase(
    commitHash: string,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return await this.executeMethod(
      "commitTokenPurchase",
      [commitHash],
      options,
      chainId
    );
  }

  /**
   * Get transaction commit
   */
  async getTransactionCommit(
    commitHash: string,
    chainId?: number
  ): Promise<TransactionCommit> {
    const result = await this.callMethod(
      "transactionCommits",
      [commitHash],
      chainId
    );
    return {
      commitHash: result[0],
      commitTime: result[1],
      user: result[2],
      revealed: result[3],
      executed: result[4],
    };
  }

  // ==================== Price History ====================

  /**
   * Get price history entry
   */
  async getPriceHistory(index: bigint, chainId?: number): Promise<bigint> {
    return await this.callMethod("priceHistory", [index], chainId);
  }

  /**
   * Get timestamp history entry
   */
  async getTimestampHistory(index: bigint, chainId?: number): Promise<bigint> {
    return await this.callMethod("timestampHistory", [index], chainId);
  }

  // ==================== Event Listening ====================

  /**
   * Listen to TokenPurchased events
   */
  async onTokenPurchased(
    callback: (event: EventLog) => void,
    chainId?: number
  ): Promise<void> {
    await this.listenToEvent("TokenPurchased", callback, chainId);
  }

  /**
   * Listen to TokenSold events
   */
  async onTokenSold(
    callback: (event: EventLog) => void,
    chainId?: number
  ): Promise<void> {
    await this.listenToEvent("TokenSold", callback, chainId);
  }

  /**
   * Listen to CreatorFeeClaimed events
   */
  async onCreatorFeeClaimed(
    callback: (event: EventLog) => void,
    chainId?: number
  ): Promise<void> {
    await this.listenToEvent("CreatorFeeClaimed", callback, chainId);
  }

  /**
   * Listen to LiquidityLocked events
   */
  async onLiquidityLocked(
    callback: (event: EventLog) => void,
    chainId?: number
  ): Promise<void> {
    await this.listenToEvent("LiquidityLocked", callback, chainId);
  }

  /**
   * Listen to BondingCurveUpdated events
   */
  async onBondingCurveUpdated(
    callback: (event: EventLog) => void,
    chainId?: number
  ): Promise<void> {
    await this.listenToEvent("BondingCurveUpdated", callback, chainId);
  }

  // ==================== Utility Methods ====================

  /**
   * Get token address
   */
  getTokenAddress(): string {
    return this.tokenAddress;
  }

  /**
   * Check if token is ready for graduation (market cap threshold)
   */
  async isReadyForGraduation(
    graduationThreshold: bigint,
    chainId?: number
  ): Promise<boolean> {
    const stats = await this.getTokenStats(chainId);
    return stats.marketCap >= graduationThreshold;
  }

  /**
   * Get trading volume in time period
   */
  async getTradingVolumeInPeriod(
    fromBlock: number,
    toBlock: number,
    chainId?: number
  ): Promise<{
    buyVolume: bigint;
    sellVolume: bigint;
    totalVolume: bigint;
  }> {
    const buyEvents = await this.getEvents(
      "TokenPurchased",
      { fromBlock, toBlock },
      chainId
    );
    const sellEvents = await this.getEvents(
      "TokenSold",
      { fromBlock, toBlock },
      chainId
    );

    let buyVolume = BigInt(0);
    let sellVolume = BigInt(0);

    buyEvents.forEach((event) => {
      if (event.args) {
        buyVolume += BigInt(event.args[3]); // totalPaid
      }
    });

    sellEvents.forEach((event) => {
      if (event.args) {
        sellVolume += BigInt(event.args[3]); // totalReceived
      }
    });

    return {
      buyVolume,
      sellVolume,
      totalVolume: buyVolume + sellVolume,
    };
  }
}

/**
 * Factory function to create CreatorToken service instance
 */
export const createCreatorTokenService = (tokenAddress: string) => {
  return new CreatorTokenService(tokenAddress);
};

export default CreatorTokenService;
