import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import WhaleTokenModule from "./WhaleToken.js";

/**
 * TokenFactory Deployment Module
 * Deploys the enhanced token factory with MEV protection and dynamic bonding curves
 */
const TokenFactoryModule = buildModule("TokenFactoryModule", (m: any) => {
  // Get WhaleToken from dependency
  const { whaleToken } = m.useModule(WhaleTokenModule);

  // Deploy TokenFactory with WhaleToken address
  const tokenFactory = m.contract("TokenFactory", [whaleToken]);

  return { tokenFactory, whaleToken };
});

export default TokenFactoryModule;
