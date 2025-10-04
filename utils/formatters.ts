/**
 * Utility functions for formatting numbers and currency values
 * Uses browser-native Intl.NumberFormat for better localization support
 */

import { formatEther } from "ethers";

/**
 * Formats numbers with K, M, B, T suffixes for large values
 * Preserves precision for smaller numbers
 * @param value - The number to format (can be number, bigint, or string)
 * @param options - Optional formatting options
 * @returns Formatted string with appropriate suffix
 */
export const formatNumber = (
  value: number | bigint | string,
  options: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    locale?: string;
  } = {}
): string => {
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    locale = "en-US",
  } = options;

  // Convert to number for consistent handling
  const num =
    typeof value === "bigint"
      ? Number(value)
      : typeof value === "string"
      ? parseFloat(value)
      : value;

  if (isNaN(num) || num === 0) return "0";

  const absNum = Math.abs(num);

  // For very small numbers (less than 0.01), show more decimal places
  if (absNum < 0.01 && absNum > 0) {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
      notation: "standard",
    }).format(num);
  }

  // For numbers less than 1000, use standard formatting
  if (absNum < 1000) {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits,
      maximumFractionDigits,
      notation: "standard",
    }).format(num);
  }

  // For larger numbers, use compact notation (K, M, B, T)
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    notation: "compact",
    compactDisplay: "short",
  }).format(num);
};

/**
 * Formats currency values with ETH suffix
 * @param value - The value to format (in wei as bigint or ETH as number)
 * @param options - Optional formatting options
 * @returns Formatted currency string with ETH suffix
 */
export const formatCurrency = (
  value: number | bigint,
  options: {
    currency?: string;
    showSymbol?: boolean;
    locale?: string;
  } = {}
): string => {
  const { currency = "ETH", showSymbol = true, locale = "en-US" } = options;

  const num = typeof value === "bigint" ? Number(value) : value;
  const formattedNumber = formatNumber(num, { locale });

  return showSymbol ? `${formattedNumber} ${currency}` : formattedNumber;
};

/**
 * Formats token balance with appropriate precision
 * @param balance - Token balance (can be bigint from contract or number)
 * @param decimals - Token decimals (default 18)
 * @param symbol - Token symbol to append
 * @returns Formatted balance string with symbol
 */
export const formatTokenBalance = (
  balance: number | bigint,
  decimals: number = 18,
  symbol: string = ""
): string => {
  let num: number;

  if (typeof balance === "bigint") {
    // Use formatEther for 18 decimals (standard), otherwise manual conversion
    if (decimals === 18) {
      // Use imported formatEther for standard token decimals
      num = Number(formatEther(balance));
    } else {
      // For non-standard decimals, convert carefully to avoid precision loss
      const divisor = BigInt(10 ** decimals);
      const wholePart = balance / divisor;
      const fractionalPart = balance % divisor;
      num = Number(wholePart) + Number(fractionalPart) / 10 ** decimals;
    }
  } else {
    num = balance;
  }

  const formattedNumber = formatNumber(num);
  return symbol ? `${formattedNumber} ${symbol}` : formattedNumber;
};

/**
 * Formats percentage values
 * @param value - The percentage value
 * @param options - Optional formatting options
 * @returns Formatted percentage string
 */
export const formatPercentage = (
  value: number,
  options: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    locale?: string;
  } = {}
): string => {
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    locale = "en-US",
  } = options;

  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value / 100);
};

/**
 * Formats large numbers for display in compact form
 * Useful for market cap, volume, etc.
 * @param value - The number to format
 * @returns Formatted string with K, M, B, T notation
 */
export const formatLargeNumber = (value: number | bigint): string => {
  return formatNumber(value, { maximumFractionDigits: 1 });
};
