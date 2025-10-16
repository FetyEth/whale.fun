"use client";

import React from "react";
import Image from "next/image";
import { Globe, Send, Twitter } from "lucide-react";
import { type TokenData } from "@/lib/services/TokenDataViemService";
import tokenDataService from "@/lib/services/TokenDataService";

interface TokenInfoCardProps {
  tokenData: TokenData | null;
}

const StatItem = ({ label, value }: { label: string; value: string }) => (
  <div className="text-center">
    <div className="text-xs text-gray-400">{label}</div>
    <div className="font-bold text-white">{value}</div>
  </div>
);

const TokenInfoCard: React.FC<TokenInfoCardProps> = ({ tokenData }) => {
  if (!tokenData) return null;

  return (
    <div className="bg-gray-900 text-white rounded-2xl p-4 space-y-4">
      <div className="relative aspect-square w-full rounded-lg overflow-hidden">
        <Image
          src={
            tokenData.logoUrl ||
            "https://purple-voluntary-minnow-145.mypinata.cloud/ipfs/bafkreiadbzvwwngz3kvk5ut75gdzlbpklxokyacpysotogltergnkhx7um"
          }
          alt={tokenData.name}
          layout="fill"
          objectFit="cover"
        />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold">${tokenData.symbol}</h2>
        <p className="text-xs text-gray-400 truncate">
          CA: {tokenData.creator}
        </p>
        <p className="text-sm text-gray-300">
          {tokenData.description || "Launch and trade the hottest coins on 0G."}
        </p>
      </div>

      <div className="flex items-center space-x-4">
        {tokenData.website && (
          <a
            href={tokenData.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white"
          >
            <Globe className="w-5 h-5" />
          </a>
        )}
        {tokenData.telegram && (
          <a
            href={tokenData.telegram}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white"
          >
            <Send className="w-5 h-5" />
          </a>
        )}
        {tokenData.twitter && (
          <a
            href={tokenData.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white"
          >
            <Twitter className="w-5 h-5" />
          </a>
        )}
      </div>

      <div className="bg-gray-800 rounded-lg p-3">
        <div className="flex justify-around">
          <StatItem
            label="Coin Stats"
            value={tokenDataService.formatMarketCap(tokenData.marketCap)}
          />
          <StatItem
            label="24h"
            value={tokenDataService.formatVolume(tokenData.dailyVolume)}
          />
          <StatItem label="Holders" value={tokenData.holderCount.toString()} />
        </div>
      </div>
    </div>
  );
};

export default TokenInfoCard;
