"use client"

import React from 'react'
import { useRouter } from 'next/navigation'

interface TokenCardProps {
  token: {
    id: string
    name: string
    symbol: string
    image: string
    priceChange: string
    priceValue: string
    marketCap: string
    volume: string
    age: string
    isLive?: boolean
  }
}

const TokenCard = ({ token }: TokenCardProps) => {
  const router = useRouter()

  const handleCardClick = () => {
    router.push(`/trade/${token.id}`)
  }

  const handleViewTokenClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click when clicking the button
    router.push(`/trade/${token.id}`)
  }

  return (
    <div 
      onClick={handleCardClick}
      className="border-2 border-dashed border-purple-200 rounded-xl p-5 bg-stone-50 hover:border-purple-300 transition-colors cursor-pointer shadow-sm"
    >
      {/* Top Section: Image on left, Name and Price boxes on right */}
      <div className="flex items-start justify-between mb-4">
        {/* Token Image - Left side with LIVE badge overlay */}
        <div className="relative w-1/2 max-w-[110px] h-20 rounded-lg bg-stone-50 flex items-center justify-center overflow-hidden flex-shrink-0">
          <img 
            src={token.image} 
            alt={token.name}
            className="w-full h-[120px] max-w-[150px] rounded-lg object-cover"
          />
          {token.isLive && (
            <span className="absolute bottom-0 left-0 bg-green-500 text-white text-xs px-2 py-0.5 rounded-bl-lg rounded-tr-lg font-medium">
              LIVE
            </span>
          )}
        </div>
        
        {/* Right side content */}
        <div className="flex flex-col items-center">
          {/* Token Name */}
          <div className="mb-2">
            <span className=" text-[#B65FFF] text-[18px] font-bold">{token.name}</span>
          </div>

          {/* Price Information - Stacked vertically */}
          <div className="flex flex-col gap-1">
            <div className="bg-purple-200 text-purple-900 px-3 py-1 rounded-lg text-sm font-medium w-fit">
              {token.priceChange}
            </div>
            <div className="bg-gray-900 text-white px-3 py-1 rounded-lg text-sm font-medium w-fit">
              {token.priceValue}
            </div>
          </div>
        </div>
      </div>

      {/* Market Cap */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-3">
         <div>
         <span className="text-md font-medium text-black">Market Cap: </span>
         </div>
         <div>
         {token.marketCap}
         </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: '60%' }}></div>
          </div>
          <div className="text-green-600 text-md font-medium whitespace-nowrap">{token.volume} vol</div>
        </div>
      </div>

      {/* Volume */}
    

      {/* Age and View Token */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1 text-md  text-gray-500">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {token.age}
        </div>
       
      </div>

      <div>
      <button 
        onClick={handleViewTokenClick}
        className="text-purple-600 text-md font-semibold hover:text-purple-700 transition-colors"
      >
          View Token →
        </button>
      </div>
    </div>
  )
}

export default TokenCard
