"use client";
import "@rainbow-me/rainbowkit/styles.css";
import {
  getDefaultConfig,
  RainbowKitProvider,
  Chain,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ReactNode } from "react";
import { polygonAmoy } from "viem/chains";

// 0G Mainnet
const zeroGMainnet = {
  id: 16661,
  name: "0G Mainnet",
  iconUrl: "https://0g.ai/favicon.ico",
  iconBackground: "#fff",
  nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://evmrpc-mainnet.0g.ai"] },
  },
  blockExplorers: {
    default: { name: "0G Explorer", url: "https://chainscan.0g.ai" },
  },
} as const satisfies Chain;

// 0G Newton Testnet
const zeroGTestnet = {
  id: 16600,
  name: "0G Newton Testnet",
  iconUrl: "https://0g.ai/favicon.ico",
  iconBackground: "#fff",
  nativeCurrency: { name: "A0GI", symbol: "A0GI", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://evmrpc-testnet.0g.ai"] },
  },
  blockExplorers: {
    default: {
      name: "0G Testnet Explorer",
      url: "https://chainscan-testnet.0g.ai",
    },
  },
} as const satisfies Chain;

// Rootstock Mainnet
const rootstockMainnet = {
  id: 30,
  name: "Rootstock Mainnet",
  iconUrl: "https://rootstock.io/favicon.ico",
  iconBackground: "#fff",
  nativeCurrency: { name: "Smart Bitcoin", symbol: "RBTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://public-node.rsk.co"] },
  },
  blockExplorers: {
    default: { name: "RSK Explorer", url: "https://explorer.rsk.co" },
  },
} as const satisfies Chain;

// Rootstock Testnet
const rootstockTestnet = {
  id: 31,
  name: "Rootstock Testnet",
  iconUrl: "https://rootstock.io/favicon.ico",
  iconBackground: "#fff",
  nativeCurrency: { name: "Test Smart Bitcoin", symbol: "tRBTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://public-node.testnet.rsk.co"] },
  },
  blockExplorers: {
    default: {
      name: "RSK Testnet Explorer",
      url: "https://explorer.testnet.rsk.co",
    },
  },
} as const satisfies Chain;

// Citrea Testnet
const citreaTestnet = {
  id: 5115,
  name: "Citrea Testnet",
  iconUrl: "https://citrea.xyz/favicon.ico",
  iconBackground: "#fff",
  nativeCurrency: { name: "Citrea Bitcoin", symbol: "cBTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.citrea.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "Citrea Explorer",
      url: "https://explorer.testnet.citrea.xyz",
    },
  },
} as const satisfies Chain;

// Citrea Devnet (current development network - no mainnet yet)
const citreaDevnet = {
  id: 62298,
  name: "Citrea Devnet",
  iconUrl: "https://citrea.xyz/favicon.ico",
  iconBackground: "#fff",
  nativeCurrency: { name: "Citrea Bitcoin", symbol: "cBTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.devnet.citrea.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "Citrea Devnet Explorer",
      url: "https://explorer.devnet.citrea.xyz",
    },
  },
} as const satisfies Chain;

const config = getDefaultConfig({
  appName: "My RainbowKit App",
  projectId: "YOUR_PROJECT_ID",
  chains: [
    zeroGMainnet,
    zeroGTestnet,
    rootstockMainnet,
    rootstockTestnet,
    citreaTestnet,
    citreaDevnet,
    polygonAmoy,
  ],
  ssr: true,
});

const queryClient = new QueryClient();

export const ClientProvider = ({ children }: { children: ReactNode }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
