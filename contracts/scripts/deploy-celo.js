import {
  createWalletClient,
  createPublicClient,
  http,
  getContract,
} from "viem";
import { celoAlfajores } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import fs from "fs";
import path from "path";
import hre from "hardhat";

async function main() {
  console.log("🚀 Deploying Whale.fun Platform to Celo Alfajores Testnet...\n");

  // Load environment variables
  const privateKey =
    "0x9f55a656f73b257dc970624b558e56c2c78bc07a793edf95fa614f4f4a7f22ae";
  const rpcUrl = "https://alfajores-forno.celo-testnet.org";

  console.log("✅ Environment variables loaded");
  console.log("RPC URL:", rpcUrl);

  // Create account from private key
  const account = privateKeyToAccount(privateKey);
  console.log("Deployer account:", account.address);

  // Create Viem clients
  const publicClient = createPublicClient({
    chain: celoAlfajores,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: celoAlfajores,
    transport: http(rpcUrl),
  });

  console.log("✅ Viem clients created");

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(
    "Account balance:",
    (Number(balance) / 1e18).toFixed(4),
    "CELO\n"
  );

  if (balance === 0n) {
    console.log(
      "⚠️  Warning: Account balance is 0. Get CELO from https://faucet.celo.org/"
    );
    return;
  }

  // Load contract artifacts
  console.log("📝 Loading contract artifacts...");
  const WhaleTokenArtifact = await hre.artifacts.readArtifact("WhaleToken");
  const TokenFactoryArtifact = await hre.artifacts.readArtifact("TokenFactory");

  console.log("✅ Contract artifacts loaded\n");

  const deploymentResults = {};

  try {
    // Step 1: Deploy WhaleToken
    console.log("📝 Step 1: Deploying WhaleToken...");

    const whaleTokenHash = await walletClient.deployContract({
      abi: WhaleTokenArtifact.abi,
      bytecode: WhaleTokenArtifact.bytecode,
      args: [],
    });

    console.log("   TX Hash:", whaleTokenHash);
    const whaleTokenReceipt = await publicClient.waitForTransactionReceipt({
      hash: whaleTokenHash,
      timeout: 60000,
    });

    console.log("✅ WhaleToken deployed!");
    console.log("   Address:", whaleTokenReceipt.contractAddress);
    console.log("   Gas used:", whaleTokenReceipt.gasUsed.toString());
    console.log(
      "   Explorer: https://alfajores.celoscan.io/tx/" + whaleTokenHash
    );
    console.log("");

    deploymentResults.WhaleToken = {
      address: whaleTokenReceipt.contractAddress,
      transactionHash: whaleTokenHash,
      gasUsed: whaleTokenReceipt.gasUsed.toString(),
      explorerUrl: `https://alfajores.celoscan.io/tx/${whaleTokenHash}`,
    };

    // Step 2: Deploy TokenFactory
    console.log("📝 Step 2: Deploying TokenFactory...");

    const tokenFactoryHash = await walletClient.deployContract({
      abi: TokenFactoryArtifact.abi,
      bytecode: TokenFactoryArtifact.bytecode,
      args: [whaleTokenReceipt.contractAddress],
    });

    console.log("   TX Hash:", tokenFactoryHash);
    const tokenFactoryReceipt = await publicClient.waitForTransactionReceipt({
      hash: tokenFactoryHash,
      timeout: 60000,
    });

    console.log("✅ TokenFactory deployed!");
    console.log("   Address:", tokenFactoryReceipt.contractAddress);
    console.log("   Gas used:", tokenFactoryReceipt.gasUsed.toString());
    console.log(
      "   Explorer: https://alfajores.celoscan.io/tx/" + tokenFactoryHash
    );
    console.log("");

    deploymentResults.TokenFactory = {
      address: tokenFactoryReceipt.contractAddress,
      transactionHash: tokenFactoryHash,
      gasUsed: tokenFactoryReceipt.gasUsed.toString(),
      explorerUrl: `https://alfajores.celoscan.io/tx/${tokenFactoryHash}`,
    };

    // Step 3: Test TokenFactory
    console.log("🧪 Testing TokenFactory...");
    const tokenFactoryContract = getContract({
      address: tokenFactoryReceipt.contractAddress,
      abi: TokenFactoryArtifact.abi,
      client: publicClient,
    });

    const factoryStats = await tokenFactoryContract.read.getFactoryStats();
    console.log("✅ TokenFactory test passed:", {
      totalTokensCreated: factoryStats[0].toString(),
      launchFee: (Number(factoryStats[3]) / 1e18).toFixed(4) + " CELO",
    });

    // Save deployment results
    const deploymentData = {
      network: "celo-alfajores",
      chainId: 44787,
      timestamp: new Date().toISOString(),
      deployer: account.address,
      contracts: deploymentResults,
      summary: {
        totalContracts: Object.keys(deploymentResults).length,
        totalGasUsed: Object.values(deploymentResults)
          .reduce((sum, contract) => sum + BigInt(contract.gasUsed), 0n)
          .toString(),
        platformStatus: "DEPLOYED TO CELO ALFAJORES",
      },
    };

    // Create deployments directory if it doesn't exist
    const deploymentsDir = path.join(process.cwd(), "deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentPath = path.join(
      deploymentsDir,
      "celo-alfajores-deployment.json"
    );
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));

    console.log("\n🎉 CELO ALFAJORES DEPLOYMENT SUCCESSFUL!");
    console.log("=====================================");
    console.log("");
    console.log("📋 DEPLOYMENT SUMMARY:");
    console.log("WhaleToken:   " + deploymentResults.WhaleToken.address);
    console.log("TokenFactory: " + deploymentResults.TokenFactory.address);
    console.log("");
    console.log("📝 TRANSACTION HASHES:");
    Object.entries(deploymentResults).forEach(([name, data]) => {
      console.log(`${name}: ${data.transactionHash}`);
    });
    console.log("");
    console.log("🌐 EXPLORER LINKS:");
    Object.entries(deploymentResults).forEach(([name, data]) => {
      console.log(`${name}: ${data.explorerUrl}`);
    });
    console.log("");
    console.log("💾 Deployment data saved to:", deploymentPath);
    console.log("");
    console.log("🚀 WHALE.FUN IS NOW LIVE ON CELO ALFAJORES! 🐋");
  } catch (error) {
    console.error("❌ Deployment failed:", error);

    if (error.message.includes("insufficient funds")) {
      console.log("\n💡 Solution: Add CELO to your account for gas fees");
      console.log("   Get testnet CELO from: https://faucet.celo.org/");
    }

    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script error:", error);
    process.exit(1);
  });
