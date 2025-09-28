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
  console.log("🚀 Deploying BossBattleArena to Rootstock Testnet (31) ...\n");

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
  const BossBattleArenaArtifact = await hre.artifacts.readArtifact("BossBattleArena");
  console.log("✅ Artifacts loaded\n");

  const results = {};

  console.log("📝 Deploying BossBattleArena...");
  // Estimate gas and fetch gas price for cheaper deployment
  const latestBlock = await publicClient.getBlockNumber().catch(() => undefined);
  if (latestBlock) console.log("Current block:", latestBlock.toString());
  const gasPrice = await publicClient.getGasPrice().catch(() => undefined);
  const nonce = await publicClient
    .getTransactionCount({ address: account.address })
    .catch(() => undefined);
  const gasEstimate = await publicClient
    .estimateContractGas({
      abi: BossBattleArenaArtifact.abi,
      bytecode: BossBattleArenaArtifact.bytecode,
      args: [],
      account: account.address,
    })
    .catch(() => undefined);
  if (gasPrice) console.log("Gas price (wei):", gasPrice.toString());
  if (gasEstimate) console.log("Gas estimate:", gasEstimate.toString());

  let bossBattleArenaHash;
  try {
    bossBattleArenaHash = await walletClient.deployContract({
      abi: BossBattleArenaArtifact.abi,
      bytecode: BossBattleArenaArtifact.bytecode,
      args: [],
      // Force legacy type for RSK
      type: 'legacy',
      ...(nonce !== undefined ? { nonce } : {}),
      // Use estimated gas if available with small buffer
      ...(gasEstimate ? { gas: gasEstimate + 50_000n } : {}),
      // RSK uses legacy gasPrice (no EIP-1559), set if available
      ...(gasPrice ? { gasPrice } : {}),
    });
  } catch (e) {
    console.error("❌ Deploy RPC error:", e?.shortMessage || e?.message || e);
    if (e?.details) console.error("Details:", e.details);
    if (e?.cause) console.error("Cause:", e.cause);
    throw e;
  }
  console.log("   TX:", bossBattleArenaHash);
  const bossBattleArenaReceipt = await publicClient.waitForTransactionReceipt({ hash: bossBattleArenaHash, timeout: 90_000 });
  if (!bossBattleArenaReceipt.contractAddress) throw new Error("No contractAddress for BossBattleArena");
  console.log("✅ BossBattleArena:", bossBattleArenaReceipt.contractAddress);
  console.log("   Explorer:", `${chain.blockExplorers.default.url}/tx/${bossBattleArenaHash}`);
  results.BossBattleArena = {
    address: bossBattleArenaReceipt.contractAddress,
    transactionHash: bossBattleArenaHash,
    explorerUrl: `${chain.blockExplorers.default.url}/tx/${bossBattleArenaHash}`,
  };

  const deploymentsDir = path.join(process.cwd(), "deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });
  const outPath = path.join(deploymentsDir, "bossbattle-rootstock-testnet-deployment.json");
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
