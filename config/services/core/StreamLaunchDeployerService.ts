import { ContractTransactionResponse } from "ethers";
import {
  BaseContractService,
  TransactionOptions,
} from "@/lib/services/BaseContractService";
import StreamLaunchDeployerABI from "../../abi/StreamLaunchDeployer.json";

/**
 * Deployed contracts interface
 */
export interface DeployedContracts {
  whaleToken: string;
  tokenFactory: string;
  tradingEngine: string;
  bossBattleArena: string;
  multiSigWallet: string;
  timeLockController: string;
  governanceController: string;
  securityController: string;
}

/**
 * Token info interface from registry
 */
export interface TokenInfo {
  creator: string;
  name: string;
  symbol: string;
  totalSupply: bigint;
  marketCap: bigint;
  creationTime: bigint;
  isActive: boolean;
  tradingVolume: bigint;
}

/**
 * Creator profile interface from registry
 */
export interface CreatorProfile {
  creator: string;
  totalTokensCreated: bigint;
  totalVolumeGenerated: bigint;
  totalFeesEarned: bigint;
  registrationTime: bigint;
  isVerified: boolean;
  socialLinks: {
    website: string;
    twitter: string;
    telegram: string;
  };
}

/**
 * Token statistics interface
 */
export interface TokenStats {
  totalSupply: bigint;
  circulatingSupply: bigint;
  currentPrice: bigint;
  marketCap: bigint;
  volume24h: bigint;
  priceChange24h: bigint;
  holders: bigint;
}

/**
 * Platform statistics interface
 */
export interface PlatformStats {
  totalTokens: bigint;
  totalCreators: bigint;
  totalTradingVolume: bigint;
  totalValueLocked: bigint;
  activeBattles: bigint;
  totalFeeRevenue: bigint;
}

/**
 * StreamLaunchDeployer Service
 * Handles all interactions with the StreamLaunchDeployer contract
 */
export class StreamLaunchDeployerService extends BaseContractService {
  constructor() {
    super({
      name: "StreamLaunchDeployer",
      abi: StreamLaunchDeployerABI,
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

  // ==================== DEPLOYMENT MANAGEMENT ====================

  /**
   * Set a pre-deployed contract address (admin only)
   */
  async setPreDeployedContract(
    name: string,
    contractAddress: string,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod(
      "setPreDeployedContract",
      [name, contractAddress],
      options,
      chainId
    );
  }

  /**
   * Get a pre-deployed contract address
   */
  async getPreDeployedContract(
    name: string,
    chainId?: number
  ): Promise<string> {
    return this.callMethod<string>("getPreDeployedContract", [name], chainId);
  }

  /**
   * Deploy the complete StreamLaunch ecosystem
   */
  async deploySystem(
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod("deploySystem", [], options, chainId);
  }

  /**
   * Configure advanced settings after deployment
   */
  async configureAdvancedSettings(
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod(
      "configureAdvancedSettings",
      [],
      options,
      chainId
    );
  }

  /**
   * Emergency pause the entire system
   */
  async emergencyPause(
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod("emergencyPause", [], options, chainId);
  }

  // ==================== CONTRACT ADDRESSES ====================

  /**
   * Get all deployed contract addresses
   */
  async getDeployedContracts(chainId?: number): Promise<DeployedContracts> {
    const result = await this.callMethod("getDeployedContracts", [], chainId);
    return {
      whaleToken: result[0],
      tokenFactory: result[1],
      tradingEngine: result[2],
      bossBattleArena: result[3],
      multiSigWallet: result[4],
      timeLockController: result[5],
      governanceController: result[6],
      securityController: result[7],
    };
  }

  /**
   * Get WhaleToken contract address
   */
  async getWhaleToken(chainId?: number): Promise<string> {
    return this.callMethod<string>("whaleToken", [], chainId);
  }

  /**
   * Get TokenFactory contract address
   */
  async getTokenFactory(chainId?: number): Promise<string> {
    return this.callMethod<string>("tokenFactory", [], chainId);
  }

  /**
   * Get TradingEngine contract address
   */
  async getTradingEngine(chainId?: number): Promise<string> {
    return this.callMethod<string>("tradingEngine", [], chainId);
  }

  /**
   * Get BossBattleArena contract address
   */
  async getBossBattleArena(chainId?: number): Promise<string> {
    return this.callMethod<string>("bossBattleArena", [], chainId);
  }

  /**
   * Get MultiSigWallet contract address
   */
  async getMultiSigWallet(chainId?: number): Promise<string> {
    return this.callMethod<string>("multiSigWallet", [], chainId);
  }

  /**
   * Get TimeLockController contract address
   */
  async getTimeLockController(chainId?: number): Promise<string> {
    return this.callMethod<string>("timeLockController", [], chainId);
  }

  /**
   * Get GovernanceController contract address
   */
  async getGovernanceController(chainId?: number): Promise<string> {
    return this.callMethod<string>("governanceController", [], chainId);
  }

  /**
   * Get SecurityController contract address
   */
  async getSecurityController(chainId?: number): Promise<string> {
    return this.callMethod<string>("securityController", [], chainId);
  }

  // ==================== DEPLOYMENT CONFIG ====================

  /**
   * Get deployer address
   */
  async getDeployer(chainId?: number): Promise<string> {
    return this.callMethod<string>("deployer", [], chainId);
  }

  /**
   * Get initial WHALE token supply constant
   */
  async getInitialWhaleSupply(chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("INITIAL_WHALE_SUPPLY", [], chainId);
  }

  /**
   * Get timelock delay constant
   */
  async getTimelockDelay(chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("TIMELOCK_DELAY", [], chainId);
  }

  /**
   * Get required confirmations for multi-sig
   */
  async getRequiredConfirmations(chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("REQUIRED_CONFIRMATIONS", [], chainId);
  }

  /**
   * Get multi-sig owners
   */
  async getMultiSigOwners(chainId?: number): Promise<string[]> {
    return this.callMethod<string[]>("multiSigOwners", [], chainId);
  }

  // ==================== TOKEN REGISTRY FUNCTIONS ====================

  /**
   * Check if a token is registered
   */
  async isRegisteredToken(token: string, chainId?: number): Promise<boolean> {
    return this.callMethod<boolean>("isRegisteredToken", [token], chainId);
  }

  /**
   * Get token information from registry
   */
  async getTokenInfo(token: string, chainId?: number): Promise<TokenInfo> {
    const result = await this.callMethod("tokenInfo", [token], chainId);
    return {
      creator: result[0],
      name: result[1],
      symbol: result[2],
      totalSupply: result[3],
      marketCap: result[4],
      creationTime: result[5],
      isActive: result[6],
      tradingVolume: result[7],
    };
  }

  /**
   * Get all registered tokens
   */
  async getAllTokens(chainId?: number): Promise<string[]> {
    return this.callMethod<string[]>("getAllTokens", [], chainId);
  }

  /**
   * Get token statistics
   */
  async getTokenStats(token: string, chainId?: number): Promise<TokenStats> {
    const result = await this.callMethod("getTokenStats", [token], chainId);
    return {
      totalSupply: result[0],
      circulatingSupply: result[1],
      currentPrice: result[2],
      marketCap: result[3],
      volume24h: result[4],
      priceChange24h: result[5],
      holders: result[6],
    };
  }

  // ==================== CREATOR REGISTRY FUNCTIONS ====================

  /**
   * Get creator profile
   */
  async getCreatorProfile(
    creator: string,
    chainId?: number
  ): Promise<CreatorProfile> {
    const result = await this.callMethod(
      "getCreatorProfile",
      [creator],
      chainId
    );
    return {
      creator: result[0],
      totalTokensCreated: result[1],
      totalVolumeGenerated: result[2],
      totalFeesEarned: result[3],
      registrationTime: result[4],
      isVerified: result[5],
      socialLinks: {
        website: result[6],
        twitter: result[7],
        telegram: result[8],
      },
    };
  }

  /**
   * Check if a creator is verified
   */
  async isVerifiedCreator(creator: string, chainId?: number): Promise<boolean> {
    return this.callMethod<boolean>("isVerifiedCreator", [creator], chainId);
  }

  // ==================== PLATFORM STATISTICS ====================

  /**
   * Get platform-wide statistics
   */
  async getPlatformStats(chainId?: number): Promise<PlatformStats> {
    const result = await this.callMethod("getPlatformStats", [], chainId);
    return {
      totalTokens: result[0],
      totalCreators: result[1],
      totalTradingVolume: result[2],
      totalValueLocked: result[3],
      activeBattles: result[4],
      totalFeeRevenue: result[5],
    };
  }

  // ==================== VERIFICATION FUNCTIONS ====================

  /**
   * Get WhaleToken bytecode hash for verification
   */
  async getWhaleTokenHash(chainId?: number): Promise<string> {
    return this.callMethod<string>("WHALE_TOKEN_HASH", [], chainId);
  }

  /**
   * Get TokenFactory bytecode hash for verification
   */
  async getTokenFactoryHash(chainId?: number): Promise<string> {
    return this.callMethod<string>("TOKEN_FACTORY_HASH", [], chainId);
  }

  // ==================== HELPER FUNCTIONS ====================

  /**
   * Check if the system is fully deployed
   */
  async isSystemDeployed(chainId?: number): Promise<boolean> {
    try {
      const contracts = await this.getDeployedContracts(chainId);
      return (
        contracts.whaleToken !== "0x0000000000000000000000000000000000000000" &&
        contracts.tokenFactory !==
          "0x0000000000000000000000000000000000000000" &&
        contracts.tradingEngine !==
          "0x0000000000000000000000000000000000000000" &&
        contracts.bossBattleArena !==
          "0x0000000000000000000000000000000000000000"
      );
    } catch {
      return false;
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth(chainId?: number): Promise<{
    isDeployed: boolean;
    contracts: DeployedContracts;
    platformStats: PlatformStats;
  }> {
    const [isDeployed, contracts, platformStats] = await Promise.all([
      this.isSystemDeployed(chainId),
      this.getDeployedContracts(chainId),
      this.getPlatformStats(chainId),
    ]);

    return {
      isDeployed,
      contracts,
      platformStats,
    };
  }

  // ==================== EVENTS ====================

  /**
   * Listen to SystemDeployed events
   */
  async onSystemDeployed(
    callback: (
      whaleToken: string,
      tokenFactory: string,
      tradingEngine: string,
      bossBattleArena: string,
      timestamp: bigint
    ) => void,
    chainId?: number
  ) {
    return this.listenToEvent(
      "SystemDeployed",
      (event: any) => {
        callback(
          event.args.whaleToken,
          event.args.tokenFactory,
          event.args.tradingEngine,
          event.args.bossBattleArena,
          event.args.timestamp
        );
      },
      chainId
    );
  }

  /**
   * Listen to AdvancedConfigurationCompleted events
   */
  async onAdvancedConfigurationCompleted(
    callback: (timestamp: bigint) => void,
    chainId?: number
  ) {
    return this.listenToEvent(
      "AdvancedConfigurationCompleted",
      (event: any) => {
        callback(event.args.timestamp);
      },
      chainId
    );
  }

  /**
   * Get SystemDeployed events
   */
  async getSystemDeployedEvents(
    fromBlock: number = -10000,
    toBlock?: number,
    chainId?: number
  ) {
    return this.getEvents("SystemDeployed", { fromBlock, toBlock }, chainId);
  }

  /**
   * Get AdvancedConfigurationCompleted events
   */
  async getConfigurationEvents(
    fromBlock: number = -10000,
    toBlock?: number,
    chainId?: number
  ) {
    return this.getEvents(
      "AdvancedConfigurationCompleted",
      { fromBlock, toBlock },
      chainId
    );
  }
}
