import { Contract, ContractTransactionResponse } from "ethers";
import {
  Zer0dexV3Service,
  SupportedChainId,
} from "@/config/services/core/zer0dexV3Service";
import { TradingEngineService } from "./TradingEngineService";
import {
  DEXConfig,
  DEXType,
  PoolCreationResult,
} from "./TokenGraduationService";

/**
 * DEX Integration Manager
 * Handles dynamic integration with multiple DEX protocols
 */
export class DEXIntegrationManager {
  private dexServices: Map<string, any> = new Map();
  private supportedDEXs: Map<number, DEXConfig[]> = new Map();

  constructor() {
    this.initializeDefaultDEXConfigs();
    this.initializeDEXServices();
  }

  /**
   * Initialize default DEX configurations
   */
  private initializeDefaultDEXConfigs(): void {
    // 0G Network configurations
    const zg0MainnetDEXs: DEXConfig[] = [
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
    ];

    const zg0TestnetDEXs: DEXConfig[] = [
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
    ];

    // Base network configurations
    const baseDEXs: DEXConfig[] = [
      {
        name: "TradingEngine",
        factoryAddress: "0x...", // TradingEngine contract address
        routerAddress: "0x...", // TradingEngine contract address (same as factory)
        supportedFeeTiers: [5, 30, 95], // baseFee, typical fee, maxFee (in basis points)
        isV3: false, // Custom AMM implementation
        chainId: 8453,
      },
      {
        name: "Uniswap V3",
        factoryAddress: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
        routerAddress: "0x2626664c2603336E57B271c5C0b26F421741e481",
        quoterAddress: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
        nftPositionManagerAddress: "0x03a520b32C04BF3bEEf7BF5755C6d6fD0b2C0Ca6",
        supportedFeeTiers: [100, 500, 3000, 10000],
        isV3: true,
        chainId: 8453,
      },
      {
        name: "SushiSwap V2",
        factoryAddress: "0x71524B4f93c58fcbF659783284E38825f0622859",
        routerAddress: "0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891",
        supportedFeeTiers: [3000], // Fixed 0.3% fee
        isV3: false,
        chainId: 8453,
      },
    ];

    const baseSepoliaDEXs: DEXConfig[] = [
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
    ];

    // Set configurations
    this.supportedDEXs.set(16661, zg0MainnetDEXs);
    this.supportedDEXs.set(16600, zg0TestnetDEXs);
    this.supportedDEXs.set(8453, baseDEXs);
    this.supportedDEXs.set(84532, baseSepoliaDEXs);
  }

  /**
   * Initialize DEX service instances
   */
  private initializeDEXServices(): void {
    // Initialize Zer0dex services
    this.dexServices.set("ZER0DEX_V3_16661", new Zer0dexV3Service(16661));
    this.dexServices.set("ZER0DEX_V3_16600", new Zer0dexV3Service(16600));

    // Initialize TradingEngine services
    this.dexServices.set("TRADING_ENGINE_16661", new TradingEngineService());
    this.dexServices.set("TRADING_ENGINE_16600", new TradingEngineService());
    this.dexServices.set("TRADING_ENGINE_8453", new TradingEngineService());
    this.dexServices.set("TRADING_ENGINE_84532", new TradingEngineService());

    // Initialize other DEX services as needed
    // this.dexServices.set("UNISWAP_V3_8453", new UniswapV3Service(8453));
    // this.dexServices.set("SUSHISWAP_V2_8453", new SushiSwapV2Service(8453));
  }

  /**
   * Get DEX service instance
   */
  private getDEXService(dexConfig: DEXConfig): any {
    const key = this.getDEXServiceKey(dexConfig);

    if (this.dexServices.has(key)) {
      return this.dexServices.get(key);
    }

    // Create service instance based on DEX type
    const service = this.createDEXService(dexConfig);
    if (service) {
      this.dexServices.set(key, service);
      return service;
    }

    throw new Error(
      `Unsupported DEX: ${dexConfig.name} on chain ${dexConfig.chainId}`
    );
  }

  /**
   * Create DEX service based on configuration
   */
  private createDEXService(dexConfig: DEXConfig): any {
    const dexType = this.identifyDEXType(dexConfig);

    switch (dexType) {
      case DEXType.TRADING_ENGINE:
        return new TradingEngineService();

      case DEXType.ZER0DEX_V3:
        if (dexConfig.chainId === 16661 || dexConfig.chainId === 16600) {
          return new Zer0dexV3Service(dexConfig.chainId as SupportedChainId);
        }
        break;

      case DEXType.UNISWAP_V3:
        // return new UniswapV3Service(dexConfig.chainId);
        break;

      case DEXType.UNISWAP_V2:
      case DEXType.SUSHISWAP:
        // return new UniswapV2Service(dexConfig);
        break;

      default:
        console.warn(`Unknown DEX type for ${dexConfig.name}`);
    }

    return null;
  }

  /**
   * Identify DEX type from configuration
   */
  private identifyDEXType(dexConfig: DEXConfig): DEXType {
    const name = dexConfig.name.toLowerCase();

    if (name.includes("tradingengine")) {
      return DEXType.TRADING_ENGINE;
    }

    if (name.includes("zer0dex") && dexConfig.isV3) {
      return DEXType.ZER0DEX_V3;
    }

    if (name.includes("uniswap") && dexConfig.isV3) {
      return DEXType.UNISWAP_V3;
    }

    if (name.includes("uniswap") && !dexConfig.isV3) {
      return DEXType.UNISWAP_V2;
    }

    if (name.includes("sushiswap")) {
      return DEXType.SUSHISWAP;
    }

    if (name.includes("pancakeswap")) {
      return DEXType.PANCAKESWAP;
    }

    return DEXType.CUSTOM;
  }

  /**
   * Generate service key for DEX
   */
  private getDEXServiceKey(dexConfig: DEXConfig): string {
    return `${dexConfig.name.toUpperCase().replace(/\s+/g, "_")}_${
      dexConfig.chainId
    }`;
  }

  // ==================== Public API ====================

  /**
   * Get available DEX configurations for a chain
   */
  getAvailableDEXs(chainId: number): DEXConfig[] {
    return this.supportedDEXs.get(chainId) || [];
  }

  /**
   * Add custom DEX configuration
   */
  addDEXConfig(dexConfig: DEXConfig): void {
    const existingDEXs = this.supportedDEXs.get(dexConfig.chainId) || [];
    existingDEXs.push(dexConfig);
    this.supportedDEXs.set(dexConfig.chainId, existingDEXs);

    // Initialize service if possible
    try {
      const service = this.createDEXService(dexConfig);
      if (service) {
        const key = this.getDEXServiceKey(dexConfig);
        this.dexServices.set(key, service);
      }
    } catch (error) {
      console.warn(
        `Failed to initialize service for ${dexConfig.name}:`,
        error
      );
    }
  }

  /**
   * Remove DEX configuration
   */
  removeDEXConfig(chainId: number, dexName: string): void {
    const existingDEXs = this.supportedDEXs.get(chainId) || [];
    const filteredDEXs = existingDEXs.filter((dex) => dex.name !== dexName);
    this.supportedDEXs.set(chainId, filteredDEXs);

    // Remove service
    const key = `${dexName.toUpperCase().replace(/\s+/g, "_")}_${chainId}`;
    this.dexServices.delete(key);
  }

  /**
   * Get optimal DEX for graduation
   */
  getOptimalDEX(
    chainId: number,
    preferences?: {
      preferV3?: boolean;
      preferLowFees?: boolean;
      maxSlippage?: number;
      minLiquidity?: bigint;
    }
  ): DEXConfig | null {
    const availableDEXs = this.getAvailableDEXs(chainId);

    if (availableDEXs.length === 0) return null;

    let candidates = [...availableDEXs];

    // Apply preferences
    if (preferences?.preferV3) {
      const v3DEXs = candidates.filter((dex) => dex.isV3);
      if (v3DEXs.length > 0) candidates = v3DEXs;
    }

    if (preferences?.preferLowFees) {
      candidates.sort((a, b) => {
        const minFeeA = Math.min(...a.supportedFeeTiers);
        const minFeeB = Math.min(...b.supportedFeeTiers);
        return minFeeA - minFeeB;
      });
    }

    // Prioritize by reliability/integration quality
    const priorityOrder = [
      "Zer0dex V3",
      "Uniswap V3",
      "SushiSwap",
      "PancakeSwap",
    ];
    candidates.sort((a, b) => {
      const indexA = priorityOrder.indexOf(a.name);
      const indexB = priorityOrder.indexOf(b.name);
      const priorityA = indexA === -1 ? priorityOrder.length : indexA;
      const priorityB = indexB === -1 ? priorityOrder.length : indexB;
      return priorityA - priorityB;
    });

    return candidates[0];
  }

  /**
   * Create graduation pool on optimal DEX
   */
  async createGraduationPool(
    tokenAddress: string,
    tokenAmount: bigint,
    ethAmount: bigint,
    chainId: number,
    preferences?: {
      dexName?: string;
      feeTier?: number;
      initialPrice?: bigint;
      slippageTolerance?: number;
    }
  ): Promise<PoolCreationResult> {
    let dexConfig: DEXConfig | null = null;

    // Use specific DEX if requested
    if (preferences?.dexName) {
      const availableDEXs = this.getAvailableDEXs(chainId);
      dexConfig =
        availableDEXs.find((dex) => dex.name === preferences.dexName) || null;
    }

    // Otherwise, get optimal DEX
    if (!dexConfig) {
      dexConfig = this.getOptimalDEX(chainId, {
        preferV3: true,
        preferLowFees: true,
      });
    }

    if (!dexConfig) {
      throw new Error(`No suitable DEX found for chain ${chainId}`);
    }

    // Get DEX service
    const dexService = this.getDEXService(dexConfig);

    // Create pool based on DEX type
    if (dexConfig.isV3) {
      return await this.createV3Pool(
        dexService,
        dexConfig,
        tokenAddress,
        tokenAmount,
        ethAmount,
        preferences
      );
    } else {
      return await this.createV2Pool(
        dexService,
        dexConfig,
        tokenAddress,
        tokenAmount,
        ethAmount,
        preferences
      );
    }
  }

  /**
   * Create Uniswap V3 style pool
   */
  private async createV3Pool(
    dexService: any,
    dexConfig: DEXConfig,
    tokenAddress: string,
    tokenAmount: bigint,
    ethAmount: bigint,
    preferences?: any
  ): Promise<PoolCreationResult> {
    // Get base token (WETH)
    const tokenAddresses =
      dexService.getTokenAddresses?.(dexConfig.chainId) || {};
    const baseToken = tokenAddresses.ETH || tokenAddresses.WETH;

    if (!baseToken) {
      throw new Error(`No base token found for chain ${dexConfig.chainId}`);
    }

    // Determine fee tier
    const feeTier =
      preferences?.feeTier ||
      dexService.getOptimalFeeTier?.(tokenAddress, baseToken) ||
      3000;

    // Validate fee tier is supported
    if (!dexConfig.supportedFeeTiers.includes(feeTier)) {
      throw new Error(`Fee tier ${feeTier} not supported by ${dexConfig.name}`);
    }

    // Create pool
    const poolResult = await dexService.createGraduationPool(
      tokenAddress,
      baseToken,
      feeTier,
      preferences?.initialPrice,
      {},
      dexConfig.chainId
    );

    // Add liquidity if amounts provided
    if (tokenAmount > 0 && ethAmount > 0) {
      await dexService.addGraduationLiquidity(
        tokenAddress,
        baseToken,
        tokenAmount,
        ethAmount,
        feeTier,
        -887220, // Full range
        887220,
        {},
        dexConfig.chainId
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
    dexService: any,
    dexConfig: DEXConfig,
    tokenAddress: string,
    tokenAmount: bigint,
    ethAmount: bigint,
    preferences?: any
  ): Promise<PoolCreationResult> {
    throw new Error("V2 style pool creation not implemented yet");
  }

  /**
   * Get pool price across multiple DEXs
   */
  async getPoolPrices(
    tokenAddress: string,
    chainId: number
  ): Promise<Record<string, { price: bigint; liquidity?: bigint }>> {
    const prices: Record<string, { price: bigint; liquidity?: bigint }> = {};
    const availableDEXs = this.getAvailableDEXs(chainId);

    await Promise.all(
      availableDEXs.map(async (dexConfig) => {
        try {
          const dexService = this.getDEXService(dexConfig);
          // Implementation would depend on having a standard price interface
          // For now, return placeholder
          prices[dexConfig.name] = {
            price: BigInt(0),
            liquidity: BigInt(0),
          };
        } catch (error) {
          console.warn(`Failed to get price from ${dexConfig.name}:`, error);
        }
      })
    );

    return prices;
  }

  /**
   * Get integration health status
   */
  async getIntegrationHealth(chainId: number): Promise<Record<string, any>> {
    const status: Record<string, any> = {};
    const availableDEXs = this.getAvailableDEXs(chainId);

    await Promise.all(
      availableDEXs.map(async (dexConfig) => {
        try {
          const dexService = this.getDEXService(dexConfig);

          if (dexService.getIntegrationStatus) {
            status[dexConfig.name] = await dexService.getIntegrationStatus(
              chainId
            );
          } else {
            // Basic connectivity test
            const startTime = Date.now();
            await dexService.getContractAddresses?.(chainId);
            const latency = Date.now() - startTime;

            status[dexConfig.name] = {
              status: "ACTIVE",
              latency,
              lastChecked: new Date(),
            };
          }
        } catch (error) {
          status[dexConfig.name] = {
            status: "ERROR",
            error: error instanceof Error ? error.message : "Unknown error",
            lastChecked: new Date(),
          };
        }
      })
    );

    return status;
  }

  /**
   * Validate DEX configuration
   */
  validateDEXConfig(dexConfig: DEXConfig): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Required fields
    if (!dexConfig.name || dexConfig.name.trim() === "") {
      errors.push("DEX name is required");
    }

    if (
      !dexConfig.factoryAddress ||
      dexConfig.factoryAddress === "0x0000000000000000000000000000000000000000"
    ) {
      errors.push("Valid factory address is required");
    }

    if (
      !dexConfig.routerAddress ||
      dexConfig.routerAddress === "0x0000000000000000000000000000000000000000"
    ) {
      errors.push("Valid router address is required");
    }

    if (!dexConfig.chainId || dexConfig.chainId <= 0) {
      errors.push("Valid chain ID is required");
    }

    if (
      !dexConfig.supportedFeeTiers ||
      dexConfig.supportedFeeTiers.length === 0
    ) {
      errors.push("At least one fee tier must be supported");
    }

    // V3 specific validation
    if (dexConfig.isV3) {
      if (!dexConfig.quoterAddress) {
        errors.push("Quoter address is required for V3 DEXs");
      }

      if (!dexConfig.nftPositionManagerAddress) {
        errors.push("NFT Position Manager address is required for V3 DEXs");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get all supported chains
   */
  getSupportedChains(): number[] {
    return Array.from(this.supportedDEXs.keys());
  }

  /**
   * Get DEX statistics
   */
  getDEXStatistics(): {
    totalDEXs: number;
    dexsByChain: Record<number, number>;
    v3DEXs: number;
    v2DEXs: number;
    tradingEngines: number;
  } {
    let totalDEXs = 0;
    let v3DEXs = 0;
    let v2DEXs = 0;
    let tradingEngines = 0;
    const dexsByChain: Record<number, number> = {};

    this.supportedDEXs.forEach((dexConfigs, chainId) => {
      dexsByChain[chainId] = dexConfigs.length;
      totalDEXs += dexConfigs.length;

      dexConfigs.forEach((config) => {
        if (config.name.toLowerCase().includes("tradingengine")) {
          tradingEngines++;
        } else if (config.isV3) {
          v3DEXs++;
        } else {
          v2DEXs++;
        }
      });
    });

    return {
      totalDEXs,
      dexsByChain,
      v3DEXs,
      v2DEXs,
      tradingEngines,
    };
  }

  // ==================== TradingEngine-Specific Methods ====================

  /**
   * Get TradingEngine service for a specific chain
   */
  getTradingEngineService(chainId: number): TradingEngineService | null {
    const key = `TRADING_ENGINE_${chainId}`;
    return this.dexServices.get(key) || null;
  }

  /**
   * Check if TradingEngine is available on a chain
   */
  isTradingEngineAvailable(chainId: number): boolean {
    const dexConfigs = this.getAvailableDEXs(chainId);
    return dexConfigs.some((config) =>
      config.name.toLowerCase().includes("tradingengine")
    );
  }

  /**
   * Get TradingEngine configuration for a chain
   */
  getTradingEngineConfig(chainId: number): DEXConfig | null {
    const dexConfigs = this.getAvailableDEXs(chainId);
    return (
      dexConfigs.find((config) =>
        config.name.toLowerCase().includes("tradingengine")
      ) || null
    );
  }

  /**
   * Create trading pair using TradingEngine
   */
  async createTradingEnginePair(
    tokenA: string,
    tokenB: string,
    chainId: number
  ): Promise<{ pairId: string; txHash: string }> {
    const tradingEngineService = this.getTradingEngineService(chainId);

    if (!tradingEngineService) {
      throw new Error(`TradingEngine not available on chain ${chainId}`);
    }

    return await tradingEngineService.createPair(tokenA, tokenB);
  }

  /**
   * Get TradingEngine pair info
   */
  async getTradingEnginePairInfo(
    tokenA: string,
    tokenB: string,
    chainId: number
  ): Promise<any> {
    const tradingEngineService = this.getTradingEngineService(chainId);

    if (!tradingEngineService) {
      throw new Error(`TradingEngine not available on chain ${chainId}`);
    }

    const pairId = tradingEngineService.calculatePairId(tokenA, tokenB);
    return await tradingEngineService.getPairInfo(pairId);
  }

  /**
   * Get optimal DEX for token graduation (prioritizes TradingEngine for supported chains)
   */
  getOptimalDEXForTokenGraduation(
    chainId: number,
    preferences?: {
      preferTradingEngine?: boolean;
      preferV3?: boolean;
      preferLowFees?: boolean;
    }
  ): DEXConfig | null {
    const availableDEXs = this.getAvailableDEXs(chainId);

    if (availableDEXs.length === 0) return null;

    // If TradingEngine is preferred and available, return it first
    if (preferences?.preferTradingEngine !== false) {
      const tradingEngineConfig = availableDEXs.find((config) =>
        config.name.toLowerCase().includes("tradingengine")
      );

      if (tradingEngineConfig) {
        return tradingEngineConfig;
      }
    }

    // Fallback to other DEXs based on preferences
    let filteredDEXs = availableDEXs.filter(
      (config) => !config.name.toLowerCase().includes("tradingengine")
    );

    if (preferences?.preferV3) {
      const v3DEXs = filteredDEXs.filter((dex) => dex.isV3);
      if (v3DEXs.length > 0) {
        filteredDEXs = v3DEXs;
      }
    }

    if (preferences?.preferLowFees) {
      filteredDEXs.sort((a, b) => {
        const minFeeA = Math.min(...a.supportedFeeTiers);
        const minFeeB = Math.min(...b.supportedFeeTiers);
        return minFeeA - minFeeB;
      });
    }

    return filteredDEXs[0] || availableDEXs[0];
  }

  /**
   * Get TradingEngine analytics for all supported chains
   */
  async getTradingEngineAnalytics(): Promise<Record<number, any>> {
    const analytics: Record<number, any> = {};

    for (const chainId of this.getSupportedChains()) {
      if (this.isTradingEngineAvailable(chainId)) {
        try {
          const tradingEngineService = this.getTradingEngineService(chainId);
          if (tradingEngineService) {
            analytics[chainId] = {
              isAvailable: true,
              feeStructure: await tradingEngineService.getFeeStructure(),
              platformRevenue: await tradingEngineService.getPlatformRevenue(),
              stakingRewards: await tradingEngineService.getStakingRewards(),
            };
          }
        } catch (error) {
          analytics[chainId] = {
            isAvailable: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      } else {
        analytics[chainId] = {
          isAvailable: false,
          error: "TradingEngine not deployed on this chain",
        };
      }
    }

    return analytics;
  }
}

// Export singleton instance
export const dexIntegrationManager = new DEXIntegrationManager();
export default dexIntegrationManager;
