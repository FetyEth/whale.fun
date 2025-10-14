import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * SecurityGovernance Deployment Module
 * Deploys multi-sig wallet, timelock, and governance contracts
 */
const SecurityGovernanceModule = buildModule(
  "SecurityGovernanceModule",
  (m: any) => {
    // Multi-sig parameters - use accounts directly
    const owner1 = m.getAccount(0);
    const owner2 = m.getAccount(1);
    const owner3 = m.getAccount(2);
    const requiredConfirmations = m.getParameter("requiredConfirmations", 3);

    // Timelock parameters
    const timelockDelay = m.getParameter("timelockDelay", 2 * 24 * 60 * 60); // 2 days

    // Deploy MultiSigWallet
    const multiSigWallet = m.contract("MultiSigWallet", [
      [owner1, owner2, owner3],
      requiredConfirmations,
    ]);

    // Deploy TimeLockController
    const timeLockController = m.contract("TimeLockController", [
      timelockDelay,
    ]);

    // Deploy GovernanceController
    const governanceController = m.contract("GovernanceController", [
      owner1, // Initial admin (will be transferred to timelock)
      timeLockController,
    ]);

    // Deploy SecurityController
    const securityController = m.contract("SecurityController", [
      owner1, // Initial admin (will be transferred to timelock)
    ]);

    return {
      multiSigWallet,
      timeLockController,
      governanceController,
      securityController,
    };
  }
);

export default SecurityGovernanceModule;
