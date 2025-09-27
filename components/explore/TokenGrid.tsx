"use client"

import React from 'react'
import TokenCard from './TokenCard'

// Sample token data based on the image
const sampleTokens = [
  {
    id: '1',
    name: 'WHALE',
    symbol: 'WHALE',
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iOCIgZmlsbD0iI0Y1RjVGNSIvPgo8dGV4dCB4PSIyNCIgeT0iMzAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZm9udC13ZWlnaHQ9ImJvbGQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2QjcyODAiPktJVFRPPC90ZXh0Pgo8L3N2Zz4K',
    priceChange: '+ 22.7%',
    priceValue: '+ 0.01',
    marketCap: '$56.9k',
    volume: '18%',
    age: '2 days ago',
    isLive: true
  },
  {
    id: '2',
    name: 'KRCOIN',
    symbol: 'KRCOIN',
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iOCIgZmlsbD0iI0ZGRkZGRiIvPgo8cGF0aCBkPSJNMjQgOEwyOCAxNkwyNCAyNEwyMCAxNloiIGZpbGw9IiNGRjAwMDAiLz4KPHBhdGggZD0iTTI0IDI0TDI4IDMyTDI0IDQwTDIwIDMyWiIgZmlsbD0iI0ZGRkYwMCIvPgo8L3N2Zz4K',
    priceChange: '+ 15.3%',
    priceValue: '+ 0.02',
    marketCap: '$42.1k',
    volume: '12%',
    age: '1 day ago',
    isLive: true
  },
  {
    id: '3',
    name: 'WHALE',
    symbol: 'WHALE',
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iOCIgZmlsbD0iI0Y1RjVGNSIvPgo8dGV4dCB4PSIyNCIgeT0iMzAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZm9udC13ZWlnaHQ9ImJvbGQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2QjcyODAiPktJVFRPPC90ZXh0Pgo8L3N2Zz4K',
    priceChange: '+ 18.9%',
    priceValue: '+ 0.03',
    marketCap: '$78.5k',
    volume: '25%',
    age: '3 days ago',
    isLive: true
  },
  {
    id: '4',
    name: 'WHALE',
    symbol: 'WHALE',
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iOCIgZmlsbD0iI0ZGRkZGRiIvPgo8Y2lyY2xlIGN4PSIyNCIgY3k9IjE2IiByPSI4IiBmaWxsPSIjMzMzMzMzIi8+CjxjaXJjbGUgY3g9IjI0IiBjeT0iMzIiIHI9IjgiIGZpbGw9IiMzMzMzMzMiLz4KPHBhdGggZD0iTTE2IDI0QzE2IDI4IDIwIDMyIDI0IDMyUzMyIDI4IDMyIDI0UzI4IDE2IDI0IDE2UzE2IDIwIDE2IDI0WiIgZmlsbD0iIzMzMzMzMyIvPgo8L3N2Zz4K',
    priceChange: '+ 31.2%',
    priceValue: '+ 0.04',
    marketCap: '$95.2k',
    volume: '32%',
    age: '5 days ago',
    isLive: true
  },
  {
    id: '5',
    name: 'WHALE',
    symbol: 'WHALE',
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iOCIgZmlsbD0iI0ZGRkZGRiIvPgo8Y2lyY2xlIGN4PSIyNCIgY3k9IjE2IiByPSI4IiBmaWxsPSIjMzMzMzMzIi8+CjxjaXJjbGUgY3g9IjI0IiBjeT0iMzIiIHI9IjgiIGZpbGw9IiMzMzMzMzMiLz4KPHBhdGggZD0iTTE2IDI0QzE2IDI4IDIwIDMyIDI0IDMyUzMyIDI4IDMyIDI0UzI4IDE2IDI0IDE2UzE2IDIwIDE2IDI0WiIgZmlsbD0iIzMzMzMzMyIvPgo8L3N2Zz4K',
    priceChange: '+ 12.4%',
    priceValue: '+ 0.02',
    marketCap: '$33.7k',
    volume: '8%',
    age: '1 day ago',
    isLive: true
  },
  {
    id: '6',
    name: 'WHALE',
    symbol: 'WHALE',
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iOCIgZmlsbD0iI0Y1RjVGNSIvPgo8dGV4dCB4PSIyNCIgeT0iMzAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZm9udC13ZWlnaHQ9ImJvbGQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2QjcyODAiPktJVFRPPC90ZXh0Pgo8L3N2Zz4K',
    priceChange: '+ 27.6%',
    priceValue: '+ 0.05',
    marketCap: '$67.8k',
    volume: '21%',
    age: '4 days ago',
    isLive: true
  }
]

const TokenGrid = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
      {sampleTokens.map((token) => (
        <TokenCard key={token.id} token={token} />
      ))}
    </div>
  )
}

export default TokenGrid
