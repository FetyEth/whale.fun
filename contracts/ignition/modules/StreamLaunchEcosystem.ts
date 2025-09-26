import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import StreamLaunchDeployerModule from "./StreamLaunchDeployer.js";

/**
 * Complete StreamLaunch Ecosystem Deployment
 * This is the main entry point that deploys the entire whale.fun platform
 */
const StreamLaunchEcosystemModule = buildModule(
  "StreamLaunchEcosystemModule",
  (m: any) => {
    // Deploy the complete ecosystem
    const ecosystem = m.useModule(StreamLaunchDeployerModule);

    return ecosystem;
  }
);

export default StreamLaunchEcosystemModule;
