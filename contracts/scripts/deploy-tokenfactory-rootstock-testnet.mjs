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

function resolveWhaleTokenAddress() {
  const fromEnv = process.env.WHALE_TOKEN_ADDRESS;
  if (fromEnv && /^0x[a-fA-F0-9]{40}$/.test(fromEnv)) return fromEnv;

  // Try to read from previous deployments file
  const deploymentsPath = path.join(process.cwd(), "deployments", "rootstock-testnet-deployment.json");
  if (fs.existsSync(deploymentsPath)) {
    try {
      const json = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
      const addr = json?.contracts?.WhaleToken?.address;
      if (addr && /^0x[a-fA-F0-9]{40}$/.test(addr)) return addr;
    } catch {}
  }

  throw new Error(
    "WhaleToken address not found. Set WHALE_TOKEN_ADDRESS env or ensure deployments/rootstock-testnet-deployment.json exists with WhaleToken.address"
  );
}

async function main() {
  console.log("\n🚀 Deploying TokenFactory ONLY to Rootstock Testnet (31) ...\n");

  const privateKey = process.env.ROOTSTOCK_TESTNET_PRIVATE_KEY;
  const rpcUrl = process.env.ROOTSTOCK_TESTNET_RPC_URL || "https://public-node.testnet.rsk.co";
  if (!privateKey) throw new Error("ROOTSTOCK_TESTNET_PRIVATE_KEY not set in environment");

  const whaleTokenAddress = resolveWhaleTokenAddress();
  console.log("Using WhaleToken:", whaleTokenAddress);

  const chain = makeRootstockTestnet(rpcUrl);
  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log("Deployer:", account.address);
  console.log("Balance:", (Number(balance) / 1e18).toFixed(6), "RBTC\n");

  console.log("📝 Loading TokenFactory artifact...");
  const TokenFactoryArtifact = await hre.artifacts.readArtifact("TokenFactory");

  console.log("📝 Deploying TokenFactory...");
  const txHash = await walletClient.deployContract({
    abi: TokenFactoryArtifact.abi,
    bytecode: TokenFactoryArtifact.bytecode,
    args: [whaleTokenAddress],
  });
  console.log("   TX:", txHash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 90_000 });
  if (!receipt.contractAddress) throw new Error("No contractAddress for TokenFactory");

  console.log("✅ TokenFactory:", receipt.contractAddress);
  console.log("   Explorer:", `${chain.blockExplorers.default.url}/tx/${txHash}`);

  // Save a minimal deployment file
  const outDir = path.join(process.cwd(), "deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "rootstock-testnet-tokenfactory-only.json");
  const payload = {
    network: "rootstock-testnet",
    chainId: 31,
    timestamp: new Date().toISOString(),
    deployer: account.address,
    whaleToken: whaleTokenAddress,
    tokenFactory: {
      address: receipt.contractAddress,
      transactionHash: txHash,
      explorerUrl: `${chain.blockExplorers.default.url}/tx/${txHash}`,
    },
  };
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log("\n💾 Saved:", outPath);

  console.log("\n🎉 TokenFactory-only deployment complete!");
}

main().catch((e) => {
  console.error("❌ Deployment failed:", e);
  process.exit(1);
});
