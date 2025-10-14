import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CreatorTokenModule = buildModule("CreatorToken", (m) => {
  // Parameters for CreatorToken deployment
  const name = m.getParameter("name", "Test Creator Token");
  const symbol = m.getParameter("symbol", "TCT");
  const totalSupply = m.getParameter("totalSupply", "1000000000000000000000000"); // 1M tokens
  const targetMarketCap = m.getParameter("targetMarketCap", "100000000000000000000"); // 100 ETH
  const creator = m.getParameter("creator");
  const whaleToken = m.getParameter("whaleToken");
  const creatorFeePercent = m.getParameter("creatorFeePercent", 50); // 0.5%
  const description = m.getParameter("description", "A test creator token");
  const logoUrl = m.getParameter("logoUrl", "");
  const communitySize = m.getParameter("communitySize", 1000);
  const liquidityDepth = m.getParameter("liquidityDepth", "1000000000000000000"); // 1 ETH

  // Deploy CreatorToken
  const creatorToken = m.contract("CreatorToken", [
    name,
    symbol,
    totalSupply,
    targetMarketCap,
    creator,
    whaleToken,
    creatorFeePercent,
    description,
    logoUrl,
    communitySize,
    liquidityDepth,
  ]);

  return { creatorToken };
});

export default CreatorTokenModule;
