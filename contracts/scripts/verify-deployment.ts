// Verify deployment script
import hre from "hardhat";

async function main() {
  const ethers = (hre as any).ethers;
  
  console.log("🔍 Verifying Whale.fun Deployment on 0G Testnet\n");
  
  const addresses = {
    whaleToken: "0x2d42f7bEfE50FD2803cFc6bA8A4dC75568e322E0",
    devProfileManager: "0xD9f0021F9423C81123fe53d02aCB16dC9e1302dA",
    graduationManager: "0x9Cab23EB3697294eA52B88D88648FfD487530d6e",
    creatorTokenFactory: "0x2e42d3B666bB53035A7A5A89FFC89ac6B09a3688",
    implementation: "0x18b917B1f54E0eeA6d97ADBbF7c945c3Dd94FC5C",
    proxy: "0x68Fa63E97B659F3CdFAFbB2FC859b70Fbb8bccC0"
  };

  // Connect to TokenFactory via proxy
  const tokenFactory = await ethers.getContractAt("TokenFactoryCore", addresses.proxy);

  try {
    // Verify initialization
    console.log("📋 Checking TokenFactory Configuration:");
    console.log("=" .repeat(60));
    
    const launchFee = await tokenFactory.LAUNCH_FEE();
    console.log("✅ Launch Fee:", ethers.formatEther(launchFee), "ETH");
    
    const maxTokens = await tokenFactory.maxTokensPerCreator();
    console.log("✅ Max Tokens Per Creator:", maxTokens.toString());
    
    const whaleTokenAddr = await tokenFactory.whaleToken();
    console.log("✅ WhaleToken Address:", whaleTokenAddr);
    console.log("   Expected:", addresses.whaleToken);
    console.log("   Match:", whaleTokenAddr.toLowerCase() === addresses.whaleToken.toLowerCase() ? "✅" : "❌");
    
    const devProfileAddr = await tokenFactory.devProfileManager();
    console.log("✅ DevProfileManager Address:", devProfileAddr);
    console.log("   Expected:", addresses.devProfileManager);
    console.log("   Match:", devProfileAddr.toLowerCase() === addresses.devProfileManager.toLowerCase() ? "✅" : "❌");
    
    const graduationAddr = await tokenFactory.graduationManager();
    console.log("✅ GraduationManager Address:", graduationAddr);
    console.log("   Expected:", addresses.graduationManager);
    console.log("   Match:", graduationAddr.toLowerCase() === addresses.graduationManager.toLowerCase() ? "✅" : "❌");
    
    const factoryAddr = await tokenFactory.creatorTokenFactory();
    console.log("✅ CreatorTokenFactory Address:", factoryAddr);
    console.log("   Expected:", addresses.creatorTokenFactory);
    console.log("   Match:", factoryAddr.toLowerCase() === addresses.creatorTokenFactory.toLowerCase() ? "✅" : "❌");
    
    const totalTokens = await tokenFactory.totalTokensCreated();
    console.log("✅ Total Tokens Created:", totalTokens.toString());
    
    const owner = await tokenFactory.owner();
    console.log("✅ Contract Owner:", owner);
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 Deployment Verification Complete!");
    console.log("=" .repeat(60));
    console.log("\n📍 Main Contract Address (use this in frontend):");
    console.log("   ", addresses.proxy);
    console.log("\n🔗 Block Explorer:");
    console.log("   https://chainscan-newton.0g.ai/address/" + addresses.proxy);
    
  } catch (error) {
    console.error("\n❌ Verification failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
