"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import TradingViewChart from "@/components/TradingViewChart";
import { Copy, ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { tokenDataViemService, type TokenData } from "@/lib/services/TokenDataViemService";
import { getBlockchainConnection } from "@/utils/Blockchain";
import { formatEther } from "ethers";
import TradingPanel from "@/components/trade/TradingPanel";
import tokenDataService from "@/lib/services/TokenDataService";

const TradePage = () => {
  const params = useParams<{ address: string }>();
  const router = useRouter();
  const tokenAddress = params?.address || "";

  // State management
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<string>("0");
  const [copied, setCopied] = useState(false);

  // Fetch token data on mount
  useEffect(() => {
    if (tokenAddress) {
      fetchTokenData();
    }
  }, [tokenAddress]);

  // Refresh token data after successful trade
  const handleTradeSuccess = () => {
    fetchTokenData();
  };

  const fetchTokenData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const connection = await getBlockchainConnection();
      const chainId = Number(connection.network.chainId);
      
      const data = await tokenDataViemService.getTokenData(tokenAddress, chainId);
      if (data) {
        setTokenData(data);
        // TODO: Fetch user's token balance
        // setUserBalance(userTokenBalance);
      } else {
        setError("Token not found");
      }
    } catch (err: any) {
      console.error("Error fetching token data:", err);
      setError(err.message || "Failed to fetch token data");
    } finally {
      setLoading(false);
    }
  };


  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tokenAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="mt-2 text-gray-600">Loading token data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !tokenData) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || "Token not found"}</p>
            <Button onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="px-6 md:px-10 lg:px-16 xl:px-24 py-6 mt-5">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Explore
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Token Info + Chart */}
          <div className="lg:col-span-2 space-y-4">
            {/* Token header */}
            <Card className="border-gray-200">
              <CardContent className="p-5 md:p-6 flex gap-4 items-center">
                <div className="h-12 w-12 rounded-xl bg-gray-100 border border-[#0000001A] overflow-hidden">
                  <Avatar className="h-full w-full rounded-xl">
                    <AvatarImage src={tokenData.logoUrl} alt={tokenData.name} />
                    <AvatarFallback>{tokenData.symbol.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-gray-900 truncate">
                    {tokenData.name}
                  </h1>
                  <div className="mt-2 flex items-center gap-3 flex-wrap text-sm">
                    <span className="font-bold text-gray-900">{tokenData.symbol}</span>
                    {tokenData.isLive && (
                      <Badge variant="destructive" className="bg-green-500 text-white">
                        LIVE
                      </Badge>
                    )}
                    <span className="px-2 py-0.5 rounded-full border border-[#0000001A] text-gray-800 bg-white">
                      {tokenData.age}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFEFEF] text-gray-800 border cursor-pointer"
                      style={{ borderColor: '#0000001A' }}
                    >
                      <Copy className="w-3 h-3" />
                      {copied ? "Copied!" : `${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Price and stats */}
            <Card className="border-gray-200">
              <CardContent className="p-5 md:p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Current Price</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatEther(tokenData.currentPrice)} ETH
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Market Cap</p>
                    <p className="text-xl font-bold text-gray-900">
                      {tokenDataService.formatMarketCap(tokenData.marketCap)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">24h Volume</p>
                    <p className="text-xl font-bold text-gray-900">
                      {tokenDataService.formatVolume(tokenData.dailyVolume)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Holders</p>
                    <p className="text-xl font-bold text-gray-900">
                      {tokenData.holderCount.toString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chart placeholder */}
            <Card className="border-gray-200">
              <CardContent className="p-5 md:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Chart</h3>
                <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Trading chart will be integrated here</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Trading Panel */}
          <div className="space-y-4">
            <TradingPanel
              tokenAddress={tokenAddress}
              tokenSymbol={tokenData.symbol}
              userBalance={userBalance}
              onTradeSuccess={handleTradeSuccess}
            />

            {/* Token Info */}
            <Card className="border-gray-200">
              <CardContent className="p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">About {tokenData.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{tokenData.description}</p>
                
                <Separator className="my-4" />
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Creator:</span>
                    <span className="font-medium">{tokenData.creator.slice(0, 6)}...{tokenData.creator.slice(-4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Launched:</span>
                    <span className="font-medium">{tokenData.age}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Supply:</span>
                    <span className="font-medium">{formatEther(tokenData.totalSupply)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Sold:</span>
                    <span className="font-medium">{formatEther(tokenData.totalSold)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TradePage;
