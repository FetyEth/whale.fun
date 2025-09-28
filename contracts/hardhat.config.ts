import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem"; // side-effect import registers hre.viem
import "@nomicfoundation/hardhat-ignition-viem"; // side-effect import registers ignition tasks
import { configVariable } from "hardhat/config";
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
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
    baseTestnet: {
      type: "http",
      chainType: "l1",
      url: configVariable("BASE_TESTNET_RPC_URL"),
      accounts: [configVariable("BASE_TESTNET_PRIVATE_KEY")],
    },
    rootstockTestnet: {
      type: "http",
      chainType: "l1",
      url: configVariable("ROOTSTOCK_TESTNET_RPC_URL"),
      accounts: [configVariable("ROOTSTOCK_TESTNET_PRIVATE_KEY")],
      chainId: 31,
    },
    celoAlfajores: {
      type: "http",
      chainType: "l1",
      url: "https://alfajores-forno.celo-testnet.org",
      accounts: ["0x9f55a656f73b257dc970624b558e56c2c78bc07a793edf95fa614f4f4a7f22ae"],
      chainId: 44787,
    },
  },
};

export default config;