import {
  createWalletClient,
  createPublicClient,
  http,
  getContract,
  parseEther,
} from "viem";
import { celoAlfajores } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import hre from "hardhat";

async function testTokenCreation() {
  console.log("🧪 Testing Token Creation Flow on Celo Alfajores...\n");

  const privateKey = "0x9f55a656f73b257dc970624b558e56c2c78bc07a793edf95fa614f4f4a7f22ae";
  const rpcUrl = "https://alfajores-forno.celo-testnet.org";
  const contractAddress = "0xecc8a625a4b9b470debf7d3b0709755693d3a64a";

  // Create account and clients
  const account = privateKeyToAccount(privateKey);
  console.log("Test account:", account.address);

  const publicClient = createPublicClient({
    chain: celoAlfajores,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: celoAlfajores,
    transport: http(rpcUrl),
  });

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log("Account balance:", (Number(balance) / 1e18).toFixed(4), "CELO");

  if (balance < parseEther("0.1")) {
    console.log("❌ Insufficient balance for testing");
    return;
  }

  try {
    // Load contract
    const TokenFactoryArtifact = await hre.artifacts.readArtifact("TokenFactory");
    const contract = getContract({
      address: contractAddress,
      abi: TokenFactoryArtifact.abi,
      client: { public: publicClient, wallet: walletClient },
    });

    console.log("\n🔍 Step 1: Check creator eligibility...");
    
    // Check current token count
    const currentCount = await contract.read.creatorTokenCount([account.address]);
    const maxTokens = await contract.read.maxTokensPerCreator();
    console.log(`   Current tokens: ${currentCount}, Max allowed: ${maxTokens}`);
    
    if (currentCount >= maxTokens) {
      console.log("❌ Creator has reached maximum token limit");
      return;
    }

    console.log("✅ Creator eligible to create tokens");

    console.log("\n🔍 Step 2: Get creation costs...");
    const launchFee = await contract.read.launchFee();
    const minLiquidity = await contract.read.minInitialLiquidity();
    const totalCost = launchFee + minLiquidity;
    
    console.log(`   Launch fee: ${(Number(launchFee) / 1e18).toFixed(4)} CELO`);
    console.log(`   Min liquidity: ${(Number(minLiquidity) / 1e18).toFixed(4)} CELO`);
    console.log(`   Total cost: ${(Number(totalCost) / 1e18).toFixed(4)} CELO`);

    console.log("\n🔍 Step 3: Test token creation...");
    
    // Token parameters (same as frontend)
    const tokenParams = {
      name: "Test Token",
      symbol: "TEST",
      totalSupply: BigInt(1000000), // 1M tokens
      targetMarketCap: parseEther("0.1"), // 0.1 CELO
      creatorFeePercent: BigInt(30), // 30%
      description: "Test token creation",
      logoUrl: "https://example.com/logo.png"
    };

    console.log("   Token params:", {
      name: tokenParams.name,
      symbol: tokenParams.symbol,
      totalSupply: tokenParams.totalSupply.toString(),
      targetMarketCap: tokenParams.targetMarketCap.toString(),
      creatorFeePercent: tokenParams.creatorFeePercent.toString(),
    });

    // Estimate gas first
    try {
      const gasEstimate = await contract.estimateGas.createToken([
        tokenParams.name,
        tokenParams.symbol,
        tokenParams.totalSupply,
        tokenParams.targetMarketCap,
        tokenParams.creatorFeePercent,
        tokenParams.description,
        tokenParams.logoUrl
      ], { value: totalCost });
      
      console.log(`   Estimated gas: ${gasEstimate.toString()}`);
    } catch (gasError) {
      console.log("❌ Gas estimation failed:", gasError.message);
      return;
    }

    // Create token
    const txHash = await contract.write.createToken([
      tokenParams.name,
      tokenParams.symbol,
      tokenParams.totalSupply,
      tokenParams.targetMarketCap,
      tokenParams.creatorFeePercent,
      tokenParams.description,
      tokenParams.logoUrl
    ], { value: totalCost });

    console.log("   Transaction hash:", txHash);

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: 60000,
    });

    console.log("✅ Token created successfully!");
    console.log("   Gas used:", receipt.gasUsed.toString());
    console.log("   Explorer:", `https://alfajores.celoscan.io/tx/${txHash}`);

    // Verify token was created
    const newStats = await contract.read.getFactoryStats();
    console.log("   New total tokens:", newStats[0].toString());

  } catch (error) {
    console.error("❌ Token creation failed:", error);
    
    if (error.message.includes("Panic due to OVERFLOW")) {
      console.log("\n💡 This is the overflow error we're trying to fix!");
    }
  }
}

testTokenCreation()
  .then(() => {
    console.log("\n✅ Token creation test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script error:", error);
    process.exit(1);
  });
