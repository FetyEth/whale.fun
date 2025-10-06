// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IDexFactory} from "./interfaces/IDexFactory.sol";
import {DexPair} from "./DexPair.sol";

contract DexFactory is IDexFactory {
    address public override feeTo;
    uint16 public override protocolFeeBps; // part of the swap fee routed to feeTo

    mapping(address => mapping(address => address)) public override getPair;
    address[] public override allPairs;

    address public owner;

    error OnlyOwner();
    error IdenticalAddresses();
    error ZeroAddress();
    error PairExists();

    constructor(address _feeTo, uint16 _protocolFeeBps) {
        owner = msg.sender;
        feeTo = _feeTo;
        protocolFeeBps = _protocolFeeBps; // e.g., 30 = 0.3%
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    function allPairsLength() external view override returns (uint256) {
        return allPairs.length;
    }

    function createPair(address tokenA, address tokenB) external override returns (address pair) {
        if (tokenA == tokenB) revert IdenticalAddresses();
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        if (token0 == address(0)) revert ZeroAddress();
        if (getPair[token0][token1] != address(0)) revert PairExists();

        // Deploy pair using create2 for deterministic address
        bytes memory bytecode = type(DexPair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        address pairAddr;
        assembly {
            pairAddr := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        // Initialize the pair with tokens
        DexPair(pairAddr).initialize(token0, token1);

        getPair[token0][token1] = pairAddr;
        getPair[token1][token0] = pairAddr;
        allPairs.push(pairAddr);
        emit PairCreated(token0, token1, pairAddr, allPairs.length);
        pair = pairAddr;
    }

    function setFeeTo(address _feeTo) external override onlyOwner {
        emit FeeToSet(feeTo, _feeTo);
        feeTo = _feeTo;
    }

    function setProtocolFeeBps(uint16 _bps) external override onlyOwner {
        emit ProtocolFeeBpsSet(protocolFeeBps, _bps);
        protocolFeeBps = _bps;
    }
}
