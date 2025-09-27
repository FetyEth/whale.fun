"use client";

import React, { useEffect, useRef } from "react";

/**
 * TradingView Advanced Chart embed as a React component.
 * Usage: <TradingViewChart symbol="BINANCE:ETHUSDT" height={420} />
 */
export default function TradingViewChart({ symbol = "BINANCE:ETHUSDT", height = 420, theme = "light" as "light" | "dark" }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clean previous embeds
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

    const config = {
      autosize: true,
      symbol,
      interval: "60",
      timezone: "Etc/UTC",
      theme,
      style: "1",
      locale: "en",
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: true,
      hide_volume: false,
      support_host: "https://www.tradingview.com",
    } as const;

    script.innerHTML = JSON.stringify(config);
    containerRef.current.appendChild(script);

    return () => {
      // Best-effort cleanup: remove child nodes to detach the widget
      try {
        if (containerRef.current) containerRef.current.innerHTML = "";
      } catch {}
    };
  }, [symbol, theme]);

  return (
    <div className="w-full" style={{ height }}>
      <div className="tradingview-widget-container" style={{ height: "100%" }}>
        <div className="tradingview-widget-container__widget" ref={containerRef} style={{ height: "100%" }} />
      </div>
    </div>
  );
}
