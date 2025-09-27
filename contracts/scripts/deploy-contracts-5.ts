/**
 * Base Testnet deployment script for StreamLaunch Ecosystem
 * Deploys all core contracts on Base Sepolia (chainId 84532) in correct order
 */

import hre from "hardhat";

type Address = `0x${string}`;

async function waitForAddress(hash: Address) {
  const client = await (hre as any).viem.getPublicClient();
  const receipt = await client.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) throw new Error("No contract address in receipt");
  return receipt.contractAddress as Address;
}

async function main() {
  const publicClient = await (hre as any).viem.getPublicClient();
  const chainId: number | undefined = publicClient?.chain?.id;
  const BASE_SEPOLIA_CHAIN_ID = 84532;
  if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
    throw new Error(
      `This script is restricted to Base testnet (chainId ${BASE_SEPOLIA_CHAIN_ID}). Current chainId: ${chainId}`
    );
  }

  const [wallet] = await (hre as any).viem.getWalletClients();
  const deployer = wallet.account.address as Address;

  console.log("🚀 Starting deployment to Base Testnet (baseSepolia)");
  console.log("Deployer:", deployer);

  // 1) WhaleToken
  console.log("\n📦 Deploying WhaleToken...");
  const whaleTx = await (hre as any).viem.deployContract("WhaleToken", []);
  const whaleToken = await waitForAddress(whaleTx);
  console.log("   WhaleToken:", whaleToken);

  // 2) TokenFactory(whaleToken)
  console.log("\n📦 Deploying TokenFactory...");
  const factoryTx = await (hre as any).viem.deployContract("TokenFactory", [whaleToken]);
  const tokenFactory = await waitForAddress(factoryTx);
  console.log("   TokenFactory:", tokenFactory);

  // 3) TradingEngine(whaleToken, tokenFactory)
  console.log("\n📦 Deploying TradingEngine...");
  const engineTx = await (hre as any).viem.deployContract("TradingEngine", [whaleToken, tokenFactory]);
  const tradingEngine = await waitForAddress(engineTx);
  console.log("   TradingEngine:", tradingEngine);

  // 4) TimeLockController(delay)
  console.log("\n📦 Deploying TimeLockController...");
  const TWO_DAYS = BigInt(2 * 24 * 60 * 60);
  const timelockTx = await (hre as any).viem.deployContract("TimeLockController", [TWO_DAYS]);
  const timeLock = await waitForAddress(timelockTx);
  console.log("   TimeLockController:", timeLock);

  // 5) GovernanceController(whaleToken, timeLock)
  console.log("\n📦 Deploying GovernanceController...");
  const govTx = await (hre as any).viem.deployContract("GovernanceController", [whaleToken, timeLock]);
  const governanceController = await waitForAddress(govTx);
  console.log("   GovernanceController:", governanceController);

  // 6) SecurityController(whaleToken)
  console.log("\n📦 Deploying SecurityController...");
  const secTx = await (hre as any).viem.deployContract("SecurityController", [whaleToken]);
  const securityController = await waitForAddress(secTx);
  console.log("   SecurityController:", securityController);

  // 7) BossBattleArena(whaleToken, tradingEngine, treasury)
  console.log("\n📦 Deploying BossBattleArena...");
  const bossTx = await (hre as any).viem.deployContract("BossBattleArena", [
    whaleToken,
    tradingEngine,
    deployer,
  ]);
  const bossBattleArena = await waitForAddress(bossTx);
  console.log("   BossBattleArena:", bossBattleArena);

  console.log("\n📊 DEPLOYMENT SUMMARY (Base Testnet)");
  console.log("═".repeat(60));
  console.log("Deployer:", deployer);
  console.log("WhaleToken:", whaleToken);
  console.log("TokenFactory:", tokenFactory);
  console.log("TradingEngine:", tradingEngine);
  console.log("TimeLockController:", timeLock);
  console.log("GovernanceController:", governanceController);
  console.log("SecurityController:", securityController);
  console.log("BossBattleArena:", bossBattleArena);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
  