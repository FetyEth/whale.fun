import dotenv from "dotenv";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFile } from "fs/promises";

dotenv.config();

async function main() {
  const rpc = process.env.ZERO_G_RPC;
  const pk = process.env.PRIVATE_KEY;
  if (!rpc || !pk) throw new Error("ZERO_G_RPC or PRIVATE_KEY missing in .env");

  const account = privateKeyToAccount(("0x" + pk) as `0x${string}`);
  const chain = {
    id: 16602,
    name: "zeroGTestnet",
    nativeCurrency: { name: "ZOG", symbol: "ZOG", decimals: 18 },
    rpcUrls: { default: { http: [rpc] } },
  } as const;

  const transport = http(rpc);
  const client = createWalletClient({ account, chain, transport });
  const publicClient = createPublicClient({ chain, transport });
  console.log("Deployer:", account.address);

  // Load artifacts
  const dexFactoryRaw = await readFile(new URL("../artifacts/contracts/dex/DexFactory.sol/DexFactory.json", import.meta.url), "utf-8");
  const dexRouterRaw = await readFile(new URL("../artifacts/contracts/dex/DexRouter.sol/DexRouter.json", import.meta.url), "utf-8");
  const dexStakingRaw = await readFile(new URL("../artifacts/contracts/dex/DexStaking.sol/DexStaking.json", import.meta.url), "utf-8");
  const DexFactoryJson = JSON.parse(dexFactoryRaw);
  const DexRouterJson = JSON.parse(dexRouterRaw);
  const DexStakingJson = JSON.parse(dexStakingRaw);

  // Deploy Factory
  const feeTo = account.address as `0x${string}`;
  const protocolFeeBps = 5; // 0.05%
  const txFactory = await client.deployContract({
    abi: DexFactoryJson.abi,
    bytecode: DexFactoryJson.bytecode,
    args: [feeTo, protocolFeeBps],
  });
  console.log("DexFactory tx:", txFactory);
  const rcFactory = await publicClient.waitForTransactionReceipt({ hash: txFactory });
  const factoryAddress = rcFactory.contractAddress as `0x${string}`;
  console.log("DexFactory deployed:", factoryAddress);

  // Deploy Router
  const txRouter = await client.deployContract({
    abi: DexRouterJson.abi,
    bytecode: DexRouterJson.bytecode,
    args: [factoryAddress],
  });
  console.log("DexRouter tx:", txRouter);
  const rcRouter = await publicClient.waitForTransactionReceipt({ hash: txRouter });
  const routerAddress = rcRouter.contractAddress as `0x${string}`;
  console.log("DexRouter deployed:", routerAddress);

  // Optionally deploy staking if env var is provided
  const rewardToken = process.env.WHALE_TOKEN_ADDRESS as `0x${string}` | undefined;
  if (rewardToken) {
    const rewardPerSec = (process.env.REWARD_PER_SEC
      ? BigInt(process.env.REWARD_PER_SEC)
      : 1n * 10n ** 18n);
    const txStaking = await client.deployContract({
      abi: DexStakingJson.abi,
      bytecode: DexStakingJson.bytecode,
      args: [rewardToken, rewardPerSec, account.address],
    });
    console.log("DexStaking tx:", txStaking);
    const rcStaking = await publicClient.waitForTransactionReceipt({ hash: txStaking });
    console.log("DexStaking deployed:", rcStaking.contractAddress);
  } else {
    console.log("Skipping DexStaking: set WHALE_TOKEN_ADDRESS in .env to deploy.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
