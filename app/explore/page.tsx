"use client"

import React from 'react'
import Header from "@/components/layout/Header";
import SearchAndFilter from "@/components/explore/SearchAndFilter";
import CreateTokenButton from "@/components/explore/CreateTokenButton";
import TokenGrid from "@/components/explore/TokenGrid";

const ExplorePage = () => {
  return (
    <div className="min-h-screen bg-white relative">
      <Header />
      
      {/* Main content with dotted background */}
      <div className="px-20 py-8 relative">
        {/* Dotted grid background */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle, #d1d5db 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }}
        />
        
        {/* Search and Filter Section */}
        <div className="flex items-center justify-between mb-8 relative z-10">
          <SearchAndFilter />
          <CreateTokenButton />
        </div>
        
        {/* Token Grid */}
        <TokenGrid />
      </div>
    </div>
  )
}

export default ExplorePage