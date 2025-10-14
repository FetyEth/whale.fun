import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TokenGraduationModule = buildModule("TokenGraduation", (m) => {
  // Get TokenFactory address parameter
  const tokenFactory = m.getParameter("tokenFactory");

  // Deploy TokenGraduation
  const tokenGraduation = m.contract("TokenGraduation", [tokenFactory]);

  return { tokenGraduation };
});

export default TokenGraduationModule;
