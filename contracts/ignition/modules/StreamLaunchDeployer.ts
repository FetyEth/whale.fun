import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import WhaleTokenModule from "./WhaleToken.js";
import TokenFactoryModule from "./TokenFactory.js";
import TradingEngineModule from "./TradingEngine.js";
import BossBattleArenaModule from "./BossBattleArena.js";
import SecurityGovernanceModule from "./SecurityGovernance.js";

/**
 * StreamLaunchDeployer Module
 * Master deployment module that orchestrates the entire ecosystem
 */
const StreamLaunchDeployerModule = buildModule(
  "StreamLaunchDeployerModule",
  (m: any) => {
    // Get all dependency modules
    const { whaleToken } = m.useModule(WhaleTokenModule);
    const { tokenFactory } = m.useModule(TokenFactoryModule);
    const { tradingEngine } = m.useModule(TradingEngineModule);
    const { bossBattleArena } = m.useModule(BossBattleArenaModule);
    const {
      multiSigWallet,
      timeLockController,
      governanceController,
      securityController,
    } = m.useModule(SecurityGovernanceModule);

    // Multi-sig owners for the deployer
    const owner1 = m.getAccount(0);
    const owner2 = m.getAccount(1);
    const owner3 = m.getAccount(2);

    // Deploy StreamLaunchDeployer
    const streamLaunchDeployer = m.contract("StreamLaunchDeployer", [
      [owner1, owner2, owner3],
    ]);

    // After deployment, call deploySystem() to initialize everything
    m.call(streamLaunchDeployer, "deploySystem", [], {
      id: "deploy_system",
    });

    return {
      streamLaunchDeployer,
      whaleToken,
      tokenFactory,
      tradingEngine,
      bossBattleArena,
      multiSigWallet,
      timeLockController,
      governanceController,
      securityController,
    };
  }
);

export default StreamLaunchDeployerModule;
