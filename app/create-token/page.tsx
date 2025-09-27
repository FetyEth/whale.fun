"use client";
import Header from "@/components/layout/Header";
import { useState, useEffect } from "react";
import type { FC, ChangeEvent, FormEvent } from "react";
import { tokenFactoryRootService } from "@/lib/services/TokenFactoryRootService";
import type { TokenCreationParams } from "@/lib/services/TokenFactoryRootService";
import { parseEther, formatEther } from "ethers";

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
    totalSupply: "",
    targetMarketCap: "",
    creatorFee: "",
    logoUrl: "",
    communitySize: "",
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
      // Validate form data and parse numbers appropriately
      // Use much smaller default values to avoid overflow
      const totalSupplyInput = formData.totalSupply || "1000";
      const marketCapInput = formData.targetMarketCap || "1";
      
      const tokenParams: TokenCreationParams = {
        name: formData.tokenName,
        symbol: formData.tokenSymbol.toUpperCase(),
        // Use smaller numbers - parse as raw BigInt first
        totalSupply: BigInt(parseInt(totalSupplyInput.replace(/,/g, ''))),
        // Use smaller market cap
        targetMarketCap: parseEther(marketCapInput),
        creatorFeePercent: BigInt(parseInt(formData.creatorFee) || 50),
        description: formData.description,
        logoUrl: formData.logoUrl,
      };

      console.log("Token params:", {
        name: tokenParams.name,
        symbol: tokenParams.symbol,
        totalSupply: tokenParams.totalSupply.toString(),
        targetMarketCap: tokenParams.targetMarketCap.toString(),
        creatorFeePercent: tokenParams.creatorFeePercent.toString(),
      });

      // Validate parameters using service validation
      const validation = tokenFactoryRootService.validateTokenParams(tokenParams);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
      }

      // Check if user can create token
      const currentAccount = await tokenFactoryRootService.getCurrentAccount();
      const canCreate = await tokenFactoryRootService.canCreatorCreateToken(currentAccount);
      if (!canCreate) {
        const creatorStats = await tokenFactoryRootService.getCreatorStats(currentAccount);
        if (creatorStats.cooldownRemaining > BigInt(0)) {
          throw new Error(`Creation cooldown active. Please wait ${creatorStats.cooldownRemaining} seconds.`);
        } else {
          throw new Error("Maximum tokens per creator limit reached.");
        }
      }

      // Create the token
      const tx = await tokenFactoryRootService.createToken(tokenParams);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      if (receipt?.status === 1) {
        setSuccess(`Token created successfully! Transaction hash: ${tx.hash}`);
        setCreatedTokenHash(tx.hash);
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

  // Load cost when component mounts
  useEffect(() => {
    loadCreationCost();
  }, []);

  // Success message component
  const TokenCreatedMessage = () => (
    <div className="text-center p-8 border-2 border-dashed border-purple-200 rounded-2xl">
      <div className="mx-auto mb-6 h-24 w-24 bg-green-100 rounded-full flex items-center justify-center">
        <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Token created</h2>
      <p className="text-gray-500 mt-2 max-w-sm mx-auto">
        Your token is live on-chain. Review the details and open your Launch Room.
      </p>
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          <strong>Token:</strong> {formData.tokenName} ({formData.tokenSymbol})
        </p>
        {createdTokenHash && (
          <p className="text-xs text-gray-500 mt-1">
            <strong>TX Hash:</strong> {createdTokenHash.slice(0, 10)}...{createdTokenHash.slice(-8)}
          </p>
        )}
      </div>
      <div className="flex items-center justify-center gap-4 mt-8">
        <button
          type="button"
          className="px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
          onClick={() => {
            // Navigate to token page - you can implement this
            console.log('Navigate to token page');
          }}
        >
          View token page
        </button>
        <button
          type="button"
          className="px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
          onClick={() => {
            if (createdTokenHash) {
              window.open(`https://amoy.polygonscan.com/tx/${createdTokenHash}`, '_blank');
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
            totalSupply: "",
            targetMarketCap: "",
            creatorFee: "",
            logoUrl: "",
            communitySize: "",
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
      <div className="flex items-center justify-center min-h-screen w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] p-4">
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
                      <strong>Creation Cost:</strong> {formatEther(creationCost.total)} ETH
                      <br />
                      <span className="text-xs">
                        (Launch Fee: {formatEther(creationCost.launchFee)} ETH + 
                        Min Liquidity: {formatEther(creationCost.liquidity)} ETH)
                      </span>
                    </p>
                  </div>
                )}
                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
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
                label="Total supply"
                id="totalSupply"
                placeholder="e.g., 1000"
                value={formData.totalSupply}
                onChange={handleChange}
                infoText="Number of tokens (start small, e.g., 1000)"
              />
              <InputField
                label="Target market cap (ETH)"
                id="targetMarketCap"
                placeholder="e.g., 1"
                value={formData.targetMarketCap}
                onChange={handleChange}
                infoText="Target market cap in ETH (start small, e.g., 1 ETH)"
              />
              <InputField
                label="Creator fee percent"
                id="creatorFee"
                placeholder="e.g., 50"
                value={formData.creatorFee}
                onChange={handleChange}
                infoText="Fee percentage (30-95%)"
              />
              <InputField
                label="Logo URL"
                id="logoUrl"
                placeholder="https://.../logo.png"
                value={formData.logoUrl}
                onChange={handleChange}
              />
              <InputField
                label="Community size (optional)"
                id="communitySize"
                placeholder="e.g., 12,500"
                value={formData.communitySize}
                onChange={handleChange}
              />
            </div>

            <div className="flex items-center justify-center gap-4 mt-10">
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
                    totalSupply: "",
                    targetMarketCap: "",
                    creatorFee: "",
                    logoUrl: "",
                    communitySize: "",
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
