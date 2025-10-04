"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowUpDown,
  Settings,
  ChevronDown,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAccount, useBalance, useChainId } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import Header from "@/components/layout/Header";
import {
  getQuoteExactInputSingle,
  swapExactInputSingle,
  getTokenBalance,
  getTokenAllowance,
  approveToken,
  calculateMinimumAmountOut,
  calculatePriceImpact,
  FEE_TIERS,
  type Token as DexToken,
} from "@/lib/dex-utils";

// Token definitions based on your .env file - converted to DexToken interface
const TOKENS: Record<string, DexToken> = {
  PAI: {
    symbol: "PAI",
    name: "PAI",
    address: "0x59ef6F3943bBdFE2fB19565037Ac85071223E94C",
    icon: "🐼",
    decimals: 18,
  },
  wstETH: {
    symbol: "wstETH",
    name: "Wrapped Staked ETH",
    address: "0x161a128567BF0C005b58211757F7e46eed983F02",
    icon: "🔷",
    decimals: 18,
  },
  stgWETH: {
    symbol: "stgWETH",
    name: "Stargate WETH",
    address: "0x564770837Ef8bbF077cFe54E5f6106538c815B22",
    icon: "🌉",
    decimals: 18,
  },
  stgUSDT: {
    symbol: "stgUSDT",
    name: "Stargate USDT",
    address: "0x9FBBAFC2Ad79af2b57eD23C60DfF79eF5c2b0FB5",
    icon: "💵",
    decimals: 6,
  },
  stgUSDC: {
    symbol: "stgUSDC",
    name: "Stargate USDC",
    address: "0x8a2B28364102Bea189D99A475C494330Ef2bDD0B",
    icon: "💎",
    decimals: 6,
  },
  W0G: {
    symbol: "W0G",
    name: "W0G Token",
    address: "0x1Cd0690fF9a693f5EF2dD976660a8dAFc81A109c",
    icon: "🔥",
    decimals: 18,
  },
  st0G: {
    symbol: "st0G",
    name: "st0G Token",
    address: "0x7bBC63D01CA42491c3E084C941c3E86e55951404",
    icon: "⚡",
    decimals: 18,
  },
  USDCe: {
    symbol: "USDCe",
    name: "USDC.e",
    address: "0x1f3AA82227281cA364bFb3d253B0f1af1Da6473E",
    icon: "💰",
    decimals: 6,
  },
};

type Token = keyof typeof TOKENS;

export default function DexPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const [fromToken, setFromToken] = useState<Token>("PAI");
  const [toToken, setToToken] = useState<Token>("wstETH");
  const [fromAmount, setFromAmount] = useState("0.00");
  const [toAmount, setToAmount] = useState("0.00");
  const [exchangeRate, setExchangeRate] = useState("0.00");
  const [slippage, setSlippage] = useState("0.5");
  const [priceImpact, setPriceImpact] = useState("0.00");
  const [lpFee, setLpFee] = useState("0.30");

  // Loading and error states
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsApproval, setNeedsApproval] = useState(false);

  // Token balances
  const [fromTokenBalance, setFromTokenBalance] = useState("0");
  const [toTokenBalance, setToTokenBalance] = useState("0");

  // Get token balances using wagmi
  const { data: fromBalance } = useBalance({
    address: address,
    token: TOKENS[fromToken].address as `0x${string}`,
  });

  const { data: toBalance } = useBalance({
    address: address,
    token: TOKENS[toToken].address as `0x${string}`,
  });

  // Update balances when they change
  useEffect(() => {
    if (fromBalance) {
      setFromTokenBalance(formatUnits(fromBalance.value, fromBalance.decimals));
    }
  }, [fromBalance]);

  useEffect(() => {
    if (toBalance) {
      setToTokenBalance(formatUnits(toBalance.value, toBalance.decimals));
    }
  }, [toBalance]);

  // Get quote from DEX
  const getQuote = useCallback(
    async (amount: string) => {
      if (!amount || parseFloat(amount) === 0 || !fromToken || !toToken) {
        setToAmount("0.00");
        setExchangeRate("0.00");
        setPriceImpact("0.00");
        return;
      }

      setIsLoadingQuote(true);
      setError(null);

      try {
        const quote = await getQuoteExactInputSingle({
          tokenIn: TOKENS[fromToken],
          tokenOut: TOKENS[toToken],
          amountIn: amount,
          fee: FEE_TIERS.MEDIUM,
        });

        setToAmount(quote);

        // Calculate exchange rate
        const rate = parseFloat(quote) / parseFloat(amount);
        setExchangeRate(rate.toFixed(8));

        // Calculate price impact (simplified - in real app, you'd need more sophisticated calculation)
        const impact = calculatePriceImpact(amount, quote, rate.toString());
        setPriceImpact(impact.toFixed(2));
      } catch (err) {
        console.error("Failed to get quote:", err);
        setError(
          "Unable to get quote. This may be due to network issues or contract availability."
        );
        setToAmount("0.00");
      } finally {
        setIsLoadingQuote(false);
      }
    },
    [fromToken, toToken]
  );

  // Check approval status
  const checkApproval = useCallback(async () => {
    if (!address || !fromAmount || parseFloat(fromAmount) === 0) {
      setNeedsApproval(false);
      return;
    }

    try {
      const allowance = await getTokenAllowance(
        TOKENS[fromToken].address,
        address
      );

      // If allowance check failed (returned '0'), skip approval for now
      if (allowance === "0") {
        setNeedsApproval(false);
        return;
      }

      const requiredAmount = parseUnits(fromAmount, TOKENS[fromToken].decimals);
      const currentAllowance = BigInt(allowance);

      setNeedsApproval(currentAllowance < requiredAmount);
    } catch (err) {
      console.error("Failed to check approval:", err);
      // On error, assume no approval needed to prevent blocking
      setNeedsApproval(false);
    }
  }, [address, fromAmount, fromToken]);

  // Debounced quote fetching
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      getQuote(fromAmount);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [fromAmount, fromToken, toToken, getQuote]);

  // Check approval when relevant values change
  useEffect(() => {
    checkApproval();
  }, [checkApproval]);

  const handleSwapTokens = () => {
    const tempToken = fromToken;
    setFromToken(toToken);
    setToToken(tempToken);

    const tempAmount = fromAmount;
    setFromAmount(toAmount);
    setToAmount(tempAmount);

    // Swap balances too
    const tempBalance = fromTokenBalance;
    setFromTokenBalance(toTokenBalance);
    setToTokenBalance(tempBalance);
  };

  const handleMaxClick = () => {
    if (fromTokenBalance && parseFloat(fromTokenBalance) > 0) {
      setFromAmount(fromTokenBalance);
    }
  };

  const handleApprove = async () => {
    if (!address) return;

    setIsApproving(true);
    setError(null);

    try {
      const hash = await approveToken(TOKENS[fromToken].address, fromAmount);

      // You could wait for transaction confirmation here
      console.log("Approval transaction:", hash);

      // Recheck approval status after a delay
      setTimeout(() => {
        checkApproval();
      }, 2000);
    } catch (err) {
      console.error("Failed to approve:", err);
      setError("Failed to approve token. Please try again.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleSwap = async () => {
    if (!address || !fromAmount || !toAmount) return;

    setIsSwapping(true);
    setError(null);

    try {
      const minimumAmountOut = calculateMinimumAmountOut(
        toAmount,
        parseFloat(slippage)
      );

      const hash = await swapExactInputSingle({
        tokenIn: TOKENS[fromToken],
        tokenOut: TOKENS[toToken],
        amountIn: fromAmount,
        amountOutMinimum: minimumAmountOut,
        recipient: address,
        fee: FEE_TIERS.MEDIUM,
      });

      console.log("Swap transaction:", hash);

      // Reset form after successful swap
      setFromAmount("0.00");
      setToAmount("0.00");
    } catch (err) {
      console.error("Failed to swap:", err);
      setError("Failed to execute swap. Please try again.");
    } finally {
      setIsSwapping(false);
    }
  };

  const TokenSelector = ({
    selectedToken,
    onTokenSelect,
    label,
  }: {
    selectedToken: Token;
    onTokenSelect: (token: Token) => void;
    label: string;
  }) => {
    const token = TOKENS[selectedToken];

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 p-3 bg-gray-700 hover:bg-gray-600 border-none rounded-xl h-auto"
          >
            <span className="text-xl">{token.icon}</span>
            <span className="text-white font-semibold text-lg">
              {token.symbol}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-300" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-gray-800 border-gray-600 min-w-[200px]">
          {Object.entries(TOKENS).map(([key, tokenData]) => (
            <DropdownMenuItem
              key={key}
              onClick={() => onTokenSelect(key as Token)}
              className="flex items-center gap-3 text-white hover:bg-gray-700 p-3 cursor-pointer"
            >
              <span className="text-xl">{tokenData.icon}</span>
              <div className="flex flex-col">
                <span className="font-medium">{tokenData.symbol}</span>
                <span className="text-xs text-gray-400">{tokenData.name}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="flex justify-center items-center min-h-[calc(100vh-80px)] px-4">
        <div className="w-full max-w-md">
          <Card className="bg-gray-900 border-gray-700 shadow-2xl rounded-2xl overflow-hidden">
            <CardContent className="p-6 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">Swap</h1>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-white hover:bg-gray-800 rounded-full"
                >
                  <Settings className="w-5 h-5" />
                </Button>
              </div>

              {/* From Token Section */}
              <div className="bg-gray-800 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Input
                      value={fromAmount}
                      onChange={(e) => setFromAmount(e.target.value)}
                      className="bg-transparent border-none text-4xl font-bold text-white placeholder-gray-500 p-0 h-auto focus:ring-0 focus-visible:ring-0"
                      placeholder="0.00"
                    />
                    <div className="text-sm text-gray-400 mt-1">
                      Balance: {parseFloat(fromTokenBalance).toFixed(4)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <TokenSelector
                      selectedToken={fromToken}
                      onTokenSelect={setFromToken}
                      label="From"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMaxClick}
                      className="text-purple-400 hover:text-purple-300 h-6 px-3 bg-purple-500/20 hover:bg-purple-500/30 rounded-md text-xs font-medium"
                      disabled={
                        !fromTokenBalance || parseFloat(fromTokenBalance) === 0
                      }
                    >
                      MAX
                    </Button>
                  </div>
                </div>
              </div>

              {/* Exchange Rate Display */}
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-sm text-gray-300">
                  1 {TOKENS[fromToken].symbol} = {exchangeRate}{" "}
                  {TOKENS[toToken].symbol}
                  {isLoadingQuote && (
                    <Loader2 className="inline w-3 h-3 ml-2 animate-spin" />
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSwapTokens}
                  className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </Button>
              </div>

              {/* To Token Section */}
              <div className="bg-gray-800 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Input
                      value={toAmount}
                      className="bg-transparent border-none text-4xl font-bold text-white placeholder-gray-500 p-0 h-auto focus:ring-0 focus-visible:ring-0"
                      placeholder="0.00"
                      readOnly
                    />
                    <div className="text-sm text-gray-400 mt-1">
                      Balance: {parseFloat(toTokenBalance).toFixed(4)}
                    </div>
                  </div>
                  <TokenSelector
                    selectedToken={toToken}
                    onTokenSelect={setToToken}
                    label="To"
                  />
                </div>
              </div>

              {/* Network Warning */}
              {isConnected && chainId && (
                <div className="flex items-center gap-2 p-3 bg-yellow-900/20 border border-yellow-500/20 rounded-xl text-yellow-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>
                    Connected to Chain ID: {chainId}. Ensure you&apos;re on the
                    correct network for Jaine contracts.
                  </span>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {/* Transaction Details */}
              <div className="space-y-2 mt-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Minimum received</span>
                  <span className="text-white">
                    {calculateMinimumAmountOut(toAmount, parseFloat(slippage))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Slippage</span>
                  <span className="text-white">{slippage}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Price Impact</span>
                  <span
                    className={cn(
                      "font-medium",
                      parseFloat(priceImpact) < 1
                        ? "text-green-400"
                        : parseFloat(priceImpact) < 3
                        ? "text-yellow-400"
                        : "text-red-400"
                    )}
                  >
                    {priceImpact}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">LP Fee</span>
                  <span className="text-white">{lpFee}%</span>
                </div>
              </div>

              {/* Connect Wallet / Approve / Swap Button */}
              <div className="mt-8">
                {!isConnected ? (
                  <Button
                    className="w-full h-14 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-2xl text-lg"
                    onClick={() => {}} // This should connect wallet - handled by RainbowKit
                    disabled
                  >
                    Connect Wallet
                  </Button>
                ) : needsApproval ? (
                  <Button
                    className="w-full h-14 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-2xl text-lg"
                    onClick={handleApprove}
                    disabled={
                      isApproving || !fromAmount || parseFloat(fromAmount) === 0
                    }
                  >
                    {isApproving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      `Approve ${TOKENS[fromToken].symbol}`
                    )}
                  </Button>
                ) : (
                  <Button
                    className="w-full h-14 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-2xl text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleSwap}
                    disabled={
                      isSwapping ||
                      !fromAmount ||
                      parseFloat(fromAmount) === 0 ||
                      !toAmount ||
                      parseFloat(toAmount) === 0 ||
                      isLoadingQuote ||
                      parseFloat(fromAmount) > parseFloat(fromTokenBalance)
                    }
                  >
                    {isSwapping ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Swapping...
                      </>
                    ) : !fromAmount || parseFloat(fromAmount) === 0 ? (
                      "Enter an amount"
                    ) : parseFloat(fromAmount) >
                      parseFloat(fromTokenBalance) ? (
                      `Insufficient ${TOKENS[fromToken].symbol} balance`
                    ) : (
                      "Swap"
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
