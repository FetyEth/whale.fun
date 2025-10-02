"use client";
import React, { useMemo } from "react";
import { useRouter } from "next/navigation";

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
}

const TokenCard = ({ token, index }: TokenCardProps) => {
  const router = useRouter();

  const handleCardClick = () => {
    if (token.isExternal) {
      router.push(`/trade/external/${token.id}`);
    } else {
      router.push(`/trade/${token.id}`);
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
    { // Blue
      bg: "#6EC2FF",
      heading: "text-white",
      text: "text-white/80",
      priceChange: token.priceChange.startsWith("-") ? "text-red-200" : "text-green-200",
      quickBuy: "bg-black/80 text-white hover:bg-black hover:cursor-pointer",
    },
    { // Purple
      bg: "#7962D9",
      heading: "text-white",
      text: "text-white/80",
      priceChange: token.priceChange.startsWith("-") ? "text-red-200" : "text-green-200",
      quickBuy: "bg-black/80 text-white hover:bg-black hover:cursor-pointer",
    },
    { // Beige
      bg: "linear-gradient(135deg, #E8DFD0, #AF9C82)",
      heading: "text-black",
      text: "text-black/70",
      priceChange: token.priceChange.startsWith("-") ? "text-red-600" : "text-green-600",
      quickBuy: "bg-black text-white hover:bg-gray-800 hover:cursor-pointer",
    },
    { // Grey
      bg: "#F3F4F6", // A light grey base
      heading: "text-black",
      text: "text-black/70",
      priceChange: token.priceChange.startsWith("-") ? "text-red-600" : "text-green-600",
      quickBuy: "bg-black text-white hover:bg-gray-800 hover:cursor-pointer",
    }
  ];

  const theme = themes[bgIndex];
  const overlayBg = `linear-gradient(0deg, rgba(0,0,0,0.28), rgba(0,0,0,0.28)), ${theme.bg}`;
  const headingClass = "text-white";
  const textClass = "text-white/80";
  const priceChangeClass = token.priceChange.startsWith("-") ? "text-red-200" : "text-green-200";

  return (
    <div
      style={{ background: overlayBg }}
      className="relative rounded-2xl p-5 shadow-md cursor-pointer transition-transform hover:scale-[1.01] flex flex-col justify-between h-[237px] w-[364px] overflow-hidden"
      onClick={handleCardClick}
    >
      {/* Content on the left */}
      <div className="flex-1 min-w-0 pr-[170px] z-10">
        <div className={`text-xl font-extrabold tracking-tight truncate ${headingClass}`}>${token.symbol.toUpperCase()}</div>
        <div className={`mt-1 text-sm/5 ${textClass}`}>Market Cap</div>
        <div className="mt-1 flex items-baseline gap-2">
          <div className={`text-2xl font-bold truncate ${headingClass}`}>{token.marketCap}</div>
          <div className={`text-sm font-medium ${priceChangeClass}`}>
            {token.priceChange}
          </div>
        </div>
        <button
          className={`mt-4 inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-4 ${textClass} hover:${headingClass}`}>
          View Token →
        </button>
      </div>

      {/* Quick Buy Button at the bottom */}
      <div className="mt-auto z-10">
        <button
          onClick={(e) => { e.stopPropagation(); }}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm ${theme.quickBuy}`}>
          + Quick buy 0.01
        </button>
      </div>

      {/* Image on the right (vertically centered, fixed 146.2px square) */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[150px] w-[150px]">
        <div className="relative h-full w-full rounded-l-2xl overflow-hidden">
          <img src={token.image} alt={token.name} className="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  );
};

export default TokenCard;
