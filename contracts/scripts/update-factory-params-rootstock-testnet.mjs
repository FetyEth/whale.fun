import { createWalletClient, createPublicClient, http, parseEther } from "viem";
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

async function main() {
  console.log("\n🔧 Updating TokenFactory parameters on Rootstock Testnet (31) ...\n");

  const privateKey = process.env.ROOTSTOCK_TESTNET_PRIVATE_KEY;
  const rpcUrl = process.env.ROOTSTOCK_TESTNET_RPC_URL || "https://public-node.testnet.rsk.co";
  const factoryAddress = process.env.ROOTSTOCK_TESTNET_FACTORY_ADDRESS || "0x03f1fde590755718cd4e1674704a62409e79ef5f";

  if (!privateKey) throw new Error("ROOTSTOCK_TESTNET_PRIVATE_KEY not set in environment");

  const chain = makeRootstockTestnet(rpcUrl);
  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log("Deployer:", account.address);
  console.log("Balance:", (Number(balance) / 1e18).toFixed(6), "RBTC\n");

  const TokenFactoryArtifact = await hre.artifacts.readArtifact("TokenFactory");
  const abi = TokenFactoryArtifact.abi;

  // Helper to read a public var
  const readVar = async (name) =>
    await publicClient.readContract({ address: factoryAddress, abi, functionName: name });

  // Read current values
  const currentLaunchFee = await readVar("launchFee");
  const currentMinInitialLiquidity = await readVar("minInitialLiquidity");
  const currentMaxTokensPerCreator = await readVar("maxTokensPerCreator");

  console.log("Current params:");
  console.log("  launchFee:", currentLaunchFee.toString());
  console.log("  minInitialLiquidity:", currentMinInitialLiquidity.toString());
  console.log("  maxTokensPerCreator:", currentMaxTokensPerCreator.toString());

  // Desired cheap settings for testnet
  const newLaunchFee = 0n; // allowed by setLaunchFee (<= 0.1 ether)
  const newMinInitialLiquidity = parseEther("0.01"); // lower bound enforced in contract
  const newMaxTokensPerCreator = 10n; // optional

  // setLaunchFee(0)
  if (currentLaunchFee !== newLaunchFee) {
    console.log("\n➡️  Setting launchFee to", newLaunchFee.toString());
    const hash = await walletClient.writeContract({
      address: factoryAddress,
      abi,
      functionName: "setLaunchFee",
      args: [newLaunchFee],
    });
    console.log("   tx:", hash);
    await publicClient.waitForTransactionReceipt({ hash, timeout: 90_000 });
  } else {
    console.log("\nℹ️  launchFee already", newLaunchFee.toString());
  }

  // setMinInitialLiquidity(0.01 ether)
  if (currentMinInitialLiquidity !== newMinInitialLiquidity) {
    console.log("\n➡️  Setting minInitialLiquidity to", newMinInitialLiquidity.toString());
    const hash = await walletClient.writeContract({
      address: factoryAddress,
      abi,
      functionName: "setMinInitialLiquidity",
      args: [newMinInitialLiquidity],
    });
    console.log("   tx:", hash);
    await publicClient.waitForTransactionReceipt({ hash, timeout: 90_000 });
  } else {
    console.log("\nℹ️  minInitialLiquidity already", newMinInitialLiquidity.toString());
  }

  // Optional: increase max tokens per creator to 10
  if (currentMaxTokensPerCreator !== newMaxTokensPerCreator) {
    console.log("\n➡️  Setting maxTokensPerCreator to", newMaxTokensPerCreator.toString());
    const hash = await walletClient.writeContract({
      address: factoryAddress,
      abi,
      functionName: "setMaxTokensPerCreator",
      args: [newMaxTokensPerCreator],
    });
    console.log("   tx:", hash);
    await publicClient.waitForTransactionReceipt({ hash, timeout: 90_000 });
  } else {
    console.log("\nℹ️  maxTokensPerCreator already", newMaxTokensPerCreator.toString());
  }

  // Read back
  const afterLaunchFee = await readVar("launchFee");
  const afterMinInitialLiquidity = await readVar("minInitialLiquidity");
  const afterMaxTokensPerCreator = await readVar("maxTokensPerCreator");

  console.log("\n✅ Updated params:");
  console.log("  launchFee:", afterLaunchFee.toString());
  console.log("  minInitialLiquidity:", afterMinInitialLiquidity.toString());
  console.log("  maxTokensPerCreator:", afterMaxTokensPerCreator.toString());

  console.log("\n🎉 Done");
}

main().catch((e) => {
  console.error("❌ Update failed:", e);
  process.exit(1);
});
