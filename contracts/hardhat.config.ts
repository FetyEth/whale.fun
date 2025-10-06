import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem"; // side-effect import registers hre.viem
import "@nomicfoundation/hardhat-ignition"; // ensure ignition tasks are registered
import "@nomicfoundation/hardhat-ignition-viem"; // viem bindings for ignition
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
    zeroGTestnet: {
      type: "http",
      url: process.env.ZERO_G_RPC ?? "",
      chainId: 16602,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};

export default config;
