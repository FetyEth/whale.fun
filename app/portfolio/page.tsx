"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TokenFactoryRootService } from "@/lib/services/TokenFactoryRootService";
import {
  CreatorTokenService,
  TokenStats,
} from "@/lib/services/CreatorTokenService";
import { formatEther, parseEther } from "ethers";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Clock,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface TokenPortfolioItem {
  address: string;
  name: string;
  symbol: string;
  balance: bigint;
  stats: TokenStats;
  creator: string;
  launchTime: bigint;
  description: string;
  logoUrl: string;
  currentValue: bigint;
  priceChange24h?: number;
}

interface PortfolioStats {
  totalValue: bigint;
  totalTokens: number;
  createdTokens: number;
  totalGains: bigint;
  totalFees: bigint;
}

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(true);
  const [portfolioTokens, setPortfolioTokens] = useState<TokenPortfolioItem[]>(
    []
  );
  const [createdTokens, setCreatedTokens] = useState<TokenPortfolioItem[]>([]);
  const [portfolioStats, setPortfolioStats] = useState<PortfolioStats>({
    totalValue: BigInt(0),
    totalTokens: 0,
    createdTokens: 0,
    totalGains: BigInt(0),
    totalFees: BigInt(0),
  });
  const [activeTab, setActiveTab] = useState("holdings");

  useEffect(() => {
    if (isConnected && address) {
      loadPortfolioData();
    }
  }, [isConnected, address]);

  const loadPortfolioData = async () => {
    if (!address) return;

    setLoading(true);
    try {
      const { createWalletClient, createPublicClient, http, custom } =
        await import("viem");
      const { zeroGGalileoTestnet } = await import("viem/chains");

      const walletClient = createWalletClient({
        transport: custom(window.ethereum),
      });

      const chainId = await walletClient.getChainId();
      console.log("Current chain ID:", chainId);

      // Map chain ID to chain object
      const chainMap: Record<number, any> = {
        31: zeroGGalileoTestnet,
        16602: {
          id: 16602,
          name: "0G Testnet",
          network: "0g-testnet",
          nativeCurrency: {
            decimals: 18,
            name: "0G",
            symbol: "0G",
          },
          rpcUrls: {
            default: {
              http: ["https://evmrpc-testnet.0g.ai"],
            },
            public: {
              http: ["https://evmrpc-testnet.0g.ai"],
            },
          },
          blockExplorers: {
            default: {
              name: "0G Explorer",
              url: "https://chainscan.0g.ai",
            },
          },
          testnet: true,
        },
      };

      const currentChain = chainMap[chainId];
      if (!currentChain) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }

      const factoryService = new TokenFactoryRootService();

      // Get tokens created by user
      const createdTokenAddresses = await factoryService.getCreatorTokens(
        address
      );

      // Get creator stats
      const creatorStats = await factoryService.getCreatorStats(address);

      console.log("Created token addresses:", createdTokenAddresses);
      console.log("Creator stats:", creatorStats);

      // Load real token data from individual contracts
      const createdTokensData = await Promise.all(
        createdTokenAddresses.map(async (tokenAddress, index) => {
          try {
            // Create public client for reading contract data
            const publicClient = createPublicClient({
              chain: currentChain,
              transport: http(),
            });

            // Load CreatorToken ABI
            const CreatorTokenABI = (
              await import("@/config/abi/CreatorToken.json")
            ).default;

            // Read basic token info from contract
            const [name, symbol, totalSupply, decimals] = await Promise.all([
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
                functionName: "totalSupply",
              }),
              publicClient.readContract({
                address: tokenAddress as `0x${string}`,
                abi: CreatorTokenABI,
                functionName: "decimals",
              }),
            ]);

            // Try to get additional stats (may fail if methods don't exist)
            let stats;
            try {
              const [
                currentPrice,
                marketCap,
                holderCount,
                totalSold,
                creatorFees,
              ] = await Promise.all([
                publicClient
                  .readContract({
                    address: tokenAddress as `0x${string}`,
                    abi: CreatorTokenABI,
                    functionName: "getCurrentPrice",
                  })
                  .catch(() => parseEther("0.001")), // Default price if method doesn't exist
                publicClient
                  .readContract({
                    address: tokenAddress as `0x${string}`,
                    abi: CreatorTokenABI,
                    functionName: "marketCap",
                  })
                  .catch(() => BigInt(0)),
                publicClient
                  .readContract({
                    address: tokenAddress as `0x${string}`,
                    abi: CreatorTokenABI,
                    functionName: "holderCount",
                  })
                  .catch(() => BigInt(1)),
                publicClient
                  .readContract({
                    address: tokenAddress as `0x${string}`,
                    abi: CreatorTokenABI,
                    functionName: "totalSold",
                  })
                  .catch(() => BigInt(0)),
                publicClient
                  .readContract({
                    address: tokenAddress as `0x${string}`,
                    abi: CreatorTokenABI,
                    functionName: "getTotalFeesCollected",
                  })
                  .catch(() => BigInt(0)),
              ]);

              stats = {
                totalSupply: totalSupply as bigint,
                totalSold: totalSold as bigint,
                currentPrice: currentPrice as bigint,
                marketCap: marketCap as bigint,
                holderCount: holderCount as bigint,
                creatorFees: creatorFees as bigint,
              };
            } catch (error) {
              console.warn(
                `Could not load stats for token ${tokenAddress}:`,
                error
              );
              // Fallback stats
              stats = {
                totalSupply: totalSupply as bigint,
                totalSold: BigInt(0),
                currentPrice: parseEther("0.001"),
                marketCap: BigInt(0),
                holderCount: BigInt(1),
                creatorFees: BigInt(0),
              };
            }

            // Get user's balance
            let balance = BigInt(0);
            try {
              balance = (await publicClient.readContract({
                address: tokenAddress as `0x${string}`,
                abi: CreatorTokenABI,
                functionName: "balanceOf",
                args: [address],
              })) as bigint;
            } catch (error) {
              console.warn(
                `Could not get balance for token ${tokenAddress}:`,
                error
              );
            }

            const currentValue =
              (balance * stats.currentPrice) / BigInt(10 ** 18);

            return {
              address: tokenAddress,
              name: name as string,
              symbol: symbol as string,
              balance,
              stats,
              creator: address,
              launchTime: BigInt(Date.now() - index * 86400000), // Approximate
              description: `Token ${name} created by you`,
              logoUrl: "",
              currentValue,
            };
          } catch (error) {
            console.error(
              `Error loading token data for ${tokenAddress}:`,
              error
            );
            // Return minimal data if contract calls fail
            return {
              address: tokenAddress,
              name: `Token ${index + 1}`,
              symbol: `TKN${index + 1}`,
              balance: BigInt(0),
              stats: {
                totalSupply: BigInt(0),
                totalSold: BigInt(0),
                currentPrice: BigInt(0),
                marketCap: BigInt(0),
                holderCount: BigInt(0),
                creatorFees: BigInt(0),
              },
              creator: address,
              launchTime: BigInt(Date.now()),
              description: `Token at ${tokenAddress}`,
              logoUrl: "",
              currentValue: BigInt(0),
            };
          }
        })
      );

      // For now, portfolio tokens are the same as created tokens
      const allTokens = createdTokensData;

      // Calculate portfolio statistics
      const totalValue = allTokens.reduce(
        (sum, token) => sum + token.currentValue,
        BigInt(0)
      );
      const totalFees = createdTokensData.reduce(
        (sum, token) => sum + token.stats.creatorFees,
        BigInt(0)
      );

      setCreatedTokens(createdTokensData);
      setPortfolioTokens(allTokens);
      setPortfolioStats({
        totalValue,
        totalTokens: allTokens.length,
        createdTokens: createdTokensData.length,
        totalGains: BigInt(0), // Would need historical data to calculate
        totalFees,
      });
    } catch (error) {
      console.error("Error loading portfolio data:", error);

      // Set empty state on error
      setCreatedTokens([]);
      setPortfolioTokens([]);
      setPortfolioStats({
        totalValue: BigInt(0),
        totalTokens: 0,
        createdTokens: 0,
        totalGains: BigInt(0),
        totalFees: BigInt(0),
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: bigint) => {
    return `${parseFloat(formatEther(value)).toFixed(4)} ETH`;
  };

  const formatNumber = (value: bigint) => {
    return value.toLocaleString();
  };

  const TokenCard = ({ token }: { token: TokenPortfolioItem }) => (
    <Card className="bg-gray-50 border-gray-200 hover:bg-gray-100 transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {token.logoUrl ? (
              <img
                src={token.logoUrl}
                alt={token.name}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                {token.symbol.charAt(0)}
              </div>
            )}
            <div>
              <CardTitle className="text-black text-lg">{token.name}</CardTitle>
              <p className="text-gray-600 text-sm">{token.symbol}</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            {token.creator === address ? "Created" : "Holding"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Balance</span>
            <span className="text-black font-medium">
              {formatNumber(token.balance)} {token.symbol}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Current Price</span>
            <span className="text-black font-medium">
              {formatCurrency(token.stats.currentPrice)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Value</span>
            <span className="text-green-600 font-medium">
              {formatCurrency(token.currentValue)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Market Cap</span>
            <span className="text-black font-medium">
              {formatCurrency(token.stats.marketCap)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Holders</span>
            <span className="text-black font-medium">
              {formatNumber(token.stats.holderCount)}
            </span>
          </div>
          {token.creator === address && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Fees Earned</span>
              <span className="text-green-600 font-medium">
                {formatCurrency(token.stats.creatorFees)}
              </span>
            </div>
          )}
        </div>
        <div className="mt-4 pt-3 border-t border-gray-200">
          <Link href={`/token/${token.address}`}>
            <Button variant="outline" size="sm" className="w-full">
              View Details <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );

  if (!isConnected) {
    return (
      <div>
        <Header />
        <div className="px-10 border w-full">
          <div className="min-h-[90vh] flex flex-col justify-center items-center text-black bg-[url('/img/bg-vector.svg')] bg-contain bg-no-repeat border-l border-r border-transparent [border-image:linear-gradient(to_bottom,#ebe3e8,transparent)_1]">
            <div className="text-center">
              <h1 className="font-britisans text-4xl font-bold mb-4">
                Connect Your Wallet
              </h1>
              <p className="text-gray-600 mb-8">
                Connect your wallet to view your token portfolio
              </p>
              <Button className="bg-black text-white hover:bg-gray-800">
                Connect Wallet
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="px-10 border w-full">
        <div className="min-h-[90vh] text-black bg-[url('/img/bg-vector.svg')] bg-contain bg-no-repeat border-l border-r border-transparent [border-image:linear-gradient(to_bottom,#ebe3e8,transparent)_1]">
          <div className="pt-8 pb-12">
            {/* Portfolio Header */}
            <div className="text-center mb-8">
              <h1 className="font-britisans text-5xl font-bold mb-4">
                Your Portfolio
              </h1>
              <p className="text-gray-600 text-lg">
                Track your token holdings and created tokens
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-black" />
                <span className="ml-2 text-black">Loading portfolio...</span>
              </div>
            ) : (
              <div className="max-w-7xl bg-white mx-auto">
                {/* Portfolio Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <Card className="bg-gray-50 border-gray-200">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-8 h-8 text-green-600" />
                        <div>
                          <p className="text-gray-600 text-sm">Total Value</p>
                          <p className="text-black text-2xl font-bold">
                            {formatCurrency(portfolioStats.totalValue)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-50 border-gray-200">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <Users className="w-8 h-8 text-blue-600" />
                        <div>
                          <p className="text-gray-600 text-sm">Total Tokens</p>
                          <p className="text-black text-2xl font-bold">
                            {portfolioStats.totalTokens}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-50 border-gray-200">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="w-8 h-8 text-purple-600" />
                        <div>
                          <p className="text-gray-600 text-sm">
                            Created Tokens
                          </p>
                          <p className="text-black text-2xl font-bold">
                            {portfolioStats.createdTokens}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-50 border-gray-200">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <Clock className="w-8 h-8 text-yellow-600" />
                        <div>
                          <p className="text-gray-600 text-sm">Fees Earned</p>
                          <p className="text-black text-2xl font-bold">
                            {formatCurrency(portfolioStats.totalFees)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Portfolio Tabs */}
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2 bg-gray-100 border-gray-200">
                    <TabsTrigger
                      value="holdings"
                      className="data-[state=active]:bg-white"
                    >
                      All Holdings ({portfolioStats.totalTokens})
                    </TabsTrigger>
                    <TabsTrigger
                      value="created"
                      className="data-[state=active]:bg-white"
                    >
                      Created Tokens ({portfolioStats.createdTokens})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="holdings" className="mt-6">
                    {portfolioTokens.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {portfolioTokens.map((token) => (
                          <TokenCard key={token.address} token={token} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-20">
                        <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-black mb-2">
                          No tokens found
                        </h3>
                        <p className="text-gray-600 mb-6">
                          You don&apos;t have any tokens in your portfolio yet.
                        </p>
                        <Link href="/explore">
                          <Button className="bg-black text-white hover:bg-gray-800">
                            Explore Tokens
                          </Button>
                        </Link>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="created" className="mt-6">
                    {createdTokens.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {createdTokens.map((token) => (
                          <TokenCard key={token.address} token={token} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-20">
                        <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-black mb-2">
                          No tokens created
                        </h3>
                        <p className="text-gray-600 mb-6">
                          You haven&apos;t created any tokens yet.
                        </p>
                        <Link href="/create-token">
                          <Button className="bg-black text-white hover:bg-gray-800">
                            Create Your First Token
                          </Button>
                        </Link>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
