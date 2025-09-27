import { createPublicClient, createWalletClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

// --- Helper Functions ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadArtifact(contractPath, contractName) {
  const artifactFile = path.resolve(__dirname, `../artifacts/contracts/${contractPath}/${contractName}.json`);
  if (!fs.existsSync(artifactFile)) {
    throw new Error(`Artifact not found for ${contractName} at ${artifactFile}`);
  }
  const { abi, bytecode } = JSON.parse(fs.readFileSync(artifactFile, 'utf-8'));
  if (!abi || !bytecode) {
    throw new Error(`Invalid artifact for ${contractName}: ABI or bytecode is missing.`);
  }
  return { abi, bytecode };
}

async function sleep(ms) {
  console.log(`\n⏳ Waiting ${ms / 1000} seconds...`);
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Main Deployment Logic ---
async function main() {
  // 1. Load Environment Variables
  const { BASE_TESTNET_RPC_URL: rpcUrl, BASE_TESTNET_PRIVATE_KEY: pk } = process.env;
  if (!rpcUrl || !pk) {
    throw new Error('BASE_TESTNET_RPC_URL and BASE_TESTNET_PRIVATE_KEY must be set in your .env file.');
  }

  // 2. Setup Viem Clients
  const account = privateKeyToAccount(pk.startsWith('0x') ? pk : `0x${pk}`);
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(rpcUrl) });

  console.log('🚀 Starting Deployment...');
  console.log('   Deployer Address:', account.address);
  console.log('   RPC Endpoint:', rpcUrl);

  // 3. Pre-flight Checks
  try {
    const blockNumber = await publicClient.getBlockNumber();
    const balance = await publicClient.getBalance({ address: account.address });
    const balanceEth = Number(balance) / 1e18;
    console.log('   ✅ Connected to RPC. Current Block:', blockNumber.toString());
    console.log('   Deployer Balance:', `${balanceEth.toFixed(6)} ETH`);
    if (balance < 10n ** 16n) { // 0.01 ETH
      throw new Error('Insufficient balance. Please fund the deployer account with at least 0.01 Base Sepolia ETH.');
    }
  } catch (error) {
    console.error('❌ Pre-flight check failed. Please verify your RPC URL and that the network is reachable.', error.message);
    process.exit(1);
  }

  const deployedAddresses = {};

  // 4. Deploy Contracts
  const contractsToDeploy = [
    { name: 'WhaleToken', path: 'WhaleToken.sol', args: [] },
    { name: 'SecurityController', path: 'SecurityGovernance.sol', args: ['WhaleToken'] },
    { name: 'TokenFactory', path: 'TokenFactory.sol', args: ['WhaleToken'] },
    { name: 'TradingEngine', path: 'TradingEngine.sol', args: ['WhaleToken', 'TokenFactory'] },
    { name: 'BossBattleArena', path: 'BossBattleArena.sol', args: ['WhaleToken', 'TradingEngine', account.address] },
  ];

  for (const contract of contractsToDeploy) {
    console.log(`\n📦 Deploying ${contract.name}...`);
    const artifact = loadArtifact(contract.path, contract.name);
    const constructorArgs = contract.args.map(arg => deployedAddresses[arg] || arg);

    try {
      const deployConfig = {
        abi: artifact.abi,
        bytecode: artifact.bytecode,
        args: constructorArgs,
        account,
      };

      // TokenFactory is a very large contract and can fail gas estimation.
      // We provide a generous hardcoded gas limit to ensure it goes through.
      if (contract.name === 'TokenFactory') {
        console.log('   Setting a high gas limit for TokenFactory...');
        deployConfig.gas = 3000000n; // Set a generous gas limit
      }

      const hash = await walletClient.deployContract(deployConfig);
      console.log(`   Tx Hash: ${hash}`);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const contractAddress = receipt.contractAddress;
      if (!contractAddress) {
        throw new Error(`Deployment failed for ${contract.name}: no contract address found in receipt.`);
      }
      console.log(`   ✅ Deployed ${contract.name} to: ${contractAddress}`);
      deployedAddresses[contract.name] = contractAddress;
      deployedAddresses[contract.path] = contractAddress; // Map by file name as requested
      await sleep(10000); // Wait 10 seconds
    } catch (error) {
      console.error(`❌ Failed to deploy ${contract.name}:`, error.shortMessage || error.message);
      process.exit(1);
    }
  }

  // 5. Write Output File
  const output = {
    'WhaleToken.sol': deployedAddresses['WhaleToken.sol'],
    'SecurityGovernance.sol': deployedAddresses['SecurityGovernance.sol'],
    'TokenFactory.sol': deployedAddresses['TokenFactory.sol'],
    'TradingEngine.sol': deployedAddresses['TradingEngine.sol'],
    'BossBattleArena.sol': deployedAddresses['BossBattleArena.sol'],
  };

  const outDir = path.resolve(__dirname, '../deployments');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'addresses.json');
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2));

  console.log('\n\n📊 DEPLOYMENT COMPLETE');
  console.log(JSON.stringify(output, null, 2));
  console.log(`\n📝 Addresses written to: ${outFile}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
