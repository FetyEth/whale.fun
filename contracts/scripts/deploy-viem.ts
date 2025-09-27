import { createPublicClient, createWalletClient, http, type Hex, type PrivateKeyAccount } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helpers to load artifacts
function loadArtifact(contractPath: string, contractName: string) {
  const artifactFile = path.resolve(
    __dirname,
    `../artifacts/contracts/${contractPath}/${contractName}.json`
  );
  const raw = fs.readFileSync(artifactFile, 'utf-8');
  const json = JSON.parse(raw);
  return {
    abi: json.abi,
    bytecode: json.bytecode as Hex,
  };
}

async function main() {
  const RPC_URL = process.env.BASE_TESTNET_RPC_URL;
  let PK = process.env.BASE_TESTNET_PRIVATE_KEY;
  if (!RPC_URL || !PK) {
    throw new Error('Missing BASE_TESTNET_RPC_URL or BASE_TESTNET_PRIVATE_KEY in .env');
  }
  // Normalize private key to 0x-prefixed hex
  if (!PK.startsWith('0x')) {
    PK = `0x${PK}`;
  }

  // Create viem clients
  const account: PrivateKeyAccount = privateKeyToAccount(PK as Hex);
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) });
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC_URL) });

  // Sanity check network
  const chain = await publicClient.getChainId();
  if (chain !== baseSepolia.id) {
    throw new Error(`Connected to wrong chain. Expected ${baseSepolia.id}, got ${chain}`);
  }

  const deployer = account.address;
  console.log('🚀 Starting deployment to Base Testnet (baseSepolia)');
  console.log('Deployer:', deployer);

  // Start from current account nonce and increment per tx
  let nonce = await publicClient.getTransactionCount({ address: deployer });

  // 1) WhaleToken
  console.log('\n📦 Deploying WhaleToken...');
  const WhaleToken = loadArtifact('WhaleToken.sol', 'WhaleToken');
  const whaleHash = await walletClient.deployContract({
    abi: WhaleToken.abi,
    bytecode: WhaleToken.bytecode,
    args: [],
    nonce,
  });
  const whaleReceipt = await publicClient.waitForTransactionReceipt({ hash: whaleHash });
  const whaleToken = whaleReceipt.contractAddress!;
  console.log('   WhaleToken:', whaleToken);
  nonce++;

  // 2) TokenFactory(whaleToken)
  console.log('\n📦 Deploying TokenFactory...');
  const TokenFactory = loadArtifact('TokenFactory.sol', 'TokenFactory');
  const factoryHash = await walletClient.deployContract({
    abi: TokenFactory.abi,
    bytecode: TokenFactory.bytecode,
    args: [whaleToken],
    nonce,
  });
  const factoryReceipt = await publicClient.waitForTransactionReceipt({ hash: factoryHash });
  const tokenFactory = factoryReceipt.contractAddress!;
  console.log('   TokenFactory:', tokenFactory);
  nonce++;

  // 3) TradingEngine(whaleToken, tokenFactory)
  console.log('\n📦 Deploying TradingEngine...');
  const TradingEngine = loadArtifact('TradingEngine.sol', 'TradingEngine');
  const engineHash = await walletClient.deployContract({
    abi: TradingEngine.abi,
    bytecode: TradingEngine.bytecode,
    args: [whaleToken, tokenFactory],
    nonce,
  });
  const engineReceipt = await publicClient.waitForTransactionReceipt({ hash: engineHash });
  const tradingEngine = engineReceipt.contractAddress!;
  console.log('   TradingEngine:', tradingEngine);
  nonce++;

  // 4) TimeLockController(delay)
  console.log('\n📦 Deploying TimeLockController...');
  const TimeLockController = loadArtifact('SecurityGovernance.sol', 'TimeLockController');
  const TWO_DAYS = BigInt(2 * 24 * 60 * 60);
  const timelockHash = await walletClient.deployContract({
    abi: TimeLockController.abi,
    bytecode: TimeLockController.bytecode,
    args: [TWO_DAYS],
    nonce,
  });
  const timelockReceipt = await publicClient.waitForTransactionReceipt({ hash: timelockHash });
  const timeLock = timelockReceipt.contractAddress!;
  console.log('   TimeLockController:', timeLock);
  nonce++;

  // 5) GovernanceController(whaleToken, timeLock)
  console.log('\n📦 Deploying GovernanceController...');
  const GovernanceController = loadArtifact('SecurityGovernance.sol', 'GovernanceController');
  const govHash = await walletClient.deployContract({
    abi: GovernanceController.abi,
    bytecode: GovernanceController.bytecode,
    args: [whaleToken, timeLock],
    nonce,
  });
  const govReceipt = await publicClient.waitForTransactionReceipt({ hash: govHash });
  const governanceController = govReceipt.contractAddress!;
  console.log('   GovernanceController:', governanceController);
  nonce++;

  // 6) SecurityController(whaleToken)
  console.log('\n📦 Deploying SecurityController...');
  const SecurityController = loadArtifact('SecurityGovernance.sol', 'SecurityController');
  const secHash = await walletClient.deployContract({
    abi: SecurityController.abi,
    bytecode: SecurityController.bytecode,
    args: [whaleToken],
    nonce,
  });
  const secReceipt = await publicClient.waitForTransactionReceipt({ hash: secHash });
  const securityController = secReceipt.contractAddress!;
  console.log('   SecurityController:', securityController);
  nonce++;

  // 7) BossBattleArena(whaleToken, tradingEngine, treasury)
  console.log('\n📦 Deploying BossBattleArena...');
  const BossBattleArena = loadArtifact('BossBattleArena.sol', 'BossBattleArena');
  const bossHash = await walletClient.deployContract({
    abi: BossBattleArena.abi,
    bytecode: BossBattleArena.bytecode,
    args: [whaleToken, tradingEngine, deployer],
    nonce,
  });
  const bossReceipt = await publicClient.waitForTransactionReceipt({ hash: bossHash });
  const bossBattleArena = bossReceipt.contractAddress!;
  console.log('   BossBattleArena:', bossBattleArena);

  console.log('\n📊 DEPLOYMENT SUMMARY (Base Testnet)');
  console.log('Deployer:', deployer);
  console.log('WhaleToken:', whaleToken);
  console.log('TokenFactory:', tokenFactory);
  console.log('TradingEngine:', tradingEngine);
  console.log('TimeLockController:', timeLock);
  console.log('GovernanceController:', governanceController);
  console.log('SecurityController:', securityController);
  console.log('BossBattleArena:', bossBattleArena);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
