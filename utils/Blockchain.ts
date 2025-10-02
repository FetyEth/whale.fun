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
  currencySymbol: string;
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
  // 0G Network
  16602: {
    chainId: 16602,
    name: "0G Testnet Network",
    rpcUrl:
      (process.env.NEXT_PUBLIC_0G_RPC_URL as string) ||
      "https://evmrpc-testnet.0g.ai", // 0G testnet RPC
    blockExplorerUrl: "https://chainscan.0g.ai",
    currencySymbol: "0G",
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
