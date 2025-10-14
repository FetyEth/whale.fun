import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import WhaleTokenModule from "./WhaleToken.js";
import TokenFactoryModule from "./TokenFactory.js";

/**
 * TradingEngine Deployment Module
 * Deploys the advanced AMM with cross-chain liquidity support
 */
const TradingEngineModule = buildModule("TradingEngineModule", (m: any) => {
  // Get dependencies
  const { whaleToken } = m.useModule(WhaleTokenModule);
  const { tokenFactory } = m.useModule(TokenFactoryModule);

  // Deploy TradingEngine
  const tradingEngine = m.contract("TradingEngine", [whaleToken, tokenFactory]);

  return { tradingEngine, whaleToken, tokenFactory };
});

export default TradingEngineModule;
