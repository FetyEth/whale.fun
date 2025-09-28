/**
 * Viem-based CreatorToken Service
 * Following the same pattern as create-token page for direct Viem integration
 */

export interface TokenStats {
  totalSupply: bigint;
  totalSold: bigint;
  currentPrice: bigint;
  marketCap: bigint;
  holderCount: bigint;
  creatorFees: bigint;
}

export class CreatorTokenViemService {
  private tokenAddress: string;

  constructor(tokenAddress: string) {
    this.tokenAddress = tokenAddress;
  }

  /**
   * Get current chain ID and configuration
   */
  private async getChainConfig() {
    const { createWalletClient, custom } = await import("viem");

    // Create temporary wallet client to get current chain
    const tempWalletClient = createWalletClient({
      transport: custom(window.ethereum),
    });

    const currentChainId = await tempWalletClient.getChainId();

    // Map chain ID to chain object (following create-token pattern)
    const chainMap: Record<number, { chain: any; contractAddress: string }> = {
      44787: {
        chain: (await import("viem/chains")).celoAlfajores,
        contractAddress: "0x0bb4da9a543d0c8482843f49f80222f936310637",
      },
      80002: {
        chain: (await import("viem/chains")).polygonAmoy,
        contractAddress: "0x2e650ddc1f722ecfd9f6ba430b33960942000982", // TokenFactory on Polygon Amoy
      },
      // Add more chains as needed
    };

    const chainConfig = chainMap[currentChainId];
    if (!chainConfig) {
      throw new Error(
        `Unsupported chain ID: ${currentChainId}. Please switch to a supported network.`
      );
    }

    return { currentChainId, chainConfig };
  }

  /**
   * Create wallet client for the current chain
   */
  private async createWalletClient() {
    const { createWalletClient, custom } = await import("viem");
    const { chainConfig } = await this.getChainConfig();

    const walletClient = createWalletClient({
      chain: chainConfig.chain,
      transport: custom(window.ethereum),
    });

    return walletClient;
  }

  /**
   * Create public client for read operations
   */
  private async createPublicClient() {
    const { createPublicClient, http } = await import("viem");
    const { chainConfig } = await this.getChainConfig();

    const publicClient = createPublicClient({
      chain: chainConfig.chain,
      transport: http(),
    });

    return publicClient;
  }

  /**
   * Load CreatorToken ABI
   */
  private async loadABI() {
    const CreatorTokenABI = (await import("@/config/abi/CreatorToken.json"))
      .default;
    return CreatorTokenABI;
  }

  /**
   * Get connected account
   */
  private async getAccount(): Promise<`0x${string}`> {
    const walletClient = await this.createWalletClient();
    const accounts = await walletClient.getAddresses();

    if (!accounts || accounts.length === 0) {
      throw new Error("No wallet accounts found. Please connect your wallet.");
    }

    return accounts[0];
  }

  // ==================== Token Information ====================

  /**
   * Get token name
   */
  async getName(): Promise<string> {
    const publicClient = await this.createPublicClient();
    const abi = await this.loadABI();

    return (await publicClient.readContract({
      address: this.tokenAddress as `0x${string}`,
      abi: abi,
      functionName: "name",
    })) as string;
  }

  /**
   * Get token symbol
   */
  async getSymbol(): Promise<string> {
    const publicClient = await this.createPublicClient();
    const abi = await this.loadABI();

    return (await publicClient.readContract({
      address: this.tokenAddress as `0x${string}`,
      abi: abi,
      functionName: "symbol",
    })) as string;
  }

  /**
   * Get token description
   */
  async getDescription(): Promise<string> {
    const publicClient = await this.createPublicClient();
    const abi = await this.loadABI();

    return (await publicClient.readContract({
      address: this.tokenAddress as `0x${string}`,
      abi: abi,
      functionName: "description",
    })) as string;
  }

  /**
   * Get logo URL
   */
  async getLogoUrl(): Promise<string> {
    const publicClient = await this.createPublicClient();
    const abi = await this.loadABI();

    return (await publicClient.readContract({
      address: this.tokenAddress as `0x${string}`,
      abi: abi,
      functionName: "logoUrl",
    })) as string;
  }

  /**
   * Get creator address
   */
  async getCreator(): Promise<string> {
    const publicClient = await this.createPublicClient();
    const abi = await this.loadABI();

    return (await publicClient.readContract({
      address: this.tokenAddress as `0x${string}`,
      abi: abi,
      functionName: "creator",
    })) as string;
  }

  /**
   * Get token launch time
   */
  async getTokenLaunchTime(): Promise<bigint> {
    const publicClient = await this.createPublicClient();
    const abi = await this.loadABI();

    return (await publicClient.readContract({
      address: this.tokenAddress as `0x${string}`,
      abi: abi,
      functionName: "tokenLaunchTime",
    })) as bigint;
  }

  // ==================== Bonding Curve Operations ====================

  /**
   * Calculate cost to buy tokens
   */
  async calculateBuyCost(tokenAmount: bigint): Promise<bigint> {
    const publicClient = await this.createPublicClient();
    const abi = await this.loadABI();

    return (await publicClient.readContract({
      address: this.tokenAddress as `0x${string}`,
      abi: abi,
      functionName: "calculateBuyCost",
      args: [tokenAmount],
    })) as bigint;
  }

  /**
   * Calculate proceeds from selling tokens
   */
  async calculateSellPrice(tokenAmount: bigint): Promise<bigint> {
    const publicClient = await this.createPublicClient();
    const abi = await this.loadABI();

    return (await publicClient.readContract({
      address: this.tokenAddress as `0x${string}`,
      abi: abi,
      functionName: "calculateSellPrice",
      args: [tokenAmount],
    })) as bigint;
  }

  /**
   * Get current token price
   */
  async getCurrentPrice(): Promise<bigint> {
    const publicClient = await this.createPublicClient();
    const abi = await this.loadABI();

    return (await publicClient.readContract({
      address: this.tokenAddress as `0x${string}`,
      abi: abi,
      functionName: "getCurrentPrice",
    })) as bigint;
  }

  /**
   * Buy tokens using bonding curve
   */
  async buyTokens(tokenAmount: bigint, value: bigint): Promise<string> {
    const walletClient = await this.createWalletClient();
    const abi = await this.loadABI();
    const account = await this.getAccount();

    console.log("Buying tokens with Viem:", {
      account,
      tokenAddress: this.tokenAddress,
      tokenAmount: tokenAmount.toString(),
      value: value.toString(),
    });

    const txHash = await walletClient.writeContract({
      account: account,
      address: this.tokenAddress as `0x${string}`,
      abi: abi,
      functionName: "buyTokens",
      args: [tokenAmount],
      value: value,
    });

    console.log("Buy transaction hash:", txHash);
    return txHash;
  }

  /**
   * Sell tokens back to bonding curve
   */
  async sellTokens(tokenAmount: bigint): Promise<string> {
    const walletClient = await this.createWalletClient();
    const abi = await this.loadABI();
    const account = await this.getAccount();

    console.log("Selling tokens with Viem:", {
      account,
      tokenAddress: this.tokenAddress,
      tokenAmount: tokenAmount.toString(),
    });

    const txHash = await walletClient.writeContract({
      account: account,
      address: this.tokenAddress as `0x${string}`,
      abi: abi,
      functionName: "sellTokens",
      args: [tokenAmount],
    });

    console.log("Sell transaction hash:", txHash);
    return txHash;
  }

  // ==================== Token Statistics ====================

  /**
   * Get comprehensive token statistics
   */
  async getTokenStats(): Promise<TokenStats> {
    const publicClient = await this.createPublicClient();
    const abi = await this.loadABI();

    const result = (await publicClient.readContract({
      address: this.tokenAddress as `0x${string}`,
      abi: abi,
      functionName: "getTokenStats",
    })) as [bigint, bigint, bigint, bigint, bigint, bigint];

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
   * Get market cap
   */
  async getMarketCap(): Promise<bigint> {
    const publicClient = await this.createPublicClient();
    const abi = await this.loadABI();

    return (await publicClient.readContract({
      address: this.tokenAddress as `0x${string}`,
      abi: abi,
      functionName: "marketCap",
    })) as bigint;
  }

  /**
   * Get daily volume
   */
  async getDailyVolume(): Promise<bigint> {
    const publicClient = await this.createPublicClient();
    const abi = await this.loadABI();

    return (await publicClient.readContract({
      address: this.tokenAddress as `0x${string}`,
      abi: abi,
      functionName: "dailyVolume",
    })) as bigint;
  }

  /**
   * Get holder count
   */
  async getHolderCount(): Promise<bigint> {
    const publicClient = await this.createPublicClient();
    const abi = await this.loadABI();

    return (await publicClient.readContract({
      address: this.tokenAddress as `0x${string}`,
      abi: abi,
      functionName: "holderCount",
    })) as bigint;
  }

  /**
   * Get total sold
   */
  async getTotalSold(): Promise<bigint> {
    const publicClient = await this.createPublicClient();
    const abi = await this.loadABI();

    return (await publicClient.readContract({
      address: this.tokenAddress as `0x${string}`,
      abi: abi,
      functionName: "totalSold",
    })) as bigint;
  }

  /**
   * Get total supply
   */
  async getTotalSupply(): Promise<bigint> {
    const publicClient = await this.createPublicClient();
    const abi = await this.loadABI();

    return (await publicClient.readContract({
      address: this.tokenAddress as `0x${string}`,
      abi: abi,
      functionName: "totalSupply_",
    })) as bigint;
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(txHash: string): Promise<any> {
    const publicClient = await this.createPublicClient();

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash as `0x${string}`,
      timeout: 60000,
    });

    console.log("Transaction confirmed:", receipt);
    return receipt;
  }
}

/**
 * Factory function to create CreatorTokenViem service instance
 */
export const createCreatorTokenViemService = (tokenAddress: string) => {
  return new CreatorTokenViemService(tokenAddress);
};

export default CreatorTokenViemService;
