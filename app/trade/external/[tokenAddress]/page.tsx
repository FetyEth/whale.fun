"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAccount, useBalance } from "wagmi";
import Image from "next/image";
import Header from "@/components/layout/Header";
import {
  usePandaAIBalance,
  useTokenAllowance,
  useTokenApproval,
  useSwapQuote,
  useBuyPandaAI,
  useSellPandaAI,
  usePandaAIMarketData,
  formatTokenAmount,
  PANDA_AI_CONFIG,
  JAINE_V3_ADDRESSES,
} from "@/lib/services/ExternalTokenDEXService";
import { ExternalTokenService } from "@/lib/services/ExternalTokenService";

const ExternalTokenTradePage = () => {
  const params = useParams();
  const tokenAddress = params.tokenAddress as string;
  const { address, isConnected } = useAccount();

  // State management
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [buyAmount, setBuyAmount] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const [slippage, setSlippage] = useState(0.5);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Wagmi hooks
  const { data: nativeBalance } = useBalance({ address });
  const {
    balance: pandaBalance,
    formattedBalance: pandaFormattedBalance,
    refetch: refetchPandaBalance,
  } = usePandaAIBalance();
  const { marketData } = usePandaAIMarketData();

  // Trading hooks
  const {
    buyPandaAI,
    isPending: isBuying,
    isSuccess: buySuccess,
    error: buyError,
  } = useBuyPandaAI();
  const {
    sellPandaAI,
    isPending: isSelling,
    isSuccess: sellSuccess,
    error: sellError,
  } = useSellPandaAI();

  // Approval hooks
  const routerAddress = JAINE_V3_ADDRESSES[16600].router as `0x${string}`;
  const { allowance, refetch: refetchAllowance } = useTokenAllowance(
    PANDA_AI_CONFIG.address,
    routerAddress
  );
  const {
    approve,
    isPending: isApproving,
    isSuccess: approveSuccess,
  } = useTokenApproval();

  // Load token information
  useEffect(() => {
    const loadTokenInfo = async () => {
      if (
        tokenAddress &&
        tokenAddress === PANDA_AI_CONFIG.address.toLowerCase()
      ) {
        try {
          setLoading(true);
          const externalTokenService = new ExternalTokenService(
            tokenAddress,
            16600
          );
          const info = await externalTokenService.getTokenInfo();
          setTokenInfo(info);
        } catch (error) {
          console.error("Error loading token info:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadTokenInfo();
  }, [tokenAddress]);

  // Handle buy transaction
  const handleBuy = async () => {
    if (!buyAmount || !isConnected) return;

    try {
      await buyPandaAI(buyAmount, slippage);
    } catch (error) {
      console.error("Buy transaction failed:", error);
    }
  };

  // Handle sell transaction
  const handleSell = async () => {
    if (!sellAmount || !isConnected) return;

    // Check if approval is needed
    const sellAmountBigInt = BigInt(
      Math.floor(parseFloat(sellAmount) * 10 ** PANDA_AI_CONFIG.decimals)
    );
    if (
      !allowance ||
      typeof allowance !== "bigint" ||
      allowance < sellAmountBigInt
    ) {
      try {
        await approve(PANDA_AI_CONFIG.address, routerAddress, sellAmountBigInt);
        return; // Wait for approval to complete
      } catch (error) {
        console.error("Approval failed:", error);
        return;
      }
    }

    try {
      await sellPandaAI(sellAmount, slippage);
    } catch (error) {
      console.error("Sell transaction failed:", error);
    }
  };

  // Refresh balances after successful transactions
  useEffect(() => {
    if (buySuccess || sellSuccess || approveSuccess) {
      refetchPandaBalance();
      refetchAllowance();
    }
  }, [
    buySuccess,
    sellSuccess,
    approveSuccess,
    refetchPandaBalance,
    refetchAllowance,
  ]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="ml-3 text-gray-600">Loading token information...</p>
        </div>
      </div>
    );
  }

  if (
    !tokenInfo ||
    tokenAddress.toLowerCase() !== PANDA_AI_CONFIG.address.toLowerCase()
  ) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Token Not Found
            </h2>
            <p className="text-gray-600">
              The requested external token is not supported or does not exist.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Token Header */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Image
                src={PANDA_AI_CONFIG.logoUrl}
                alt={tokenInfo.name}
                width={64}
                height={64}
                className="w-16 h-16 rounded-full"
              />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {tokenInfo.name}
                </h1>
                <p className="text-lg text-gray-600">${tokenInfo.symbol}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                    External Token
                  </span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                    0G Network
                  </span>
                </div>
              </div>
            </div>

            {/* Market Stats */}
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                ${marketData.price}
              </div>
              <div
                className={`text-sm font-medium ${
                  marketData.priceChange24h >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {marketData.priceChange24h >= 0 ? "+" : ""}
                {marketData.priceChange24h.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">24h Change</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Trading Interface */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex space-x-1 mb-6">
                <button
                  onClick={() => setActiveTab("buy")}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    activeTab === "buy"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Buy {tokenInfo.symbol}
                </button>
                <button
                  onClick={() => setActiveTab("sell")}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    activeTab === "sell"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Sell {tokenInfo.symbol}
                </button>
              </div>

              {activeTab === "buy" ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount (0G)
                    </label>
                    <input
                      type="number"
                      value={buyAmount}
                      onChange={(e) => setBuyAmount(e.target.value)}
                      placeholder="0.0"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>
                        Balance:{" "}
                        {nativeBalance
                          ? parseFloat(nativeBalance.formatted).toFixed(4)
                          : "0.0000"}{" "}
                        0G
                      </span>
                      <button
                        onClick={() =>
                          setBuyAmount(
                            nativeBalance
                              ? (
                                  parseFloat(nativeBalance.formatted) * 0.9
                                ).toString()
                              : "0"
                          )
                        }
                        className="text-purple-600 hover:text-purple-800"
                      >
                        Max
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Slippage Tolerance (%)
                    </label>
                    <div className="flex space-x-2">
                      {[0.1, 0.5, 1.0].map((value) => (
                        <button
                          key={value}
                          onClick={() => setSlippage(value)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium ${
                            slippage === value
                              ? "bg-purple-100 text-purple-800"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {value}%
                        </button>
                      ))}
                      <input
                        type="number"
                        value={slippage}
                        onChange={(e) =>
                          setSlippage(parseFloat(e.target.value) || 0.5)
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-20"
                        step="0.1"
                        min="0.1"
                        max="50"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleBuy}
                    disabled={!isConnected || !buyAmount || isBuying}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {!isConnected
                      ? "Connect Wallet"
                      : isBuying
                      ? "Buying..."
                      : `Buy ${tokenInfo.symbol}`}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount ({tokenInfo.symbol})
                    </label>
                    <input
                      type="number"
                      value={sellAmount}
                      onChange={(e) => setSellAmount(e.target.value)}
                      placeholder="0.0"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>
                        Balance: {pandaFormattedBalance} {tokenInfo.symbol}
                      </span>
                      <button
                        onClick={() => setSellAmount(pandaFormattedBalance)}
                        className="text-purple-600 hover:text-purple-800"
                      >
                        Max
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Slippage Tolerance (%)
                    </label>
                    <div className="flex space-x-2">
                      {[0.1, 0.5, 1.0].map((value) => (
                        <button
                          key={value}
                          onClick={() => setSlippage(value)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium ${
                            slippage === value
                              ? "bg-purple-100 text-purple-800"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {value}%
                        </button>
                      ))}
                      <input
                        type="number"
                        value={slippage}
                        onChange={(e) =>
                          setSlippage(parseFloat(e.target.value) || 0.5)
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-20"
                        step="0.1"
                        min="0.1"
                        max="50"
                      />
                    </div>
                  </div>

                  {/* Approval needed check */}
                  {(() => {
                    if (!sellAmount || !allowance || typeof allowance !== "bigint") {
                      return null;
                    }
                    
                    const sellAmountBigInt = BigInt(
                      Math.floor(
                        parseFloat(sellAmount) * 10 ** PANDA_AI_CONFIG.decimals
                      )
                    );
                    
                    if (sellAmountBigInt > allowance) {
                      return (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <p className="text-sm text-yellow-800">
                            You need to approve {tokenInfo.symbol} spending first.
                          </p>
                        </div>
                      );
                    }
                    
                    return null;
                  })()}

                  <button
                    onClick={handleSell}
                    disabled={
                      !isConnected || !sellAmount || isSelling || isApproving
                    }
                    className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {!isConnected
                      ? "Connect Wallet"
                      : isApproving
                      ? "Approving..."
                      : isSelling
                      ? "Selling..."
                      : `Sell ${tokenInfo.symbol}`}
                  </button>
                </div>
              )}

              {/* Transaction Status */}
              {(buyError || sellError) && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    Transaction failed:{" "}
                    {buyError?.message || sellError?.message}
                  </p>
                </div>
              )}

              {(buySuccess || sellSuccess) && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    Transaction successful! Your balances will update shortly.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Market Information */}
          <div className="space-y-6">
            {/* Market Stats */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Market Stats
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Market Cap</span>
                  <span className="font-medium">${marketData.marketCap}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">24h Volume</span>
                  <span className="font-medium">${marketData.volume24h}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Holders</span>
                  <span className="font-medium">
                    {marketData.holders.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Supply</span>
                  <span className="font-medium">
                    {formatTokenAmount(
                      marketData.totalSupply,
                      PANDA_AI_CONFIG.decimals
                    )}{" "}
                    {tokenInfo.symbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Circulating Supply</span>
                  <span className="font-medium">
                    {formatTokenAmount(
                      marketData.circulatingSupply,
                      PANDA_AI_CONFIG.decimals
                    )}{" "}
                    {tokenInfo.symbol}
                  </span>
                </div>
              </div>
            </div>

            {/* Token Info */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Token Info
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-600 text-sm">
                    Contract Address
                  </span>
                  <p className="font-mono text-sm bg-gray-100 p-2 rounded mt-1 break-all">
                    {tokenInfo.address}
                  </p>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Decimals</span>
                  <span className="font-medium">{tokenInfo.decimals}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Network</span>
                  <span className="font-medium">0G Network</span>
                </div>
              </div>
            </div>

            {/* Your Holdings */}
            {isConnected && (
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Your Holdings
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {tokenInfo.symbol} Balance
                    </span>
                    <span className="font-medium">{pandaFormattedBalance}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">0G Balance</span>
                    <span className="font-medium">
                      {nativeBalance
                        ? parseFloat(nativeBalance.formatted).toFixed(4)
                        : "0.0000"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExternalTokenTradePage;
