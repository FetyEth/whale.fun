import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * WhaleToken Deployment Module
 * Deploys the platform governance token with staking and cross-chain support
 */
const WhaleTokenModule = buildModule("WhaleTokenModule", (m: any) => {
  // Deploy WhaleToken
  const whaleToken = m.contract("WhaleToken");

  return { whaleToken };
});

export default WhaleTokenModule;
