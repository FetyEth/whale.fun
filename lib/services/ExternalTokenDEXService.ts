/**
 * External Token DEX Service
 * Handles DEX integration for external tokens using wagmi
 * Based on the transaction data showing Jaine V3 (Uniswap V3 fork) integration
 */

import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useBalance,
} from "wagmi";
import { parseEther, formatEther, parseUnits, formatUnits } from "viem";

// Jaine V3 contract addresses on 0G Network (from transaction data)
export const JAINE_V3_ADDRESSES = {
  16600: {
    // 0G Testnet
    factory: "0x7453582657F056ce5CfcEeE9E31E4BC390fa2b3c", // Assumed from zer0dex
    router: "0xb95B5953FF8ee5D5d9818CdbEfE363ff2191318c", // Assumed from zer0dex
    quoter: "0x8d5E064d2EF44C29eE349e71CF70F751ECD62892", // Assumed from zer0dex
    nftPositionManager: "0x8F67A30Ed186e3E1f6504c6dE3239Ef43A2e0d72", // From transaction data
    multicall: "0xED0103a53069a347eD40290e0A069b46fd50Ba05", // Assumed from zer0dex
    tokens: {
      W0G: "0x224D...5E76", // Wrapped 0G from transaction (partial address)
      PAI: "0x59ef6F3943bBdFE2fB19565037Ac85071223E94C", // Panda AI token
    },
  },
};

// Panda AI token configuration
export const PANDA_AI_CONFIG = {
  address: "0x59ef6F3943bBdFE2fB19565037Ac85071223E94C" as `0x${string}`,
  symbol: "PAI",
  name: "Panda AI",
  decimals: 9, // From the explorer data
  totalSupply: "1000000000", // 1B PAI
  chainId: 16600,
  logoUrl: "https://pandas-ai.com/assets/logos/pandasai-logo.avif",
  description: "Panda AI - An innovative AI-powered token on 0G Network",
};

// Standard ERC20 ABI for token operations
export const ERC20_ABI = [
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
] as const;

// Uniswap V3 Router ABI (simplified for swaps)
export const UNISWAP_V3_ROUTER_ABI = [
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "tokenIn", type: "address" },
          { internalType: "address", name: "tokenOut", type: "address" },
          { internalType: "uint24", name: "fee", type: "uint24" },
          { internalType: "address", name: "recipient", type: "address" },
          { internalType: "uint256", name: "deadline", type: "uint256" },
          { internalType: "uint256", name: "amountIn", type: "uint256" },
          {
            internalType: "uint256",
            name: "amountOutMinimum",
            type: "uint256",
          },
          {
            internalType: "uint160",
            name: "sqrtPriceLimitX96",
            type: "uint160",
          },
        ],
        internalType: "struct ISwapRouter.ExactInputSingleParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "exactInputSingle",
    outputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "tokenIn", type: "address" },
          { internalType: "address", name: "tokenOut", type: "address" },
          { internalType: "uint24", name: "fee", type: "uint24" },
          { internalType: "address", name: "recipient", type: "address" },
          { internalType: "uint256", name: "deadline", type: "uint256" },
          { internalType: "uint256", name: "amountOut", type: "uint256" },
          { internalType: "uint256", name: "amountInMaximum", type: "uint256" },
          {
            internalType: "uint160",
            name: "sqrtPriceLimitX96",
            type: "uint160",
          },
        ],
        internalType: "struct ISwapRouter.ExactOutputSingleParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "exactOutputSingle",
    outputs: [{ internalType: "uint256", name: "amountIn", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
] as const;

// Quoter ABI for price quotes
export const QUOTER_ABI = [
  {
    inputs: [
      { internalType: "address", name: "tokenIn", type: "address" },
      { internalType: "address", name: "tokenOut", type: "address" },
      { internalType: "uint24", name: "fee", type: "uint24" },
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint160", name: "sqrtPriceLimitX96", type: "uint160" },
    ],
    name: "quoteExactInputSingle",
    outputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export interface SwapParams {
  tokenIn: `0x${string}`;
  tokenOut: `0x${string}`;
  fee: number;
  amountIn: string;
  slippageTolerance: number; // percentage (e.g., 0.5 for 0.5%)
}

export interface SwapQuote {
  amountOut: string;
  amountOutFormatted: string;
  priceImpact: number;
  minimumAmountOut: string;
  route: string[];
}

/**
 * Hook for getting Panda AI token balance
 */
export function usePandaAIBalance() {
  const { address } = useAccount();

  const {
    data: balance,
    isLoading,
    refetch,
  } = useReadContract({
    address: PANDA_AI_CONFIG.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const formattedBalance =
    balance && typeof balance === "bigint"
      ? formatUnits(balance, PANDA_AI_CONFIG.decimals)
      : "0";

  return {
    balance,
    formattedBalance,
    isLoading,
    refetch,
  };
}

/**
 * Hook for getting token allowance
 */
export function useTokenAllowance(
  tokenAddress: `0x${string}`,
  spenderAddress: `0x${string}`
) {
  const { address } = useAccount();

  const {
    data: allowance,
    isLoading,
    refetch,
  } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, spenderAddress] : undefined,
    query: {
      enabled: !!address,
    },
  });

  return {
    allowance,
    isLoading,
    refetch,
  };
}

/**
 * Hook for approving token spending
 */
export function useTokenApproval() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const approve = async (
    tokenAddress: `0x${string}`,
    spenderAddress: `0x${string}`,
    amount: bigint
  ) => {
    writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spenderAddress, amount],
    });
  };

  return {
    approve,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook for getting swap quotes
 */
export function useSwapQuote(params: SwapParams | null) {
  const quoterAddress = JAINE_V3_ADDRESSES[16600].quoter as `0x${string}`;

  const { data: amountOut, isLoading } = useReadContract({
    address: quoterAddress,
    abi: QUOTER_ABI,
    functionName: "quoteExactInputSingle",
    args: params
      ? [
          params.tokenIn,
          params.tokenOut,
          params.fee,
          parseUnits(params.amountIn, PANDA_AI_CONFIG.decimals),
          BigInt(0), // sqrtPriceLimitX96
        ]
      : undefined,
    query: {
      enabled: !!params && params.amountIn !== "0" && params.amountIn !== "",
    },
  }) as { data: bigint | undefined; isLoading: boolean };

  const quote: SwapQuote | null =
    params && amountOut && typeof amountOut === "bigint"
      ? {
          amountOut: amountOut.toString(),
          amountOutFormatted: formatUnits(amountOut, 18), // Assuming output token has 18 decimals
          priceImpact: 0.1, // Mock price impact - would need more complex calculation
          minimumAmountOut: (
            (amountOut *
              BigInt(Math.floor((100 - params.slippageTolerance) * 100))) /
            BigInt(10000)
          ).toString(),
          route: [params.tokenIn, params.tokenOut],
        }
      : null;

  return {
    quote,
    isLoading,
  };
}

/**
 * Hook for executing swaps
 */
export function useSwap() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const swap = async (params: SwapParams) => {
    const routerAddress = JAINE_V3_ADDRESSES[16600].router as `0x${string}`;
    const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes from now
    const amountIn = parseUnits(params.amountIn, PANDA_AI_CONFIG.decimals);
    const minimumAmountOut =
      (amountIn * BigInt(Math.floor((100 - params.slippageTolerance) * 100))) /
      BigInt(10000);

    writeContract({
      address: routerAddress,
      abi: UNISWAP_V3_ROUTER_ABI,
      functionName: "exactInputSingle",
      args: [
        {
          tokenIn: params.tokenIn,
          tokenOut: params.tokenOut,
          fee: params.fee,
          recipient: params.tokenOut, // User's address - would need to get from useAccount
          deadline: BigInt(deadline),
          amountIn: amountIn,
          amountOutMinimum: minimumAmountOut,
          sqrtPriceLimitX96: BigInt(0),
        },
      ],
    });
  };

  return {
    swap,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook for buying Panda AI tokens with 0G
 */
export function useBuyPandaAI() {
  const { address } = useAccount();
  const { swap, hash, isPending, isConfirming, isSuccess, error } = useSwap();

  const buyPandaAI = async (
    amountIn0G: string,
    slippageTolerance: number = 0.5
  ) => {
    if (!address) throw new Error("Wallet not connected");

    const params: SwapParams = {
      tokenIn: "0x0000000000000000000000000000000000000000", // 0G native token (would need actual W0G address)
      tokenOut: PANDA_AI_CONFIG.address,
      fee: 3000, // 0.3% fee tier
      amountIn: amountIn0G,
      slippageTolerance,
    };

    await swap(params);
  };

  return {
    buyPandaAI,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook for selling Panda AI tokens for 0G
 */
export function useSellPandaAI() {
  const { address } = useAccount();
  const { swap, hash, isPending, isConfirming, isSuccess, error } = useSwap();

  const sellPandaAI = async (
    amountInPAI: string,
    slippageTolerance: number = 0.5
  ) => {
    if (!address) throw new Error("Wallet not connected");

    const params: SwapParams = {
      tokenIn: PANDA_AI_CONFIG.address,
      tokenOut: "0x0000000000000000000000000000000000000000", // 0G native token (would need actual W0G address)
      fee: 3000, // 0.3% fee tier
      amountIn: amountInPAI,
      slippageTolerance,
    };

    await swap(params);
  };

  return {
    sellPandaAI,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook for getting Panda AI market data
 */
export function usePandaAIMarketData() {
  // Mock market data - in real implementation, would fetch from DEX or price API
  const marketData = {
    price: "0.000001234", // Price in 0G
    priceUSD: "0.00000456", // Price in USD (if available)
    marketCap: "1,234,567", // Market cap in USD
    volume24h: "45,678", // 24h volume
    priceChange24h: 12.34, // 24h price change percentage
    holders: 2048, // From explorer data
    totalSupply: PANDA_AI_CONFIG.totalSupply,
    circulatingSupply: "800000000", // 800M PAI (assuming some locked)
  };

  return {
    marketData,
    isLoading: false,
  };
}

/**
 * Utility function to format token amounts
 */
export function formatTokenAmount(
  amount: string | bigint,
  decimals: number = 18,
  displayDecimals: number = 4
): string {
  const formatted =
    typeof amount === "string"
      ? formatUnits(BigInt(amount), decimals)
      : formatUnits(amount, decimals);

  const num = parseFloat(formatted);

  if (num === 0) return "0";
  if (num < 0.0001) return "<0.0001";

  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: displayDecimals,
  });
}

/**
 * Utility function to calculate price impact
 */
export function calculatePriceImpact(
  amountIn: string,
  amountOut: string,
  currentPrice: string
): number {
  // Simplified price impact calculation
  // In real implementation, would use more sophisticated DEX math
  const expectedOut = parseFloat(amountIn) * parseFloat(currentPrice);
  const actualOut = parseFloat(amountOut);

  if (expectedOut === 0) return 0;

  return ((expectedOut - actualOut) / expectedOut) * 100;
}

const ExternalTokenDEXService = {
  PANDA_AI_CONFIG,
  JAINE_V3_ADDRESSES,
  usePandaAIBalance,
  useTokenAllowance,
  useTokenApproval,
  useSwapQuote,
  useSwap,
  useBuyPandaAI,
  useSellPandaAI,
  usePandaAIMarketData,
  formatTokenAmount,
  calculatePriceImpact,
};

export default ExternalTokenDEXService;
