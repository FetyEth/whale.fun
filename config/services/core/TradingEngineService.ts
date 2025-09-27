import { ContractTransactionResponse } from "ethers";
import {
  BaseContractService,
  TransactionOptions,
} from "@/lib/services/BaseContractService";
import TradingEngineABI from "../../abi/TradingEngine.json";

/**
 * Trading Pair interface based on contract struct
 */
export interface TradingPair {
  tokenA: string;
  tokenB: string;
  reserveA: bigint;
  reserveB: bigint;
  totalSupply: bigint;
  lastTradeTime: bigint;
  isActive: boolean;
}

/**
 * Token Statistics interface based on contract struct
 */
export interface TokenStats {
  totalVolume: bigint;
  dailyVolume: bigint;
  priceChange24h: bigint;
  allTimeHigh: bigint;
  allTimeLow: bigint;
  lastPrice: bigint;
  marketCap: bigint;
}

/**
 * Fee Structure interface based on contract struct
 */
export interface FeeStructure {
  baseFee: bigint;
  maxFee: bigint;
  creatorShare: bigint;
  platformShare: bigint;
  stakingShare: bigint;
}

/**
 * TradingEngine Service
 * Handles all interactions with the TradingEngine contract
 */
export class TradingEngineService extends BaseContractService {
  constructor() {
    super({
      name: "TradingEngine",
      abi: TradingEngineABI,
      deployments: {
        84532: {
          address: "0x37fabbc03ffb620c7ea9ff9f533d7d422ea95cd0",
          deployedAt: 0,
          verified: false,
        },
      },
    });
  }

  // ==================== PAIR MANAGEMENT ====================

  /**
   * Create a new trading pair
   */
  async createPair(
    tokenA: string,
    tokenB: string,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod("createPair", [tokenA, tokenB], options, chainId);
  }

  /**
   * Get pair information
   */
  async getPairInfo(pairId: string, chainId?: number): Promise<TradingPair> {
    const result = await this.callMethod("getPairInfo", [pairId], chainId);
    return {
      tokenA: result[0],
      tokenB: result[1],
      reserveA: result[2],
      reserveB: result[3],
      totalSupply: result[4],
      lastTradeTime: result[5],
      isActive: result[6],
    };
  }

  /**
   * Get all trading pairs
   */
  async getAllPairs(chainId?: number): Promise<string[]> {
    return this.callMethod<string[]>("allPairs", [], chainId);
  }

  // ==================== LIQUIDITY MANAGEMENT ====================

  /**
   * Add liquidity to a trading pair
   */
  async addLiquidity(
    tokenA: string,
    tokenB: string,
    amountA: bigint,
    amountB: bigint,
    minAmountA: bigint,
    minAmountB: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod(
      "addLiquidity",
      [tokenA, tokenB, amountA, amountB, minAmountA, minAmountB],
      options,
      chainId
    );
  }

  /**
   * Remove liquidity from a trading pair
   */
  async removeLiquidity(
    tokenA: string,
    tokenB: string,
    liquidity: bigint,
    minAmountA: bigint,
    minAmountB: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod(
      "removeLiquidity",
      [tokenA, tokenB, liquidity, minAmountA, minAmountB],
      options,
      chainId
    );
  }

  /**
   * Get liquidity balance for a user in a specific pair
   */
  async getLiquidityBalance(
    pairId: string,
    user: string,
    chainId?: number
  ): Promise<bigint> {
    return this.callMethod<bigint>(
      "liquidityBalances",
      [pairId, user],
      chainId
    );
  }

  // ==================== TRADING FUNCTIONS ====================

  /**
   * Execute a trade
   */
  async trade(
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
    minAmountOut: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod(
      "trade",
      [tokenIn, tokenOut, amountIn, minAmountOut],
      options,
      chainId
    );
  }

  /**
   * Calculate dynamic fee for a token
   */
  async calculateDynamicFee(token: string, chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("calculateDynamicFee", [token], chainId);
  }

  // ==================== STATISTICS ====================

  /**
   * Get token statistics
   */
  async getTokenStats(token: string, chainId?: number): Promise<TokenStats> {
    const result = await this.callMethod("getTokenStats", [token], chainId);
    return {
      totalVolume: result[0],
      dailyVolume: result[1],
      priceChange24h: result[2],
      allTimeHigh: result[3],
      allTimeLow: result[4],
      lastPrice: result[5],
      marketCap: result[6],
    };
  }

  /**
   * Get token volume in 24h
   */
  async getTokenVolume24h(token: string, chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("tokenVolume24h", [token], chainId);
  }

  /**
   * Get token holder count
   */
  async getTokenHolderCount(token: string, chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("tokenHolderCount", [token], chainId);
  }

  // ==================== FEE MANAGEMENT ====================

  /**
   * Get current fee structure
   */
  async getFees(chainId?: number): Promise<FeeStructure> {
    const result = await this.callMethod("fees", [], chainId);
    return {
      baseFee: result[0],
      maxFee: result[1],
      creatorShare: result[2],
      platformShare: result[3],
      stakingShare: result[4],
    };
  }

  /**
   * Update fees (admin only)
   */
  async updateFees(
    baseFee: bigint,
    maxFee: bigint,
    creatorShare: bigint,
    platformShare: bigint,
    stakingShare: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod(
      "updateFees",
      [baseFee, maxFee, creatorShare, platformShare, stakingShare],
      options,
      chainId
    );
  }

  /**
   * Get creator earnings
   */
  async getCreatorEarnings(creator: string, chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("creatorEarnings", [creator], chainId);
  }

  /**
   * Get total fees generated for a token
   */
  async getTotalFeesGenerated(
    token: string,
    chainId?: number
  ): Promise<bigint> {
    return this.callMethod<bigint>("totalFeesGenerated", [token], chainId);
  }

  // ==================== ADMIN FUNCTIONS ====================

  /**
   * Withdraw platform revenue (admin only)
   */
  async withdrawPlatformRevenue(
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod("withdrawPlatformRevenue", [], options, chainId);
  }

  /**
   * Distribute staking rewards (admin only)
   */
  async distributeStakingRewards(
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod("distributeStakingRewards", [], options, chainId);
  }

  /**
   * Get platform revenue
   */
  async getPlatformRevenue(chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("platformRevenue", [], chainId);
  }

  /**
   * Get staking rewards
   */
  async getStakingRewards(chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("stakingRewards", [], chainId);
  }

  // ==================== CONTRACT ADDRESSES ====================

  /**
   * Get WhaleToken contract address
   */
  async getWhaleTokenAddress(chainId?: number): Promise<string> {
    return this.callMethod<string>("whaleToken", [], chainId);
  }

  /**
   * Get TokenFactory contract address
   */
  async getTokenFactoryAddress(chainId?: number): Promise<string> {
    return this.callMethod<string>("tokenFactory", [], chainId);
  }

  // ==================== EVENTS ====================

  /**
   * Listen to Trade events
   */
  async onTrade(
    callback: (
      trader: string,
      tokenIn: string,
      tokenOut: string,
      amountIn: bigint,
      amountOut: bigint,
      fee: bigint,
      timestamp: bigint
    ) => void,
    chainId?: number
  ) {
    return this.listenToEvent(
      "Trade",
      (event: any) => {
        callback(
          event.args.trader,
          event.args.tokenIn,
          event.args.tokenOut,
          event.args.amountIn,
          event.args.amountOut,
          event.args.fee,
          event.args.timestamp
        );
      },
      chainId
    );
  }

  /**
   * Listen to LiquidityAdded events
   */
  async onLiquidityAdded(
    callback: (
      provider: string,
      pairId: string,
      amountA: bigint,
      amountB: bigint,
      liquidity: bigint
    ) => void,
    chainId?: number
  ) {
    return this.listenToEvent(
      "LiquidityAdded",
      (event: any) => {
        callback(
          event.args.provider,
          event.args.pairId,
          event.args.amountA,
          event.args.amountB,
          event.args.liquidity
        );
      },
      chainId
    );
  }

  /**
   * Listen to LiquidityRemoved events
   */
  async onLiquidityRemoved(
    callback: (
      provider: string,
      pairId: string,
      amountA: bigint,
      amountB: bigint,
      liquidity: bigint
    ) => void,
    chainId?: number
  ) {
    return this.listenToEvent(
      "LiquidityRemoved",
      (event: any) => {
        callback(
          event.args.provider,
          event.args.pairId,
          event.args.amountA,
          event.args.amountB,
          event.args.liquidity
        );
      },
      chainId
    );
  }

  /**
   * Get Trade events
   */
  async getTradeEvents(
    fromBlock: number = -10000,
    toBlock?: number,
    chainId?: number
  ) {
    return this.getEvents("Trade", { fromBlock, toBlock }, chainId);
  }

  /**
   * Get LiquidityAdded events
   */
  async getLiquidityEvents(
    fromBlock: number = -10000,
    toBlock?: number,
    chainId?: number
  ) {
    return this.getEvents("LiquidityAdded", { fromBlock, toBlock }, chainId);
  }
}
