import dotenv from "dotenv";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFile } from "fs/promises";

// Minimal ERC20 ABI
const ERC20_ABI = [
  { "type": "function", "name": "decimals", "stateMutability": "view", "inputs": [], "outputs": [{"name":"","type":"uint8"}] },
  { "type": "function", "name": "approve", "stateMutability": "nonpayable", "inputs": [{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}], "outputs": [{"name":"","type":"bool"}] },
  { "type": "function", "name": "balanceOf", "stateMutability": "view", "inputs": [{"name":"owner","type":"address"}], "outputs": [{"name":"","type":"uint256"}] }
] as const;

dotenv.config();

async function main() {
  const rpc = process.env.ZERO_G_RPC!;
  const pk = process.env.PRIVATE_KEY!;
  const FACTORY = process.env.DEX_FACTORY as `0x${string}` | undefined;
  const ROUTER = process.env.DEX_ROUTER as `0x${string}` | undefined;
  const TOKEN_A = process.env.TOKEN_A as `0x${string}`;
  const TOKEN_B = process.env.TOKEN_B as `0x${string}`;
  const AMOUNT_A = process.env.AMOUNT_A; // human units, e.g., "100.0"
  const AMOUNT_B = process.env.AMOUNT_B; // human units
  const SLIPPAGE_BPS = Number(process.env.SLIPPAGE_BPS ?? "300"); // 3% default
  const RECEIVER = (process.env.RECEIVER as `0x${string}`) || undefined;

  if (!rpc || !pk) throw new Error("ZERO_G_RPC or PRIVATE_KEY missing in .env");
  if (!FACTORY || !ROUTER) throw new Error("Set DEX_FACTORY and DEX_ROUTER env vars to proceed");
  if (!TOKEN_A || !TOKEN_B || !AMOUNT_A || !AMOUNT_B) throw new Error("Set TOKEN_A, TOKEN_B, AMOUNT_A, AMOUNT_B in .env");

  const account = privateKeyToAccount(("0x" + pk) as `0x${string}`);
  const chain = { id: 16602, name: "zeroGTestnet", nativeCurrency: { name: "ZOG", symbol: "ZOG", decimals: 18 }, rpcUrls: { default: { http: [rpc] } } } as const;
  const transport = http(rpc);
  const wallet = createWalletClient({ account, chain, transport });
  const publicClient = createPublicClient({ chain, transport });

  // Load ABIs for Factory and Router
  const factoryRaw = await readFile(new URL("../artifacts/contracts/dex/DexFactory.sol/DexFactory.json", import.meta.url), "utf-8");
  const routerRaw = await readFile(new URL("../artifacts/contracts/dex/DexRouter.sol/DexRouter.json", import.meta.url), "utf-8");
  const Factory = JSON.parse(factoryRaw);
  const Router = JSON.parse(routerRaw);

  // Fetch decimals and compute amounts in wei
  const decA = await publicClient.readContract({ address: TOKEN_A, abi: ERC20_ABI, functionName: "decimals", args: [] });
  const decB = await publicClient.readContract({ address: TOKEN_B, abi: ERC20_ABI, functionName: "decimals", args: [] });
  const toWei = (amt: string, decimals: number) => {
    const [intP, fracPRaw] = amt.split(".");
    const fracP = (fracPRaw || "").padEnd(decimals, "0").slice(0, decimals);
    return BigInt(intP || "0") * (10n ** BigInt(decimals)) + BigInt(fracP || "0");
  };
  const amountADesired = toWei(AMOUNT_A, Number(decA));
  const amountBDesired = toWei(AMOUNT_B, Number(decB));

  // Create Pair if not exists
  let pair = await publicClient.readContract({ address: FACTORY, abi: Factory.abi, functionName: "getPair", args: [TOKEN_A, TOKEN_B] });
  if (pair === "0x0000000000000000000000000000000000000000") {
    const tx = await wallet.writeContract({ address: FACTORY, abi: Factory.abi, functionName: "createPair", args: [TOKEN_A, TOKEN_B] });
    console.log("createPair tx:", tx);
    await publicClient.waitForTransactionReceipt({ hash: tx, confirmations: 2, pollingInterval: 5000, timeout: 600_000 });
    pair = await publicClient.readContract({ address: FACTORY, abi: Factory.abi, functionName: "getPair", args: [TOKEN_A, TOKEN_B] });
  }
  console.log("Pair:", pair);

  // Approve Router to spend tokens
  const approveA = await wallet.writeContract({ address: TOKEN_A, abi: ERC20_ABI, functionName: "approve", args: [ROUTER, amountADesired] });
  console.log("approve A tx:", approveA);
  await publicClient.waitForTransactionReceipt({ hash: approveA, confirmations: 1, pollingInterval: 3000, timeout: 300_000 });

  const approveB = await wallet.writeContract({ address: TOKEN_B, abi: ERC20_ABI, functionName: "approve", args: [ROUTER, amountBDesired] });
  console.log("approve B tx:", approveB);
  await publicClient.waitForTransactionReceipt({ hash: approveB, confirmations: 1, pollingInterval: 3000, timeout: 300_000 });

  // Compute slippage mins
  const amountAMin = (amountADesired * BigInt(10_000 - SLIPPAGE_BPS)) / 10_000n;
  const amountBMin = (amountBDesired * BigInt(10_000 - SLIPPAGE_BPS)) / 10_000n;

  // Add Liquidity
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800); // 30 min
  const to = (RECEIVER || account.address) as `0x${string}`;
  const txAdd = await wallet.writeContract({
    address: ROUTER,
    abi: Router.abi,
    functionName: "addLiquidity",
    args: [{ tokenA: TOKEN_A, tokenB: TOKEN_B, amountADesired, amountBDesired, amountAMin, amountBMin, to, deadline }],
  });
  console.log("addLiquidity tx:", txAdd);
  const rc = await publicClient.waitForTransactionReceipt({ hash: txAdd, confirmations: 2, pollingInterval: 5000, timeout: 600_000 });
  console.log("addLiquidity receipt:", rc.status);
}

main().catch((e) => { console.error(e); process.exit(1); });
