import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import WhaleTokenModule from "./WhaleToken.js";

/**
 * Dex Deployment Module
 * - Deploys DexFactory with feeTo=deployer, protocolFeeBps=5 (0.05%)
 * - Deploys DexRouter pointing to the factory
 * - Deploys DexStaking using WhaleToken as the reward token
 */
const DexModule = buildModule("DexModule", (m: any) => {
  // Use existing WhaleToken as reward token
  const { whaleToken } = m.useModule(WhaleTokenModule);

  // Parameters
  const protocolFeeBps = 5; // 0.05% protocol fee (on top of 0.30% total kept in pair via fee-minting logic)
  const feeTo = m.getAccount(0);

  // Deploy Factory and Router
  const dexFactory = m.contract("DexFactory", [feeTo, protocolFeeBps]);
  const dexRouter = m.contract("DexRouter", [dexFactory]);

  // Deploy Staking (MasterChef-like)
  const rewardPerSec = m.getParameter("rewardPerSec", 1n * 10n ** 18n); // default 1 token / sec
  const dexStaking = m.contract("DexStaking", [whaleToken, rewardPerSec, feeTo]);

  return { dexFactory, dexRouter, dexStaking, whaleToken };
});

export default DexModule;
