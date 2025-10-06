import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * PandaAiToken Deployment Module
 * Deploys the platform governance token with staking and cross-chain support
 */
const PandaAiTokenModule = buildModule("PandaAiTokenModule", (m: any) => {
  // Deploy PandaAiToken
  const PandaAiToken = m.contract("PandaAiToken");

  return { PandaAiToken };
});

export default PandaAiTokenModule;
