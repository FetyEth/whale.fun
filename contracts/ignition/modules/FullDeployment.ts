import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const FullDeploymentModule = buildModule("FullDeployment", (m) => {
  // Step 1: Deploy WhaleToken first (if not already deployed)
  const whaleToken = m.contract("WhaleToken", []);

  // Step 2: Deploy TokenFactory (Root Contract)
  const tokenFactory = m.contract("TokenFactory", [whaleToken]);

  // Step 3: Deploy TokenGraduation (linked to TokenFactory)
  const tokenGraduation = m.contract("TokenGraduation", [tokenFactory]);

  // Step 4: Deploy libraries if needed
  // Note: Libraries are usually deployed automatically by Hardhat when referenced

  return { 
    whaleToken, 
    tokenFactory, 
    tokenGraduation 
  };
});

export default FullDeploymentModule;
