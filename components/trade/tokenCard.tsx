"use client";
import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useBalance } from "wagmi";
import { parseEther, formatEther } from "ethers";
import { getBlockchainConnection } from "@/utils/Blockchain";
import CreatorTokenABI from "@/config/abi/CreatorToken.json";
import Image from "next/image";
import { toast } from "sonner";

interface TokenCardProps {
  token: {
    id: string;
    name: string;
    symbol: string;
    image: string;
    priceChange: string;
    priceValue: string;
    currentPrice: string;
    marketCap: string;
    volume: string;
    age: string;
    isLive?: boolean;
    isExternal?: boolean;
    chainId?: number;
  };
  index?: number;
  compact?: boolean;
}

const TokenCard = ({ token, index, compact = false }: TokenCardProps) => {
  const router = useRouter();
  const { address: userAddress, isConnected, chain } = useAccount();
  const [isQuickBuying, setIsQuickBuying] = useState(false);
  const [quickBuyError, setQuickBuyError] = useState<string | null>(null);

  const handleCardClick = () => {
    if (token.isExternal) {
      router.push(`/token/external/${token.id}`);
    } else {
      router.push(`/token/${token.id}`);
    }
  };

  const handleQuickBuy = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!userAddress || !isConnected) {
      setQuickBuyError("Please connect your wallet");
      return;
    }

    if (token.isExternal) {
      setQuickBuyError("Quick buy not available for external tokens");
      return;
    }

    // Check user's ETH balance before buying
    try {
      const { createPublicClient, http } = await import("viem");
      const connection = await getBlockchainConnection();
      const chainId = Number(connection.network.chainId);

      const chainMap: Record<number, any> = {
        16602: {
          id: 16602,
          name: "0G Testnet",
          network: "0g-testnet",
          nativeCurrency: { decimals: 18, name: "0G", symbol: "0G" },
          rpcUrls: { default: { http: ["https://evmrpc-testnet.0g.ai"] } },
          blockExplorers: {
            default: {
              name: "0G Explorer",
              url: "https://chainscan-galileo.0g.ai",
            },
          },
          testnet: true,
        },
      };

      const currentChain = chainMap[chainId];
      if (!currentChain) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }

      const publicClient = createPublicClient({
        chain: currentChain,
        transport: http(),
      });

      const userBalance = await publicClient.getBalance({
        address: userAddress as `0x${string}`,
      });

      const requiredAmount = parseEther("0.01");
      if (userBalance < requiredAmount) {
        setQuickBuyError(
          `Insufficient balance. Need ${formatEther(
            requiredAmount
          )} ETH, have ${formatEther(userBalance)} ETH`
        );
        return;
      }
    } catch (balanceError) {
      console.error("Balance check error:", balanceError);
      setQuickBuyError("Could not verify balance. Please try again.");
      return;
    }

    setIsQuickBuying(true);
    setQuickBuyError(null);

    try {
      const { createWalletClient, createPublicClient, http, custom } =
        await import("viem");

      // Get current chain
      const connection = await getBlockchainConnection();
      const chainId = Number(connection.network.chainId);

      // Map chain ID to chain object
      const chainMap: Record<number, any> = {
        16602: {
          id: 16602,
          name: "0G Testnet",
          network: "0g-testnet",
          nativeCurrency: { decimals: 18, name: "0G", symbol: "0G" },
          rpcUrls: { default: { http: ["https://evmrpc-testnet.0g.ai"] } },
          blockExplorers: {
            default: {
              name: "0G Explorer",
              url: "https://chainscan-galileo.0g.ai",
            },
          },
          testnet: true,
        },
      };

      const currentChain = chainMap[chainId];
      if (!currentChain) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }

      // Create clients
      const publicClient = createPublicClient({
        chain: currentChain,
        transport: http(),
      });

      const walletClient = createWalletClient({
        chain: currentChain,
        transport: custom((window as any).ethereum),
      });

      // Calculate buy amount for 0.01 ETH
      const ethAmount = parseEther("0.01");

      // Since we don't have calculateTokensForETH, we'll estimate by trying different token amounts
      // Start with current price to get a rough estimate
      const currentPrice = (await publicClient.readContract({
        address: token.id as `0x${string}`,
        abi: CreatorTokenABI,
        functionName: "getCurrentPrice",
      })) as bigint;

      // Estimate tokens we can buy: ethAmount / currentPrice
      // Use a binary search approach to find the right amount
      const tokenAmount = ethAmount / currentPrice; // Initial estimate

      // Try to get closer to 0.01 ETH by binary search
      let low = tokenAmount / BigInt(2);
      let high = tokenAmount * BigInt(2);
      let bestTokenAmount = tokenAmount;
      let bestCost = ethAmount;

      for (let i = 0; i < 10; i++) {
        // Max 10 iterations
        try {
          const mid = (low + high) / BigInt(2);
          if (mid <= 0) break;

          const cost = (await publicClient.readContract({
            address: token.id as `0x${string}`,
            abi: CreatorTokenABI,
            functionName: "calculateBuyCost",
            args: [mid],
          })) as bigint;

          if (cost <= ethAmount) {
            bestTokenAmount = mid;
            bestCost = cost;
            low = mid;
          } else {
            high = mid;
          }

          // If we're close enough, break
          const diff = cost > ethAmount ? cost - ethAmount : ethAmount - cost;
          if (diff < ethAmount / BigInt(100)) {
            // Within 1%
            bestTokenAmount = mid;
            bestCost = cost;
            break;
          }
        } catch {
          break;
        }
      }

      if (bestTokenAmount <= 0) {
        throw new Error("Cannot buy tokens with this amount");
      }

      console.log("Quick buy:", {
        tokenAmount: bestTokenAmount.toString(),
        cost: bestCost.toString(),
        costEth: formatEther(bestCost),
      });

      // Execute the buy transaction
      const txHash = await walletClient.writeContract({
        account: userAddress as `0x${string}`,
        address: token.id as `0x${string}`,
        abi: CreatorTokenABI,
        functionName: "buyTokens",
        args: [bestTokenAmount],
        value: bestCost,
        chain: currentChain,
      });

      console.log("Quick buy transaction submitted:", txHash);

      // Show immediate success message since transaction was submitted
      toast.success("Transaction submitted!", {
        description: `Buying ${formatEther(bestTokenAmount)} ${
          token.symbol
        } for ${formatEther(bestCost)} ETH`,
        duration: 3000,
      });

      // Try to wait for confirmation with proper error handling
      try {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
          timeout: 30000, // Reduced timeout
          retryCount: 3,
          retryDelay: 2000,
        });

        if (receipt.status === "success") {
          console.log("Quick buy confirmed:", receipt);
          toast.success("Quick buy confirmed!", {
            description: `Successfully bought ${formatEther(bestTokenAmount)} ${
              token.symbol
            }`,
            duration: 5000,
          });
        } else {
          toast.error("Transaction failed", {
            description: "The transaction was reverted",
            duration: 5000,
          });
        }
      } catch (receiptError: any) {
        // If we can't get the receipt, the transaction might still succeed
        console.warn("Could not get transaction receipt:", receiptError);
        toast.info("Transaction pending", {
          description:
            "Your transaction is processing. Check your wallet for updates.",
          duration: 5000,
        });
      }
    } catch (error: any) {
      console.error("Quick buy error:", error);
      setQuickBuyError(error.message || "Quick buy failed");

      // Show error to user
      if (error.message.includes("User rejected")) {
        setQuickBuyError("Transaction cancelled by user");
      } else if (error.message.includes("insufficient")) {
        setQuickBuyError("Insufficient ETH balance");
      } else {
        setQuickBuyError("Quick buy failed. Please try again.");
      }
    } finally {
      setIsQuickBuying(false);
    }
  };

  const bgIndex = useMemo(() => {
    if (typeof index === "number") return index % 4; // cycle in order and repeat
    const s = token.id || token.name || "";
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h % 4;
  }, [index, token.id, token.name]);

  const themes = [
    {
      // Blue
      bg: "#6EC2FF",
      heading: "text-white",
      text: "text-white/80",
      priceChange: token.priceChange.startsWith("-")
        ? "text-red-200"
        : "text-green-200",
      quickBuy: "bg-black/80 text-white hover:bg-black hover:cursor-pointer",
    },
    {
      // Purple
      bg: "#7962D9",
      heading: "text-white",
      text: "text-white/80",
      priceChange: token.priceChange.startsWith("-")
        ? "text-red-200"
        : "text-green-200",
      quickBuy: "bg-black/80 text-white hover:bg-black hover:cursor-pointer",
    },
    {
      // Beige
      bg: "linear-gradient(135deg, #E8DFD0, #AF9C82)",
      heading: "text-black",
      text: "text-black/70",
      priceChange: token.priceChange.startsWith("-")
        ? "text-red-600"
        : "text-green-600",
      quickBuy: "bg-black text-white hover:bg-gray-800 hover:cursor-pointer",
    },
    {
      // Grey
      bg: "#F3F4F6", // A light grey base
      heading: "text-black",
      text: "text-black/70",
      priceChange: token.priceChange.startsWith("-")
        ? "text-red-600"
        : "text-green-600",
      quickBuy: "bg-black text-white hover:bg-gray-800 hover:cursor-pointer",
    },
  ];

  const theme = themes[bgIndex];
  const overlayBg = `linear-gradient(0deg, rgba(0,0,0,0.28), rgba(0,0,0,0.28)), ${theme.bg}`;
  const headingClass = "text-white";
  const textClass = "text-white/80";
  const priceChangeClass = token.priceChange.startsWith("-")
    ? "text-red-200"
    : "text-green-200";

  const sizeClass = compact ? "h-[175px] w-[286px]" : "h-[237px] w-[364px]";
  const imgSize = compact ? 100 : 150;

  return (
    <div
      style={{ background: overlayBg }}
      className={`relative rounded-2xl ${
        compact ? "p-4" : "p-5"
      } shadow-md cursor-pointer transition-transform hover:scale-[1.01] flex flex-col justify-between ${sizeClass} overflow-hidden`}
      onClick={handleCardClick}
    >
      {/* Content on the left */}
      <div
        className={`flex-1 min-w-0 ${
          compact ? "pr-[128px]" : "pr-[170px]"
        } z-10`}
      >
        <div
          className={`${
            compact ? "text-[17px]" : "text-xl"
          } font-extrabold tracking-tight truncate ${headingClass}`}
        >
          ${token.symbol.toUpperCase()}
        </div>
        <div
          className={`mt-1 ${compact ? "text-xs" : "text-sm/5"} ${textClass}`}
        >
          Market Cap
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <div
            className={`${
              compact ? "text-xl" : "text-2xl"
            } font-bold truncate ${headingClass}`}
          >
            {token.marketCap}
          </div>
          <div
            className={`${
              compact ? "text-xs" : "text-sm"
            } font-medium ${priceChangeClass}`}
          >
            {token.priceChange}
          </div>
        </div>
        <button
          className={`mt-2 inline-flex items-center gap-1 ${
            compact ? "text-xs" : "text-sm"
          } font-semibold underline cursor-pointer underline-offset-4 ${textClass} hover:${headingClass}`}
        >
          View Token →
        </button>
      </div>

      {/* Quick Buy Button at the bottom */}
      <div className="mt-auto z-10">
        {quickBuyError && (
          <div
            className={`mb-2 text-xs text-red-200 bg-red-500/20 rounded px-2 py-1 ${
              compact ? "text-[10px]" : "text-xs"
            }`}
          >
            {quickBuyError}
          </div>
        )}
        <button
          onClick={handleQuickBuy}
          disabled={isQuickBuying || !isConnected}
          className={`inline-flex items-center gap-2 rounded-lg ${
            compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
          } font-semibold shadow-sm transition-all ${
            isQuickBuying
              ? "bg-gray-500 text-gray-300 cursor-not-allowed"
              : !isConnected
              ? "bg-gray-600 text-gray-400 cursor-not-allowed"
              : theme.quickBuy
          }`}
        >
          {isQuickBuying ? (
            <>
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Buying...
            </>
          ) : !isConnected ? (
            "Connect Wallet"
          ) : (
            "+ Quick buy 0.01"
          )}
        </button>
      </div>

      {/* Image on the right (vertically centered, fixed 146.2px square) */}
      <div
        className="absolute right-0 top-1/2 -translate-y-1/2"
        style={{ height: imgSize, width: imgSize }}
      >
        <div className="relative h-full w-full rounded-l-2xl overflow-hidden">
          <img
            src={token.image}
            alt={token.name}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
};

export default TokenCard;
