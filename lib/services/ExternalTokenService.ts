/**
 * External Token Service
 * Handles integration with external ERC20 tokens (not created through our platform)
 */

import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseEther,
  formatEther,
} from "viem";

export interface ExternalTokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  chainId: number;
  logoUrl?: string;
  description?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  isExternal: true; // Flag to identify external tokens
}

export interface ExternalTokenStats {
  currentPrice: bigint;
  marketCap: bigint;
  totalSupply: bigint;
  holderCount: bigint;
  dailyVolume: bigint;
  priceChange24h: number; // percentage
}

export interface ExternalTokenBalance {
  balance: bigint;
  formattedBalance: string;
  valueInETH: bigint;
  formattedValue: string;
}

export class ExternalTokenService {
  private tokenAddress: string;
  private chainId: number;

  constructor(tokenAddress: string, chainId: number) {
    this.tokenAddress = tokenAddress;
    this.chainId = chainId;
  }

  /**
   * Get chain configuration for the token's network
   */
  private async getChainConfig() {
    const chainMap: Record<number, any> = {
      16661: (await import("viem/chains")).mainnet, // Use mainnet as base, we'll override RPC
      44787: (await import("viem/chains")).celoAlfajores,
      80002: (await import("viem/chains")).polygonAmoy,
      84532: (await import("viem/chains")).baseSepolia,
    };

    let chain = chainMap[this.chainId];

    // For 0G Network, create custom chain config
    if (this.chainId === 16661) {
      chain = {
        id: 16661,
        name: "0G Mainnet",
        network: "0g-mainnet",
        nativeCurrency: {
          decimals: 18,
          name: "0G",
          symbol: "0G",
        },
        rpcUrls: {
          default: {
            http: ["https://evmrpc.0g.ai"],
          },
          public: {
            http: ["https://evmrpc.0g.ai"],
          },
        },
        blockExplorers: {
          default: {
            name: "0G Explorer",
            url: "https://chainscan.0g.ai",
          },
        },
        testnet: false,
      };
    }

    if (!chain) {
      throw new Error(`Unsupported chain ID: ${this.chainId}`);
    }

    return chain;
  }

  /**
   * Create public client for read operations
   */
  private async createPublicClient() {
    const chain = await this.getChainConfig();

    return createPublicClient({
      chain,
      transport: http(),
    });
  }

  /**
   * Create wallet client for transactions
   */
  private async createWalletClient() {
    const chain = await this.getChainConfig();

    return createWalletClient({
      chain,
      transport: custom(window.ethereum),
    });
  }

  /**
   * Standard ERC20 ABI for basic token operations
   */
  private getERC20ABI() {
    return [
      {
        constant: true,
        inputs: [],
        name: "name",
        outputs: [{ name: "", type: "string" }],
        type: "function",
      },
      {
        constant: true,
        inputs: [],
        name: "symbol",
        outputs: [{ name: "", type: "string" }],
        type: "function",
      },
      {
        constant: true,
        inputs: [],
        name: "decimals",
        outputs: [{ name: "", type: "uint8" }],
        type: "function",
      },
      {
        constant: true,
        inputs: [],
        name: "totalSupply",
        outputs: [{ name: "", type: "uint256" }],
        type: "function",
      },
      {
        constant: true,
        inputs: [{ name: "_owner", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "balance", type: "uint256" }],
        type: "function",
      },
      {
        constant: false,
        inputs: [
          { name: "_to", type: "address" },
          { name: "_value", type: "uint256" },
        ],
        name: "transfer",
        outputs: [{ name: "", type: "bool" }],
        type: "function",
      },
      {
        constant: false,
        inputs: [
          { name: "_spender", type: "address" },
          { name: "_value", type: "uint256" },
        ],
        name: "approve",
        outputs: [{ name: "", type: "bool" }],
        type: "function",
      },
      {
        constant: true,
        inputs: [
          { name: "_owner", type: "address" },
          { name: "_spender", type: "address" },
        ],
        name: "allowance",
        outputs: [{ name: "", type: "uint256" }],
        type: "function",
      },
    ];
  }

  // ==================== Token Information ====================

  /**
   * Get comprehensive token information
   */
  async getTokenInfo(): Promise<ExternalTokenInfo> {
    const publicClient = await this.createPublicClient();
    const abi = this.getERC20ABI();

    try {
      // First, check if the address is a valid contract
      const bytecode = await publicClient.getBytecode({
        address: this.tokenAddress as `0x${string}`,
      });

      if (!bytecode || bytecode === "0x") {
        throw new Error(
          `No contract found at address ${this.tokenAddress} on chain ${this.chainId}. This address may not be a valid contract or may not exist on this network.`
        );
      }

      const [name, symbol, decimals, totalSupply] = await Promise.all([
        publicClient.readContract({
          address: this.tokenAddress as `0x${string}`,
          abi,
          functionName: "name",
        }) as Promise<string>,
        publicClient.readContract({
          address: this.tokenAddress as `0x${string}`,
          abi,
          functionName: "symbol",
        }) as Promise<string>,
        publicClient.readContract({
          address: this.tokenAddress as `0x${string}`,
          abi,
          functionName: "decimals",
        }) as Promise<number>,
        publicClient.readContract({
          address: this.tokenAddress as `0x${string}`,
          abi,
          functionName: "totalSupply",
        }) as Promise<bigint>,
      ]);

      return {
        address: this.tokenAddress,
        name,
        symbol,
        decimals,
        totalSupply,
        chainId: this.chainId,
        isExternal: true,
      };
    } catch (error: any) {
      console.error("Error fetching token info:", error);
      
      // Provide more specific error messages
      if (error.message?.includes("returned no data")) {
        throw new Error(
          `Contract at ${this.tokenAddress} does not implement ERC-20 standard functions (name, symbol, decimals, totalSupply). This may not be a valid ERC-20 token.`
        );
      }
      
      if (error.message?.includes("No contract found")) {
        throw error; // Re-throw our custom error
      }
      
      throw new Error(
        `Failed to fetch token information from ${this.tokenAddress} on chain ${this.chainId}: ${error.message || error}`
      );
    }
  }

  /**
   * Get token balance for a specific address
   */
  async getBalance(userAddress: string): Promise<ExternalTokenBalance> {
    const publicClient = await this.createPublicClient();
    const abi = this.getERC20ABI();

    try {
      const [balance, decimals] = await Promise.all([
        publicClient.readContract({
          address: this.tokenAddress as `0x${string}`,
          abi,
          functionName: "balanceOf",
          args: [userAddress],
        }) as Promise<bigint>,
        publicClient.readContract({
          address: this.tokenAddress as `0x${string}`,
          abi,
          functionName: "decimals",
        }) as Promise<number>,
      ]);

      // Format balance with proper decimals
      const formattedBalance = formatEther(
        balance * BigInt(10 ** (18 - decimals))
      );

      // For now, set value to 0 since we don't have price data
      // In a real implementation, you'd integrate with a price API
      const valueInETH = BigInt(0);
      const formattedValue = "0.00";

      return {
        balance,
        formattedBalance,
        valueInETH,
        formattedValue,
      };
    } catch (error) {
      console.error("Error fetching balance:", error);
      throw new Error(`Failed to fetch token balance: ${error}`);
    }
  }

  /**
   * Transfer tokens to another address
   */
  async transfer(toAddress: string, amount: bigint): Promise<string> {
    const walletClient = await this.createWalletClient();
    const chain = await this.getChainConfig();
    const abi = this.getERC20ABI();

    try {
      const accounts = await walletClient.getAddresses();
      if (!accounts || accounts.length === 0) {
        throw new Error("No wallet accounts found");
      }

      const txHash = await walletClient.writeContract({
        account: accounts[0],
        address: this.tokenAddress as `0x${string}`,
        abi,
        functionName: "transfer",
        args: [toAddress, amount],
        chain: chain,
      });

      return txHash;
    } catch (error) {
      console.error("Error transferring tokens:", error);
      throw new Error(`Failed to transfer tokens: ${error}`);
    }
  }

  /**
   * Approve tokens for spending by another address
   */
  async approve(spenderAddress: string, amount: bigint): Promise<string> {
    const walletClient = await this.createWalletClient();
    const chain = await this.getChainConfig();
    const abi = this.getERC20ABI();

    try {
      const accounts = await walletClient.getAddresses();
      if (!accounts || accounts.length === 0) {
        throw new Error("No wallet accounts found");
      }

      const txHash = await walletClient.writeContract({
        account: accounts[0],
        address: this.tokenAddress as `0x${string}`,
        abi,
        functionName: "approve",
        args: [spenderAddress, amount],
        chain: chain,
      });

      return txHash;
    } catch (error) {
      console.error("Error approving tokens:", error);
      throw new Error(`Failed to approve tokens: ${error}`);
    }
  }

  /**
   * Get allowance for a spender
   */
  async getAllowance(
    ownerAddress: string,
    spenderAddress: string
  ): Promise<bigint> {
    const publicClient = await this.createPublicClient();
    const abi = this.getERC20ABI();

    try {
      const allowance = (await publicClient.readContract({
        address: this.tokenAddress as `0x${string}`,
        abi,
        functionName: "allowance",
        args: [ownerAddress, spenderAddress],
      })) as bigint;

      return allowance;
    } catch (error) {
      console.error("Error fetching allowance:", error);
      throw new Error(`Failed to fetch allowance: ${error}`);
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(txHash: string): Promise<any> {
    const publicClient = await this.createPublicClient();

    try {
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash as `0x${string}`,
        timeout: 60000,
      });

      return receipt;
    } catch (error) {
      console.error("Error waiting for transaction:", error);
      throw new Error(`Transaction failed or timed out: ${error}`);
    }
  }
}

/**
 * Predefined external tokens configuration
 */
export const EXTERNAL_TOKENS: Record<string, ExternalTokenInfo> = {
  "panda-ai-0g": {
    address: "0x59ef6F3943bBdFE2fB19565037Ac85071223E94C",
    name: "Panda AI",
    symbol: "PAI",
    decimals: 18,
    totalSupply: BigInt(0), // Will be fetched dynamically
    chainId: 16661, // 0G Mainnet
    logoUrl: "https://via.placeholder.com/64x64/000000/FFFFFF?text=PAI",
    description:
      "Panda AI token on 0G Network - An innovative AI-powered token",
    website: "https://panda-ai.example.com",
    twitter: "https://twitter.com/panda_ai",
    telegram: "https://t.me/panda_ai",
    isExternal: true,
  },
};

/**
 * Factory function to create external token service
 */
export const createExternalTokenService = (
  tokenAddress: string,
  chainId: number
) => {
  return new ExternalTokenService(tokenAddress, chainId);
};

export default ExternalTokenService;
