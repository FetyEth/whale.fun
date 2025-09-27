import { Contract, ContractTransactionResponse, EventLog } from "ethers";
import {
  BaseContractService,
  TransactionOptions,
  EventFilterOptions,
  ContractConfig,
} from "./BaseContractService";
import TokenGraduationABI from "@/config/abi/TokenGraduation.json";
import { CreatorTokenService } from "./CreatorTokenService";
import { TradingEngineService } from "./TradingEngineService";
import {
  Zer0dexV3Service,
  SupportedChainId,
} from "@/config/services/core/zer0dexV3Service";

/**
 * Graduation information interface
 */
export interface GraduationInfo {
  isGraduated: boolean;
  thresholdInUSD: bigint;
  thresholdInETH: bigint;
  currentMarketCap: bigint;
  readyForGraduation: boolean;
  liquidityPair: string;
}

/**
 * DEX configuration interface
 */
export interface DEXConfig {
  name: string;
  factoryAddress: string;
  routerAddress: string;
  quoterAddress?: string;
  multicallAddress?: string;
  nftPositionManagerAddress?: string;
  supportedFeeTiers: number[];
  isV3: boolean;
  chainId: number;
}

/**
 * Liquidity pool creation result
 */
export interface PoolCreationResult {
  poolAddress: string;
  txHash: string;
  tokenAmount: bigint;
  ethAmount: bigint;
  liquidityTokens?: bigint;
}

/**
 * Graduation parameters
 */
export interface GraduationParams {
  dexConfig: DEXConfig;
  feeTier?: number;
  initialPrice?: bigint;
  slippageTolerance?: number;
  deadline?: number;
}

/**
 * Supported DEX types
 */
export enum DEXType {
  UNISWAP_V2 = "UNISWAP_V2",
  UNISWAP_V3 = "UNISWAP_V3",
  SUSHISWAP = "SUSHISWAP",
  PANCAKESWAP = "PANCAKESWAP",
  ZER0DEX_V3 = "ZER0DEX_V3",
  TRADING_ENGINE = "TRADING_ENGINE",
  CUSTOM = "CUSTOM",
}

/**
 * TokenGraduation contract deployment configuration
 */
const TOKEN_GRADUATION_CONFIG: ContractConfig = {
  name: "TokenGraduation",
  abi: TokenGraduationABI,
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
 * Pre-configured DEX configurations for supported networks
 */
export const DEFAULT_DEX_CONFIGS: Record<number, DEXConfig[]> = {
  // 0G Mainnet
  16661: [
    {
      name: "TradingEngine",
      factoryAddress: "0x...", // TradingEngine contract address
      routerAddress: "0x...", // TradingEngine contract address (same as factory)
      supportedFeeTiers: [5, 30, 95], // baseFee, typical fee, maxFee (in basis points)
      isV3: false, // Custom AMM implementation
      chainId: 16661,
    },
    {
      name: "Zer0dex V3",
      factoryAddress: "0x7453582657F056ce5CfcEeE9E31E4BC390fa2b3c",
      routerAddress: "0xb95B5953FF8ee5D5d9818CdbEfE363ff2191318c",
      quoterAddress: "0x8d5E064d2EF44C29eE349e71CF70F751ECD62892",
      multicallAddress: "0xED0103a53069a347eD40290e0A069b46fd50Ba05",
      nftPositionManagerAddress: "0x44f24B66b3BAa3A784dBeee9bFE602f15A2Cc5d9",
      supportedFeeTiers: [500, 3000, 10000],
      isV3: true,
      chainId: 16661,
    },
  ],
  // 0G Testnet
  16600: [
    {
      name: "TradingEngine",
      factoryAddress: "0x...", // TradingEngine contract address
      routerAddress: "0x...", // TradingEngine contract address (same as factory)
      supportedFeeTiers: [5, 30, 95], // baseFee, typical fee, maxFee (in basis points)
      isV3: false, // Custom AMM implementation
      chainId: 16600,
    },
    {
      name: "Zer0dex V3",
      factoryAddress: "0x7453582657F056ce5CfcEeE9E31E4BC390fa2b3c",
      routerAddress: "0xb95B5953FF8ee5D5d9818CdbEfE363ff2191318c",
      quoterAddress: "0x8d5E064d2EF44C29eE349e71CF70F751ECD62892",
      multicallAddress: "0xED0103a53069a347eD40290e0A069b46fd50Ba05",
      nftPositionManagerAddress: "0x44f24B66b3BAa3A784dBeee9bFE602f15A2Cc5d9",
      supportedFeeTiers: [500, 3000, 10000],
      isV3: true,
      chainId: 16600,
    },
  ],
  // Base Sepolia (example)
  84532: [
    {
      name: "TradingEngine",
      factoryAddress: "0x...", // TradingEngine contract address
      routerAddress: "0x...", // TradingEngine contract address (same as factory)
      supportedFeeTiers: [5, 30, 95], // baseFee, typical fee, maxFee (in basis points)
      isV3: false, // Custom AMM implementation
      chainId: 84532,
    },
    {
      name: "Uniswap V3",
      factoryAddress: "0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24",
      routerAddress: "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4",
      quoterAddress: "0xC5290058841028F1614F3A6F0F5816cAd0df5E27",
      supportedFeeTiers: [100, 500, 3000, 10000],
      isV3: true,
      chainId: 84532,
    },
  ],
};

/**
 * TokenGraduation Service
 * Provides functionality for token graduation to DEX pools with dynamic DEX support
 */
export class TokenGraduationService extends BaseContractService {
  private dexServices: Map<string, any> = new Map();

  constructor() {
    super(TOKEN_GRADUATION_CONFIG);
    this.initializeDEXServices();
  }

  /**
   * Initialize DEX services for supported chains
   */
  private initializeDEXServices(): void {
    // Initialize Zer0dex V3 services
    this.dexServices.set("ZER0DEX_V3_16661", new Zer0dexV3Service(16661));
    this.dexServices.set("ZER0DEX_V3_16600", new Zer0dexV3Service(16600));

    // Initialize TradingEngine services
    this.dexServices.set("TRADING_ENGINE_16661", new TradingEngineService());
    this.dexServices.set("TRADING_ENGINE_16600", new TradingEngineService());
    this.dexServices.set("TRADING_ENGINE_84532", new TradingEngineService());
  }

  /**
   * Get DEX service for a specific configuration
   */
  private getDEXService(dexConfig: DEXConfig): any {
    const key = `${dexConfig.name.toUpperCase().replace(/\s+/g, "_")}_${
      dexConfig.chainId
    }`;

    if (this.dexServices.has(key)) {
      return this.dexServices.get(key);
    }

    // Create new service instance based on DEX type
    if (dexConfig.name.toLowerCase().includes("zer0dex")) {
      const service = new Zer0dexV3Service(
        dexConfig.chainId as SupportedChainId
      );
      this.dexServices.set(key, service);
      return service;
    } else if (dexConfig.name.toLowerCase().includes("tradingengine")) {
      const service = new TradingEngineService();
      this.dexServices.set(key, service);
      return service;
    }

    // Add support for other DEX types here
    throw new Error(`Unsupported DEX: ${dexConfig.name}`);
  }

  // ==================== Core Graduation Functions ====================

  /**
   * Get graduation threshold for a token
   */
  async getGraduationThreshold(
    token: string,
    chainId?: number
  ): Promise<bigint> {
    return await this.callMethod("getGraduationThreshold", [token], chainId);
  }

  /**
   * Set graduation threshold for a token (creator or owner only)
   */
  async setGraduationThreshold(
    token: string,
    thresholdInUSD: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return await this.executeMethod(
      "setGraduationThreshold",
      [token, thresholdInUSD],
      options,
      chainId
    );
  }

  /**
   * Check if token is ready for graduation
   */
  async isReadyForGraduation(
    token: string,
    chainId?: number
  ): Promise<boolean> {
    return await this.callMethod("isReadyForGraduation", [token], chainId);
  }

  /**
   * Check if token is eligible for graduation
   */
  async isEligibleForGraduation(
    token: string,
    chainId?: number
  ): Promise<boolean> {
    return await this.callMethod("isEligibleForGraduation", [token], chainId);
  }

  /**
   * Graduate token with dynamic DEX integration
   */
  async graduateTokenToDEX(
    token: string,
    params: GraduationParams,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<PoolCreationResult> {
    const targetChainId = chainId || params.dexConfig.chainId;

    // Validate token is eligible
    const isEligible = await this.isEligibleForGraduation(token, targetChainId);
    if (!isEligible) {
      throw new Error("Token is not eligible for graduation");
    }

    // Get token information
    const creatorTokenService = new CreatorTokenService(token);
    const tokenStats = await creatorTokenService.getTokenStats(targetChainId);

    // Calculate liquidity amounts
    const tokenAmount = tokenStats.totalSupply - tokenStats.totalSold;
    const ethAmount = BigInt(0); // Will be calculated based on bonding curve

    // Create pool using the appropriate DEX service
    const poolResult = await this.createDEXPool(
      token,
      params.dexConfig,
      tokenAmount,
      ethAmount,
      params,
      targetChainId
    );

    // Update contract state (if using smart contract graduation)
    try {
      const graduationTx = await this.executeMethod(
        "graduateToken",
        [token, params.dexConfig.routerAddress],
        options,
        targetChainId
      );

      return {
        ...poolResult,
        txHash: graduationTx.hash,
      };
    } catch (error) {
      console.warn("Contract graduation failed, but DEX pool created:", error);
      return poolResult;
    }
  }

  /**
   * Create DEX pool based on configuration
   */
  private async createDEXPool(
    token: string,
    dexConfig: DEXConfig,
    tokenAmount: bigint,
    ethAmount: bigint,
    params: GraduationParams,
    chainId: number
  ): Promise<PoolCreationResult> {
    const dexService = this.getDEXService(dexConfig);

    // Handle TradingEngine specifically
    if (dexConfig.name.toLowerCase().includes("tradingengine")) {
      return await this.createTradingEnginePool(
        token,
        dexService,
        dexConfig,
        tokenAmount,
        ethAmount,
        params,
        chainId
      );
    }

    if (dexConfig.isV3) {
      return await this.createV3Pool(
        token,
        dexService,
        dexConfig,
        tokenAmount,
        ethAmount,
        params,
        chainId
      );
    } else {
      return await this.createV2Pool(
        token,
        dexService,
        dexConfig,
        tokenAmount,
        ethAmount,
        params,
        chainId
      );
    }
  }

  /**
   * Create Uniswap V3 style pool
   */
  private async createV3Pool(
    token: string,
    dexService: any,
    dexConfig: DEXConfig,
    tokenAmount: bigint,
    ethAmount: bigint,
    params: GraduationParams,
    chainId: number
  ): Promise<PoolCreationResult> {
    // Get base token (usually ETH/WETH)
    const baseTokens = dexService.getTokenAddresses?.(chainId) || {};
    const baseToken = baseTokens.ETH || baseTokens.WETH || "";

    if (!baseToken) {
      throw new Error("No base token found for the network");
    }

    // Determine fee tier
    const feeTier =
      params.feeTier ||
      dexService.getOptimalFeeTier?.(token, baseToken) ||
      3000;

    // Create graduation pool
    const poolResult = await dexService.createGraduationPool(
      token,
      baseToken,
      feeTier,
      params.initialPrice,
      {},
      chainId
    );

    // Add initial liquidity if amounts are provided
    if (tokenAmount > 0 && ethAmount > 0) {
      await dexService.addGraduationLiquidity(
        token,
        baseToken,
        tokenAmount,
        ethAmount,
        feeTier,
        -887220, // Full range lower tick
        887220, // Full range upper tick
        {},
        chainId
      );
    }

    return {
      poolAddress: poolResult.poolAddress,
      txHash: poolResult.txHash,
      tokenAmount,
      ethAmount,
    };
  }

  /**
   * Create Uniswap V2 style pool
   */
  private async createV2Pool(
    token: string,
    dexService: any,
    dexConfig: DEXConfig,
    tokenAmount: bigint,
    ethAmount: bigint,
    params: GraduationParams,
    chainId: number
  ): Promise<PoolCreationResult> {
    // Implementation for V2 style DEXs
    throw new Error("V2 style DEX integration not implemented yet");
  }

  /**
   * Create TradingEngine pool for graduation
   */
  private async createTradingEnginePool(
    token: string,
    tradingEngineService: TradingEngineService,
    dexConfig: DEXConfig,
    tokenAmount: bigint,
    ethAmount: bigint,
    params: GraduationParams,
    chainId: number
  ): Promise<PoolCreationResult> {
    try {
      // Get base token (ETH/WETH equivalent for the chain)
      const baseToken = this.getBaseTokenForChain(chainId);

      // Create trading pair using TradingEngine
      const pairCreation = await tradingEngineService.createPair(
        token,
        baseToken,
        { gasLimit: BigInt(500000) } // Reasonable gas limit
      );

      let liquidityResult: any = null;

      // Add initial liquidity if amounts are provided
      if (tokenAmount > 0 && ethAmount > 0) {
        // Calculate minimum amounts with 5% slippage tolerance
        const slippageTolerance = params.slippageTolerance || 5;
        const amountAMin =
          (tokenAmount * BigInt(100 - slippageTolerance)) / BigInt(100);
        const amountBMin =
          (ethAmount * BigInt(100 - slippageTolerance)) / BigInt(100);

        liquidityResult = await tradingEngineService.addLiquidity(
          {
            pairId: pairCreation.pairId,
            amountADesired: tokenAmount,
            amountBDesired: ethAmount,
            amountAMin,
            amountBMin,
            deadline: params.deadline || Math.floor(Date.now() / 1000) + 3600, // 1 hour deadline
          },
          {
            gasLimit: BigInt(800000), // Higher gas limit for liquidity
            value: ethAmount, // Send ETH value
          }
        );
      }

      // Get the pair information to retrieve the pool address
      const pairInfo = await tradingEngineService.getPairInfo(
        pairCreation.pairId
      );

      return {
        poolAddress: pairCreation.pairId, // TradingEngine uses pairId as pool identifier
        txHash: liquidityResult?.txHash || pairCreation.txHash,
        tokenAmount: liquidityResult?.amountA || tokenAmount,
        ethAmount: liquidityResult?.amountB || ethAmount,
        liquidityTokens: liquidityResult?.liquidity,
      };
    } catch (error) {
      throw new Error(`Failed to create TradingEngine pool: ${error}`);
    }
  }

  /**
   * Get base token address for a specific chain
   */
  private getBaseTokenForChain(chainId: number): string {
    const baseTokens: Record<number, string> = {
      16661: "0x967F8799aF07dF1534d48A95a5C9FEBE92c53AE0", // WRBTC on 0G Mainnet
      16600: "0x967F8799aF07dF1534d48A95a5C9FEBE92c53AE0", // WRBTC on 0G Testnet
      84532: "0x4200000000000000000000000000000000000006", // WETH on Base Sepolia
      8453: "0x4200000000000000000000000000000000000006", // WETH on Base Mainnet
      30: "0x967F8799aF07dF1534d48A95a5C9FEBE92c53AE0", // WRBTC on Rootstock Mainnet
      31: "0x967F8799aF07dF1534d48A95a5C9FEBE92c53AE0", // WRBTC on Rootstock Testnet
      1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH on Ethereum Mainnet
    };

    const baseToken = baseTokens[chainId];
    if (!baseToken) {
      throw new Error(`No base token configured for chain ${chainId}`);
    }

    return baseToken;
  }

  // ==================== Graduation Information ====================

  /**
   * Get comprehensive graduation information
   */
  async getGraduationInfo(
    token: string,
    chainId?: number
  ): Promise<GraduationInfo> {
    const result = await this.callMethod("getGraduationInfo", [token], chainId);
    return {
      isGraduated: result[0],
      thresholdInUSD: result[1],
      thresholdInETH: result[2],
      currentMarketCap: result[3],
      readyForGraduation: result[4],
      liquidityPair: result[5],
    };
  }

  /**
   * Get graduated pairs mapping
   */
  async getGraduatedPair(token: string, chainId?: number): Promise<string> {
    return await this.callMethod("graduatedPairs", [token], chainId);
  }

  /**
   * Check if token is graduated
   */
  async isTokenGraduated(token: string, chainId?: number): Promise<boolean> {
    return await this.callMethod("graduatedTokens", [token], chainId);
  }

  // ==================== Price Oracle Functions ====================

  /**
   * Convert USD to ETH
   */
  async usdToEth(usdAmount: bigint, chainId?: number): Promise<bigint> {
    return await this.callMethod("usdToEth", [usdAmount], chainId);
  }

  /**
   * Update ETH to USD rate (owner only)
   */
  async updateEthToUsdRate(
    newRate: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return await this.executeMethod(
      "updateEthToUsdRate",
      [newRate],
      options,
      chainId
    );
  }

  /**
   * Get current ETH to USD rate
   */
  async getEthToUsdRate(chainId?: number): Promise<bigint> {
    return await this.callMethod("ethToUsdRate", [], chainId);
  }

  // ==================== DEX Management ====================

  /**
   * Get available DEX configurations for a chain
   */
  getAvailableDEXConfigs(chainId: number): DEXConfig[] {
    return DEFAULT_DEX_CONFIGS[chainId] || [];
  }

  /**
   * Add custom DEX configuration
   */
  addCustomDEXConfig(dexConfig: DEXConfig): void {
    if (!DEFAULT_DEX_CONFIGS[dexConfig.chainId]) {
      DEFAULT_DEX_CONFIGS[dexConfig.chainId] = [];
    }

    DEFAULT_DEX_CONFIGS[dexConfig.chainId].push(dexConfig);
  }

  /**
   * Get optimal DEX for graduation
   */
  getOptimalDEXForGraduation(
    chainId: number,
    tokenAmount: bigint,
    preferences?: {
      preferV3?: boolean;
      preferLowFees?: boolean;
      preferHighLiquidity?: boolean;
    }
  ): DEXConfig | null {
    const availableDEXs = this.getAvailableDEXConfigs(chainId);

    if (availableDEXs.length === 0) return null;

    // Apply preferences
    let filteredDEXs = availableDEXs;

    if (preferences?.preferV3) {
      filteredDEXs = filteredDEXs.filter((dex) => dex.isV3);
    }

    if (preferences?.preferLowFees) {
      filteredDEXs.sort((a, b) => {
        const minFeeA = Math.min(...a.supportedFeeTiers);
        const minFeeB = Math.min(...b.supportedFeeTiers);
        return minFeeA - minFeeB;
      });
    }

    return filteredDEXs[0] || null;
  }

  // ==================== Pool Analytics ====================

  /**
   * Get pool information for graduated token
   */
  async getPoolInfo(
    token: string,
    dexConfig: DEXConfig,
    chainId?: number
  ): Promise<any> {
    const poolAddress = await this.getGraduatedPair(token, chainId);
    if (
      !poolAddress ||
      poolAddress === "0x0000000000000000000000000000000000000000"
    ) {
      throw new Error("Token not graduated or pool not found");
    }

    const dexService = this.getDEXService(dexConfig);
    return await dexService.getPoolInfo(poolAddress, chainId);
  }

  /**
   * Get current price from graduated pool
   */
  async getCurrentPoolPrice(
    token: string,
    dexConfig: DEXConfig,
    chainId?: number
  ): Promise<{
    price: bigint;
    sqrtPriceX96?: bigint;
    tick?: number;
  }> {
    const poolAddress = await this.getGraduatedPair(token, chainId);
    if (
      !poolAddress ||
      poolAddress === "0x0000000000000000000000000000000000000000"
    ) {
      throw new Error("Token not graduated or pool not found");
    }

    const dexService = this.getDEXService(dexConfig);
    return await dexService.getCurrentPrice(poolAddress, chainId);
  }

  /**
   * Get TWAP for graduated token
   */
  async getTWAP(
    token: string,
    dexConfig: DEXConfig,
    secondsAgo: number = 3600,
    chainId?: number
  ): Promise<bigint> {
    const poolAddress = await this.getGraduatedPair(token, chainId);
    if (
      !poolAddress ||
      poolAddress === "0x0000000000000000000000000000000000000000"
    ) {
      throw new Error("Token not graduated or pool not found");
    }

    const dexService = this.getDEXService(dexConfig);
    return await dexService.getTWAP(poolAddress, secondsAgo, chainId);
  }

  // ==================== Event Listening ====================

  /**
   * Listen to TokenGraduated events
   */
  async onTokenGraduated(
    callback: (event: EventLog) => void,
    chainId?: number
  ): Promise<void> {
    await this.listenToEvent("TokenGraduated", callback, chainId);
  }

  /**
   * Listen to GraduationThresholdUpdated events
   */
  async onGraduationThresholdUpdated(
    callback: (event: EventLog) => void,
    chainId?: number
  ): Promise<void> {
    await this.listenToEvent("GraduationThresholdUpdated", callback, chainId);
  }

  /**
   * Get graduation events for a token
   */
  async getTokenGraduationEvents(
    token: string,
    filterOptions: EventFilterOptions = {},
    chainId?: number
  ): Promise<EventLog[]> {
    const events = await this.getEvents(
      "TokenGraduated",
      filterOptions,
      chainId
    );
    return events.filter(
      (event) =>
        event.args && event.args[0].toLowerCase() === token.toLowerCase()
    );
  }

  // ==================== Batch Operations ====================

  /**
   * Get graduation info for multiple tokens
   */
  async getBatchGraduationInfo(
    tokens: string[],
    chainId?: number
  ): Promise<Record<string, GraduationInfo>> {
    const results: Record<string, GraduationInfo> = {};

    await Promise.all(
      tokens.map(async (token) => {
        try {
          results[token] = await this.getGraduationInfo(token, chainId);
        } catch (error) {
          console.warn(`Failed to get graduation info for ${token}:`, error);
          results[token] = {
            isGraduated: false,
            thresholdInUSD: BigInt(0),
            thresholdInETH: BigInt(0),
            currentMarketCap: BigInt(0),
            readyForGraduation: false,
            liquidityPair: "0x0000000000000000000000000000000000000000",
          };
        }
      })
    );

    return results;
  }

  // ==================== Integration Status ====================

  /**
   * Get integration status for all DEX services
   */
  async getIntegrationStatus(chainId: number): Promise<Record<string, any>> {
    const status: Record<string, any> = {};
    const dexConfigs = this.getAvailableDEXConfigs(chainId);

    await Promise.all(
      dexConfigs.map(async (config) => {
        try {
          const dexService = this.getDEXService(config);
          if (dexService.getIntegrationStatus) {
            status[config.name] = await dexService.getIntegrationStatus(
              chainId
            );
          } else {
            status[config.name] = {
              status: "UNKNOWN",
              error: "No status method",
            };
          }
        } catch (error) {
          status[config.name] = {
            status: "ERROR",
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    return status;
  }

  // ==================== TradingEngine-Specific Methods ====================

  /**
   * Graduate token directly to TradingEngine
   */
  async graduateTokenToTradingEngine(
    token: string,
    tokenAmount: bigint,
    ethAmount: bigint,
    options: TransactionOptions = {},
    chainId: number = 16661
  ): Promise<PoolCreationResult> {
    // Get TradingEngine configuration for the chain
    const dexConfigs = this.getAvailableDEXConfigs(chainId);
    const tradingEngineConfig = dexConfigs.find((config) =>
      config.name.toLowerCase().includes("tradingengine")
    );

    if (!tradingEngineConfig) {
      throw new Error(`TradingEngine not available on chain ${chainId}`);
    }

    // Create graduation parameters
    const graduationParams: GraduationParams = {
      dexConfig: tradingEngineConfig,
      slippageTolerance: 5, // 5% slippage tolerance
      deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour deadline
    };

    return await this.graduateTokenToDEX(
      token,
      graduationParams,
      options,
      chainId
    );
  }

  /**
   * Get TradingEngine pool information for a graduated token
   */
  async getTradingEnginePoolInfo(
    token: string,
    chainId: number = 16661
  ): Promise<any> {
    const tradingEngineService = this.getDEXService({
      name: "TradingEngine",
      factoryAddress: "",
      routerAddress: "",
      supportedFeeTiers: [],
      isV3: false,
      chainId,
    }) as TradingEngineService;

    const baseToken = this.getBaseTokenForChain(chainId);
    const pairId = tradingEngineService.calculatePairId(token, baseToken);

    return await tradingEngineService.getPairInfo(pairId);
  }

  /**
   * Monitor TradingEngine pool health after graduation
   */
  async monitorTradingEnginePool(
    token: string,
    chainId: number = 16661,
    callback: (status: {
      pairId: string;
      reserves: { tokenA: bigint; tokenB: bigint };
      volume24h: bigint;
      lastTradeTime: bigint;
      isHealthy: boolean;
    }) => void
  ): Promise<void> {
    const tradingEngineService = this.getDEXService({
      name: "TradingEngine",
      factoryAddress: "",
      routerAddress: "",
      supportedFeeTiers: [],
      isV3: false,
      chainId,
    }) as TradingEngineService;

    const baseToken = this.getBaseTokenForChain(chainId);
    const pairId = tradingEngineService.calculatePairId(token, baseToken);

    // Set up monitoring interval
    const checkHealth = async () => {
      try {
        const pairInfo = await tradingEngineService.getPairInfo(pairId);
        const tokenStats = await tradingEngineService.getTokenStats(token);

        const timeSinceLastTrade =
          BigInt(Date.now() / 1000) - pairInfo.lastTradeTime;
        const isHealthy =
          pairInfo.reserveA > 0 &&
          pairInfo.reserveB > 0 &&
          timeSinceLastTrade < BigInt(86400); // Active within 24 hours

        callback({
          pairId,
          reserves: {
            tokenA: pairInfo.reserveA,
            tokenB: pairInfo.reserveB,
          },
          volume24h: tokenStats.dailyVolume,
          lastTradeTime: pairInfo.lastTradeTime,
          isHealthy,
        });
      } catch (error) {
        console.error("Pool health check failed:", error);
      }
    };

    // Initial check
    await checkHealth();

    // Set up periodic monitoring (every 5 minutes)
    setInterval(checkHealth, 5 * 60 * 1000);
  }

  /**
   * Get TradingEngine graduation analytics
   */
  async getTradingEngineAnalytics(
    token: string,
    chainId: number = 16661
  ): Promise<{
    totalFeesGenerated: bigint;
    creatorEarnings: bigint;
    tradingVolume: bigint;
    priceHistory: { timestamp: number; price: bigint }[];
    liquidityProviders: number;
  }> {
    const tradingEngineService = this.getDEXService({
      name: "TradingEngine",
      factoryAddress: "",
      routerAddress: "",
      supportedFeeTiers: [],
      isV3: false,
      chainId,
    }) as TradingEngineService;

    // Get token creator from token factory
    const creatorTokenService = new CreatorTokenService(token);
    const creator = await creatorTokenService.getCreator(chainId);

    const [totalFeesGenerated, creatorEarnings, tokenStats] = await Promise.all(
      [
        tradingEngineService.getTotalFeesGenerated(token),
        tradingEngineService.getCreatorEarnings(creator),
        tradingEngineService.getTokenStats(token),
      ]
    );

    return {
      totalFeesGenerated,
      creatorEarnings,
      tradingVolume: tokenStats.totalVolume,
      priceHistory: [], // Would need to implement price history tracking
      liquidityProviders: 0, // Would need to track LP count
    };
  }

  /**
   * Emergency pause TradingEngine pool (admin only)
   */
  async emergencyPauseTradingEnginePool(
    pairId: string,
    options: TransactionOptions = {},
    chainId: number = 16661
  ): Promise<string> {
    // This would require additional admin functions in TradingEngine contract
    // For now, throw an error indicating the feature needs implementation
    throw new Error(
      "Emergency pause functionality not implemented in TradingEngine contract"
    );
  }
}

// Create and export a singleton instance
export const tokenGraduationService = new TokenGraduationService();
export default tokenGraduationService;
