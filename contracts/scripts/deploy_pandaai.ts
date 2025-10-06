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

  // Load artifact
  const artifactRaw = await readFile(
    new URL("../artifacts/contracts/dex/PandaAiToken.sol/PandaAiToken.json", import.meta.url)
  , "utf-8");
  const artifact = JSON.parse(artifactRaw);
  const abi = artifact.abi;
  const bytecode: `0x${string}` = artifact.bytecode;

  const hash = await client.deployContract({ abi, bytecode, args: [] });
  console.log("Tx hash:", hash);

  // Wait for receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("PandaAiToken deployed at:", receipt.contractAddress);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
