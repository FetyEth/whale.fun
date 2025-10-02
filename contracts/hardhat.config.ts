import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem"; // side-effect import registers hre.viem
import "@nomicfoundation/hardhat-ignition-viem"; // side-effect import registers ignition tasks
import dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200, // Higher runs generally reduce runtime gas (slightly larger bytecode)
      },
      metadata: {
        bytecodeHash: "none",
      },
      outputSelection: {
        "*": {
          "*": ["evm.bytecode", "evm.deployedBytecode", "abi"],
        },
      },
      // Additional size optimizations
      viaIR: true, // Enable IR for better optimization
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
  },
};

export default config;
