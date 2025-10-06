import { Chain } from "viem";

export interface ChainConfig {
  id: number;
  name: string;
  network: string;
  nativeCurrency: {
    decimals: number;
    name: string;
    symbol: string;
  };
  rpcUrls: {
    default: { http: string[] };
    public: { http: string[] };
  };
  blockExplorers: {
    default: { name: string; url: string };
  };
  testnet?: boolean;
  contracts?: {
    tokenFactory?: string;
    [key: string]: string | undefined;
  };
}

export const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  16602: {
    id: 16602,
    name: "0G Testnet Network",
    network: "0g-testnet",
    nativeCurrency: {
      decimals: 18,
      name: "0G",
      symbol: "0G",
    },
    rpcUrls: {
      default: { http: ["https://evmrpc-testnet.0g.ai"] },
      public: { http: ["https://evmrpc-testnet.0g.ai"] },
    },
    blockExplorers: {
      default: {
        name: "0G Explorer",
        url: "https://chainscan-galileo.0g.ai",
      },
    },
    testnet: true,
    contracts: {
      tokenFactory: "0xb17f589b3dd10a05d4ef4ed1bdbe4cee8ec2da25",
    },
  },
};

export const getSupportedChains = (): Chain[] => {
  return Object.values(SUPPORTED_CHAINS).map((config) => ({
    id: config.id,
    name: config.name,
    network: config.network,
    nativeCurrency: config.nativeCurrency,
    rpcUrls: config.rpcUrls,
    blockExplorers: config.blockExplorers,
    testnet: config.testnet,
  })) as Chain[];
};

export const getChainConfig = (chainId: number): ChainConfig | null => {
  return SUPPORTED_CHAINS[chainId] || null;
};

export const getContractAddress = (
  chainId: number,
  contractName: string
): string | null => {
  const config = getChainConfig(chainId);
  return config?.contracts?.[contractName] || null;
};

export const isChainSupported = (chainId: number): boolean => {
  return chainId in SUPPORTED_CHAINS;
};

export const getDefaultChain = (): ChainConfig => {
  return SUPPORTED_CHAINS[16602];
};
