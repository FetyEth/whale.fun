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
import { formatEther, parseEther } from "ethers";
import tokenDataService from "@/lib/services/TokenDataService";
import StreamPlayer from "@/components/StreamPlayer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAccount } from "wagmi";
import CreatorTokenABI from "@/config/abi/CreatorToken.json";

const TokenStat = ({
  name,
  percent,
  votes,
  eth,
  selected,
  onClick,
}: {
  name: string;
  percent: string;
  votes: string;
  eth: string;
  selected?: boolean;
  onClick?: () => void;
}) => (
  <Card
    onClick={onClick}
    className={`group flex-1 border-dashed cursor-pointer transition-colors duration-200 ${
      selected ? "bg-[#B65FFF]" : "bg-white hover:bg-[#DAADFF]"
    }`}
  >
    <CardContent className="p-6 text-center">
      <p
        className={`text-xs uppercase tracking-wider transition-colors duration-200 ${
          selected ? "text-white" : "text-[#0000004D] group-hover:text-white"
        }`}
      >
        Token Name
      </p>
      <p
        className={`text-2xl font-extrabold transition-colors duration-200 ${
          selected ? "text-white" : "text-[#B65FFF] group-hover:text-white"
        }`}
      >
        {name}
      </p>
      <div className="mt-3">
        <span
          className={`text-5xl leading-none font-black transition-colors duration-200 ${
            selected ? "text-white" : "text-gray-900 group-hover:text-white"
          }`}
        >
          {percent}
        </span>
      </div>
      <p
        className={`mt-2 text-xs transition-colors duration-200 ${
          selected ? "text-white" : "text-gray-900 group-hover:text-white"
        }`}
      >
        {votes} votes
      </p>
      <p
        className={`mt-1 text-xs transition-colors duration-200 ${
          selected ? "text-white" : "text-gray-900 group-hover:text-white"
        }`}
      >
        {eth} ETH
      </p>
    </CardContent>
  </Card>
);

const TradePage = () => {
  const params = useParams<{ address: string }>();
  const router = useRouter();
  const tokenAddress = params?.address || "";

  // State management
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<string>("0");
  const [userTokenBalance, setUserTokenBalance] = useState<string>("0");
  const [copied, setCopied] = useState(false);
  
  // Trading state
  const [buyAmount, setBuyAmount] = useState<string>("");
  const [sellAmount, setSellAmount] = useState<string>("");
  const [buyQuote, setBuyQuote] = useState<{cost: bigint; priceImpact: number} | null>(null);
  const [sellQuote, setSellQuote] = useState<{proceeds: bigint; priceImpact: number} | null>(null);
  const [tradingLoading, setTradingLoading] = useState(false);
  const [tradingError, setTradingError] = useState<string | null>(null);
  
  // Chart data
  const [chartData, setChartData] = useState<{timestamp: number; price: number}[]>([]);
  const [chartTimeframe, setChartTimeframe] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  
  // Wallet connection
  const { address: userAddress, isConnected } = useAccount();

  // Livestream state
  const [selectedToken, setSelectedToken] = useState<"WHALE" | "ARROW">("WHALE");
  const [bossOpen, setBossOpen] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  // Trade panel state (match Livestream UI)
  const [tradeMode, setTradeMode] = useState<"Buy" | "Sell">("Buy");
  const [amount, setAmount] = useState<string>("");
  const parsedAmount = Number(amount || 0);
  // Modal flow
  const [showSetup, setShowSetup] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatAllowed, setChatAllowed] = useState(false);
  // Go Live form state
  const [glTitle, setGlTitle] = useState("Token Name");
  const [glDesc, setGlDesc] = useState("");
  const [glUser, setGlUser] = useState("");
  const [glCam, setGlCam] = useState(true);
  const [glMic, setGlMic] = useState(true);
  const [glRec, setGlRec] = useState(false);
  const [glMirror, setGlMirror] = useState(false);
  // Huddle identifiers for inline publish/recording
  const [roomId, setRoomId] = useState<string>("");
  const [huddleToken, setHuddleToken] = useState<string>("");

  // Fetch token data on mount
  useEffect(() => {
    if (tokenAddress) {
      fetchTokenData();
    }
  }, [tokenAddress]);
  
  // Fetch user balances when connected
  useEffect(() => {
    if (tokenAddress && userAddress && isConnected) {
      fetchUserBalances();
    }
  }, [tokenAddress, userAddress, isConnected]);
  
  // Update quotes when amount changes
  useEffect(() => {
    if (tokenAddress && amount && parsedAmount > 0) {
      if (tradeMode === "Buy") {
        updateBuyQuote();
      } else {
        updateSellQuote();
      }
    } else {
      setBuyQuote(null);
      setSellQuote(null);
    }
  }, [amount, tradeMode, tokenAddress]);

  const updateBuyQuote = async () => {
    if (!tokenAddress || !amount || parsedAmount <= 0) return;
    
    try {
      const { createPublicClient, http } = await import("viem");
      const { celoAlfajores, rootstock, rootstockTestnet } = await import("viem/chains");
      
      // Get current chain
      const connection = await getBlockchainConnection();
      const chainId = Number(connection.network.chainId);
      
      // Map chain ID to chain object
      const chainMap: Record<number, any> = {
        44787: celoAlfajores,
        30: rootstock,
        31: rootstockTestnet
      };
      
      const currentChain = chainMap[chainId] || celoAlfajores;
      
      const publicClient = createPublicClient({
        chain: currentChain,
        transport: http()
      });
      
      // Token amount should be in token units (18 decimals)
      // User enters number of tokens they want to buy (e.g., "1" means 1 token)
      const tokenAmount = parseEther(amount); // Convert to token wei (18 decimals)
      
      // Try contract calculation first (now with fixed BondingCurveLibrary)
      try {
        console.log("Attempting contract calculation for:", { tokenAddress, tokenAmount: tokenAmount.toString(), amount });
        
        const [cost, currentPrice] = await Promise.all([
          publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: CreatorTokenABI,
            functionName: "calculateBuyCost",
            args: [tokenAmount]
          }) as Promise<bigint>,
          publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: CreatorTokenABI,
            functionName: "getCurrentPrice"
          }) as Promise<bigint>
        ]);
        
        console.log("Contract calculation results:", { 
          cost: cost.toString(), 
          costEth: formatEther(cost),
          currentPrice: currentPrice.toString(),
          currentPriceEth: formatEther(currentPrice)
        });
        
        // Calculate price impact based on bonding curve
        const currentPriceEth = Number(formatEther(currentPrice));
        const costEth = Number(formatEther(cost));
        const tokenAmountNumber = parseFloat(amount);
        
        // Check if contract returned reasonable values
        if (costEth > 1000000) { // If cost is more than 1M ETH, something is wrong
          throw new Error(`Contract returned unreasonable cost: ${costEth} ETH`);
        }
        
        // Simple price impact: how much more expensive per token compared to current price
        const avgPricePerToken = tokenAmountNumber > 0 ? costEth / tokenAmountNumber : 0;
        const priceImpact = currentPriceEth > 0 ? ((avgPricePerToken - currentPriceEth) / currentPriceEth) * 100 : 0;
        
        console.log("Contract calculation success:", { costEth, priceImpact });
        setBuyQuote({ cost, priceImpact: Math.max(0, priceImpact) });
        return;
      } catch (contractError) {
        console.warn("Contract calculation failed, using frontend fallback:", contractError);
      }
      
      // Fallback to frontend calculation if contract fails
      const currentPrice = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: CreatorTokenABI,
        functionName: "getCurrentPrice"
      }) as bigint;
      
      const tokenAmountNumber = parseFloat(amount);
      const currentPriceEth = Number(formatEther(currentPrice));
      
      // Handle very small prices (like 0.000001 ETH)
      if (currentPriceEth === 0) {
        setBuyQuote({ cost: parseEther("0.001"), priceImpact: 0 }); // Minimum cost
        return;
      }
      
      // Simple linear bonding curve: price increases with each token bought
      // For very small prices, use a more conservative approach
      console.log("Frontend fallback calculation:", { currentPriceEth, tokenAmountNumber });
      
      if (currentPriceEth < 0.000001) {
        // For very small prices, use a fixed small cost
        const cost = parseEther((tokenAmountNumber * 0.000001).toString());
        setBuyQuote({ cost, priceImpact: 10 }); // 10% impact
        return;
      }
      
      const priceIncrement = Math.max(currentPriceEth * 0.01, 0.000001); // 1% price increase per token or minimum
      const avgPricePerToken = currentPriceEth + (tokenAmountNumber * priceIncrement / 2); // Average price over the range
      const totalCostEth = tokenAmountNumber * avgPricePerToken;
      
      console.log("Calculation details:", { priceIncrement, avgPricePerToken, totalCostEth });
      
      // Ensure totalCostEth is reasonable before parsing
      if (totalCostEth > 1000000) { // Cap at 1M ETH
        console.warn("Cost too high, capping at 1000 ETH");
        setBuyQuote({ cost: parseEther("1000"), priceImpact: 100 });
        return;
      }
      
      if (totalCostEth < 0.000000001) { // Minimum cost
        console.warn("Cost too low, setting minimum");
        setBuyQuote({ cost: parseEther("0.000001"), priceImpact: 1 });
        return;
      }
      
      // Convert to wei safely
      const cost = parseEther(totalCostEth.toFixed(18)); // Fix precision issues
      
      // Calculate price impact
      const priceImpact = currentPriceEth > 0 ? ((avgPricePerToken - currentPriceEth) / currentPriceEth) * 100 : 0;
      
      setBuyQuote({ cost, priceImpact: Math.max(0, priceImpact) });
    } catch (err: any) {
      console.error("Error updating buy quote:", err);
      setBuyQuote(null);
    }
  };
  
  const updateSellQuote = async () => {
    if (!tokenAddress || !amount || parsedAmount <= 0) return;
    
    try {
      const { createPublicClient, http } = await import("viem");
      const { celoAlfajores, rootstock, rootstockTestnet } = await import("viem/chains");
      
      // Get current chain
      const connection = await getBlockchainConnection();
      const chainId = Number(connection.network.chainId);
      
      // Map chain ID to chain object
      const chainMap: Record<number, any> = {
        44787: celoAlfajores,
        30: rootstock,
        31: rootstockTestnet
      };
      
      const currentChain = chainMap[chainId] || celoAlfajores;
      
      const publicClient = createPublicClient({
        chain: currentChain,
        transport: http()
      });
      
      // Token amount should be in token units (18 decimals)
      // User enters number of tokens they want to sell (e.g., "1" means 1 token)
      const tokenAmount = parseEther(amount); // Convert to token wei (18 decimals)
      
      // Try contract calculation first (now with fixed BondingCurveLibrary)
      try {
        const [proceeds, currentPrice] = await Promise.all([
          publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: CreatorTokenABI,
            functionName: "calculateSellPrice",
            args: [tokenAmount]
          }) as Promise<bigint>,
          publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: CreatorTokenABI,
            functionName: "getCurrentPrice"
          }) as Promise<bigint>
        ]);
        
        // Calculate price impact for selling based on bonding curve
        const currentPriceEth = Number(formatEther(currentPrice));
        const proceedsEth = Number(formatEther(proceeds));
        const tokenAmountNumber = parseFloat(amount);
        
        // Simple price impact: how much less you get per token compared to current price
        const avgPricePerToken = tokenAmountNumber > 0 ? proceedsEth / tokenAmountNumber : 0;
        const priceImpact = currentPriceEth > 0 ? ((currentPriceEth - avgPricePerToken) / currentPriceEth) * 100 : 0;
        
        setSellQuote({ proceeds, priceImpact: Math.max(0, priceImpact) });
        return;
      } catch (contractError) {
        console.warn("Contract sell calculation failed, using frontend fallback:", contractError);
      }
      
      // Fallback to frontend calculation if contract fails
      const currentPrice = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: CreatorTokenABI,
        functionName: "getCurrentPrice"
      }) as bigint;
      
      const tokenAmountNumber = parseFloat(amount);
      const currentPriceEth = Number(formatEther(currentPrice));
      
      // Handle very small prices
      if (currentPriceEth === 0) {
        setSellQuote({ proceeds: parseEther("0"), priceImpact: 0 });
        return;
      }
      
      // Simple linear bonding curve: price decreases when selling
      const priceDecrement = Math.max(currentPriceEth * 0.01, 0.000001); // 1% price decrease per token or minimum
      const avgPricePerToken = Math.max(currentPriceEth - (tokenAmountNumber * priceDecrement / 2), currentPriceEth * 0.5); // Minimum 50% of current price
      const totalProceedsEth = tokenAmountNumber * avgPricePerToken;
      
      // Convert to wei
      const proceeds = parseEther(totalProceedsEth.toString());
      
      // Calculate price impact
      const priceImpact = currentPriceEth > 0 ? ((currentPriceEth - avgPricePerToken) / currentPriceEth) * 100 : 0;
      
      setSellQuote({ proceeds, priceImpact: Math.max(0, priceImpact) });
    } catch (err: any) {
      console.error("Error updating sell quote:", err);
      setSellQuote(null);
    }
  };

  // Update default stream title when token data loads
  useEffect(() => {
    if (tokenData?.name) {
      setGlTitle(tokenData.name);
    }
  }, [tokenData?.name]);

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
        await fetchChartData(chainId);
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

  const fetchUserBalances = async () => {
    if (!userAddress || !tokenAddress) return;
    
    try {
      const { createWalletClient, createPublicClient, http } = await import("viem");
      const { celoAlfajores, rootstock, rootstockTestnet } = await import("viem/chains");
      
      // Get current chain
      const walletClient = createWalletClient({
        chain: celoAlfajores, // Default to Celo Alfajores
        transport: http()
      });
      
      const chainId = await walletClient.getChainId();
      
      // Map chain ID to chain object
      const chainMap: Record<number, any> = {
        44787: celoAlfajores,
        30: rootstock,
        31: rootstockTestnet
      };
      
      const currentChain = chainMap[chainId] || celoAlfajores;
      
      const publicClient = createPublicClient({
        chain: currentChain,
        transport: http()
      });
      
      const [ethBalance, tokenBalance] = await Promise.all([
        publicClient.getBalance({ address: userAddress as `0x${string}` }),
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: CreatorTokenABI,
          functionName: "balanceOf",
          args: [userAddress]
        })
      ]);
      
      setUserBalance(formatEther(ethBalance));
      setUserTokenBalance(formatEther(tokenBalance as bigint));
    } catch (err: any) {
      console.error("Error fetching user balances:", err);
    }
  };

  const fetchChartData = async (chainId: number) => {
    try {
      const { createPublicClient, http } = await import("viem");
      const { celoAlfajores, rootstock, rootstockTestnet } = await import("viem/chains");
      
      // Map chain ID to chain object
      const chainMap: Record<number, any> = {
        44787: celoAlfajores,
        30: rootstock,
        31: rootstockTestnet
      };
      
      const currentChain = chainMap[chainId] || celoAlfajores;
      
      const publicClient = createPublicClient({
        chain: currentChain,
        transport: http()
      });
      
      // Get current block number
      const currentBlock = await publicClient.getBlockNumber();
      const blocksToFetch = chartTimeframe === '1h' ? 300 : chartTimeframe === '24h' ? 7200 : chartTimeframe === '7d' ? 50400 : 216000;
      const fromBlock = currentBlock - BigInt(blocksToFetch);
      
      try {
        // Fetch TokenPurchased and TokenSold events to build real price history
        const [purchaseEvents, sellEvents] = await Promise.all([
          publicClient.getLogs({
            address: tokenAddress as `0x${string}`,
            event: {
              type: 'event',
              name: 'TokenPurchased',
              inputs: [
                { name: 'buyer', type: 'address', indexed: true },
                { name: 'tokenAmount', type: 'uint256', indexed: false },
                { name: 'price', type: 'uint256', indexed: false },
                { name: 'totalPaid', type: 'uint256', indexed: false }
              ]
            },
            fromBlock,
            toBlock: currentBlock
          }),
          publicClient.getLogs({
            address: tokenAddress as `0x${string}`,
            event: {
              type: 'event',
              name: 'TokenSold',
              inputs: [
                { name: 'seller', type: 'address', indexed: true },
                { name: 'tokenAmount', type: 'uint256', indexed: false },
                { name: 'price', type: 'uint256', indexed: false },
                { name: 'totalReceived', type: 'uint256', indexed: false }
              ]
            },
            fromBlock,
            toBlock: currentBlock
          })
        ]);

        // Combine and sort events by block number
        const allEvents = [...purchaseEvents, ...sellEvents].sort((a, b) => 
          Number(a.blockNumber) - Number(b.blockNumber)
        );

        if (allEvents.length > 0) {
          // Build candlestick data from events
          const candleData = [];
          const intervalMs = chartTimeframe === '1h' ? 60000 : chartTimeframe === '24h' ? 600000 : chartTimeframe === '7d' ? 3600000 : 3600000;
          
          for (const event of allEvents) {
            const block = await publicClient.getBlock({ blockNumber: event.blockNumber });
            const timestamp = Number(block.timestamp) * 1000;
            const price = Number(formatEther(event.args.price as bigint));
            
            candleData.push({ timestamp, price });
          }
          
          setChartData(candleData);
        } else {
          // Fallback: get current price and create a single data point
          const currentPrice = await publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: CreatorTokenABI,
            functionName: "getCurrentPrice"
          }) as bigint;
          
          const currentPriceEth = Number(formatEther(currentPrice));
          const now = Date.now();
          
          setChartData([
            { timestamp: now - 3600000, price: currentPriceEth },
            { timestamp: now, price: currentPriceEth }
          ]);
        }
      } catch (eventError) {
        console.error("Error fetching events, using current price:", eventError);
        
        // Fallback to current price
        const currentPrice = await publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: CreatorTokenABI,
          functionName: "getCurrentPrice"
        }) as bigint;
        
        const currentPriceEth = Number(formatEther(currentPrice));
        const now = Date.now();
        
        setChartData([
          { timestamp: now - 3600000, price: currentPriceEth },
          { timestamp: now, price: currentPriceEth }
        ]);
      }
    } catch (err: any) {
      console.error("Error fetching chart data:", err);
    }
  };

  const executeTrade = async () => {
    if (!userAddress || !isConnected) {
      setTradingError("Please connect your wallet");
      return;
    }
    
    if (!amount || parsedAmount <= 0) {
      setTradingError("Please enter a valid amount");
      return;
    }
    
    try {
      setTradingLoading(true);
      setTradingError(null);
      
      const { createWalletClient, http, custom } = await import("viem");
      const { celoAlfajores, rootstock, rootstockTestnet } = await import("viem/chains");
      
      // Get current chain
      const connection = await getBlockchainConnection();
      const chainId = Number(connection.network.chainId);
      
      // Map chain ID to chain object
      const chainMap: Record<number, any> = {
        44787: celoAlfajores,
        30: rootstock,
        31: rootstockTestnet
      };
      
      const currentChain = chainMap[chainId] || celoAlfajores;
      
      // Create wallet client
      const walletClient = createWalletClient({
        chain: currentChain,
        transport: custom((window as any).ethereum)
      });
      
      // Token amount should be in token units (18 decimals)
      // User enters number of tokens they want to trade (e.g., "1" means 1 token)
      const tokenAmount = parseEther(amount); // Convert to token wei (18 decimals)
      let txHash;
      
      if (tradeMode === "Buy") {
        if (!buyQuote) {
          throw new Error("No buy quote available");
        }
        if (buyQuote.priceImpact > 100) { // 100% max slippage for bonding curves (more reasonable)
          throw new Error(`Price impact too high: ${buyQuote.priceImpact.toFixed(2)}%`);
        }
        
        txHash = await walletClient.writeContract({
          account: userAddress as `0x${string}`,
          address: tokenAddress as `0x${string}`,
          abi: CreatorTokenABI,
          functionName: "buyTokens",
          args: [tokenAmount],
          value: buyQuote.cost,
          chain: currentChain
        });
      } else {
        if (!sellQuote) {
          throw new Error("No sell quote available");
        }
        if (sellQuote.priceImpact > 100) { // 100% max slippage for bonding curves (more reasonable)
          throw new Error(`Price impact too high: ${sellQuote.priceImpact.toFixed(2)}%`);
        }
        
        txHash = await walletClient.writeContract({
          account: userAddress as `0x${string}`,
          address: tokenAddress as `0x${string}`,
          abi: CreatorTokenABI,
          functionName: "sellTokens",
          args: [tokenAmount],
          chain: currentChain
        });
      }
      
      // Wait for transaction confirmation
      const { createPublicClient } = await import("viem");
      const publicClient = createPublicClient({
        chain: currentChain,
        transport: http()
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      
      // Refresh data
      await Promise.all([
        fetchTokenData(),
        fetchUserBalances()
      ]);
      
      setAmount("");
      setBuyQuote(null);
      setSellQuote(null);
      
      alert(`${tradeMode} successful! Transaction hash: ${txHash}`);
      
    } catch (err: any) {
      console.error("Error executing trade:", err);
      setTradingError(err.message || `Failed to ${tradeMode.toLowerCase()} tokens`);
    } finally {
      setTradingLoading(false);
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
                    <button
                      type="button"
                      onClick={() => setShowSetup(true)}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black text-white cursor-pointer"
                    >
                      Go Live
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Video player (shown after permissions) */}
            {permissionsGranted ? (
              <>
                <StreamPlayer
                  camEnabled={glCam}
                  micEnabled={glMic}
                  onToggleCam={() => setGlCam((v) => !v)}
                  onToggleMic={() => setGlMic((v) => !v)}
                  onEndStream={() => {
                    // End should only stop camera/mic and keep the page; no preview popup
                    setPermissionsGranted(false);
                    setShowChat(false);
                    // Turn off local states so StreamPlayer won't try to re-acquire
                    setGlCam(false);
                    setGlMic(false);
                    setGlRec(false);
                    // Clear identifiers so no further publish/record attempts
                    setRoomId("");
                    setHuddleToken("");
                  }}
                  recEnabled={glRec}
                  onToggleRec={() => setGlRec((v) => !v)}
                  mirrorEnabled={glMirror}
                  onToggleMirror={() => setGlMirror((v) => !v)}
                  roomId={roomId}
                  token={huddleToken}
                />
              </>
            ) : (
              <>
              </>
            )}

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

            {/* Price Chart */}
            <Card className="border-gray-200">
              <CardContent className="p-5 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Price Chart</h3>
                  <div className="flex gap-2">
                    {(['1h', '24h', '7d', '30d'] as const).map((timeframe) => (
                      <button
                        key={timeframe}
                        onClick={() => {
                          setChartTimeframe(timeframe);
                          if (tokenData) fetchChartData(44787);
                        }}
                        className={`px-3 py-1 rounded text-sm ${
                          chartTimeframe === timeframe
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {timeframe}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-64 bg-gray-50 rounded-lg relative">
                  {chartData.length > 0 ? (
                    <svg className="w-full h-full" viewBox="0 0 400 200">
                      {chartData.map((point, index) => {
                        if (index === 0) return null;
                        const prevPoint = chartData[index - 1];
                        const x1 = (index - 1) * (400 / (chartData.length - 1));
                        const y1 = 180 - ((prevPoint.price - Math.min(...chartData.map(d => d.price))) / (Math.max(...chartData.map(d => d.price)) - Math.min(...chartData.map(d => d.price)))) * 160;
                        const x2 = index * (400 / (chartData.length - 1));
                        const y2 = 180 - ((point.price - Math.min(...chartData.map(d => d.price))) / (Math.max(...chartData.map(d => d.price)) - Math.min(...chartData.map(d => d.price)))) * 160;
                        return (
                          <line
                            key={index}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke="#8B5CF6"
                            strokeWidth="2"
                            fill="none"
                          />
                        );
                      })}
                    </svg>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500">Loading chart data...</p>
                    </div>
                  )}
                </div>
                <div className="mt-2 text-sm text-gray-500 text-center">
                  Current Price: {tokenData ? formatEther(tokenData.currentPrice) : '0'} ETH
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Sidebar - Same order as Livestream: Boss Battle -> Trade -> Live Chat */}
          <div className="space-y-4">
            {/* Boss Battle card (always visible) */}
              <Card className="border-gray-200 mt-0">
                <CardHeader className="">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                      <span>
                        <img src="/icons/trophy.svg" alt="trophy" width={24} height={24} />
                      </span>
                      <span className="text-[18px] font-semibold">Boss Battle</span>
                      <span className="flex items-center gap-2">
                        <span className="relative inline-flex h-2.5 w-2.5">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                        </span>
                        <span className="text-red-600 font-semibold drop-shadow-[0_0_4px_rgba(239,68,68,0.6)]">Live</span>
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full cursor-pointer"
                      onClick={() => setBossOpen((v) => !v)}
                      aria-expanded={bossOpen}
                      aria-label="Toggle Boss Battle"
                    >
                      <svg
                        className={`h-5 w-5 transition-transform duration-200 ${
                          bossOpen ? "-rotate-180" : "rotate-0"
                        }`}
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Button>
                  </CardTitle>
                </CardHeader>
                <hr className="mx-6 -mt-4 border-[#0000001A]" />
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                    <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
                      <span>
                        <img src="/icons/coins-stacked.svg" alt="coins-stacked" width={24} height={24} />
                      </span>
                      <div className="leading-tight">
                        <p className="font-semibold">Pool 48.8 ETH</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
                      <span>
                        <img src="/icons/clock.svg" alt="clock" width={24} height={24} />
                      </span>
                      <div className="leading-tight">
                        <p className="font-semibold">Round 1/3</p>
                        <p className="text-xs text-gray-500">02:37</p>
                      </div>
                    </div>
                    <div className="col-span-1 flex items-center gap-2 border rounded-lg px-3 py-2">
                      <span>
                        <img src="/icons/people.svg" alt="eye" width={24} height={24} />
                      </span>
                      <p className="font-semibold">12,837 live</p>
                    </div>
                  </div>

                  {/* Slide-down content */}
                  <div
                    className={`transition-all duration-500 ease-in-out overflow-hidden ${
                      bossOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Token Selection Section */}
                      <div>
                        {selectedToken ? (
                          <p className="text-sm text-gray-600 mb-2">
                            you have selected <span className="font-semibold">{selectedToken}</span>
                          </p>
                        ) : (
                          <p className="text-sm text-gray-600 mb-2">Select your chosen token</p>
                        )}

                        {/* Token Stats (WHALE/ARROW) */}
                        <div className="flex gap-3">
                          <TokenStat
                            name="WHALE"
                            percent="61%"
                            votes="1,284"
                            eth="7.1"
                            selected={selectedToken === "WHALE"}
                            onClick={() => setSelectedToken("WHALE")}
                          />
                          <TokenStat
                            name="ARROW"
                            percent="39%"
                            votes="796"
                            eth="5.3"
                            selected={selectedToken === "ARROW"}
                            onClick={() => setSelectedToken("ARROW")}
                          />
                        </div>
                      </div>

                      {/* Stake/Vote Section */}
                      <div className="space-y-3 pt-2">
                        <Input type="number" placeholder="Amount (ETH)" className="h-11 bg-[#E5E5E566]" />
                        <Button className="w-full h-11 rounded-xl font-semibold cursor-pointer">
                          {`Stake & Vote ${selectedToken}`}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

            {/* Trade card with real functionality */}
              <Card className="border-gray-200 mt-2">
                <CardContent className="p-2 md:p-3 space-y-3">
                  {/* Tabs container */}
                  <div className="p-0 flex gap-1" style={{ borderColor: '#0000001A' }}>
                    <button
                      onClick={() => setTradeMode("Buy")}
                      className={`flex-1 px-6 py-2 rounded-2xl font-semibold transition-colors duration-200 cursor-pointer ${
                        tradeMode === "Buy"
                          ? "bg-[#B65FFF] text-white hover:bg-[#A24EE6]"
                          : "bg-[#F2F2F2] text-gray-700 border hover:bg-[#DAADFF] hover:text-white"
                      }`}
                      style={tradeMode === "Buy" ? undefined : { borderColor: '#0000001A' }}
                    >
                      Buy
                    </button>
                    <button
                      onClick={() => setTradeMode("Sell")}
                      className={`flex-1 px-6 py-2 rounded-2xl font-semibold transition-colors duration-200 cursor-pointer ${
                        tradeMode === "Sell"
                          ? "bg-[#B65FFF] text-white hover:bg-[#A24EE6]"
                          : "bg-[#F2F2F2] text-gray-700 border hover:bg-[#DAADFF] hover:text-white"
                      }`}
                      style={tradeMode === "Sell" ? undefined : { borderColor: '#0000001A' }}
                    >
                      Sell
                    </button>
                  </div>

                  {/* Balance Display */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {tradeMode === "Buy" ? "ETH Balance:" : "Token Balance:"}
                    </span>
                    <span className="font-semibold">
                      {tradeMode === "Buy" 
                        ? `${parseFloat(userBalance).toFixed(4)} ETH`
                        : `${parseFloat(userTokenBalance).toFixed(4)} ${tokenData?.symbol || 'TOKEN'}`
                      }
                    </span>
                  </div>


                  {/* Amount field */}
                  <div className="border rounded-xl px-3 py-2 flex items-center justify-between bg-white" style={{ borderColor: '#0000001A' }}>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-transparent outline-none text-2xl font-medium placeholder:text-gray-400"
                    />
                    <span className="text-sm font-medium text-gray-600 ml-2">
                      {tradeMode === "Buy" ? tokenData?.symbol || 'TOKEN' : 'TOKEN'}
                    </span>
                  </div>

                  {/* Preset chips */}
                  <div className="flex items-center gap-2 flex-nowrap overflow-x-auto">
                    <button
                      onClick={() => setAmount("")}
                      className="px-3 py-1 rounded-full bg-white text-gray-800 border shadow-sm text-sm cursor-pointer"
                      style={{ borderColor: '#0000001A' }}
                    >
                      Reset
                    </button>
                    {[0.10, 0.5, 10].map((val, i) => (
                      <button
                        key={i}
                        onClick={() => setAmount(String(val))}
                        className="px-3 py-1 rounded-full bg-white text-gray-800 border shadow-sm text-sm cursor-pointer"
                        style={{ borderColor: '#0000001A' }}
                      >
                        {val}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        const maxAmount = tradeMode === "Buy" 
                          ? (parseFloat(userBalance) * 0.95).toFixed(4)
                          : userTokenBalance;
                        setAmount(maxAmount);
                      }}
                      className="px-3 py-1 rounded-full bg-white text-gray-800 border shadow-sm text-sm cursor-pointer"
                      style={{ borderColor: '#0000001A' }}
                    >
                      Max
                    </button>
                  </div>

                  {/* Quote Display */}
                  {(buyQuote && tradeMode === "Buy") && (
                    <div className="bg-blue-50 p-3 rounded-lg text-sm">
                      <div className="flex justify-between mb-1">
                        <span>Cost:</span>
                        <span className="font-semibold">{formatEther(buyQuote.cost)} ETH</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Price Impact:</span>
                        <span className={`font-semibold ${
                          buyQuote.priceImpact > 5 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {buyQuote.priceImpact.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {(sellQuote && tradeMode === "Sell") && (
                    <div className="bg-green-50 p-3 rounded-lg text-sm">
                      <div className="flex justify-between mb-1">
                        <span>You&apos;ll receive:</span>
                        <span className="font-semibold">{formatEther(sellQuote.proceeds)} ETH</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Price Impact:</span>
                        <span className={`font-semibold ${
                          sellQuote.priceImpact > 5 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {sellQuote.priceImpact.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Preset chips */}
                  <div className="flex items-center gap-2 flex-nowrap overflow-x-auto">
                    <button
                      onClick={() => setAmount("")}
                      className="px-3 py-1 rounded-full bg-white text-gray-800 border shadow-sm text-sm cursor-pointer"
                      style={{ borderColor: '#0000001A' }}
                    >
                      Reset
                    </button>
                    {[0.01, 0.1, 0.5].map((val, i) => (
                      <button
                        key={i}
                        onClick={() => setAmount(String(val))}
                        className="px-3 py-1 rounded-full bg-white text-gray-800 border shadow-sm text-sm cursor-pointer"
                        style={{ borderColor: '#0000001A' }}
                      >
                        {val}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        const maxAmount = tradeMode === "Buy" 
                          ? (parseFloat(userBalance) * 0.95).toFixed(4)
                          : userTokenBalance;
                        setAmount(maxAmount);
                      }}
                      className="px-3 py-1 rounded-full bg-white text-gray-800 border shadow-sm text-sm cursor-pointer"
                      style={{ borderColor: '#0000001A' }}
                    >
                      Max
                    </button>
                  </div>

                  {/* Error Display */}
                  {tradingError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                      {tradingError}
                    </div>
                  )}

                  {/* Primary action */}
                  <Button
                    onClick={executeTrade}
                    disabled={!amount || parsedAmount <= 0 || tradingLoading || !isConnected}
                    className={`w-full h-12 rounded-2xl text-lg font-semibold text-white cursor-pointer ${
                      (!amount || parsedAmount <= 0 || tradingLoading || !isConnected) 
                        ? "bg-black/60 cursor-not-allowed" 
                        : "bg-black hover:bg-gray-800"
                    }`}
                  >
                    {tradingLoading ? "Processing..." : `${tradeMode} ${tokenData?.symbol || 'TOKEN'}`}
                  </Button>
                </CardContent>
              </Card>

            {/* Live Chat (always visible) */}
              <Card className="border-gray-200 mt-6">
                <CardHeader className="pb-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">Live Chat</CardTitle>
                    <div className="text-sm text-gray-400">New message will appear here</div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <hr className="border-[#0000001A]" />
                  <div className="space-y-4">
                    {/* Right aligned message */}
                    <div className="flex justify-end">
                      <div className="max-w-[70%] bg-[#EAD6FF] text-gray-900 px-4 py-3 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">Hey chat</span>
                          <span className="text-xs text-gray-500">23:07</span>
                        </div>
                      </div>
                    </div>
                    {/* Left aligned message */}
                    <div className="flex items-start gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>A</AvatarFallback>
                      </Avatar>
                      <div className="max-w-[80%] border rounded-2xl px-4 py-3 shadow-sm" style={{ borderColor: '#0000001A' }}>
                        <div className="text-sm text-emerald-600 font-semibold">aamx8e</div>
                        <div className="mt-1 text-[15px] text-gray-900 flex items-end gap-3">
                          <span>buying your token</span>
                          <span className="text-xs text-gray-500">23:59</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <Input placeholder="Write a message.." className="h-12 rounded-xl bg-[#F2F2F2] placeholder:text-gray-400" />
                    <img src="/icons/send-button.svg" alt="send-button" width={34} height={34} className="cursor-pointer" />
                  </div>
                </CardContent>
              </Card>
            

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

      {/* Setup Modal (title/description) */}
      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white text-gray-900 border border-[#0000001A] shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-[20px] font-semibold">Go live setup</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">Add your stream name and description</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Token name" value={glTitle} onChange={(e) => setGlTitle(e.target.value)} />
            <Input placeholder="Description" value={glDesc} onChange={(e) => setGlDesc(e.target.value)} />
          </div>
          <DialogFooter className="pt-2">
            <button
              className="h-10 px-4 rounded-xl bg-black text-white font-medium hover:bg-black/90"
              onClick={() => {
                setShowSetup(false);
                setShowTerms(true);
              }}
            >
              Continue
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terms and Conditions Modal */}
      <Dialog open={showTerms && !acceptedTerms} onOpenChange={setShowTerms}>
        <DialogContent className="sm:max-w-lg rounded-2xl bg-white text-gray-900 border border-[#0000001A] shadow-xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-[20px] font-semibold">Terms and conditions</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">Whale.fun Livestream Moderation Policy</DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] overflow-auto space-y-5 text-[13px] leading-6 pr-1">
            <div>
              <p className="font-semibold text-gray-900">Purpose</p>
              <p className="text-gray-600">To cultivate a social environment on Whale.fun that preserves creativity and freedom of expression and encourages meaningful engagement amongst users, free of illegal, harmful, and negative interactions.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Restriction on Underage Use</p>
              <p className="text-gray-600">Livestreaming is restricted to users above the age of 18. Whale.fun takes this user restriction seriously.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Prohibited Content</p>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                <li>Violence and threats</li>
                <li>Harassment and bullying</li>
                <li>Sexual content and nudity</li>
                <li>Youth endangerment</li>
                <li>Illegal activities</li>
                <li>Privacy violations</li>
                <li>Copyright violations</li>
                <li>Terrorism or violent extremism</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Creator Responsibilities</p>
              <p className="text-gray-600">Follow the moderation policy and review moderation guidelines before streaming sensitive topics.</p>
              <p className="text-gray-600">Contact legal@Whale.fun.com for appeals.</p>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <button
              className="h-10 px-4 rounded-xl bg-black text-white font-medium hover:bg-black/90"
              onClick={() => {
                setAcceptedTerms(true);
                setShowTerms(false);
                setShowPreview(true);
              }}
            >
              I agree
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stream Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Stream preview</DialogTitle>
            <DialogDescription>Choose your video/audio preferences</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <label className="block text-xs opacity-70">Whale.fun broadcast mode</label>
              <select className="w-full rounded border px-3 py-2">
                <option value="webcam">Webcam</option>
              </select>
            </div>
            <div>
              <label className="block text-xs opacity-70">Video/audio inputs</label>
              <div className="grid grid-cols-1 gap-2">
                <select className="w-full rounded border px-3 py-2"><option>Default Camera</option></select>
                <select className="w-full rounded border px-3 py-2"><option>Default Microphone</option></select>
              </div>
            </div>
            <div>
              <label className="block text-xs opacity-70">Stream title (optional)</label>
              <Input placeholder="Enter a descriptive title..." value={glDesc} onChange={(e)=>setGlDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => { setShowPreview(false); setShowChat(true); }}>Next</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chat Options Modal */}
      <Dialog open={showChat} onOpenChange={setShowChat}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Chat options</DialogTitle>
            <DialogDescription>Configure your chat before going live</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <label className="flex items-center justify-between rounded-xl border px-3 py-2" style={{ borderColor: '#0000001A' }}>
              <div>
                <div className="font-medium">Token-gated chat</div>
                <div className="text-xs text-gray-500">Only token holders can chat</div>
              </div>
              <button
                type="button"
                onClick={() => setChatAllowed((v) => !v)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  chatAllowed ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-700"
                }`}
              >
                {chatAllowed ? "On" : "Off"}
              </button>
            </label>
          </div>
          <DialogFooter>
            <Button onClick={async () => {
              try {
                if (glCam || glMic) {
                  const perm = await navigator.mediaDevices.getUserMedia({ video: glCam, audio: glMic });
                  // Immediately stop permission stream to avoid dangling devices
                  try { perm.getTracks().forEach((t) => t.stop()); } catch {}
                }
                setPermissionsGranted(true);
                setShowChat(false);
                // Create Huddle room and token so StreamPlayer can join/publish inline
                const res = await fetch("/api/huddle01/room", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ title: glTitle, description: glDesc }),
                });
                const roomData = await res.json();
                if (!res.ok || roomData?.error || !roomData?.roomId) throw new Error(roomData?.error || "Failed to create room");
                const newRoomId = roomData.roomId as string;
                setRoomId(newRoomId);
                const tres = await fetch("/api/huddle01/token", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ roomId: newRoomId, userId: glUser || undefined }),
                });
                const tdata = await tres.json();
                if (!tres.ok || tdata?.error || !tdata?.token) throw new Error(tdata?.error || "Failed to generate token");
                setHuddleToken(tdata.token as string);
              } catch (e: any) {
                alert(e?.message || "Permission or setup failed. Please try again.");
              }
            }}>Go live</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TradePage;
