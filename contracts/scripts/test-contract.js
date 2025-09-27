import {
  createPublicClient,
  http,
  getContract,
} from "viem";
import { celoAlfajores } from "viem/chains";
import hre from "hardhat";

async function testContract() {
  console.log("🧪 Testing deployed TokenFactory contract on Celo Alfajores...\n");

  const rpcUrl = "https://alfajores-forno.celo-testnet.org";
  const contractAddress = "0xecc8a625a4b9b470debf7d3b0709755693d3a64a";

  // Create public client
  const publicClient = createPublicClient({
    chain: celoAlfajores,
    transport: http(rpcUrl),
  });

  console.log("✅ Public client created");
  console.log("Contract address:", contractAddress);

  try {
    // Load contract artifact
    const TokenFactoryArtifact = await hre.artifacts.readArtifact("TokenFactory");
    console.log("✅ Contract artifact loaded");

    // Create contract instance
    const contract = getContract({
      address: contractAddress,
      abi: TokenFactoryArtifact.abi,
      client: publicClient,
    });

    console.log("\n🔍 Testing contract methods...");

    // Test basic methods
    try {
      console.log("1. Testing getFactoryStats()...");
      const stats = await contract.read.getFactoryStats();
      console.log("   ✅ Factory Stats:", {
        totalTokensCreated: stats[0].toString(),
        totalVolumeTraded: stats[1].toString(),
        totalFeesCollected: stats[2].toString(),
        launchFee: stats[3].toString(),
      });
    } catch (error) {
      console.log("   ❌ getFactoryStats failed:", error.message);
    }

    try {
      console.log("2. Testing maxTokensPerCreator...");
      const maxTokens = await contract.read.maxTokensPerCreator();
      console.log("   ✅ Max tokens per creator:", maxTokens.toString());
    } catch (error) {
      console.log("   ❌ maxTokensPerCreator failed:", error.message);
    }

    try {
      console.log("3. Testing launchFee...");
      const launchFee = await contract.read.launchFee();
      console.log("   ✅ Launch fee:", launchFee.toString());
    } catch (error) {
      console.log("   ❌ launchFee failed:", error.message);
    }

    try {
      console.log("4. Testing whaleToken...");
      const whaleToken = await contract.read.whaleToken();
      console.log("   ✅ Whale token address:", whaleToken);
    } catch (error) {
      console.log("   ❌ whaleToken failed:", error.message);
    }

    try {
      console.log("5. Testing minInitialLiquidity...");
      const minLiquidity = await contract.read.minInitialLiquidity();
      console.log("   ✅ Min initial liquidity:", minLiquidity.toString());
    } catch (error) {
      console.log("   ❌ minInitialLiquidity failed:", error.message);
    }

    // List all available functions
    console.log("\n📋 Available contract functions:");
    const functions = TokenFactoryArtifact.abi
      .filter(item => item.type === 'function')
      .map(func => `${func.name}(${func.inputs.map(input => input.type).join(', ')})`)
      .sort();
    
    functions.forEach((func, index) => {
      console.log(`   ${index + 1}. ${func}`);
    });

  } catch (error) {
    console.error("❌ Contract test failed:", error);
  }
}

testContract()
  .then(() => {
    console.log("\n✅ Contract testing completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script error:", error);
    process.exit(1);
  });
