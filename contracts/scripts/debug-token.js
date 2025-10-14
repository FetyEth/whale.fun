import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  formatEther,
} from "viem";
import { celoAlfajores } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import dotenv from "dotenv";
import fs from "fs";

// Load environment variables
dotenv.config();

// Contract addresses (latest deployment)
const FACTORY_ADDRESS = "0x0bb4da9a543d0c8482843f49f80222f936310637";

// Load ABIs from config directory
const TokenFactoryABI = JSON.parse(
  fs.readFileSync("../config/abi/TokenFactoryRoot.json", "utf8")
);
const CreatorTokenABI = JSON.parse(
  fs.readFileSync("../config/abi/CreatorToken.json", "utf8")
);

async function debugTokenCreationAndTrading() {
  console.log("🔍 DEBUG: Token Creation and Trading Test");
  console.log("==========================================");

  // Setup clients
  const privateKey =
    "0x9f55a656f73b257dc970624b558e56c2c78bc07a793edf95fa614f4f4a7f22ae";
  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({
    chain: celoAlfajores,
    transport: http("https://alfajores-forno.celo-testnet.org"),
  });

  const walletClient = createWalletClient({
    account,
    chain: celoAlfajores,
    transport: http("https://alfajores-forno.celo-testnet.org"),
  });

  console.log("📡 Account:", account.address);
  try {
    // Step 1: Create a test token
    console.log("\n📝 Step 1: Creating test token...");

    const createTokenTx = await walletClient.writeContract({
      address: FACTORY_ADDRESS,
      abi: TokenFactoryABI,
      functionName: "createToken",
      args: [
        "DebugToken", // name
        "DBG", // symbol
        parseEther("1000000"), // totalSupply (1M tokens in wei)
        parseEther("0.1"), // targetMarketCap (0.1 ETH)
        50n, // creatorFeePercent (0.5%)
        "Debug test token", // description
        "https://example.com/logo.png" // logoUrl
      ],
      value: parseEther('0.11') // launch fee (0.01) + minInitialLiquidity (0.1)
    });

    console.log("⏳ Waiting for token creation...");
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: createTokenTx,
    });
    console.log('✅ Token created! TX:', createTokenTx);

    // Get the token address from logs
    let tokenAddress;
    for (const log of receipt.logs) {
      try {
        const decoded = publicClient.decodeEventLog({
          abi: TokenFactoryABI,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "TokenCreated") {
          tokenAddress = decoded.args.tokenAddress;
          break;
        }
      } catch (e) {
        // Skip logs that don't match
      }
    }

    if (!tokenAddress) {
      console.error("❌ Could not find token address in logs");
      return;
    }

    console.log("🎯 Token Address:", tokenAddress);

    // Step 2: Check token state
    console.log("\n🔍 Step 2: Checking token state...");

    const [contractBalance, totalSupply, currentPrice] = await Promise.all([
      publicClient.readContract({
        address: tokenAddress,
        abi: CreatorTokenABI,
        functionName: "balanceOf",
        args: [tokenAddress], // Contract's own balance
      }),
      publicClient.readContract({
        address: tokenAddress,
        abi: CreatorTokenABI,
        functionName: "totalSupply",
      }),
      publicClient.readContract({
        address: tokenAddress,
        abi: CreatorTokenABI,
        functionName: "getCurrentPrice",
      }),
    ]);

    console.log("📊 Contract Balance:", formatEther(contractBalance), "tokens");
    console.log("📊 Total Supply:", formatEther(totalSupply), "tokens");
    console.log(
      "📊 Current Price:",
      formatEther(currentPrice),
      "ETH per token"
    );

    // Step 3: Calculate buy cost
    console.log("\n💰 Step 3: Calculating buy cost for 1 token...");

    const tokenAmount = parseEther("1"); // 1 token
    const buyCost = await publicClient.readContract({
      address: tokenAddress,
      abi: CreatorTokenABI,
      functionName: "calculateBuyCost",
      args: [tokenAmount],
    });

    console.log("💵 Cost to buy 1 token:", formatEther(buyCost), "ETH");

    // Step 4: Try to buy tokens
    console.log("\n🛒 Step 4: Attempting to buy 1 token...");

    try {
      const buyTx = await walletClient.writeContract({
        address: tokenAddress,
        abi: CreatorTokenABI,
        functionName: "buyTokens",
        args: [tokenAmount],
        value: buyCost,
      });

      console.log("⏳ Waiting for buy transaction...");
      const buyReceipt = await publicClient.waitForTransactionReceipt({
        hash: buyTx,
      });

      if (buyReceipt.status === "success") {
        console.log("✅ Buy successful! TX:", buyTx);

        // Check balances after purchase
        const [newContractBalance, userBalance] = await Promise.all([
          publicClient.readContract({
            address: tokenAddress,
            abi: CreatorTokenABI,
            functionName: "balanceOf",
            args: [tokenAddress],
          }),
          publicClient.readContract({
            address: tokenAddress,
            abi: CreatorTokenABI,
            functionName: "balanceOf",
            args: [account.address],
          }),
        ]);

        console.log(
          "📊 Contract Balance After:",
          formatEther(newContractBalance),
          "tokens"
        );
        console.log("📊 User Balance:", formatEther(userBalance), "tokens");
      } else {
        console.log("❌ Buy transaction failed");
      }
    } catch (error) {
      console.error("❌ Buy failed with error:", error.message);

      // Try to get more details from the error
      if (error.message.includes("Contract balance:")) {
        console.log("🔍 Debug info found in error message!");
      }
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Run the debug test
debugTokenCreationAndTrading().catch(console.error);
