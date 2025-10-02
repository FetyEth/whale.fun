'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import TokenCard from '@/components/trade/tokenCard';
import { tokenDataService, type TokenData } from '@/lib/services/TokenDataService';

interface SimilarTokensProps {
  currentTokenAddress?: string;
  chainId?: number;
}

/**
 * Similar Tokens panel used on trade/[address] page
 * Replicates the Explore card UI with a horizontal list under a dark rounded panel.
 */
const SimilarTokens: React.FC<SimilarTokensProps> = ({ currentTokenAddress, chainId }) => {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const all = await tokenDataService.getAllTokensData(chainId);
        if (!mounted) return;
        // Exclude current token if present and take first 8 for the panel
        const filtered = all.filter(t => t.id.toLowerCase() !== (currentTokenAddress || '').toLowerCase());
        setTokens(filtered.slice(0, 8));
      } catch (e) {
        console.warn('Failed to fetch similar tokens', e);
        setTokens([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [currentTokenAddress, chainId]);

  const formattedTokens = useMemo(() => tokens.map(t => ({
    id: t.id,
    name: t.name,
    symbol: t.symbol,
    image: t.logoUrl,
    priceChange: t.priceChange,
    priceValue: t.priceValue,
    currentPrice: tokenDataService.formatCurrentPrice(t.currentPrice),
    marketCap: tokenDataService.formatMarketCap(t.marketCap),
    volume: `${tokenDataService.formatVolume(t.dailyVolume)} vol`,
    age: tokenDataService.formatLaunchTime(t.launchTime),
    isLive: t.isLive,
    isExternal: t.isExternal,
    chainId: t.chainId,
  })), [tokens]);

  // Update arrow visibility
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = () => {
      const left = el.scrollLeft;
      const max = el.scrollWidth - el.clientWidth;
      setCanLeft(left > 0);
      setCanRight(left < max - 1);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [formattedTokens.length]);

  const scrollByCards = (dir: 'left' | 'right') => {
    const el = scrollerRef.current;
    if (!el) return;
    const gap = 16; // Tailwind gap-4
    const child = el.querySelector<HTMLElement>('[data-card]');
    const cardW = child ? child.offsetWidth : 364; // TokenCard default width
    const delta = (cardW + gap) * 2; // scroll by two cards
    el.scrollBy({ left: dir === 'right' ? delta : -delta, behavior: 'smooth' });
  };

  return (
    <div className="rounded-2xl bg-[#2B2B2B] text-white border-none shadow-lg">
      <div className="px-6 pt-5 pb-3 mx-3">
        <div className="flex justify-between items-center min-h-[52px]">
          <div className="flex flex-col justify-center">
            <div className="text-2xl font-semibold">Similar Tokens</div>
            <div className="text-sm text-white/70 mt-1">Some other tokens that you might like</div>
          </div>
          <button className="text-sm text-white/70 hover:text-white/90">Show all</button>
        </div>
      </div>
      <div className="relative px-4 pb-4 mx-3">
        {loading ? (
          <div className="h-[200px] grid place-items-center text-white/60">Loading...</div>
        ) : formattedTokens.length === 0 ? (
          <div className="h-[120px] grid place-items-center text-white/60">No similar tokens found</div>
        ) : (
          <div className="relative">
            {/* Scroll container */}
            <div ref={scrollerRef} className="flex gap-4 overflow-x-auto no-scrollbar pb-2 pr-8">
              {formattedTokens.map((token, idx) => (
                <div key={token.id} className="shrink-0" data-card>
                  <TokenCard token={token as any} index={idx} compact />
                </div>
              ))}
            </div>

            {/* Left arrow */}
            {canLeft && (
              <button
                aria-label="Scroll left"
                onClick={() => scrollByCards('left')}
                className="absolute left-1 top-1/2 -translate-y-1/2 h-14 w-8 rounded-[14px] overflow-hidden z-10 grid place-items-center"
              >
                <span className="absolute inset-0 rounded-[14px] bg-[linear-gradient(180deg,#D9D9D9_0%,#5F5F5F_100%)] opacity-90" />
                <svg
                  className="relative z-10 h-3.5 w-3.5 -scale-x-100"
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M7 5l4 4-4 4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}

            {/* Right arrow */}
            {canRight && (
              <button
                aria-label="Scroll right"
                onClick={() => scrollByCards('right')}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-14 w-8 rounded-[14px] overflow-hidden z-10 grid place-items-center"
              >
                <span className="absolute inset-0 rounded-[14px] bg-[linear-gradient(180deg,#D9D9D9_0%,#5F5F5F_100%)] opacity-90" />
                <svg
                  className="relative z-10 h-3.5 w-3.5"
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M7 5l4 4-4 4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SimilarTokens;
