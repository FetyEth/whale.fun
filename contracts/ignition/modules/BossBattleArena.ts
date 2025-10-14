import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import WhaleTokenModule from "./WhaleToken.js";
import TradingEngineModule from "./TradingEngine.js";

/**
 * BossBattleArena Deployment Module
 * Deploys the gamification system with community battles and rewards
 */
const BossBattleArenaModule = buildModule("BossBattleArenaModule", (m: any) => {
  // Get dependencies
  const { whaleToken } = m.useModule(WhaleTokenModule);
  const { tradingEngine } = m.useModule(TradingEngineModule);

  // Treasury address parameter (will be set to deployer initially)
  const treasuryAddress = m.getParameter("treasuryAddress", m.getAccount(0));

  // Deploy BossBattleArena
  const bossBattleArena = m.contract("BossBattleArena", [
    whaleToken,
    tradingEngine,
    treasuryAddress,
  ]);

  return { bossBattleArena, whaleToken, tradingEngine };
});

export default BossBattleArenaModule;
