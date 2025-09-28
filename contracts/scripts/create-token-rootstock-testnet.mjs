import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import hre from "hardhat";
import fs from "fs";
import path from "path";

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

function parseArgs() {
  // Simple arg parsing (use defaults if not provided)
  const args = Object.fromEntries(
    process.argv.slice(2).map((kv) => {
      const [k, ...rest] = kv.split("=");
      return [k.replace(/^--/, ""), rest.join("=")];
    })
  );
  return {
    name: args.name || "TestToken",
    symbol: args.symbol || "TEST",
    totalSupply: args.totalSupply ? Number(args.totalSupply) : 1_000_000, // human units
    targetMarketCap: args.targetMarketCap ? Number(args.targetMarketCap) : 50, // in ETH/RBTC units
    creatorFeePercent: args.creatorFeePercent ? Number(args.creatorFeePercent) : 50, // 0-10000? (factory expects 30..95)
    description: args.description || "Test token",
    logoUrl: args.logoUrl || "https://example.com/logo.png",
    expectedCommunitySize: args.expectedCommunitySize ? Number(args.expectedCommunitySize) : 0,
    extraLiquidity: args.extraLiquidity ? Number(args.extraLiquidity) : 0, // additional RBTC to send above min
    value: args.value ? Number(args.value) : undefined, // optional total msg.value in RBTC
  };
}

function toWei(num) {
  return BigInt(Math.floor(num * 1e18));
}

async function main() {
  console.log("🚀 Creating a token on Rootstock Testnet (31) ...\n");

  const params = parseArgs();
  console.log("Params:", params);

  const privateKey = process.env.ROOTSTOCK_TESTNET_PRIVATE_KEY;
  const rpcUrl = process.env.ROOTSTOCK_TESTNET_RPC_URL || "https://public-node.testnet.rsk.co";
  if (!privateKey) throw new Error("ROOTSTOCK_TESTNET_PRIVATE_KEY not set");

  const chain = makeRootstockTestnet(rpcUrl);
  const account = privateKeyToAccount(privateKey);

  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  // Load TokenFactory address from deployments json
  const deploymentsPath = path.join(process.cwd(), "deployments", "rootstock-testnet-deployment.json");
  if (!fs.existsSync(deploymentsPath)) throw new Error("Deployment file not found: " + deploymentsPath);
  const deployment = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
  const factoryAddress = deployment.contracts?.TokenFactory?.address;
  if (!factoryAddress) throw new Error("TokenFactory address missing in deployment file");

  // Load artifacts
  const TokenFactoryArtifact = await hre.artifacts.readArtifact("TokenFactory");

  // Determine msg.value
  let value;
  if (typeof params.value === "number") {
    value = toWei(params.value);
    console.log("Using user-provided value (RBTC):", params.value);
  } else {
    try {
      const launchFee = await publicClient.readContract({
        address: factoryAddress,
        abi: TokenFactoryArtifact.abi,
        functionName: "launchFee",
      });
      const minInitialLiquidity = await publicClient.readContract({
        address: factoryAddress,
        abi: TokenFactoryArtifact.abi,
        functionName: "minInitialLiquidity",
      });
      value = (launchFee + minInitialLiquidity + toWei(params.extraLiquidity));
      console.log("Factory fees detected:", {
        factoryAddress,
        launchFee: String(launchFee),
        minInitialLiquidity: String(minInitialLiquidity),
        value: String(value),
      });
    } catch (e) {
      // Fallback to a safe default if reads fail
      const fallbackRbtc = 0.12 + (params.extraLiquidity || 0); // 0.02 + 0.10 baseline
      value = toWei(fallbackRbtc);
      console.log(
        "⚠️ Could not read launchFee/minInitialLiquidity. Using fallback value (RBTC):",
        fallbackRbtc,
        "\nError:",
        e?.message || e
      );
    }
  }

  // Prepare inputs
  const totalSupplyRaw = toWei(params.totalSupply); // 18 decimals
  const targetMarketCapWei = toWei(params.targetMarketCap);
  const creatorFeeBP = BigInt(params.creatorFeePercent); // factory expects 30..95

  console.log("Submitting createTokenWithCommunityData ...");
  const hash = await walletClient.writeContract({
    address: factoryAddress,
    abi: TokenFactoryArtifact.abi,
    functionName: "createTokenWithCommunityData",
    args: [
      params.name,
      params.symbol,
      totalSupplyRaw,
      targetMarketCapWei,
      creatorFeeBP,
      params.description,
      params.logoUrl,
      BigInt(params.expectedCommunitySize),
    ],
    value,
  });

  console.log("TX:", hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
  console.log("✅ Token created. Gas used:", receipt.gasUsed?.toString?.());

  // Optional: parse logs to find TokenCreated event
  try {
    const logs = receipt.logs || [];
    const iface = new hre.ethers.Interface(TokenFactoryArtifact.abi);
    for (const log of logs) {
      try {
        const parsed = iface.parseLog({ topics: log.topics, data: log.data });
        if (parsed?.name === "TokenCreated") {
          const tokenAddress = parsed.args?.tokenAddress || parsed.args?.[0];
          console.log("🎉 New token address:", tokenAddress);
        }
      } catch {}
    }
  } catch {}
}

main().catch((e) => {
  console.error("❌ Create token failed:", e);
  process.exit(1);
});
