import { parseUnits, formatUnits, encodePacked } from "viem";
import { readContract, writeContract, waitForTransaction } from "wagmi/actions";

// Import ABIs
import jaineV3QuoterABI from "@/config/abi/jaine/jaineV3Quoter.json";
import jaineV3SwapRouterABI from "@/config/abi/jaine/jaineV3SwapRouter.json";
import jaineV3FactoryABI from "@/config/abi/jaine/jaineV3Factory.json";
import ERC20ABI from "@/config/abi/ERC20.json"; // We'll need this for token approvals
import { config } from "@/provider/ClientProvider";

// Contract addresses from .env
export const JAINE_CONTRACTS = {
  factory:
    process.env.NEXT_PUBLIC_JAINE_V3_FACTORY ||
    "0x9bdcA5798E52e592A08e3b34d3F18EeF76Af7ef4",
  swapRouter:
    process.env.NEXT_PUBLIC_JAINE_V3_SWAP_ROUTER ||
    "0x8B598A7C136215A95ba0282b4d832B9f9801f2e2",
  quoter:
    process.env.NEXT_PUBLIC_JAINE_V3_QUOTER ||
    "0xd00883722cECAD3A1c60bCA611f09e1851a0bE02",
} as const;

// Common fee tiers for Uniswap V3 style DEXs
export const FEE_TIERS = {
  LOW: 500, // 0.05%
  MEDIUM: 3000, // 0.3%
  HIGH: 10000, // 1%
} as const;

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  icon?: string;
}

export interface QuoteParams {
  tokenIn: Token;
  tokenOut: Token;
  amountIn: string;
  fee?: number;
}

export interface SwapParams {
  tokenIn: Token;
  tokenOut: Token;
  amountIn: string;
  amountOutMinimum: string;
  recipient: string;
  deadline?: number;
  fee?: number;
}

export interface PoolInfo {
  token0: Token;
  token1: Token;
  fee: number;
  liquidity: string;
  sqrtPriceX96: string;
  tick: number;
}

/**
 * Get a quote for exact input swap
 */
export async function getQuoteExactInputSingle({
  tokenIn,
  tokenOut,
  amountIn,
  fee = FEE_TIERS.MEDIUM,
}: QuoteParams): Promise<string> {
  try {
    const amountInWei = parseUnits(amountIn, tokenIn.decimals);

    // Check if pool exists first
    const poolAddress = await getPool(tokenIn.address, tokenOut.address, fee);
    if (
      !poolAddress ||
      poolAddress === "0x0000000000000000000000000000000000000000"
    ) {
      console.warn(
        "No pool exists for this token pair and fee tier. Returning mock quote."
      );
      const mockRate = 0.0003;
      const quote = (parseFloat(amountIn) * mockRate).toString();
      return quote;
    }

    // Try to get a real quote
    const result = await readContract(config, {
      address: JAINE_CONTRACTS.quoter as `0x${string}`,
      abi: jaineV3QuoterABI,
      functionName: "quoteExactInputSingle",
      args: [
        tokenIn.address as `0x${string}`,
        tokenOut.address as `0x${string}`,
        fee,
        amountInWei,
        BigInt(0), // sqrtPriceLimitX96 (0 for no limit)
      ],
    });

    return formatUnits(result as bigint, tokenOut.decimals);
  } catch (error) {
    console.error("Error getting quote (falling back to mock):", error);
    const mockRate = 0.0003;
    const quote = (parseFloat(amountIn) * mockRate).toString();
    return quote;
  }
}

/**
 * Get a quote for exact output swap
 */
export async function getQuoteExactOutputSingle({
  tokenIn,
  tokenOut,
  amountIn,
  fee = FEE_TIERS.MEDIUM,
}: QuoteParams): Promise<string> {
  try {
    const amountOutWei = parseUnits(amountIn, tokenOut.decimals);

    const result = await readContract(config, {
      address: JAINE_CONTRACTS.quoter as `0x${string}`,
      abi: jaineV3QuoterABI,
      functionName: "quoteExactOutputSingle",
      args: [
        tokenIn.address as `0x${string}`,
        tokenOut.address as `0x${string}`,
        fee,
        amountOutWei,
        BigInt(0), // sqrtPriceLimitX96 (0 for no limit)
      ],
    });

    return formatUnits(result as bigint, tokenIn.decimals);
  } catch (error) {
    console.error("Error getting quote:", error);
    throw new Error("Failed to get quote");
  }
}

/**
 * Check if token needs approval and get current allowance
 */
export async function getTokenAllowance(
  tokenAddress: string,
  owner: string,
  spender: string = JAINE_CONTRACTS.swapRouter
): Promise<string> {
  try {
    // Check if the address looks like a valid contract address
    if (
      !tokenAddress ||
      tokenAddress === "0x0000000000000000000000000000000000000000"
    ) {
      return "0";
    }

    const result = await readContract(config, {
      address: tokenAddress as `0x${string}`,
      abi: ERC20ABI,
      functionName: "allowance",
      args: [owner as `0x${string}`, spender as `0x${string}`],
    });

    return result as string;
  } catch (error) {
    console.error("Error getting allowance:", error);
    // Return 0 for any errors - this will disable approval checks
    return "0";
  }
}

/**
 * Approve token spending
 */
export async function approveToken(
  tokenAddress: string,
  amount: string,
  spender: string = JAINE_CONTRACTS.swapRouter
): Promise<string> {
  try {
    const hash = await writeContract(config, {
      address: tokenAddress as `0x${string}`,
      abi: ERC20ABI,
      functionName: "approve",
      args: [spender as `0x${string}`, parseUnits(amount, 18)],
    });

    return hash;
  } catch (error) {
    console.error("Error approving token:", error);
    throw new Error("Failed to approve token");
  }
}

/**
 * Execute exact input single swap
 */
export async function swapExactInputSingle({
  tokenIn,
  tokenOut,
  amountIn,
  amountOutMinimum,
  recipient,
  deadline = Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes
  fee = FEE_TIERS.MEDIUM,
}: SwapParams): Promise<string> {
  try {
    const params = {
      tokenIn: tokenIn.address as `0x${string}`,
      tokenOut: tokenOut.address as `0x${string}`,
      fee,
      recipient: recipient as `0x${string}`,
      deadline: BigInt(deadline),
      amountIn: parseUnits(amountIn, tokenIn.decimals),
      amountOutMinimum: parseUnits(amountOutMinimum, tokenOut.decimals),
      sqrtPriceLimitX96: BigInt(0),
    };

    const hash = await writeContract(config, {
      address: JAINE_CONTRACTS.swapRouter as `0x${string}`,
      abi: jaineV3SwapRouterABI,
      functionName: "exactInputSingle",
      args: [params],
    });

    return hash;
  } catch (error) {
    console.error("Error executing swap:", error);
    throw new Error("Failed to execute swap");
  }
}

/**
 * Get token balance
 */
export async function getTokenBalance(
  tokenAddress: string,
  userAddress: string
): Promise<string> {
  try {
    const result = await readContract(config, {
      address: tokenAddress as `0x${string}`,
      abi: ERC20ABI,
      functionName: "balanceOf",
      args: [userAddress as `0x${string}`],
    });

    return result as string;
  } catch (error) {
    console.error("Error getting balance:", error);
    return "0";
  }
}

/**
 * Check if a pool exists for given token pair
 */
export async function getPool(
  tokenA: string,
  tokenB: string,
  fee: number = FEE_TIERS.MEDIUM
): Promise<string> {
  try {
    const result = await readContract(config, {
      address: JAINE_CONTRACTS.factory as `0x${string}`,
      abi: jaineV3FactoryABI,
      functionName: "getPool",
      args: [tokenA as `0x${string}`, tokenB as `0x${string}`, fee],
    });

    return result as string;
  } catch (error) {
    console.error("Error getting pool:", error);
    return "0x0000000000000000000000000000000000000000";
  }
}

/**
 * Calculate price impact percentage
 */
export function calculatePriceImpact(
  amountIn: string,
  amountOut: string,
  marketPrice: string
): number {
  try {
    const actualPrice = parseFloat(amountOut) / parseFloat(amountIn);
    const impact =
      ((parseFloat(marketPrice) - actualPrice) / parseFloat(marketPrice)) * 100;
    return Math.abs(impact);
  } catch {
    return 0;
  }
}

/**
 * Calculate minimum amount out with slippage
 */
export function calculateMinimumAmountOut(
  amountOut: string,
  slippagePercent: number
): string {
  try {
    const slippageMultiplier = (100 - slippagePercent) / 100;
    const minimumAmount = parseFloat(amountOut) * slippageMultiplier;
    return minimumAmount.toString();
  } catch {
    return "0";
  }
}

/**
 * Format token amount for display
 */
export function formatTokenAmount(
  amount: string,
  decimals: number,
  displayDecimals: number = 6
): string {
  try {
    const formatted = formatUnits(BigInt(amount), decimals);
    const num = parseFloat(formatted);

    if (num === 0) return "0";
    if (num < 0.000001) return "< 0.000001";

    return num.toFixed(displayDecimals);
  } catch {
    return "0";
  }
}

/**
 * Encode path for multi-hop swaps
 */
export function encodePath(tokens: string[], fees: number[]): string {
  if (tokens.length !== fees.length + 1) {
    throw new Error("Invalid path: tokens length must be fees length + 1");
  }

  let path = "0x";
  for (let i = 0; i < fees.length; i++) {
    path += tokens[i].slice(2); // Remove 0x prefix
    path += fees[i].toString(16).padStart(6, "0"); // 3 bytes for fee
  }
  path += tokens[tokens.length - 1].slice(2); // Last token

  return path;
}

// Additional interfaces for liquidity management
export interface MintParams {
  token0: string;
  token1: string;
  fee: number;
  tickLower: number;
  tickUpper: number;
  amount0Desired: string;
  amount1Desired: string;
  amount0Min: string;
  amount1Min: string;
  recipient: string;
  deadline: number;
}

export interface IncreaseLiquidityParams {
  tokenId: string;
  amount0Desired: string;
  amount1Desired: string;
  amount0Min: string;
  amount1Min: string;
  deadline: number;
}

export interface DecreaseLiquidityParams {
  tokenId: string;
  liquidity: string;
  amount0Min: string;
  amount1Min: string;
  deadline: number;
}

export interface CollectParams {
  tokenId: string;
  recipient: string;
  amount0Max: string;
  amount1Max: string;
}

/**
 * Create a new liquidity pool (if it doesn't exist)
 */
export async function createPool(
  tokenA: string,
  tokenB: string,
  fee: number,
  sqrtPriceX96: string
): Promise<string> {
  try {
    const hash = await writeContract(config, {
      address: JAINE_CONTRACTS.factory as `0x${string}`,
      abi: jaineV3FactoryABI,
      functionName: "createPool",
      args: [
        tokenA as `0x${string}`,
        tokenB as `0x${string}`,
        fee,
        BigInt(sqrtPriceX96),
      ],
    });

    return hash;
  } catch (error) {
    console.error("Error creating pool:", error);
    throw new Error("Failed to create pool");
  }
}

/**
 * Get pool information
 */
export async function getPoolInfo(poolAddress: string): Promise<any> {
  try {
    // You would need the pool ABI for this
    const poolABI = [
      {
        name: "token0",
        type: "function",
        inputs: [],
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
      },
      {
        name: "token1",
        type: "function",
        inputs: [],
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
      },
      {
        name: "fee",
        type: "function",
        inputs: [],
        outputs: [{ name: "", type: "uint24" }],
        stateMutability: "view",
      },
      {
        name: "liquidity",
        type: "function",
        inputs: [],
        outputs: [{ name: "", type: "uint128" }],
        stateMutability: "view",
      },
      {
        name: "slot0",
        type: "function",
        inputs: [],
        outputs: [
          { name: "sqrtPriceX96", type: "uint160" },
          { name: "tick", type: "int24" },
          { name: "observationIndex", type: "uint16" },
          { name: "observationCardinality", type: "uint16" },
          { name: "observationCardinalityNext", type: "uint16" },
          { name: "feeProtocol", type: "uint8" },
          { name: "unlocked", type: "bool" },
        ],
        stateMutability: "view",
      },
    ];

    const [token0, token1, fee, liquidity, slot0] = await Promise.all([
      readContract(config, {
        address: poolAddress as `0x${string}`,
        abi: poolABI,
        functionName: "token0",
      }),
      readContract(config, {
        address: poolAddress as `0x${string}`,
        abi: poolABI,
        functionName: "token1",
      }),
      readContract(config, {
        address: poolAddress as `0x${string}`,
        abi: poolABI,
        functionName: "fee",
      }),
      readContract(config, {
        address: poolAddress as `0x${string}`,
        abi: poolABI,
        functionName: "liquidity",
      }),
      readContract(config, {
        address: poolAddress as `0x${string}`,
        abi: poolABI,
        functionName: "slot0",
      }),
    ]);

    return {
      token0,
      token1,
      fee,
      liquidity,
      sqrtPriceX96: (slot0 as any)[0],
      tick: (slot0 as any)[1],
    };
  } catch (error) {
    console.error("Error getting pool info:", error);
    throw new Error("Failed to get pool info");
  }
}

/**
 * Calculate sqrt price from token prices
 */
export function calculateSqrtPriceX96(price: number): string {
  // This is a simplified calculation
  // In practice, you'd need more sophisticated math for precision
  const sqrtPrice = Math.sqrt(price);
  const Q96 = Math.pow(2, 96);
  return Math.floor(sqrtPrice * Q96).toString();
}

/**
 * Calculate price from sqrt price
 */
export function calculatePriceFromSqrtPriceX96(sqrtPriceX96: string): number {
  const Q96 = Math.pow(2, 96);
  const sqrtPrice = parseInt(sqrtPriceX96) / Q96;
  return Math.pow(sqrtPrice, 2);
}

/**
 * Calculate tick from price
 */
export function priceToTick(price: number): number {
  return Math.floor(Math.log(price) / Math.log(1.0001));
}

/**
 * Calculate price from tick
 */
export function tickToPrice(tick: number): number {
  return Math.pow(1.0001, tick);
}

/**
 * Get position info for NFT-based positions (if using position manager)
 */
export async function getPositionInfo(tokenId: string): Promise<any> {
  try {
    // This would require the NonfungiblePositionManager ABI
    // For now, returning mock data structure
    return {
      nonce: 0,
      operator: "0x0000000000000000000000000000000000000000",
      token0: "0x0000000000000000000000000000000000000000",
      token1: "0x0000000000000000000000000000000000000000",
      fee: 3000,
      tickLower: -60,
      tickUpper: 60,
      liquidity: "0",
      feeGrowthInside0LastX128: "0",
      feeGrowthInside1LastX128: "0",
      tokensOwed0: "0",
      tokensOwed1: "0",
    };
  } catch (error) {
    console.error("Error getting position info:", error);
    throw new Error("Failed to get position info");
  }
}
