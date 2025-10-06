// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IDexPair {
    function token0() external view returns (address);
    function token1() external view returns (address);
}

interface IDexFactory {
    event PairCreated(address indexed token0, address indexed token1, address pair, uint256);
    event FeeToSet(address indexed previous, address indexed current);
    event ProtocolFeeBpsSet(uint16 previousBps, uint16 currentBps);

    function feeTo() external view returns (address);
    function protocolFeeBps() external view returns (uint16);

    function getPair(address tokenA, address tokenB) external view returns (address pair);
    function allPairs(uint256) external view returns (address pair);
    function allPairsLength() external view returns (uint256);

    function createPair(address tokenA, address tokenB) external returns (address pair);

    function setFeeTo(address _feeTo) external;
    function setProtocolFeeBps(uint16 _bps) external;
}
