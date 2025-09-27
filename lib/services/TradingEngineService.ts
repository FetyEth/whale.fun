import {
  Contract,
  ContractTransactionResponse,
  EventLog,
  parseUnits,
  formatUnits,
  keccak256,
  solidityPacked,
} from "ethers";
import {
  BaseContractService,
  TransactionOptions,
  EventFilterOptions,
  ContractConfig,
} from "./BaseContractService";
import TradingEngineABI from "@/config/abi/TradingEngine.json";

/**
 * Trading pair information interface
 */
export interface TradingPair {
  pairId: string;
  tokenA: string;
  tokenB: string;
  reserveA: bigint;
  reserveB: bigint;
  totalSupply: bigint;
  lastTradeTime: bigint;
  isActive: boolean;
}

/**
 * Fee structure interface
 */
export interface FeeStructure {
  baseFee: number;
  maxFee: number;
  creatorShare: number;
  platformShare: number;
  stakingShare: number;
}

/**
 * Token statistics interface
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
 * Trade result interface
 */
export interface TradeResult {
  amountOut: bigint;
  fee: bigint;
  priceImpact: number;
  txHash: string;
}

/**
 * Liquidity provision result interface
 */
export interface LiquidityResult {
  liquidity: bigint;
  amountA: bigint;
  amountB: bigint;
  txHash: string;
}

/**
 * Trading parameters interface
 */
export interface TradeParams {
  pairId: string;
  tokenIn: string;
  amountIn: bigint;
  amountOutMin: bigint;
  deadline?: number;
  slippageTolerance?: number;
}

/**
 * Liquidity parameters interface
 */
export interface LiquidityParams {
  pairId: string;
  amountADesired: bigint;
  amountBDesired: bigint;
  amountAMin: bigint;
  amountBMin: bigint;
  deadline?: number;
}

/**
 * Price calculation result
 */
export interface PriceInfo {
  price: bigint;
  priceImpact: number;
  fee: bigint;
  minAmountOut: bigint;
}

/**
 * TradingEngine contract deployment configuration
 */
const TRADING_ENGINE_CONFIG: ContractConfig = {
  name: "TradingEngine",
  abi: TradingEngineABI,
  deployments: {
    84532: {
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
 * TradingEngine Service
 * Provides comprehensive AMM trading functionality with dynamic fees and liquidity management
 */
export class TradingEngineService extends BaseContractService {
  constructor() {
    super(TRADING_ENGINE_CONFIG);
  }

  // ==================== Trading Pair Management ====================

  /**
   * Create a new trading pair
   */
  async createPair(
    tokenA: string,
    tokenB: string,
    options?: TransactionOptions
  ): Promise<{ pairId: string; txHash: string }> {
    try {
      const tx = await this.executeMethod(
        "createPair",
        [tokenA, tokenB],
        options
      );
      const receipt = await this.waitForConfirmation(tx);

      // Extract pairId from events or calculate it
      const pairId = this.calculatePairId(tokenA, tokenB);

      return {
        pairId,
        txHash: receipt.hash,
      };
    } catch (error) {
      throw new Error(`Failed to create trading pair: ${error}`);
    }
  }

  /**
   * Calculate pair ID for two tokens
   */
  calculatePairId(tokenA: string, tokenB: string): string {
    return keccak256(solidityPacked(["address", "address"], [tokenA, tokenB]));
  }

  /**
   * Get trading pair information
   */
  async getPairInfo(pairId: string): Promise<TradingPair> {
    try {
      const [tokenA, tokenB, reserveA, reserveB, totalSupply, isActive] =
        await this.callMethod("getPairInfo", [pairId]);

      const pair = await this.callMethod("tradingPairs", [pairId]);

      return {
        pairId,
        tokenA,
        tokenB,
        reserveA: BigInt(reserveA.toString()),
        reserveB: BigInt(reserveB.toString()),
        totalSupply: BigInt(totalSupply.toString()),
        lastTradeTime: BigInt(pair.lastTradeTime.toString()),
        isActive,
      };
    } catch (error) {
      throw new Error(`Failed to get pair info: ${error}`);
    }
  }

  /**
   * Get all trading pairs
   */
  async getAllPairs(): Promise<TradingPair[]> {
    try {
      const contract = await this.getContract();
      const pairCount = await contract.allPairs.length;
      const pairs: TradingPair[] = [];

      for (let i = 0; i < pairCount; i++) {
        const pairId = await this.callMethod("allPairs", [i]);
        const pairInfo = await this.getPairInfo(pairId);
        pairs.push(pairInfo);
      }

      return pairs;
    } catch (error) {
      throw new Error(`Failed to get all pairs: ${error}`);
    }
  }

  // ==================== Liquidity Management ====================

  /**
   * Add liquidity to a trading pair
   */
  async addLiquidity(
    params: LiquidityParams,
    options?: TransactionOptions
  ): Promise<LiquidityResult> {
    try {
      const tx = await this.executeMethod(
        "addLiquidity",
        [
          params.pairId,
          params.amountADesired,
          params.amountBDesired,
          params.amountAMin,
          params.amountBMin,
        ],
        options
      );

      const receipt = await this.waitForConfirmation(tx);

      // Parse events to get actual amounts and liquidity
      const liquidityAddedEvent = receipt.logs.find(
        (log) => (log as EventLog).eventName === "LiquidityAdded"
      ) as EventLog;

      if (liquidityAddedEvent) {
        return {
          liquidity: BigInt(liquidityAddedEvent.args[4].toString()),
          amountA: BigInt(liquidityAddedEvent.args[2].toString()),
          amountB: BigInt(liquidityAddedEvent.args[3].toString()),
          txHash: receipt.hash,
        };
      }

      throw new Error("LiquidityAdded event not found");
    } catch (error) {
      throw new Error(`Failed to add liquidity: ${error}`);
    }
  }

  /**
   * Remove liquidity from a trading pair
   */
  async removeLiquidity(
    pairId: string,
    liquidity: bigint,
    amountAMin: bigint,
    amountBMin: bigint,
    options?: TransactionOptions
  ): Promise<LiquidityResult> {
    try {
      const tx = await this.executeMethod(
        "removeLiquidity",
        [pairId, liquidity, amountAMin, amountBMin],
        options
      );

      const receipt = await this.waitForConfirmation(tx);

      // Parse events to get actual amounts
      const liquidityRemovedEvent = receipt.logs.find(
        (log) => (log as EventLog).eventName === "LiquidityRemoved"
      ) as EventLog;

      if (liquidityRemovedEvent) {
        return {
          liquidity,
          amountA: BigInt(liquidityRemovedEvent.args[2].toString()),
          amountB: BigInt(liquidityRemovedEvent.args[3].toString()),
          txHash: receipt.hash,
        };
      }

      throw new Error("LiquidityRemoved event not found");
    } catch (error) {
      throw new Error(`Failed to remove liquidity: ${error}`);
    }
  }

  /**
   * Get user's liquidity balance for a pair
   */
  async getLiquidityBalance(pairId: string, user: string): Promise<bigint> {
    try {
      const balance = await this.callMethod("liquidityBalances", [
        pairId,
        user,
      ]);
      return BigInt(balance.toString());
    } catch (error) {
      throw new Error(`Failed to get liquidity balance: ${error}`);
    }
  }

  // ==================== Trading Functions ====================

  /**
   * Execute a trade
   */
  async trade(
    params: TradeParams,
    options?: TransactionOptions
  ): Promise<TradeResult> {
    try {
      // Get quote first to calculate price impact
      const quote = await this.getQuote(
        params.pairId,
        params.tokenIn,
        params.amountIn
      );

      const tx = await this.executeMethod(
        "trade",
        [params.pairId, params.tokenIn, params.amountIn, params.amountOutMin],
        options
      );

      const receipt = await this.waitForConfirmation(tx);

      // Parse trade event
      const tradeEvent = receipt.logs.find(
        (log) => (log as EventLog).eventName === "Trade"
      ) as EventLog;

      if (tradeEvent) {
        return {
          amountOut: BigInt(tradeEvent.args[4].toString()),
          fee: BigInt(tradeEvent.args[5].toString()),
          priceImpact: quote.priceImpact,
          txHash: receipt.hash,
        };
      }

      throw new Error("Trade event not found");
    } catch (error) {
      throw new Error(`Failed to execute trade: ${error}`);
    }
  }

  /**
   * Get quote for a trade
   */
  async getQuote(
    pairId: string,
    tokenIn: string,
    amountIn: bigint
  ): Promise<PriceInfo> {
    try {
      // Get pair info
      const pair = await this.getPairInfo(pairId);

      // Calculate dynamic fee
      const dynamicFee = await this.callMethod("calculateDynamicFee", [
        tokenIn,
      ]);
      const fee = BigInt(dynamicFee.toString());

      // Calculate output amount (simplified AMM formula)
      const isTokenA = tokenIn.toLowerCase() === pair.tokenA.toLowerCase();
      const reserveIn = isTokenA ? pair.reserveA : pair.reserveB;
      const reserveOut = isTokenA ? pair.reserveB : pair.reserveA;

      const amountInWithFee =
        (amountIn * (BigInt(10000) - fee)) / BigInt(10000);
      const amountOut =
        (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee);

      // Calculate price impact
      const priceImpact = Number((amountIn * BigInt(10000)) / reserveIn) / 100; // Simplified price impact calculation

      // Calculate minimum amount out with slippage
      const slippage = 50; // 0.5% default slippage
      const minAmountOut =
        (amountOut * BigInt(10000 - slippage)) / BigInt(10000);

      return {
        price: amountOut,
        priceImpact,
        fee: (amountIn * fee) / BigInt(10000),
        minAmountOut,
      };
    } catch (error) {
      throw new Error(`Failed to get quote: ${error}`);
    }
  }

  // ==================== Statistics and Analytics ====================

  /**
   * Get token statistics
   */
  async getTokenStats(token: string): Promise<TokenStats> {
    try {
      const [
        totalVolume,
        dailyVolume,
        priceChange24h,
        allTimeHigh,
        allTimeLow,
        lastPrice,
      ] = await this.callMethod("getTokenStats", [token]);

      return {
        totalVolume: BigInt(totalVolume.toString()),
        dailyVolume: BigInt(dailyVolume.toString()),
        priceChange24h: BigInt(priceChange24h.toString()),
        allTimeHigh: BigInt(allTimeHigh.toString()),
        allTimeLow: BigInt(allTimeLow.toString()),
        lastPrice: BigInt(lastPrice.toString()),
        marketCap: BigInt(0), // Would need additional calculation
      };
    } catch (error) {
      throw new Error(`Failed to get token stats: ${error}`);
    }
  }

  /**
   * Get creator earnings
   */
  async getCreatorEarnings(creator: string): Promise<bigint> {
    try {
      const earnings = await this.callMethod("creatorEarnings", [creator]);
      return BigInt(earnings.toString());
    } catch (error) {
      throw new Error(`Failed to get creator earnings: ${error}`);
    }
  }

  /**
   * Get total fees generated for a token
   */
  async getTotalFeesGenerated(token: string): Promise<bigint> {
    try {
      const fees = await this.callMethod("totalFeesGenerated", [token]);
      return BigInt(fees.toString());
    } catch (error) {
      throw new Error(`Failed to get total fees generated: ${error}`);
    }
  }

  /**
   * Get platform revenue
   */
  async getPlatformRevenue(): Promise<bigint> {
    try {
      const revenue = await this.callMethod("platformRevenue");
      return BigInt(revenue.toString());
    } catch (error) {
      throw new Error(`Failed to get platform revenue: ${error}`);
    }
  }

  /**
   * Get staking rewards
   */
  async getStakingRewards(): Promise<bigint> {
    try {
      const rewards = await this.callMethod("stakingRewards");
      return BigInt(rewards.toString());
    } catch (error) {
      throw new Error(`Failed to get staking rewards: ${error}`);
    }
  }

  // ==================== Fee Management ====================

  /**
   * Get current fee structure
   */
  async getFeeStructure(): Promise<FeeStructure> {
    try {
      const fees = await this.callMethod("fees");

      return {
        baseFee: Number(fees.baseFee),
        maxFee: Number(fees.maxFee),
        creatorShare: Number(fees.creatorShare),
        platformShare: Number(fees.platformShare),
        stakingShare: Number(fees.stakingShare),
      };
    } catch (error) {
      throw new Error(`Failed to get fee structure: ${error}`);
    }
  }

  /**
   * Calculate dynamic fee for a token
   */
  async calculateDynamicFee(token: string): Promise<number> {
    try {
      const fee = await this.callMethod("calculateDynamicFee", [token]);
      return Number(fee);
    } catch (error) {
      throw new Error(`Failed to calculate dynamic fee: ${error}`);
    }
  }

  // ==================== Admin Functions ====================

  /**
   * Update fee structure (admin only)
   */
  async updateFees(
    baseFee: number,
    maxFee: number,
    creatorShare: number,
    platformShare: number,
    stakingShare: number,
    options?: TransactionOptions
  ): Promise<string> {
    try {
      const tx = await this.executeMethod(
        "updateFees",
        [baseFee, maxFee, creatorShare, platformShare, stakingShare],
        options
      );

      const receipt = await this.waitForConfirmation(tx);
      return receipt.hash;
    } catch (error) {
      throw new Error(`Failed to update fees: ${error}`);
    }
  }

  /**
   * Withdraw platform revenue (admin only)
   */
  async withdrawPlatformRevenue(options?: TransactionOptions): Promise<string> {
    try {
      const tx = await this.executeMethod(
        "withdrawPlatformRevenue",
        [],
        options
      );
      const receipt = await this.waitForConfirmation(tx);
      return receipt.hash;
    } catch (error) {
      throw new Error(`Failed to withdraw platform revenue: ${error}`);
    }
  }

  /**
   * Distribute staking rewards (admin only)
   */
  async distributeStakingRewards(
    options?: TransactionOptions
  ): Promise<string> {
    try {
      const tx = await this.executeMethod(
        "distributeStakingRewards",
        [],
        options
      );
      const receipt = await this.waitForConfirmation(tx);
      return receipt.hash;
    } catch (error) {
      throw new Error(`Failed to distribute staking rewards: ${error}`);
    }
  }

  // ==================== Event Listeners ====================

  /**
   * Listen for trade events
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
    options?: EventFilterOptions
  ): Promise<void> {
    await this.listenToEvent("Trade", (event: EventLog) => {
      const args = event.args;
      callback(
        args[0], // trader
        args[1], // tokenIn
        args[2], // tokenOut
        BigInt(args[3].toString()), // amountIn
        BigInt(args[4].toString()), // amountOut
        BigInt(args[5].toString()), // fee
        BigInt(args[6].toString()) // timestamp
      );
    });
  }

  /**
   * Listen for liquidity added events
   */
  async onLiquidityAdded(
    callback: (
      provider: string,
      pairId: string,
      amountA: bigint,
      amountB: bigint,
      liquidity: bigint
    ) => void,
    options?: EventFilterOptions
  ): Promise<void> {
    await this.listenToEvent("LiquidityAdded", (event: EventLog) => {
      const args = event.args;
      callback(
        args[0], // provider
        args[1], // pairId
        BigInt(args[2].toString()), // amountA
        BigInt(args[3].toString()), // amountB
        BigInt(args[4].toString()) // liquidity
      );
    });
  }

  /**
   * Listen for liquidity removed events
   */
  async onLiquidityRemoved(
    callback: (
      provider: string,
      pairId: string,
      amountA: bigint,
      amountB: bigint,
      liquidity: bigint
    ) => void,
    options?: EventFilterOptions
  ): Promise<void> {
    await this.listenToEvent("LiquidityRemoved", (event: EventLog) => {
      const args = event.args;
      callback(
        args[0], // provider
        args[1], // pairId
        BigInt(args[2].toString()), // amountA
        BigInt(args[3].toString()), // amountB
        BigInt(args[4].toString()) // liquidity
      );
    });
  }

  // ==================== Utility Functions ====================

  /**
   * Format token amount for display
   */
  formatTokenAmount(amount: bigint, decimals: number = 18): string {
    return formatUnits(amount, decimals);
  }

  /**
   * Parse token amount from string
   */
  parseTokenAmount(amount: string, decimals: number = 18): bigint {
    return parseUnits(amount, decimals);
  }

  /**
   * Calculate price impact percentage
   */
  calculatePriceImpact(
    amountIn: bigint,
    reserveIn: bigint,
    reserveOut: bigint
  ): number {
    // Simplified price impact calculation
    const priceImpact = (Number(amountIn) / Number(reserveIn)) * 100;
    return Math.min(priceImpact, 100); // Cap at 100%
  }

  /**
   * Get optimal trading route (for future multi-hop implementation)
   */
  async getOptimalRoute(
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint
  ): Promise<{ path: string[]; expectedOutput: bigint }> {
    // For now, assume direct pair exists
    // Future implementation could include multi-hop routing
    return {
      path: [tokenIn, tokenOut],
      expectedOutput: BigInt(0), // Would calculate based on available pairs
    };
  }

  /**
   * Estimate gas for trade
   */
  async estimateTradeGas(params: TradeParams): Promise<bigint> {
    try {
      const contract = await this.getContract();
      const gasEstimate = await contract.trade.estimateGas(
        params.pairId,
        params.tokenIn,
        params.amountIn,
        params.amountOutMin
      );
      return BigInt(gasEstimate.toString());
    } catch (error) {
      throw new Error(`Failed to estimate trade gas: ${error}`);
    }
  }
}
