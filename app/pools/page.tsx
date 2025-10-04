"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Minus,
  Search,
  TrendingUp,
  TrendingDown,
  Droplets,
  Settings,
  ExternalLink,
  Loader2,
  AlertCircle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccount, useBalance } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import Header from "@/components/layout/Header";
import { getPool, FEE_TIERS, type Token as DexToken } from "@/lib/dex-utils";

// Token definitions (same as DEX page)
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

interface PoolData {
  token0: DexToken;
  token1: DexToken;
  fee: number;
  liquidity: string;
  volume24h: string;
  fees24h: string;
  apr: string;
  tvl: string;
  address: string;
}

interface UserPosition {
  poolAddress: string;
  token0: DexToken;
  token1: DexToken;
  fee: number;
  liquidity: string;
  token0Amount: string;
  token1Amount: string;
  fees: string;
  range: {
    min: number;
    max: number;
    current: number;
  };
}

export default function PoolsPage() {
  const { address, isConnected } = useAccount();

  const [activeTab, setActiveTab] = useState("pools");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedToken0, setSelectedToken0] = useState<Token>("PAI");
  const [selectedToken1, setSelectedToken1] = useState<Token>("wstETH");
  const [selectedFee, setSelectedFee] = useState<number>(FEE_TIERS.MEDIUM);
  const [token0Amount, setToken0Amount] = useState("");
  const [token1Amount, setToken1Amount] = useState("");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });

  // Loading states
  const [isLoadingPools, setIsLoadingPools] = useState(false);
  const [isAddingLiquidity, setIsAddingLiquidity] = useState(false);
  const [isRemovingLiquidity, setIsRemovingLiquidity] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock pool data - in real app, fetch from contracts
  const [pools, setPools] = useState<PoolData[]>([
    {
      token0: TOKENS.PAI,
      token1: TOKENS.wstETH,
      fee: FEE_TIERS.MEDIUM,
      liquidity: "1,234,567.89",
      volume24h: "245,678.90",
      fees24h: "736.04",
      apr: "12.45",
      tvl: "2,469,135.78",
      address: "0x1234...abcd",
    },
    {
      token0: TOKENS.stgUSDC,
      token1: TOKENS.stgUSDT,
      fee: FEE_TIERS.LOW,
      liquidity: "987,654.32",
      volume24h: "156,789.01",
      fees24h: "78.39",
      apr: "3.21",
      tvl: "1,975,308.64",
      address: "0x5678...efgh",
    },
    {
      token0: TOKENS.W0G,
      token1: TOKENS.PAI,
      fee: FEE_TIERS.HIGH,
      liquidity: "456,789.12",
      volume24h: "89,012.34",
      fees24h: "890.12",
      apr: "23.67",
      tvl: "913,578.24",
      address: "0x9abc...ijkl",
    },
  ]);

  // Mock user positions
  const [userPositions, setUserPositions] = useState<UserPosition[]>([
    {
      poolAddress: "0x1234...abcd",
      token0: TOKENS.PAI,
      token1: TOKENS.wstETH,
      fee: FEE_TIERS.MEDIUM,
      liquidity: "1,234.56",
      token0Amount: "500.00",
      token1Amount: "0.15",
      fees: "12.34",
      range: { min: 0.0002, max: 0.0008, current: 0.0005 },
    },
  ]);

  // Filter pools based on search
  const filteredPools = pools.filter(
    (pool) =>
      pool.token0.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pool.token1.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddLiquidity = async () => {
    if (!isConnected || !token0Amount || !token1Amount) return;

    setIsAddingLiquidity(true);
    setError(null);

    try {
      // Here you would implement the actual add liquidity logic
      console.log("Adding liquidity:", {
        token0: TOKENS[selectedToken0],
        token1: TOKENS[selectedToken1],
        fee: selectedFee,
        amount0: token0Amount,
        amount1: token1Amount,
        priceRange,
      });

      // Simulate success
      setTimeout(() => {
        setToken0Amount("");
        setToken1Amount("");
        setPriceRange({ min: "", max: "" });
        setIsAddingLiquidity(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to add liquidity:", err);
      setError("Failed to add liquidity. Please try again.");
      setIsAddingLiquidity(false);
    }
  };

  const handleRemoveLiquidity = async (
    positionId: string,
    percentage: number
  ) => {
    if (!isConnected) return;

    setIsRemovingLiquidity(true);
    setError(null);

    try {
      // Here you would implement the actual remove liquidity logic
      console.log("Removing liquidity:", { positionId, percentage });

      // Simulate success
      setTimeout(() => {
        setIsRemovingLiquidity(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to remove liquidity:", err);
      setError("Failed to remove liquidity. Please try again.");
      setIsRemovingLiquidity(false);
    }
  };

  const PoolCard = ({ pool }: { pool: PoolData }) => (
    <Card className="bg-gray-900/50 border-gray-700/50 hover:border-gray-600/50 transition-all">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center -space-x-2">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm">
                {pool.token0.icon}
              </div>
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm">
                {pool.token1.icon}
              </div>
            </div>
            <div>
              <h3 className="text-white font-semibold">
                {pool.token0.symbol}/{pool.token1.symbol}
              </h3>
              <Badge variant="outline" className="text-xs">
                {(pool.fee / 10000).toFixed(2)}%
              </Badge>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Add Liquidity
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">TVL</p>
            <p className="text-white font-medium">${pool.tvl}</p>
          </div>
          <div>
            <p className="text-gray-400">24h Volume</p>
            <p className="text-white font-medium">${pool.volume24h}</p>
          </div>
          <div>
            <p className="text-gray-400">24h Fees</p>
            <p className="text-green-400 font-medium">${pool.fees24h}</p>
          </div>
          <div>
            <p className="text-gray-400">APR</p>
            <p className="text-green-400 font-medium">{pool.apr}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const PositionCard = ({ position }: { position: UserPosition }) => {
    const isInRange =
      position.range.current >= position.range.min &&
      position.range.current <= position.range.max;

    return (
      <Card className="bg-gray-900/50 border-gray-700/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center -space-x-2">
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm">
                  {position.token0.icon}
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm">
                  {position.token1.icon}
                </div>
              </div>
              <div>
                <h3 className="text-white font-semibold">
                  {position.token0.symbol}/{position.token1.symbol}
                </h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {(position.fee / 10000).toFixed(2)}%
                  </Badge>
                  <Badge
                    variant={isInRange ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {isInRange ? "In Range" : "Out of Range"}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
              <Button size="sm" variant="outline">
                <Minus className="w-3 h-3 mr-1" />
                Remove
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <p className="text-gray-400">{position.token0.symbol}</p>
              <p className="text-white font-medium">{position.token0Amount}</p>
            </div>
            <div>
              <p className="text-gray-400">{position.token1.symbol}</p>
              <p className="text-white font-medium">{position.token1Amount}</p>
            </div>
            <div>
              <p className="text-gray-400">Unclaimed Fees</p>
              <p className="text-green-400 font-medium">${position.fees}</p>
            </div>
            <div>
              <p className="text-gray-400">Liquidity</p>
              <p className="text-white font-medium">${position.liquidity}</p>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>Min: {position.range.min}</span>
              <span>Current: {position.range.current}</span>
              <span>Max: {position.range.max}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={cn(
                  "h-2 rounded-full",
                  isInRange ? "bg-green-500" : "bg-red-500"
                )}
                style={{
                  width: `${
                    ((position.range.current - position.range.min) /
                      (position.range.max - position.range.min)) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              Liquidity Pools
            </h1>
            <p className="text-gray-400">
              Earn fees by providing liquidity to trading pairs
            </p>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="grid grid-cols-3 bg-gray-800 border-gray-700 w-fit">
              <TabsTrigger
                value="pools"
                className="data-[state=active]:bg-purple-600"
              >
                All Pools
              </TabsTrigger>
              <TabsTrigger
                value="positions"
                className="data-[state=active]:bg-purple-600"
              >
                My Positions
              </TabsTrigger>
              <TabsTrigger
                value="create"
                className="data-[state=active]:bg-purple-600"
              >
                Add Liquidity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pools" className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search pools..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPools.map((pool, index) => (
                  <PoolCard key={index} pool={pool} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="positions" className="space-y-6">
              {!isConnected ? (
                <Card className="bg-gray-900/50 border-gray-700/50">
                  <CardContent className="p-12 text-center">
                    <Droplets className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Connect your wallet
                    </h3>
                    <p className="text-gray-400 mb-6">
                      Connect your wallet to view your liquidity positions
                    </p>
                    <Button className="bg-purple-600 hover:bg-purple-700">
                      Connect Wallet
                    </Button>
                  </CardContent>
                </Card>
              ) : userPositions.length === 0 ? (
                <Card className="bg-gray-900/50 border-gray-700/50">
                  <CardContent className="p-12 text-center">
                    <Droplets className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                      No positions found
                    </h3>
                    <p className="text-gray-400 mb-6">
                      You don&apos;t have any liquidity positions yet
                    </p>
                    <Button
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={() => setActiveTab("create")}
                    >
                      Add Liquidity
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {userPositions.map((position, index) => (
                    <PositionCard key={index} position={position} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="create" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="bg-gray-900/50 border-gray-700/50">
                  <CardHeader>
                    <CardTitle className="text-white">Add Liquidity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Token Selection */}
                    <div className="space-y-4">
                      <h3 className="text-white font-medium">Select Pair</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {/* Token selectors would go here */}
                        <div className="p-3 bg-gray-800 rounded-lg">
                          <p className="text-gray-400 text-sm mb-1">Token 1</p>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {TOKENS[selectedToken0].icon}
                            </span>
                            <span className="text-white font-medium">
                              {TOKENS[selectedToken0].symbol}
                            </span>
                          </div>
                        </div>
                        <div className="p-3 bg-gray-800 rounded-lg">
                          <p className="text-gray-400 text-sm mb-1">Token 2</p>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {TOKENS[selectedToken1].icon}
                            </span>
                            <span className="text-white font-medium">
                              {TOKENS[selectedToken1].symbol}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Fee Tier Selection */}
                    <div className="space-y-3">
                      <h3 className="text-white font-medium">Fee Tier</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          {
                            fee: FEE_TIERS.LOW,
                            label: "0.05%",
                            description: "Best for stable pairs",
                          },
                          {
                            fee: FEE_TIERS.MEDIUM,
                            label: "0.30%",
                            description: "Best for most pairs",
                          },
                          {
                            fee: FEE_TIERS.HIGH,
                            label: "1.00%",
                            description: "Best for exotic pairs",
                          },
                        ].map((tier) => (
                          <button
                            key={tier.fee}
                            onClick={() => setSelectedFee(tier.fee)}
                            className={cn(
                              "p-3 rounded-lg border text-left transition-all",
                              selectedFee === tier.fee
                                ? "border-purple-500 bg-purple-500/10"
                                : "border-gray-700 bg-gray-800 hover:border-gray-600"
                            )}
                          >
                            <p className="text-white font-medium">
                              {tier.label}
                            </p>
                            <p className="text-xs text-gray-400">
                              {tier.description}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Deposit Amounts */}
                    <div className="space-y-4">
                      <h3 className="text-white font-medium">
                        Deposit Amounts
                      </h3>
                      <div className="space-y-3">
                        <div className="bg-gray-800 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-400">
                              {TOKENS[selectedToken0].symbol}
                            </span>
                            <span className="text-gray-400 text-sm">
                              Balance: 0.00
                            </span>
                          </div>
                          <Input
                            value={token0Amount}
                            onChange={(e) => setToken0Amount(e.target.value)}
                            placeholder="0.00"
                            className="bg-transparent border-none text-2xl font-bold text-white p-0 h-auto"
                          />
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-400">
                              {TOKENS[selectedToken1].symbol}
                            </span>
                            <span className="text-gray-400 text-sm">
                              Balance: 0.00
                            </span>
                          </div>
                          <Input
                            value={token1Amount}
                            onChange={(e) => setToken1Amount(e.target.value)}
                            placeholder="0.00"
                            className="bg-transparent border-none text-2xl font-bold text-white p-0 h-auto"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Price Range */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-medium">Price Range</h3>
                        <Info className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-800 rounded-lg p-4">
                          <p className="text-gray-400 text-sm mb-2">
                            Min Price
                          </p>
                          <Input
                            value={priceRange.min}
                            onChange={(e) =>
                              setPriceRange((prev) => ({
                                ...prev,
                                min: e.target.value,
                              }))
                            }
                            placeholder="0.00"
                            className="bg-transparent border-none text-white"
                          />
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4">
                          <p className="text-gray-400 text-sm mb-2">
                            Max Price
                          </p>
                          <Input
                            value={priceRange.max}
                            onChange={(e) =>
                              setPriceRange((prev) => ({
                                ...prev,
                                max: e.target.value,
                              }))
                            }
                            placeholder="0.00"
                            className="bg-transparent border-none text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/20 rounded-lg text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                      </div>
                    )}

                    <Button
                      onClick={handleAddLiquidity}
                      disabled={
                        isAddingLiquidity || !token0Amount || !token1Amount
                      }
                      className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl"
                    >
                      {isAddingLiquidity ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Adding Liquidity...
                        </>
                      ) : (
                        "Add Liquidity"
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Pool Preview */}
                <Card className="bg-gray-900/50 border-gray-700/50">
                  <CardHeader>
                    <CardTitle className="text-white">Pool Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center py-8">
                      <Droplets className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-400">
                        Enter amounts to see pool preview
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
