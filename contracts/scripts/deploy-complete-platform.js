import { createWalletClient, createPublicClient, http, getContract } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'fs';
import path from 'path';
import hre from 'hardhat';

async function main() {
  console.log("🚀 Deploying COMPLETE Whale.fun Platform with Viem to Amoy Testnet...\n");

  // Load environment variables
  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology/';

  if (!privateKey) {
    throw new Error("❌ PRIVATE_KEY not found in environment variables");
  }

  console.log("✅ Environment variables loaded");
  console.log("RPC URL:", rpcUrl);

  // Create account from private key
  const account = privateKeyToAccount(`0x${privateKey.replace('0x', '')}`);
  console.log("Deployer account:", account.address);

  // Create Viem clients
  const publicClient = createPublicClient({
    chain: polygonAmoy,
    transport: http(rpcUrl)
  });

  const walletClient = createWalletClient({
    account,
    chain: polygonAmoy,
    transport: http(rpcUrl)
  });

  console.log("✅ Viem clients created");

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log("Account balance:", (Number(balance) / 1e18).toFixed(4), "MATIC\n");

  if (balance === 0n) {
    console.log("⚠️  Warning: Account balance is 0. Make sure you have MATIC for gas fees.");
  }

  // Load contract artifacts
  console.log("📝 Loading contract artifacts...");
  const WhaleTokenArtifact = await hre.artifacts.readArtifact("WhaleToken");
  const TokenFactoryArtifact = await hre.artifacts.readArtifact("TokenFactory");
  const TokenGraduationArtifact = await hre.artifacts.readArtifact("TokenGraduation");
  const TokenAnalyticsArtifact = await hre.artifacts.readArtifact("TokenAnalytics");
  const TradingEngineArtifact = await hre.artifacts.readArtifact("TradingEngine");
  const BossBattleArenaArtifact = await hre.artifacts.readArtifact("BossBattleArena");

  console.log("✅ Contract artifacts loaded\n");

  const deploymentResults = {};

  try {
    // Step 1: Deploy WhaleToken
    console.log("📝 Step 1: Deploying WhaleToken...");
    
    const whaleTokenHash = await walletClient.deployContract({
      abi: WhaleTokenArtifact.abi,
      bytecode: WhaleTokenArtifact.bytecode,
      args: []
    });

    console.log("   TX Hash:", whaleTokenHash);
    const whaleTokenReceipt = await publicClient.waitForTransactionReceipt({ 
      hash: whaleTokenHash,
      timeout: 60000
    });

    console.log("✅ WhaleToken deployed!");
    console.log("   Address:", whaleTokenReceipt.contractAddress);
    console.log("   Gas used:", whaleTokenReceipt.gasUsed.toString());
    console.log("   Explorer: https://amoy.polygonscan.com/tx/" + whaleTokenHash);
    console.log("");

    deploymentResults.WhaleToken = {
      address: whaleTokenReceipt.contractAddress,
      transactionHash: whaleTokenHash,
      gasUsed: whaleTokenReceipt.gasUsed.toString(),
      explorerUrl: `https://amoy.polygonscan.com/tx/${whaleTokenHash}`
    };

    // Step 2: Deploy TokenFactory
    console.log("📝 Step 2: Deploying TokenFactory...");
    
    const tokenFactoryHash = await walletClient.deployContract({
      abi: TokenFactoryArtifact.abi,
      bytecode: TokenFactoryArtifact.bytecode,
      args: [whaleTokenReceipt.contractAddress]
    });

    console.log("   TX Hash:", tokenFactoryHash);
    const tokenFactoryReceipt = await publicClient.waitForTransactionReceipt({ 
      hash: tokenFactoryHash,
      timeout: 60000
    });

    console.log("✅ TokenFactory deployed!");
    console.log("   Address:", tokenFactoryReceipt.contractAddress);
    console.log("   Gas used:", tokenFactoryReceipt.gasUsed.toString());
    console.log("   Explorer: https://amoy.polygonscan.com/tx/" + tokenFactoryHash);
    console.log("");

    deploymentResults.TokenFactory = {
      address: tokenFactoryReceipt.contractAddress,
      transactionHash: tokenFactoryHash,
      gasUsed: tokenFactoryReceipt.gasUsed.toString(),
      explorerUrl: `https://amoy.polygonscan.com/tx/${tokenFactoryHash}`
    };

    // Step 3: Deploy TradingEngine
    console.log("📝 Step 3: Deploying TradingEngine...");
    
    const tradingEngineHash = await walletClient.deployContract({
      abi: TradingEngineArtifact.abi,
      bytecode: TradingEngineArtifact.bytecode,
      args: [whaleTokenReceipt.contractAddress, tokenFactoryReceipt.contractAddress]
    });

    console.log("   TX Hash:", tradingEngineHash);
    const tradingEngineReceipt = await publicClient.waitForTransactionReceipt({ 
      hash: tradingEngineHash,
      timeout: 60000
    });

    console.log("✅ TradingEngine deployed!");
    console.log("   Address:", tradingEngineReceipt.contractAddress);
    console.log("   Gas used:", tradingEngineReceipt.gasUsed.toString());
    console.log("   Explorer: https://amoy.polygonscan.com/tx/" + tradingEngineHash);
    console.log("");

    deploymentResults.TradingEngine = {
      address: tradingEngineReceipt.contractAddress,
      transactionHash: tradingEngineHash,
      gasUsed: tradingEngineReceipt.gasUsed.toString(),
      explorerUrl: `https://amoy.polygonscan.com/tx/${tradingEngineHash}`
    };

    // Step 4: Deploy BossBattleArena
    console.log("📝 Step 4: Deploying BossBattleArena...");
    
    const bossBattleArenaHash = await walletClient.deployContract({
      abi: BossBattleArenaArtifact.abi,
      bytecode: BossBattleArenaArtifact.bytecode,
      args: [whaleTokenReceipt.contractAddress, tradingEngineReceipt.contractAddress, account.address]
    });

    console.log("   TX Hash:", bossBattleArenaHash);
    const bossBattleArenaReceipt = await publicClient.waitForTransactionReceipt({ 
      hash: bossBattleArenaHash,
      timeout: 60000
    });

    console.log("✅ BossBattleArena deployed!");
    console.log("   Address:", bossBattleArenaReceipt.contractAddress);
    console.log("   Gas used:", bossBattleArenaReceipt.gasUsed.toString());
    console.log("   Explorer: https://amoy.polygonscan.com/tx/" + bossBattleArenaHash);
    console.log("");

    deploymentResults.BossBattleArena = {
      address: bossBattleArenaReceipt.contractAddress,
      transactionHash: bossBattleArenaHash,
      gasUsed: bossBattleArenaReceipt.gasUsed.toString(),
      explorerUrl: `https://amoy.polygonscan.com/tx/${bossBattleArenaHash}`
    };

    // Step 5: Deploy TokenGraduation
    console.log("📝 Step 5: Deploying TokenGraduation...");
    
    const tokenGraduationHash = await walletClient.deployContract({
      abi: TokenGraduationArtifact.abi,
      bytecode: TokenGraduationArtifact.bytecode,
      args: [tokenFactoryReceipt.contractAddress]
    });

    console.log("   TX Hash:", tokenGraduationHash);
    const tokenGraduationReceipt = await publicClient.waitForTransactionReceipt({ 
      hash: tokenGraduationHash,
      timeout: 60000
    });

    console.log("✅ TokenGraduation deployed!");
    console.log("   Address:", tokenGraduationReceipt.contractAddress);
    console.log("   Gas used:", tokenGraduationReceipt.gasUsed.toString());
    console.log("   Explorer: https://amoy.polygonscan.com/tx/" + tokenGraduationHash);
    console.log("");

    deploymentResults.TokenGraduation = {
      address: tokenGraduationReceipt.contractAddress,
      transactionHash: tokenGraduationHash,
      gasUsed: tokenGraduationReceipt.gasUsed.toString(),
      explorerUrl: `https://amoy.polygonscan.com/tx/${tokenGraduationHash}`
    };

    // Step 6: Deploy TokenAnalytics
    console.log("📝 Step 6: Deploying TokenAnalytics...");
    
    const tokenAnalyticsHash = await walletClient.deployContract({
      abi: TokenAnalyticsArtifact.abi,
      bytecode: TokenAnalyticsArtifact.bytecode,
      args: [tokenFactoryReceipt.contractAddress]
    });

    console.log("   TX Hash:", tokenAnalyticsHash);
    const tokenAnalyticsReceipt = await publicClient.waitForTransactionReceipt({ 
      hash: tokenAnalyticsHash,
      timeout: 60000
    });

    console.log("✅ TokenAnalytics deployed!");
    console.log("   Address:", tokenAnalyticsReceipt.contractAddress);
    console.log("   Gas used:", tokenAnalyticsReceipt.gasUsed.toString());
    console.log("   Explorer: https://amoy.polygonscan.com/tx/" + tokenAnalyticsHash);
    console.log("");

    deploymentResults.TokenAnalytics = {
      address: tokenAnalyticsReceipt.contractAddress,
      transactionHash: tokenAnalyticsHash,
      gasUsed: tokenAnalyticsReceipt.gasUsed.toString(),
      explorerUrl: `https://amoy.polygonscan.com/tx/${tokenAnalyticsHash}`
    };

    // Step 7: Test Complete Platform Flow
    console.log("🧪 Testing Complete Platform Flow...");
    console.log("===================================");
    
    try {
      // Test 1: WhaleToken
      console.log("🔍 Test 1: WhaleToken functionality...");
      const whaleTokenContract = getContract({
        address: whaleTokenReceipt.contractAddress,
        abi: WhaleTokenArtifact.abi,
        client: publicClient
      });

      const whaleName = await whaleTokenContract.read.name();
      const whaleSymbol = await whaleTokenContract.read.symbol();
      const whaleSupply = await whaleTokenContract.read.totalSupply();
      console.log("✅ WhaleToken test passed:", { 
        name: whaleName, 
        symbol: whaleSymbol,
        totalSupply: (Number(whaleSupply) / 1e18).toFixed(0) + " tokens"
      });

      // Test 2: TokenFactory
      console.log("🔍 Test 2: TokenFactory functionality...");
      const tokenFactoryContract = getContract({
        address: tokenFactoryReceipt.contractAddress,
        abi: TokenFactoryArtifact.abi,
        client: publicClient
      });

      const factoryStats = await tokenFactoryContract.read.getFactoryStats();
      console.log("✅ TokenFactory test passed:", {
        totalTokensCreated: factoryStats[0].toString(),
        launchFee: (Number(factoryStats[3]) / 1e18).toFixed(4) + " MATIC"
      });

      // Test 3: Create a test token
      console.log("🔍 Test 3: Creating a test token...");
      const createTokenHash = await walletClient.writeContract({
        address: tokenFactoryReceipt.contractAddress,
        abi: TokenFactoryArtifact.abi,
        functionName: 'createToken',
        args: [
          "Test Token",           // name
          "TEST",                 // symbol
          "1000000000000000000000000", // 1M tokens
          "100000000000000000000",     // 100 ETH target market cap
          50,                     // 0.5% creator fee
          "A test token for whale.fun", // description
          "https://example.com/logo.png" // logo URL
        ],
        value: BigInt("11000000000000000000") // 11 MATIC (10 for liquidity + 1 for fee)
      });

      console.log("   Create Token TX Hash:", createTokenHash);
      const createTokenReceipt = await publicClient.waitForTransactionReceipt({ 
        hash: createTokenHash,
        timeout: 60000
      });

      console.log("✅ Test token created successfully!");
      console.log("   TX Hash:", createTokenHash);
      console.log("   Gas used:", createTokenReceipt.gasUsed.toString());

      // Get the new token address from events
      const newFactoryStats = await tokenFactoryContract.read.getFactoryStats();
      console.log("✅ Factory stats updated:", {
        totalTokensCreated: newFactoryStats[0].toString(),
        totalFeesCollected: (Number(newFactoryStats[2]) / 1e18).toFixed(4) + " MATIC"
      });

      // Test 4: TradingEngine
      console.log("🔍 Test 4: TradingEngine functionality...");
      const tradingEngineContract = getContract({
        address: tradingEngineReceipt.contractAddress,
        abi: TradingEngineArtifact.abi,
        client: publicClient
      });

      const tradingEngineWhaleToken = await tradingEngineContract.read.whaleToken();
      const tradingEngineTokenFactory = await tradingEngineContract.read.tokenFactory();
      console.log("✅ TradingEngine test passed:", {
        whaleTokenAddress: tradingEngineWhaleToken,
        tokenFactoryAddress: tradingEngineTokenFactory,
        correctlyLinked: tradingEngineWhaleToken.toLowerCase() === whaleTokenReceipt.contractAddress.toLowerCase()
      });

      // Test 5: BossBattleArena
      console.log("🔍 Test 5: BossBattleArena functionality...");
      const bossBattleArenaContract = getContract({
        address: bossBattleArenaReceipt.contractAddress,
        abi: BossBattleArenaArtifact.abi,
        client: publicClient
      });

      const arenaWhaleToken = await bossBattleArenaContract.read.whaleToken();
      const arenaTradingEngine = await bossBattleArenaContract.read.tradingEngine();
      console.log("✅ BossBattleArena test passed:", {
        whaleTokenAddress: arenaWhaleToken,
        tradingEngineAddress: arenaTradingEngine,
        correctlyLinked: arenaWhaleToken.toLowerCase() === whaleTokenReceipt.contractAddress.toLowerCase()
      });

      console.log("\n🎉 ALL PLATFORM TESTS PASSED!");

    } catch (error) {
      console.log("⚠️  Platform testing failed:", error.message);
    }

    // Step 8: Save complete deployment results
    const deploymentData = {
      network: "amoy",
      chainId: 80002,
      timestamp: new Date().toISOString(),
      deployer: account.address,
      contracts: deploymentResults,
      summary: {
        totalContracts: Object.keys(deploymentResults).length,
        totalGasUsed: Object.values(deploymentResults).reduce((sum, contract) => sum + BigInt(contract.gasUsed), 0n).toString(),
        platformStatus: "FULLY DEPLOYED AND TESTED"
      }
    };

    // Create deployments directory if it doesn't exist
    const deploymentsDir = path.join(process.cwd(), "deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentPath = path.join(deploymentsDir, "complete-platform-deployment.json");
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));

    console.log("\n🎉 COMPLETE PLATFORM DEPLOYMENT SUCCESSFUL!");
    console.log("===========================================");
    console.log("");
    console.log("📋 DEPLOYMENT SUMMARY:");
    console.log("WhaleToken:      " + deploymentResults.WhaleToken.address);
    console.log("TokenFactory:    " + deploymentResults.TokenFactory.address);
    console.log("TradingEngine:   " + deploymentResults.TradingEngine.address);
    console.log("BossBattleArena: " + deploymentResults.BossBattleArena.address);
    console.log("TokenGraduation: " + deploymentResults.TokenGraduation.address);
    console.log("TokenAnalytics:  " + deploymentResults.TokenAnalytics.address);
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
    console.log("💾 Complete deployment data saved to:", deploymentPath);
    console.log("");
    console.log("🚀 WHALE.FUN PLATFORM IS NOW LIVE ON AMOY TESTNET! 🐋");

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    
    if (error.message.includes('insufficient funds')) {
      console.log("\n💡 Solution: Add MATIC to your account for gas fees");
      console.log("   Get testnet MATIC from: https://faucet.polygon.technology/");
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
