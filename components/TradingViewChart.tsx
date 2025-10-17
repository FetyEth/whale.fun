"use client";

import React, { useEffect, useRef } from "react";

/**
 * TradingView Advanced Chart embed as a React component.
 * Enhanced for crypto trading view with professional trading UI
 * Usage: <TradingViewChart symbol="0GNETWORK:TOKEN_ETH" height={420} />
 */
export default function TradingViewChart({
  symbol = "BINANCE:ETHUSDT",
  height = 420,
  theme = "dark" as "light" | "dark",
  interval = "60", // Default to 1h candles
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Store the ref value in a variable to avoid lint warning
    const container = containerRef.current;

    // Clean previous embeds
    container.innerHTML = "";

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

    const config = {
      autosize: true,
      symbol,
      interval,
      timezone: "Etc/UTC",
      theme,
      style: "1", // Candles
      locale: "en",
      enable_publishing: false,
      withdateranges: true,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: "https://www.tradingview.com",
      toolbar_bg: theme === "dark" ? "#2B2B2B" : "#f1f3f6",
      studies: [
        "Volume@tv-basicstudies",
        "VWAP@tv-basicstudies",
        "MASimple@tv-basicstudies",
      ],
      show_popup_button: true,
      popup_width: "1000",
      popup_height: "650",
      container_id: `tradingview_chart_${symbol.replace(/[^a-zA-Z0-9]/g, "_")}`,
    } as const;

    script.innerHTML = JSON.stringify(config);
    container.appendChild(script);

    return () => {
      // Best-effort cleanup: remove child nodes to detach the widget
      try {
        container.innerHTML = "";
      } catch {}
    };
  }, [symbol, theme, interval]);

  return (
    <div className="w-full rounded-xl overflow-hidden" style={{ height }}>
      <div className="tradingview-widget-container" style={{ height: "100%" }}>
        <div
          id={`tradingview_chart_${symbol.replace(/[^a-zA-Z0-9]/g, "_")}`}
          className="tradingview-widget-container__widget"
          ref={containerRef}
          style={{ height: "100%" }}
        />
      </div>
    </div>
  );
}
