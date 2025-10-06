// Upgrade TokenFactory to new implementation
import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

async function main() {
  console.log("🔄 Upgrading TokenFactory Implementation\n");

  const RPC_URL = "https://evmrpc-testnet.0g.ai";
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const proxyAddress = "0x68Fa63E97B659F3CdFAFbB2FC859b70Fbb8bccC0";

  console.log("📡 Connected to:", RPC_URL);
  console.log("👤 Wallet:", wallet.address);
  console.log("🏭 Proxy Address:", proxyAddress);
  console.log("");

  // Load ABI
  const artifactPath = join(
    __dirname,
    "../artifacts/contracts/TokenFactoryCore.sol/TokenFactoryCore.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  // Deploy new implementation
  console.log("📝 Step 1: Deploy New Implementation");
  console.log("-".repeat(60));

  const TokenFactoryCore = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet
  );

  console.log("🚀 Deploying new implementation...");
  const newImplementation = await TokenFactoryCore.deploy();
  await newImplementation.waitForDeployment();
  const newImplAddress = await newImplementation.getAddress();

  console.log("✅ New Implementation deployed to:", newImplAddress);

  // Upgrade proxy
  console.log("\n📝 Step 2: Upgrade Proxy");
  console.log("-".repeat(60));

  const proxy = new ethers.Contract(proxyAddress, artifact.abi, wallet);

  // Check owner
  const owner = await proxy.owner();
  console.log("📋 Proxy owner:", owner);
  console.log("📋 Your address:", wallet.address);

  if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
    console.error("❌ You are not the owner of the proxy!");
    return;
  }

  console.log("✅ Ownership verified");
  console.log("🔄 Upgrading proxy to new implementation...");

  const upgradeTx = await proxy.upgradeToAndCall(newImplAddress, "0x");
  console.log("✅ Upgrade transaction sent:", upgradeTx.hash);
  console.log("⏳ Waiting for confirmation...");

  const receipt = await upgradeTx.wait();
  console.log("✅ Upgrade confirmed!");
  console.log("📦 Block:", receipt.blockNumber);
  console.log("⛽ Gas used:", receipt.gasUsed.toString());

  console.log("\n📝 Step 3: Verify Upgrade");
  console.log("-".repeat(60));

  // Test a read function
  const launchFee = await proxy.LAUNCH_FEE();
  console.log("✅ Launch Fee:", ethers.formatEther(launchFee), "ETH");

  const totalTokens = await proxy.totalTokensCreated();
  console.log("✅ Total Tokens Created:", totalTokens.toString());

  console.log("\n🎉 Upgrade completed successfully!");
  console.log("=" .repeat(60));
  console.log("📋 Summary:");
  console.log("- Old Implementation: 0x18b917B1f54E0eeA6d97ADBbF7c945c3Dd94FC5C");
  console.log("- New Implementation:", newImplAddress);
  console.log("- Proxy Address:", proxyAddress);
  console.log("- Transaction:", upgradeTx.hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Upgrade failed:", error);
    process.exit(1);
  });
