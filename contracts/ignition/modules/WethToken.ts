import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * WethToken Deployment Module
 * Deploys the platform governance token with staking and cross-chain support
 */
const WethTokenModule = buildModule("WethTokenModule", (m: any) => {
  // Deploy WethToken
  const WethToken = m.contract("WethToken");

  return { WethToken };
});

export default WethTokenModule;
