import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
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

function toWei(num) {
  return BigInt(Math.floor(num * 1e18));
}

function parseArgs() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((kv) => {
      const [k, ...rest] = kv.split("=");
      return [k.replace(/^--/, ""), rest.join("=")];
    })
  );
  return {
    factory: args.factory, // optional (if not provided, try deployments json)
    launchFee: args.launchFee ? Number(args.launchFee) : undefined, // RBTC
    minInitialLiquidity: args.minInitialLiquidity ? Number(args.minInitialLiquidity) : undefined, // RBTC
  };
}

async function main() {
  console.log("⚙️ Configuring TokenFactory on Rootstock Testnet (31) ...\n");
  const { factory, launchFee, minInitialLiquidity } = parseArgs();

  const privateKey = process.env.ROOTSTOCK_TESTNET_PRIVATE_KEY;
  const rpcUrl = process.env.ROOTSTOCK_TESTNET_RPC_URL || "https://public-node.testnet.rsk.co";
  if (!privateKey) throw new Error("ROOTSTOCK_TESTNET_PRIVATE_KEY not set");

  const chain = makeRootstockTestnet(rpcUrl);
  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  // Resolve factory address
  let factoryAddress = factory;
  if (!factoryAddress) {
    const path = (await import("path")).default;
    const fs = (await import("fs")).default;
    const deploymentsPath = path.join(process.cwd(), "deployments", "rootstock-testnet-deployment.json");
    if (!fs.existsSync(deploymentsPath)) throw new Error("Deployment file not found and --factory not provided");
    const deployment = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
    factoryAddress = deployment.contracts?.TokenFactory?.address;
  }
  if (!factoryAddress) throw new Error("TokenFactory address missing");

  const TokenFactoryArtifact = await hre.artifacts.readArtifact("TokenFactory");

  // Verify ownership (optional best-effort)
  try {
    const owner = await publicClient.readContract({ address: factoryAddress, abi: TokenFactoryArtifact.abi, functionName: "owner" });
    console.log("Factory:", factoryAddress, "owner:", owner);
  } catch {}

  // Apply updates
  if (typeof launchFee === "number") {
    console.log("Setting launchFee to", launchFee, "RBTC ...");
    const tx1 = await walletClient.writeContract({
      address: factoryAddress,
      abi: TokenFactoryArtifact.abi,
      functionName: "setLaunchFee",
      args: [toWei(launchFee)],
    });
    console.log("  tx:", tx1);
    await publicClient.waitForTransactionReceipt({ hash: tx1 });
  }

  if (typeof minInitialLiquidity === "number") {
    console.log("Setting minInitialLiquidity to", minInitialLiquidity, "RBTC ...");
    const tx2 = await walletClient.writeContract({
      address: factoryAddress,
      abi: TokenFactoryArtifact.abi,
      functionName: "setMinInitialLiquidity",
      args: [toWei(minInitialLiquidity)],
    });
    console.log("  tx:", tx2);
    await publicClient.waitForTransactionReceipt({ hash: tx2 });
  }

  console.log("\n✅ Configuration complete.");
}

main().catch((e) => {
  console.error("❌ Configure failed:", e);
  process.exit(1);
});
