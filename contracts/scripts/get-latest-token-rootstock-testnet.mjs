import { createPublicClient, http } from "viem";
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

async function main() {
  const rpcUrl = process.env.ROOTSTOCK_TESTNET_RPC_URL || "https://public-node.testnet.rsk.co";
  const chain = makeRootstockTestnet(rpcUrl);
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });

  const deploymentsPath = path.join(process.cwd(), "deployments", "rootstock-testnet-deployment.json");
  if (!fs.existsSync(deploymentsPath)) throw new Error("Deployment file not found: " + deploymentsPath);
  const deployment = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
  const factoryAddress = deployment.contracts?.TokenFactory?.address;
  if (!factoryAddress) throw new Error("TokenFactory address missing in deployment file");

  const TokenFactoryArtifact = await hre.artifacts.readArtifact("TokenFactory");

  const tokens = await publicClient.readContract({
    address: factoryAddress,
    abi: TokenFactoryArtifact.abi,
    functionName: "getAllTokens",
  });

  console.log("Tokens (", tokens.length, "):");
  tokens.forEach((t, i) => console.log(`${i + 1}. ${t}`));
  if (tokens.length > 0) {
    console.log("\nLatest token:", tokens[tokens.length - 1]);
  }
}

main().catch((e) => {
  console.error("❌ Failed:", e);
  process.exit(1);
});
