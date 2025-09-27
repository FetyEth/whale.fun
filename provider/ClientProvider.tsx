"use client";
import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ReactNode } from "react";
import {
  celoAlfajores,
  rootstock,
  rootstockTestnet,
  zeroG,
  zeroGGalileoTestnet,
} from "viem/chains";

const config = getDefaultConfig({
  appName: "My RainbowKit App",
  projectId: "YOUR_PROJECT_ID",
  chains: [
    zeroG,
    zeroGGalileoTestnet,
    rootstock,
    rootstockTestnet,
    celoAlfajores,
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
