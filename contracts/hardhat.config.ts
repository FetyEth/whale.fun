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
        runs: 1, // Minimum runs for maximum size reduction
        details: {
          yul: true,
          yulDetails: {
            stackAllocation: true,
            optimizerSteps: "dhfoDgvulfnTUtnIf[xa[r]scLMcCTUtTOntnfDIulLculVcul [j]Tpeulxa[rul]xa[r]cLgvifCTUca[r]LSsTFOtfDnca[r]Iulc]jmul[jul] VcTOcul jmul"
          }
        }
      },
      metadata: {
        bytecodeHash: "none", // Remove metadata hash to save bytes
        appendCBOR: false     // Remove CBOR metadata
      },
      outputSelection: {
        "*": {
          "*": ["evm.bytecode", "evm.deployedBytecode", "abi"],
        },
      },
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
