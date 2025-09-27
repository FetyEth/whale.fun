import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TokenFactoryRootModule = buildModule("TokenFactoryRoot", (m) => {
  // Get WhaleToken address parameter
  const whaleToken = m.getParameter("whaleToken");

  // Deploy TokenFactory (Root Contract)
  const tokenFactory = m.contract("TokenFactory", [whaleToken]);

  return { tokenFactory };
});

export default TokenFactoryRootModule;
