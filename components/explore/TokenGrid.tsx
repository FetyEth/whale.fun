"use client"

import React from 'react'
import TokenCard from './TokenCard'
import { type TokenData, tokenDataService } from "@/lib/services/TokenDataService"

interface TokenGridProps {
  tokens: TokenData[]
}

const TokenGrid = ({ tokens }: TokenGridProps) => {
  // Convert TokenData to the format expected by TokenCard
  const formattedTokens = tokens.map((token) => ({
    id: token.id,
    name: token.name,
    symbol: token.symbol,
    image: token.logoUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iOCIgZmlsbD0iI0Y1RjVGNSIvPgo8dGV4dCB4PSIyNCIgeT0iMzAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZm9udC13ZWlnaHQ9ImJvbGQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2QjcyODAiPktJVFRPPC90ZXh0Pgo8L3N2Zz4K',
    priceChange: token.priceChange,
    priceValue: token.priceValue,
    currentPrice: tokenDataService.formatCurrentPrice(token.currentPrice),
    marketCap: tokenDataService.formatMarketCap(token.marketCap),
    volume: `${tokenDataService.formatVolume(token.dailyVolume)} vol`,
    age: tokenDataService.formatLaunchTime(token.launchTime),
    isLive: token.isLive
  }))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative ">
      {formattedTokens.map((token, idx) => (
        <TokenCard key={token.id} token={token} index={idx} />
      ))}
    </div>
  )
}

export default TokenGrid
