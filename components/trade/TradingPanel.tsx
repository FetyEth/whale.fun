"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createCreatorTokenViemService } from "@/lib/services/CreatorTokenViemService";

// Helper functions for Wei/Ether conversions (BigInt safe)
const parseEther = (value: string): bigint => {
  if (!value) return BigInt(0);
  const [whole, frac = ""] = value.split(".");
  const wholeWei = BigInt(whole || "0") * BigInt(10) ** BigInt(18);
  const fracPadded = (frac + "0".repeat(18)).slice(0, 18);
  const fracWei = BigInt(fracPadded || "0");
  return wholeWei + fracWei;
};

const formatEther = (value: bigint): string => {
  const negative = value < BigInt(0);
  const v = negative ? -value : value;
  const whole = v / BigInt(10) ** BigInt(18);
  const frac = v % BigInt(10) ** BigInt(18);
  // Show up to 6 decimals, trimmed
  const fracStr = frac
    .toString()
    .padStart(18, "0")
    .slice(0, 6)
    .replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole.toString()}${
    fracStr ? "." + fracStr : ""
  }`;
};

interface TradingPanelProps {
  tokenAddress: string;
  tokenSymbol: string;
  userBalance: string;
  onTradeSuccess?: () => void;
}

const TradingPanel = ({
  tokenAddress,
  tokenSymbol,
  userBalance,
  onTradeSuccess,
}: TradingPanelProps) => {
  const [tradeMode, setTradeMode] = useState<"Buy" | "Sell">("Buy");
  const [amount, setAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState<string>("0");
  const [estimatedProceeds, setEstimatedProceeds] = useState<string>("0");
  const [estimatedCostWei, setEstimatedCostWei] = useState<bigint>(BigInt(0));
  const [estimatedProceedsWei, setEstimatedProceedsWei] = useState<bigint>(
    BigInt(0)
  );

  // Update estimates when amount changes
  useEffect(() => {
    if (amount && !isNaN(Number(amount)) && Number(amount) > 0) {
      updateEstimates();
    } else {
      setEstimatedCost("0");
      setEstimatedProceeds("0");
      setEstimatedCostWei(BigInt(0));
      setEstimatedProceedsWei(BigInt(0));
    }
  }, [amount, tradeMode]);

  const updateEstimates = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;

    try {
      // Convert token amount to Wei (tokens have 18 decimals)
      const tokenAmount = parseEther(amount);
      const service = createCreatorTokenViemService(tokenAddress);

      console.log("tradeMode", tradeMode);
      console.log("amount (string):", amount);
      console.log("tokenAmount (Wei):", tokenAmount.toString());

      if (tradeMode === "Buy") {
        console.log("calculating buy cost");
        // calculateBuyCost returns the cost in Wei (ETH)
        const costInWei = await service.calculateBuyCost(tokenAmount);
        console.log("costInWei:", costInWei.toString());
        const costInEth = formatEther(costInWei as unknown as bigint);
        console.log("costInEth:", costInEth);
        setEstimatedCost(costInEth);
        setEstimatedCostWei(costInWei as unknown as bigint);
      } else {
        console.log("calculating sell price");
        // calculateSellPrice returns the proceeds in Wei (ETH)
        const proceedsInWei = await service.calculateSellPrice(tokenAmount);
        console.log("proceedsInWei:", proceedsInWei.toString());
        const proceedsInEth = formatEther(proceedsInWei as unknown as bigint);
        console.log("proceedsInEth:", proceedsInEth);
        setEstimatedProceeds(proceedsInEth);
        setEstimatedProceedsWei(proceedsInWei as unknown as bigint);
      }
    } catch (err) {
      console.error("Error calculating estimates:", err);
      setEstimatedCost("0");
      setEstimatedProceeds("0");
      setEstimatedCostWei(BigInt(0));
      setEstimatedProceedsWei(BigInt(0));
    }
  };

  const handleTrade = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;

    try {
      setIsProcessing(true);
      // Convert token amount to Wei (tokens have 18 decimals)
      const tokenAmount = parseEther(amount);
      const service = createCreatorTokenViemService(tokenAddress);

      if (tradeMode === "Buy") {
        // Use cached wei estimate to avoid precision loss
        const costInWei =
          estimatedCostWei > BigInt(0)
            ? estimatedCostWei
            : parseEther(estimatedCost);
        console.log("Executing buy:");
        console.log("- Token amount (Wei):", tokenAmount.toString());
        console.log("- Cost (Wei):", costInWei.toString());
        console.log("- Cost (ETH):", estimatedCost);

        const txHash = await service.buyTokens(tokenAmount, costInWei);
        console.log("Buy transaction hash:", txHash);

        // Wait for transaction confirmation
        const receipt = await service.waitForTransaction(txHash);
        console.log("Buy transaction confirmed:", receipt);
      } else {
        console.log("Executing sell:");
        console.log("- Token amount (Wei):", tokenAmount.toString());
        console.log("- Token amount (tokens):", amount);

        const txHash = await service.sellTokens(tokenAmount);
        console.log("Sell transaction hash:", txHash);

        // Wait for transaction confirmation
        const receipt = await service.waitForTransaction(txHash);
        console.log("Sell transaction confirmed:", receipt);
      }

      // Reset form and notify parent
      setAmount("");
      onTradeSuccess?.();
    } catch (err: any) {
      console.error("Trade error:", err);
      alert(err.message || "Trade failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const parsedAmount = Number(amount || 0);
  const canTrade = amount && parsedAmount > 0 && !isProcessing;

  const presetAmounts = [0.1, 0.5, 1, 5];

  return (
    <div className="space-y-4">
      {/* Trade Mode Toggle */}
      <Card className="border-gray-200">
        <CardContent className="p-5">
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setTradeMode("Buy")}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                tradeMode === "Buy"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setTradeMode("Sell")}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                tradeMode === "Sell"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Sell
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Trading Panel */}
      <Card className="border-gray-200">
        <CardContent className="p-5">
          <div className="space-y-4">
            {/* Price display */}
            <div className="flex items-center justify-between">
              <div className="text-2xl font-semibold text-gray-900">
                {tradeMode === "Buy" ? "Cost:" : "You'll receive:"}
              </div>
              <div className="text-2xl font-semibold text-gray-400">
                {tradeMode === "Buy"
                  ? `${estimatedCost} ETH`
                  : `${estimatedProceeds} ETH`}
              </div>
            </div>

            {/* Amount field */}
            <div
              className="border rounded-xl px-4 py-3 flex items-center justify-between bg-white"
              style={{ borderColor: "#0000001A" }}
            >
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent outline-none text-2xl font-medium placeholder:text-gray-400"
              />
              <span className="ml-3 text-lg font-medium text-gray-600">
                {tokenSymbol}
              </span>
            </div>

            {/* Preset amounts */}
            <div className="flex items-center gap-2 flex-nowrap overflow-x-auto">
              <button
                onClick={() => setAmount("")}
                className="px-3 py-1 rounded-full bg-white text-gray-800 border shadow-sm text-sm"
                style={{ borderColor: "#0000001A" }}
              >
                Reset
              </button>
              {presetAmounts.map((val, i) => (
                <button
                  key={i}
                  onClick={() => setAmount(String(val))}
                  className="px-3 py-1 rounded-full bg-white text-gray-800 border shadow-sm text-sm"
                  style={{ borderColor: "#0000001A" }}
                >
                  {val}
                </button>
              ))}
              <button
                onClick={() => setAmount(userBalance)}
                className="px-3 py-1 rounded-full bg-white text-gray-800 border shadow-sm text-sm"
                style={{ borderColor: "#0000001A" }}
              >
                Max
              </button>
            </div>

            {/* Trade button */}
            <Button
              disabled={!canTrade}
              onClick={handleTrade}
              className={`w-full h-12 rounded-2xl text-lg font-semibold text-white ${
                !canTrade
                  ? "bg-black/60 cursor-not-allowed"
                  : "bg-black hover:bg-black/90"
              }`}
            >
              {isProcessing ? "Processing..." : `${tradeMode} ${tokenSymbol}`}
            </Button>

            {/* Balance info */}
            <div className="text-center text-sm text-gray-500">
              Your balance: {userBalance} {tokenSymbol}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TradingPanel;
