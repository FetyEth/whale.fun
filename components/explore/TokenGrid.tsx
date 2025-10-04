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
    image:
      token.logoUrl ||
      'https://ipfs.io/ipfs/bafkreiadbzvwwngz3kvk5ut75gdzlbpklxokyacpysotogltergnkhx7um',
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
