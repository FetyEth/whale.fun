import { tokenFactoryRootService } from "./TokenFactoryRootService";
import { getBlockchainConnection } from "@/utils/Blockchain";
import CreatorTokenABI from "@/config/abi/CreatorToken.json";
import { ExternalTokenService, EXTERNAL_TOKENS, type ExternalTokenInfo } from "./ExternalTokenService";

/**
 * Token data interface for explore page
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
  isExternal?: boolean; // Flag to identify external tokens
  chainId?: number; // Chain ID for external tokens
}

/**
 * Service for fetching token data for the explore page
 */
export class TokenDataService {
  /**
   * Fetch all launched tokens with their data
   */
  async getAllTokensData(chainId?: number): Promise<TokenData[]> {
    try {
      console.log("🔍 Fetching all tokens from factory and external sources...");
      console.log("📡 Chain ID:", chainId);

      const tokensData: TokenData[] = [];

      // 1. Get platform tokens from factory
      try {
        const tokenAddresses = await tokenFactoryRootService.getAllTokens(chainId);
        console.log("📋 Found platform token addresses:", tokenAddresses);
        console.log("📊 Total platform tokens found:", tokenAddresses.length);

        for (let i = 0; i < tokenAddresses.length; i++) {
          const tokenAddress = tokenAddresses[i];
          try {
            console.log(
              `🔄 Fetching data for platform token ${i + 1}/${
                tokenAddresses.length
              }: ${tokenAddress}`
            );
            const tokenData = await this.getTokenData(tokenAddress, chainId);
            if (tokenData) {
              tokensData.push(tokenData);
              console.log(`✅ Successfully fetched data for ${tokenData.symbol}`);
            }
          } catch (error) {
            console.error(
              `❌ Error fetching data for platform token ${tokenAddress}:`,
              error
            );
            // Continue with other tokens even if one fails
          }
        }
      } catch (error) {
        console.error("⚠️ Error fetching platform tokens:", error);
        // Continue to external tokens even if platform tokens fail
      }

      // 2. Add external tokens for supported networks
      const externalTokens = await this.getExternalTokensData(chainId);
      tokensData.push(...externalTokens);

      console.log("🎉 Successfully fetched all tokens data:", tokensData);
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
  async getTokenData(
    tokenAddress: string,
    chainId?: number
  ): Promise<TokenData | null> {
    try {
      console.log(`Fetching data for token: ${tokenAddress}`);

      // Create public client for read operations based on current chain
      const { createPublicClient, http } = await import("viem");
      const { celoAlfajores, polygonAmoy, rootstockTestnet } = await import("viem/chains");
      let targetChain = celoAlfajores;
      try {
        // Prefer provided chainId, else read from wallet
        let activeChainId = chainId;
        if (!activeChainId) {
          const connection = await getBlockchainConnection();
          activeChainId = Number(connection.network.chainId);
        }
        const map: Record<number, any> = {
          44787: celoAlfajores,
          80002: polygonAmoy,
          31: rootstockTestnet,
        };
        targetChain = map[Number(activeChainId!)] || celoAlfajores;
      } catch {}

      const publicClient = createPublicClient({
        chain: targetChain,
        transport: http(),
      });

      // Fetch basic token info from factory
      const [creator, launchTime] = await Promise.all([
        tokenFactoryRootService.getTokenCreator(tokenAddress, chainId),
        tokenFactoryRootService.getTokenLaunchTime(tokenAddress, chainId),
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
          abi: CreatorTokenABI,
          functionName: "name",
        }),
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: CreatorTokenABI,
          functionName: "symbol",
        }),
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: CreatorTokenABI,
          functionName: "description",
        }),
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: CreatorTokenABI,
          functionName: "logoUrl",
        }),
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: CreatorTokenABI,
          functionName: "getCurrentPrice",
        }),
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: CreatorTokenABI,
          functionName: "marketCap",
        }),
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: CreatorTokenABI,
          functionName: "totalSupply_",
        }),
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: CreatorTokenABI,
          functionName: "totalSold",
        }),
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: CreatorTokenABI,
          functionName: "holderCount",
        }),
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: CreatorTokenABI,
          functionName: "dailyVolume",
        }),
      ]);

      // Calculate derived values
      const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
      const ageInSeconds = currentTimestamp - launchTime;
      const ageInDays = Number(ageInSeconds) / (24 * 60 * 60);

      const age =
        ageInDays < 1
          ? "Just launched"
          : ageInDays < 2
          ? "1 day ago"
          : `${Math.floor(ageInDays)} days ago`;

      // Calculate price change data (mock implementation - in real app you'd use price history)
      const basePrice = Number(currentPrice) / 1e18;
      const randomChange = (Math.random() - 0.5) * 100; // Random change between -50% and +50%
      const priceChange = `${
        randomChange >= 0 ? "+" : ""
      }${randomChange.toFixed(1)}%`;
      const priceValue = `${randomChange >= 0 ? "+" : ""}${(
        (basePrice * randomChange) /
        100
      ).toFixed(3)}`;

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

  /**
   * Format launch time for display
   */
  formatLaunchTime(launchTime: bigint): string {
    const launchTimeMs = Number(launchTime) * 1000; // Convert to milliseconds
    const now = Date.now();
    const diffMs = now - launchTimeMs;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return "Just now";
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return "1 day ago";
    } else {
      return `${diffDays} days ago`;
    }
  }

  /**
   * Format current price for display
   */
  formatCurrentPrice(currentPrice: bigint): string {
    const priceNumber = Number(currentPrice) / 1e18; // Convert from wei
    
    if (priceNumber >= 1) {
      return `$${priceNumber.toFixed(4)}`;
    } else if (priceNumber >= 0.0001) {
      return `$${priceNumber.toFixed(6)}`;
    } else if (priceNumber > 0) {
      return `$${priceNumber.toExponential(2)}`;
    } else {
      return "$0.000000";
    }
  }

  /**
   * Fetch external tokens data for supported networks
   */
  async getExternalTokensData(chainId?: number): Promise<TokenData[]> {
    const externalTokens: TokenData[] = [];

    try {
      // Only add external tokens for 0G Network (Chain ID: 16600)
      if (chainId === 16600) {
        console.log("🌐 Fetching external tokens for 0G Network...");

        // Add Panda AI token
        const pandaAIData = await this.getExternalTokenData(
          EXTERNAL_TOKENS["panda-ai-0g"],
          chainId
        );
        if (pandaAIData) {
          externalTokens.push(pandaAIData);
          console.log("✅ Added Panda AI token to token list");
        }
      }
    } catch (error) {
      console.error("❌ Error fetching external tokens:", error);
    }

    return externalTokens;
  }

  /**
   * Create TokenData for external tokens
   */
  async getExternalTokenData(
    externalToken: ExternalTokenInfo,
    chainId: number
  ): Promise<TokenData | null> {
    try {
      console.log(`🔄 Processing external token: ${externalToken.symbol}`);

      // Create external token service instance
      const externalTokenService = new ExternalTokenService(
        externalToken.address,
        chainId
      );

      // Fetch current token info from blockchain
      const tokenInfo = await externalTokenService.getTokenInfo();

      // Mock some data since we don't have bonding curve for external tokens
      const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
      const mockLaunchTime = currentTimestamp - BigInt(2 * 24 * 60 * 60); // 2 days ago
      const ageInSeconds = currentTimestamp - mockLaunchTime;
      const ageInDays = Number(ageInSeconds) / (24 * 60 * 60);

      const age =
        ageInDays < 1
          ? "Just launched"
          : ageInDays < 2
          ? "1 day ago"
          : `${Math.floor(ageInDays)} days ago`;

      // Mock market data for external tokens
      const mockCurrentPrice = BigInt(Math.floor(0.000001234 * 1e18)); // ~$0.000001234
      const mockMarketCap = BigInt(Math.floor(1234567 * 1e18)); // ~$1.2M
      const mockDailyVolume = BigInt(Math.floor(45678 * 1e18)); // ~$45k

      // Calculate price change data (mock implementation)
      const randomChange = (Math.random() - 0.5) * 50; // Random change between -25% and +25%
      const priceChange = `${
        randomChange >= 0 ? "+" : ""
      }${randomChange.toFixed(1)}%`;
      const priceValue = `${randomChange >= 0 ? "+" : ""}${(
        0.000001234 * randomChange / 100
      ).toFixed(8)}`;

      const tokenData: TokenData = {
        id: externalToken.address,
        address: externalToken.address,
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        description: externalToken.description || `${tokenInfo.name} - External token on ${chainId === 16600 ? '0G Network' : 'Unknown Network'}`,
        logoUrl: externalToken.logoUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iOCIgZmlsbD0iI0ZGNkIzNSIvPgo8dGV4dCB4PSIyNCIgeT0iMzAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZm9udC13ZWlnaHQ9ImJvbGQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNGRkZGRkYiPlBBSTwvdGV4dD4KPC9zdmc+',
        creator: "External", // External tokens don't have a creator in our system
        launchTime: mockLaunchTime,
        currentPrice: mockCurrentPrice,
        marketCap: mockMarketCap,
        totalSupply: tokenInfo.totalSupply,
        totalSold: BigInt(0), // External tokens don't have "sold" concept
        holderCount: BigInt(2048), // From explorer data
        dailyVolume: mockDailyVolume,
        isLive: true, // External tokens are always "live"
        priceChange,
        priceValue,
        age,
        isExternal: true,
        chainId: chainId,
      };

      console.log(`✅ Successfully processed external token ${tokenInfo.symbol}:`, tokenData);
      return tokenData;
    } catch (error) {
      console.error(`❌ Error processing external token ${externalToken.symbol}:`, error);
      return null;
    }
  }
}

// Create and export singleton instance
export const tokenDataService = new TokenDataService();
export default tokenDataService;
