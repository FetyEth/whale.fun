import dotenv from "dotenv";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFile } from "fs/promises";

dotenv.config();

async function main() {
  const rpc = process.env.ZERO_G_RPC;
  const pk = process.env.PRIVATE_KEY;
  const rewardToken = process.env.WHALE_TOKEN_ADDRESS as `0x${string}` | undefined;
  const rewardPerSec = process.env.REWARD_PER_SEC ? BigInt(process.env.REWARD_PER_SEC) : 1n * 10n ** 18n;
  if (!rpc || !pk) throw new Error("ZERO_G_RPC or PRIVATE_KEY missing in .env");
  if (!rewardToken) throw new Error("Set WHALE_TOKEN_ADDRESS in .env to deploy DexStaking");

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

  // Load artifact
  const dexStakingRaw = await readFile(new URL("../artifacts/contracts/dex/DexStaking.sol/DexStaking.json", import.meta.url), "utf-8");
  const DexStakingJson = JSON.parse(dexStakingRaw);

  const txHash = await client.deployContract({
    abi: DexStakingJson.abi,
    bytecode: DexStakingJson.bytecode,
    args: [rewardToken, rewardPerSec, account.address],
  });
  console.log("DexStaking tx:", txHash);

  // Longer wait window for slower testnets
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    pollingInterval: 2000,
    timeout: 180_000,
  });
  console.log("DexStaking deployed:", receipt.contractAddress);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
