/**
 * Viem-based TokenData Service
 * Following the same pattern as create-token page for direct Viem integration
 */

export interface TokenData {
  id: string;
  address: string;
  name: string;
  symbol: string;
  description: string;
  logoUrl: string;
  creator: string;
  launchTime: bigint;
  currentPrice: bigint;
  marketCap: bigint;
  totalSupply: bigint;
  totalSold: bigint;
  holderCount: bigint;
  dailyVolume: bigint;
  isLive: boolean;
  priceChange: string;
  priceValue: string;
  age: string;
}

export class TokenDataViemService {
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
    
    // Map chain ID to chain object and contract address
    const chainMap: Record<number, { chain: any; factoryAddress: string }> = {
      44787: { 
        chain: (await import("viem/chains")).celoAlfajores, 
        factoryAddress: "0x5755574a0d453729568f068026ef03078e8ea87c" 
      },
      80002: {
        chain: (await import("viem/chains")).polygonAmoy,
        factoryAddress: "0x2e650ddc1f722ecfd9f6ba430b33960942000982" // TokenFactory on Polygon Amoy
      },
      // Add more chains as needed
    };
    
    const chainConfig = chainMap[currentChainId];
    if (!chainConfig) {
      throw new Error(`Unsupported chain ID: ${currentChainId}. Please switch to a supported network.`);
    }

    return { currentChainId, chainConfig };
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
   * Load TokenFactory ABI
   */
  private async loadFactoryABI() {
    const TokenFactoryABI = (await import("@/config/abi/TokenFactoryRoot.json")).default;
    return TokenFactoryABI;
  }

  /**
   * Load CreatorToken ABI
   */
  private async loadCreatorTokenABI() {
    const CreatorTokenABI = (await import("@/config/abi/CreatorToken.json")).default;
    return CreatorTokenABI;
  }

  /**
   * Fetch all launched tokens with their data
   */
  async getAllTokensData(chainId?: number): Promise<TokenData[]> {
    try {
      console.log("🔍 Fetching all tokens from factory...");
      console.log("📡 Chain ID:", chainId);
      
      const publicClient = await this.createPublicClient();
      const factoryABI = await this.loadFactoryABI();
      const { chainConfig } = await this.getChainConfig();
      
      // Get all token addresses from factory
      const tokenAddresses = await publicClient.readContract({
        address: chainConfig.factoryAddress as `0x${string}`,
        abi: factoryABI,
        functionName: "getAllTokens",
      }) as string[];

      console.log("📋 Found token addresses:", tokenAddresses);
      console.log("📊 Total tokens found:", tokenAddresses.length);

      if (tokenAddresses.length === 0) {
        console.log("⚠️ No tokens found on this network");
        return [];
      }

      // Fetch data for each token
      const tokensData: TokenData[] = [];
      
      for (let i = 0; i < tokenAddresses.length; i++) {
        const tokenAddress = tokenAddresses[i];
        try {
          console.log(`🔄 Fetching data for token ${i + 1}/${tokenAddresses.length}: ${tokenAddress}`);
          const tokenData = await this.getTokenData(tokenAddress, chainId);
          if (tokenData) {
            tokensData.push(tokenData);
            console.log(`✅ Successfully fetched data for ${tokenData.symbol}`);
          }
        } catch (error) {
          console.error(`❌ Error fetching data for token ${tokenAddress}:`, error);
          // Continue with other tokens even if one fails
        }
      }

      console.log("🎉 Successfully fetched tokens data:", tokensData);
      console.log("📈 Total tokens with data:", tokensData.length);
      return tokensData;
    } catch (error) {
      console.error("💥 Error fetching all tokens data:", error);
      return [];
    }
  }

  /**
   * Fetch data for a specific token
   */
  async getTokenData(tokenAddress: string, chainId?: number): Promise<TokenData | null> {
    try {
      console.log(`Fetching data for token: ${tokenAddress}`);

      const publicClient = await this.createPublicClient();
      const factoryABI = await this.loadFactoryABI();
      const creatorTokenABI = await this.loadCreatorTokenABI();
      const { chainConfig } = await this.getChainConfig();

      // Fetch basic token info from factory
      const [creator, launchTime] = await Promise.all([
        publicClient.readContract({
          address: chainConfig.factoryAddress as `0x${string}`,
          abi: factoryABI,
          functionName: "getTokenCreator",
          args: [tokenAddress],
        }) as Promise<string>,
        publicClient.readContract({
          address: chainConfig.factoryAddress as `0x${string}`,
          abi: factoryABI,
          functionName: "getTokenLaunchTime",
          args: [tokenAddress],
        }) as Promise<bigint>,
      ]);

      // Fetch detailed token data from the token contract
      const [
        name,
        symbol,
        description,
        logoUrl,
        currentPrice,
        marketCap,
        totalSupply,
        totalSold,
        holderCount,
        dailyVolume,
      ] = await Promise.all([
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: creatorTokenABI,
          functionName: "name",
        }) as Promise<string>,
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: creatorTokenABI,
          functionName: "symbol",
        }) as Promise<string>,
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: creatorTokenABI,
          functionName: "description",
        }) as Promise<string>,
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: creatorTokenABI,
          functionName: "logoUrl",
        }) as Promise<string>,
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: creatorTokenABI,
          functionName: "getCurrentPrice",
        }) as Promise<bigint>,
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: creatorTokenABI,
          functionName: "marketCap",
        }) as Promise<bigint>,
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: creatorTokenABI,
          functionName: "totalSupply_",
        }) as Promise<bigint>,
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: creatorTokenABI,
          functionName: "totalSold",
        }) as Promise<bigint>,
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: creatorTokenABI,
          functionName: "holderCount",
        }) as Promise<bigint>,
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: creatorTokenABI,
          functionName: "dailyVolume",
        }) as Promise<bigint>,
      ]);

      // Calculate derived values
      const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
      const ageInSeconds = currentTimestamp - launchTime;
      const ageInDays = Number(ageInSeconds) / (24 * 60 * 60);
      
      const age = ageInDays < 1 
        ? "Just launched"
        : ageInDays < 2 
        ? "1 day ago"
        : `${Math.floor(ageInDays)} days ago`;

      // Calculate price change data (mock implementation - in real app you'd use price history)
      const basePrice = Number(currentPrice) / 1e18;
      const randomChange = (Math.random() - 0.5) * 100; // Random change between -50% and +50%
      const priceChange = `${randomChange >= 0 ? '+' : ''}${randomChange.toFixed(1)}%`;
      const priceValue = `${randomChange >= 0 ? '+' : ''}${(basePrice * randomChange / 100).toFixed(3)}`;

      const tokenData: TokenData = {
        id: tokenAddress,
        address: tokenAddress,
        name: name as string,
        symbol: symbol as string,
        description: description as string,
        logoUrl: logoUrl as string,
        creator: creator as string,
        launchTime: launchTime as bigint,
        currentPrice: currentPrice as bigint,
        marketCap: marketCap as bigint,
        totalSupply: totalSupply as bigint,
        totalSold: totalSold as bigint,
        holderCount: holderCount as bigint,
        dailyVolume: dailyVolume as bigint,
        isLive: Math.random() > 0.3, // Randomly assign live status (70% chance to be live)
        priceChange,
        priceValue,
        age,
      };

      console.log(`Successfully fetched data for token ${symbol}:`, tokenData);
      return tokenData;
    } catch (error) {
      console.error(`Error fetching data for token ${tokenAddress}:`, error);
      return null;
    }
  }

  /**
   * Format market cap for display
   */
  formatMarketCap(marketCap: bigint): string {
    const marketCapNumber = Number(marketCap) / 1e18; // Convert from wei
    
    if (marketCapNumber >= 1e6) {
      return `$${(marketCapNumber / 1e6).toFixed(1)}M`;
    } else if (marketCapNumber >= 1e3) {
      return `$${(marketCapNumber / 1e3).toFixed(1)}k`;
    } else {
      return `$${marketCapNumber.toFixed(2)}`;
    }
  }

  /**
   * Format volume for display
   */
  formatVolume(dailyVolume: bigint): string {
    const volumeNumber = Number(dailyVolume) / 1e18; // Convert from wei
    
    if (volumeNumber >= 1e6) {
      return `${(volumeNumber / 1e6).toFixed(1)}M`;
    } else if (volumeNumber >= 1e3) {
      return `${(volumeNumber / 1e3).toFixed(1)}k`;
    } else {
      return `${volumeNumber.toFixed(2)}`;
    }
  }
}

// Create and export singleton instance
export const tokenDataViemService = new TokenDataViemService();
export default tokenDataViemService;
