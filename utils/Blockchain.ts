import { ethers, Contract, Signer, Network } from "ethers";

declare global {
  interface Window {
    ethereum?: any;
  }
}

/**
 * Network configuration interface
 */
export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorerUrl: string;
}

/**
 * Contract deployment configuration
 */
export interface ContractDeployment {
  address: string;
  deployedAt: number;
  verified: boolean;
}

/**
 * Blockchain connection result
 */
export interface BlockchainConnection {
  provider: ethers.BrowserProvider;
  signer: Signer;
  network: Network;
  account: string;
}

/**
 * Contract instance result
 */
export interface ContractInstance<T = Contract> {
  contract: T;
  signer: Signer;
  network: Network;
  account: string;
}

/**
 * Supported networks configuration
 */
export const SUPPORTED_NETWORKS: Record<number, NetworkConfig> = {
  // Polygon Amoy Testnet
  80002: {
    chainId: 80002,
    name: "Polygon Amoy",
    rpcUrl:
      (process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC_URL as string) ||
      "https://rpc-amoy.polygon.technology", // fallback public RPC
    blockExplorerUrl: "https://amoy.polygonscan.com",
  },
  44787: {
    chainId: 44787,
    name: "Celo Alfajores",
    rpcUrl:
      (process.env.NEXT_PUBLIC_CELO_ALFAJORES_RPC_URL as string) ||
      "https://celo-alfajores.g.alchemy.com/v2/1BTCZ0n--PQOn68XlkU6pClh0vpdJMLb", // Alchemy RPC
    blockExplorerUrl: "https://alfajores.celoscan.io",
  },
  // Base Testnet (Base Sepolia)
  84532: {
    chainId: 84532,
    name: "Base Sepolia",
    rpcUrl:
      (process.env.NEXT_PUBLIC_BASE_TESTNET_RPC_URL as string) ||
      "https://sepolia.base.org", // fallback public RPC (lower reliability)
    blockExplorerUrl: "https://sepolia.basescan.org",
  },
  31: {
    chainId: 31,
    name: "Rootstock Testnet",
    rpcUrl:
      (process.env.NEXT_PUBLIC_ROOTSTOCK_TESTNET_RPC_URL as string) ||
      "https://public-node.testnet.rsk.co",
    blockExplorerUrl: "https://explorer.testnet.rsk.co",
  },
};

/**
 * Get blockchain provider and ensure wallet connection
 */
export const getBlockchainConnection =
  async (): Promise<BlockchainConnection> => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error(
        "MetaMask not found. Please install MetaMask to continue."
      );
    }

    try {
      // Initialize provider with ethers v6
      const provider = new ethers.BrowserProvider(window.ethereum);

      // Request wallet connection
      await provider.send("eth_requestAccounts", []);

      // Get signer and network info
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      const account = await signer.getAddress();

      return { provider, signer, network, account };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to connect to wallet: ${error.message}`);
      }
      throw new Error("Failed to connect to wallet: Unknown error");
    }
  };

/**
 * Check if current network is supported
 */
export const validateNetwork = (chainId: number): NetworkConfig => {
  const networkConfig = SUPPORTED_NETWORKS[chainId];
  if (!networkConfig) {
    throw new Error(
      `Unsupported network (Chain ID: ${chainId}). Please switch to a supported network.`
    );
  }
  return networkConfig;
};

/**
 * Get contract instance with proper typing
 */
export const getContractInstance = async <T = Contract>(
  contractAddress: string,
  contractABI: any,
  chainId?: number
): Promise<ContractInstance<T>> => {
  const connection = await getBlockchainConnection();
  const { signer, network, account } = connection;

  // Validate network if chainId is provided
  if (chainId && Number(network.chainId) !== chainId) {
    throw new Error(
      `Wrong network. Expected Chain ID: ${chainId}, Current: ${network.chainId}`
    );
  }

  // Validate network is supported
  validateNetwork(Number(network.chainId));

  // Create contract instance
  const contract = new ethers.Contract(
    contractAddress,
    contractABI,
    signer
  ) as T;

  return { contract, signer, network, account };
};

/**
 * Switch to a specific network
 */
export const switchNetwork = async (chainId: number): Promise<void> => {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask not found");
  }

  const networkConfig = SUPPORTED_NETWORKS[chainId];
  if (!networkConfig) {
    throw new Error(`Unsupported network: ${chainId}`);
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
  } catch (error: any) {
    // If network doesn't exist, add it
    if (error.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: `0x${chainId.toString(16)}`,
            chainName: networkConfig.name,
            rpcUrls: [networkConfig.rpcUrl],
            blockExplorerUrls: [networkConfig.blockExplorerUrl],
          },
        ],
      });
    } else {
      throw error;
    }
  }
};

/**
 * Format address for display (shows first 6 and last 4 characters)
 */
export const formatAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Wait for transaction confirmation
 */
export const waitForTransaction = async (
  txHash: string,
  confirmations: number = 1
): Promise<ethers.TransactionReceipt> => {
  const connection = await getBlockchainConnection();
  const receipt = await connection.provider.waitForTransaction(
    txHash,
    confirmations
  );

  if (!receipt) {
    throw new Error("Transaction failed or was not found");
  }

  return receipt;
};

/**
 * Get gas price estimation
 */
export const getGasPrice = async (): Promise<bigint> => {
  const connection = await getBlockchainConnection();
  return await connection.provider
    .getFeeData()
    .then((fee) => fee.gasPrice || BigInt(0));
};

/**
 * Estimate gas for a contract method
 */
export const estimateGas = async (
  contract: Contract,
  methodName: string,
  args: any[] = []
): Promise<bigint> => {
  try {
    return await contract[methodName].estimateGas(...args);
  } catch (error) {
    throw new Error(`Failed to estimate gas for ${methodName}: ${error}`);
  }
};
