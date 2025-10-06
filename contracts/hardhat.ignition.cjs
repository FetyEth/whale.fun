// CJS Hardhat config dedicated to Ignition CLI until plugin task registration works under ESM/TS.
require('dotenv').config();
require('@nomicfoundation/hardhat-toolbox-viem');
require('@nomicfoundation/hardhat-ignition');
require('@nomicfoundation/hardhat-ignition-viem');

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.28',
    settings: {
      optimizer: { enabled: true, runs: 200 },
      metadata: { bytecodeHash: 'none' },
      outputSelection: {
        '*': { '*': ['evm.bytecode', 'evm.deployedBytecode', 'abi'] },
      },
      viaIR: true,
    },
  },
  networks: {
    hardhatMainnet: { type: 'edr-simulated', chainType: 'l1' },
    hardhatOp: { type: 'edr-simulated', chainType: 'op' },
    zeroGTestnet: {
      type: 'http',
      url: process.env.ZERO_G_RPC || '',
      chainId: 16602,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};
