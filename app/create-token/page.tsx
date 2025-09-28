"use client";
import Header from "@/components/layout/Header";
import { useState, useEffect } from "react";
import type { FC, ChangeEvent, FormEvent } from "react";
import { tokenFactoryRootService } from "@/lib/services/TokenFactoryRootService";
import { parseEther, formatEther } from "ethers";
import {
  getBlockchainConnection,
  validateNetwork,
  switchNetwork,
  SUPPORTED_NETWORKS,
} from "@/utils/Blockchain";
import Link from "next/link";

interface InputFieldProps {
  label: string;
  id: string;
  placeholder: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  isTextArea?: boolean;
  maxLength?: number;
  infoText?: string;
}

const InputField: FC<InputFieldProps> = ({
  label,
  id,
  placeholder,
  value,
  onChange,
  isTextArea = false,
  maxLength,
  infoText,
}) => (
  <div>
    <label
      htmlFor={id}
      className="block text-sm font-medium text-gray-700 mb-1"
    >
      {label}
    </label>
    {isTextArea ? (
      <textarea
        id={id}
        name={id}
        rows={3}
        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-purple-500 focus:border-purple-500"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
      />
    ) : (
      <input
        type="text"
        id={id}
        name={id}
        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-purple-500 focus:border-purple-500"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    )}
    {infoText && <p className="text-xs text-gray-400 mt-1">{infoText}</p>}
  </div>
);

const CreatePage: FC = () => {
  const [formData, setFormData] = useState({
    tokenName: "",
    tokenSymbol: "",
    description: "",
    logoUrl: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isTokenCreated, setIsTokenCreated] = useState(false);
  const [createdTokenHash, setCreatedTokenHash] = useState<string | null>(null);
  const [creationCost, setCreationCost] = useState<{
    launchFee: bigint;
    liquidity: bigint;
    total: bigint;
  } | null>(null);
  const [currentNetwork, setCurrentNetwork] = useState<{
    chainId: number;
    name: string;
  } | null>(null);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Check network connection and validate
      const connection = await getBlockchainConnection();
      const chainId = Number(connection.network.chainId);

      try {
        validateNetwork(chainId);
      } catch (networkError) {
        const supportedNetworksList = Object.values(SUPPORTED_NETWORKS)
          .map((network) => `${network.name} (${network.chainId})`)
          .join(", ");

        throw new Error(
          `Unsupported network (Chain ID: ${chainId}). Please switch to one of the supported networks: ${supportedNetworksList}`
        );
      }

      // Check if contracts are deployed on this network
      console.log("Checking contract deployment for network:", chainId);
      console.log("Current network config:", currentNetwork);
      console.log(
        "Expected contract address for chain",
        chainId,
        ":",
        chainId === 44787
          ? "0x0bb4da9a543d0c8482843f49f80222f936310637"
          : "not configured"
      );

      try {
        console.log("Attempting to call getFactoryStats...");
        const factoryStats = await tokenFactoryRootService.getFactoryStats();
        console.log("✅ Factory stats:", factoryStats);
      } catch (contractError: any) {
        console.error("❌ Contract check failed:", contractError);
        console.error("Error details:", {
          message: contractError.message,
          code: contractError.code,
          chainId: chainId,
          networkName: currentNetwork?.name,
        });

        if (contractError.message.includes("could not decode result data")) {
          throw new Error(
            `Contract call failed on ${
              currentNetwork?.name || "current network"
            }. This might be due to RPC issues or wallet provider problems. Try refreshing the page or switching wallet networks.`
          );
        }
        throw contractError;
      }

      // Direct Viem call - use wallet provider for signing
      console.log("Making direct Viem call...");

      const { createWalletClient, createPublicClient, http, custom } =
        await import("viem");
      const {
        celoAlfajores,
        rootstock,
        rootstockTestnet,
        zeroG,
        zeroGGalileoTestnet,
      } = await import("viem/chains");

      // Create wallet client to get current chain dynamically
      const tempWalletClient = createWalletClient({
        transport: custom(window.ethereum),
      });

      const currentChainId = await tempWalletClient.getChainId();
      console.log("Current chain ID:", currentChainId);

      // Map chain ID to chain object and contract address
      const chainMap: Record<number, { chain: any; contractAddress: string }> =
        {
          31: {
            chain: rootstockTestnet,
            contractAddress: "0x2aa101937824aea2b88d8464e00cfa823573688a",
          },
          16602: {
            chain: {
              id: 16602,
              name: "0G Testnet",
              network: "0g-testnet",
              nativeCurrency: {
                decimals: 18,
                name: "0G",
                symbol: "0G",
              },
              rpcUrls: {
                default: {
                  http: ["https://evmrpc-testnet.0g.ai"],
                },
                public: {
                  http: ["https://evmrpc-testnet.0g.ai"],
                },
              },
              blockExplorers: {
                default: {
                  name: "0G Explorer",
                  url: "https://chainscan.0g.ai",
                },
              },
              testnet: true,
            },
            contractAddress: "0xb17f589b3dd10a05d4ef4ed1bdbe4cee8ec2da25",
          },
          // Add more chains as needed
        };

      const chainConfig = chainMap[currentChainId];
      if (!chainConfig) {
        throw new Error(
          `Unsupported chain ID: ${currentChainId}. Please switch to a supported network.`
        );
      }

      // Use wallet provider for signing with dynamic chain
      const walletClient = createWalletClient({
        chain: chainConfig.chain,
        transport: custom(window.ethereum),
      });

      // Get the connected wallet accounts
      const accounts = await walletClient.getAddresses();
      if (!accounts || accounts.length === 0) {
        throw new Error(
          "No wallet accounts found. Please connect your wallet."
        );
      }
      const account = accounts[0]; // Use the first connected account

      // Load contract ABI
      const TokenFactoryABI = (
        await import("@/config/abi/TokenFactoryRoot.json")
      ).default;

      const contractAddress = chainConfig.contractAddress as `0x${string}`;
      // Load current on-chain creation costs dynamically (launchFee + minInitialLiquidity)
      const dynamicCost = await tokenFactoryRootService.calculateCreationCost(
        undefined,
        currentChainId
      );
      const totalCost = dynamicCost.total;

      console.log("Direct contract call with params:", {
        account: account,
        name: formData.tokenName,
        symbol: formData.tokenSymbol.toUpperCase(),
        totalSupply: parseEther("1000000"), // 1M tokens in wei
        targetMarketCap: parseEther("0.1"),
        creatorFeePercent: BigInt(30),
        description: formData.description || "Token created via Whale.fun",
        logoUrl: formData.logoUrl || "https://example.com/logo.png",
        value: totalCost.toString(),
      });

      // Direct contract call using Viem
      const txHash = await walletClient.writeContract({
        account: account,
        address: contractAddress,
        abi: TokenFactoryABI,
        functionName: "createToken",
        args: [
          formData.tokenName,
          formData.tokenSymbol.toUpperCase(),
          parseEther("1000000"), // 1M tokens in wei
          parseEther("0.1"), // 0.1 CELO
          BigInt(30), // 30%
          formData.description || "Token created via Whale.fun",
          formData.logoUrl || "https://example.com/logo.png",
        ],
        value: totalCost,
        chain: chainConfig.chain,
      });

      console.log("Transaction hash:", txHash);

      // Wait for confirmation using public client
      const publicClient = createPublicClient({
        chain: chainConfig.chain,
        transport: http(),
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 60000,
      });

      console.log("Transaction confirmed:", receipt);

      if (receipt?.status === "success") {
        setSuccess(`Token created successfully! Transaction hash: ${txHash}`);
        setCreatedTokenHash(txHash);
        setIsTokenCreated(true);
        // Reset form data but keep it for potential reuse
        // setFormData({ ... }) - removed to keep data for success display
      } else {
        throw new Error("Transaction failed");
      }
    } catch (err: any) {
      console.error("Token creation error:", err);
      setError(err.message || "Failed to create token. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Load creation cost on component mount
  const loadCreationCost = async () => {
    try {
      const cost = await tokenFactoryRootService.calculateCreationCost();
      setCreationCost(cost);
    } catch (err) {
      console.error("Failed to load creation cost:", err);
    }
  };

  // Check current network
  const checkNetwork = async () => {
    try {
      const connection = await getBlockchainConnection();
      const chainId = Number(connection.network.chainId);
      const networkConfig = validateNetwork(chainId);
      setCurrentNetwork({ chainId, name: networkConfig.name });
    } catch (err) {
      console.log("Network check failed:", err);
      setCurrentNetwork(null);
    }
  };

  // Load cost and check network when component mounts
  useEffect(() => {
    loadCreationCost();
    checkNetwork();
  }, []);

  // Success message component
  const TokenCreatedMessage = () => (
    <div className="text-center p-8 border-2 border-dashed border-purple-200 rounded-2xl">
      <img
        src="/img/congrats.svg"
        alt="Token creation successful"
        className="mx-auto mb-6 h-24 w-24"
      />
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
        Token created
      </h2>
      <p className="text-gray-500 mt-2 max-w-sm mx-auto">
        Your token is live on-chain. Review the details and open your Launch
        Room.
      </p>
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          <strong>Token:</strong> {formData.tokenName} ({formData.tokenSymbol})
        </p>
        {createdTokenHash && (
          <p className="text-xs text-gray-500 mt-1">
            <strong>TX Hash:</strong> {createdTokenHash.slice(0, 10)}...
            {createdTokenHash.slice(-8)}
          </p>
        )}
      </div>
      <div className="flex items-center justify-center gap-4 mt-8">
        <Link
          href={`/trade/${createdTokenHash}`}
          type="button"
          className="px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
        >
          View token page
        </Link>
        <button
          type="button"
          className="px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
          onClick={() => {
            if (createdTokenHash && currentNetwork) {
              const networkConfig = SUPPORTED_NETWORKS[currentNetwork.chainId];
              if (networkConfig) {
                window.open(
                  `${networkConfig.blockExplorerUrl}/tx/${createdTokenHash}`,
                  "_blank"
                );
              }
            }
          }}
        >
          View on explorer
        </button>
      </div>
      <button
        type="button"
        className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline"
        onClick={() => {
          setIsTokenCreated(false);
          setCreatedTokenHash(null);
          setSuccess(null);
          setFormData({
            tokenName: "",
            tokenSymbol: "",
            description: "",
            logoUrl: "",
          });
        }}
      >
        Create another token
      </button>
    </div>
  );

  return (
    <main>
      <Header />
      <div className="flex items-center justify-center  w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] p-4">
        <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-sm max-w-4xl w-full mx-auto">
          {isTokenCreated ? (
            <TokenCreatedMessage />
          ) : (
            <>
              <div className="text-center mb-10">
                <h1 className="text-4xl sm:text-5xl font-bold text-purple-500">
                  Create your token
                </h1>
                <p className="text-gray-500 mt-2">
                  Set the basics, lock the rules, and preview your curve before
                  mint.
                </p>

                {creationCost && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Creation Cost:</strong>{" "}
                      {formatEther(creationCost.total)}{" "}
                      {currentNetwork?.chainId === 44787
                        ? "CELO"
                        : currentNetwork?.chainId === 16602
                        ? "0G"
                        : currentNetwork?.chainId === 31
                        ? "RBTC"
                        : "ETH"}
                      <br />
                      <span className="text-xs">
                        (Launch Fee: {formatEther(creationCost.launchFee)}{" "}
                        {currentNetwork?.chainId === 44787
                          ? "CELO"
                          : currentNetwork?.chainId === 16602
                          ? "0G"
                          : currentNetwork?.chainId === 31
                          ? "RBTC"
                          : "ETH"}{" "}
                        + Min Liquidity: {formatEther(creationCost.liquidity)}{" "}
                        {currentNetwork?.chainId === 44787
                          ? "CELO"
                          : currentNetwork?.chainId === 16602
                          ? "0G"
                          : currentNetwork?.chainId === 31
                          ? "RBTC"
                          : "ETH"}
                        )
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  {/* Logo Upload Section */}

                  {/* Basic Token Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField
                      label="Token name"
                      id="tokenName"
                      placeholder="e.g., Whale Wars"
                      value={formData.tokenName}
                      onChange={handleChange}
                    />
                    <InputField
                      label="Token symbol"
                      id="tokenSymbol"
                      placeholder="e.g., WHALE"
                      value={formData.tokenSymbol}
                      onChange={handleChange}
                    />
                  </div>

                  <InputField
                    label="Description"
                    id="description"
                    placeholder="What's the thesis, utility, or story?"
                    value={formData.description}
                    onChange={handleChange}
                    isTextArea
                    maxLength={280}
                    infoText="max 280 chars"
                  />
                  <InputField
                    label="Logo URL"
                    id="logoUrl"
                    placeholder="https://example.com/logo.png"
                    value={formData.logoUrl}
                    onChange={handleChange}
                    infoText="Direct link to your token logo image"
                  />
                </div>

                <div className="flex items-center justify-center gap-4 mt-8">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-8 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Creating Token..." : "Create token"}
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    className="px-8 py-3 bg-white text-gray-800 font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => {
                      setFormData({
                        tokenName: "",
                        tokenSymbol: "",
                        description: "",
                        logoUrl: "",
                      });
                      setError(null);
                      setSuccess(null);
                    }}
                  >
                    {isLoading ? "Processing..." : "Reset"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
};

export default CreatePage;
