import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import fs from "fs";
import path from "path";
import hre from "hardhat";

const makeRootstockTestnet = (rpcUrl) => ({
  id: 31,
  name: "Rootstock Testnet",
  network: "rootstock-testnet",
  nativeCurrency: { name: "Test RBTC", symbol: "RBTC", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] }, public: { http: [rpcUrl] } },
  blockExplorers: {
    default: { name: "RSK Explorer", url: "https://explorer.testnet.rsk.co" },
  },
});

async function main() {
  console.log("🚀 Deploying Whale.fun Platform to Rootstock Testnet (31) ...\n");

  const privateKey = process.env.ROOTSTOCK_TESTNET_PRIVATE_KEY;
  const rpcUrl = process.env.ROOTSTOCK_TESTNET_RPC_URL || "https://public-node.testnet.rsk.co";

  if (!privateKey) {
    throw new Error("ROOTSTOCK_TESTNET_PRIVATE_KEY not set in environment");
  }

  console.log("RPC URL:", rpcUrl);

  const chain = makeRootstockTestnet(rpcUrl);

  const account = privateKeyToAccount(privateKey);
  console.log("Deployer:", account.address);

  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log("Balance:", (Number(balance) / 1e18).toFixed(6), "RBTC\n");
  if (balance === 0n) {
    console.log("⚠️ Your balance is 0. Get tRBTC from faucet: https://faucet.rsk.co/");
  }

  console.log("📝 Loading artifacts...");
  const WhaleTokenArtifact = await hre.artifacts.readArtifact("WhaleToken");
  const TokenFactoryArtifact = await hre.artifacts.readArtifact("TokenFactory");
  console.log("✅ Artifacts loaded\n");

  const results = {};

  console.log("📝 Deploying WhaleToken...");
  const whaleTokenHash = await walletClient.deployContract({
    abi: WhaleTokenArtifact.abi,
    bytecode: WhaleTokenArtifact.bytecode,
    args: [],
  });
  console.log("   TX:", whaleTokenHash);
  const whaleTokenReceipt = await publicClient.waitForTransactionReceipt({ hash: whaleTokenHash, timeout: 90_000 });
  if (!whaleTokenReceipt.contractAddress) throw new Error("No contractAddress for WhaleToken");
  console.log("✅ WhaleToken:", whaleTokenReceipt.contractAddress);
  console.log("   Explorer:", `${chain.blockExplorers.default.url}/tx/${whaleTokenHash}`);
  results.WhaleToken = {
    address: whaleTokenReceipt.contractAddress,
    transactionHash: whaleTokenHash,
    explorerUrl: `${chain.blockExplorers.default.url}/tx/${whaleTokenHash}`,
  };

  console.log("📝 Deploying TokenFactory...");
  const tokenFactoryHash = await walletClient.deployContract({
    abi: TokenFactoryArtifact.abi,
    bytecode: TokenFactoryArtifact.bytecode,
    args: [whaleTokenReceipt.contractAddress],
  });
  console.log("   TX:", tokenFactoryHash);
  const tokenFactoryReceipt = await publicClient.waitForTransactionReceipt({ hash: tokenFactoryHash, timeout: 90_000 });
  if (!tokenFactoryReceipt.contractAddress) throw new Error("No contractAddress for TokenFactory");
  console.log("✅ TokenFactory:", tokenFactoryReceipt.contractAddress);
  console.log("   Explorer:", `${chain.blockExplorers.default.url}/tx/${tokenFactoryHash}`);
  results.TokenFactory = {
    address: tokenFactoryReceipt.contractAddress,
    transactionHash: tokenFactoryHash,
    explorerUrl: `${chain.blockExplorers.default.url}/tx/${tokenFactoryHash}`,
  };

  const deploymentsDir = path.join(process.cwd(), "deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });
  const outPath = path.join(deploymentsDir, "rootstock-testnet-deployment.json");
  const payload = {
    network: "rootstock-testnet",
    chainId: 31,
    timestamp: new Date().toISOString(),
    deployer: account.address,
    contracts: results,
  };
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log("\n💾 Saved:", outPath);

  console.log("\n🎉 Rootstock Testnet deployment complete!");
}

main().catch((e) => {
  console.error("❌ Deployment failed:", e);
  process.exit(1);
});
