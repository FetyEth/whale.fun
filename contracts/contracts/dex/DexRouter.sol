// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IDexFactory} from "./interfaces/IDexFactory.sol";
import {IDexPair} from "./interfaces/IDexPair.sol";
import {IDexRouter} from "./interfaces/IDexRouter.sol";

contract DexRouter is IDexRouter {
    using SafeERC20 for IERC20;

    address public immutable override factory;

    error Expired();
    error InvalidPath();

    constructor(address _factory) {
        factory = _factory;
    }

    function addLiquidity(AddLiquidityParams calldata p)
        external
        override
        returns (uint amountA, uint amountB, uint liquidity)
    {
        if (block.timestamp > p.deadline) revert Expired();
        address pair = IDexFactory(factory).getPair(p.tokenA, p.tokenB);
        if (pair == address(0)) {
            pair = IDexFactory(factory).createPair(p.tokenA, p.tokenB);
        }

        (address token0, address token1) = p.tokenA < p.tokenB ? (p.tokenA, p.tokenB) : (p.tokenB, p.tokenA);
        (uint amount0, uint amount1) = _optimalLiquidityAmounts(pair, token0, token1, p.amountADesired, p.amountBDesired, p.amountAMin, p.amountBMin, p.tokenA, p.tokenB);

        // transfer in
        IERC20(p.tokenA).safeTransferFrom(msg.sender, pair, token0 == p.tokenA ? amount0 : amount1);
        IERC20(p.tokenB).safeTransferFrom(msg.sender, pair, token0 == p.tokenA ? amount1 : amount0);
        liquidity = IDexPair(pair).mint(p.to);

        amountA = token0 == p.tokenA ? amount0 : amount1;
        amountB = token0 == p.tokenA ? amount1 : amount0;
    }

    function removeLiquidity(RemoveLiquidityParams calldata p)
        external
        override
        returns (uint amountA, uint amountB)
    {
        if (block.timestamp > p.deadline) revert Expired();
        address pair = IDexFactory(factory).getPair(p.tokenA, p.tokenB);
        IERC20(pair).safeTransferFrom(msg.sender, pair, p.liquidity);
        (uint amount0, uint amount1) = IDexPair(pair).burn(p.to);
        (address token0, ) = p.tokenA < p.tokenB ? (p.tokenA, p.tokenB) : (p.tokenB, p.tokenA);
        (amountA, amountB) = token0 == p.tokenA ? (amount0, amount1) : (amount1, amount0);
        require(amountA >= p.amountAMin && amountB >= p.amountBMin, "SLIPPAGE");
    }

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external override returns (uint[] memory amounts) {
        if (block.timestamp > deadline) revert Expired();
        if (path.length < 2) revert InvalidPath();
        amounts = getAmountsOut(amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "SLIPPAGE");
        IERC20(path[0]).safeTransferFrom(msg.sender, IDexFactory(factory).getPair(path[0], path[1]), amounts[0]);
        _swap(amounts, path, to);
    }

    function _swap(uint[] memory amounts, address[] memory path, address _to) internal {
        for (uint i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            address pair = IDexFactory(factory).getPair(input, output);
            (address token0,) = input < output ? (input, output) : (output, input);
            uint amountOut = amounts[i + 1];
            (uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOut) : (amountOut, uint(0));
            address to = i < path.length - 2 ? IDexFactory(factory).getPair(output, path[i + 2]) : _to;
            IDexPair(pair).swap(amount0Out, amount1Out, to);
        }
    }

    function _optimalLiquidityAmounts(
        address pair,
        address token0,
        address token1,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address tokenA,
        address tokenB
    ) internal view returns (uint amount0, uint amount1) {
        (uint112 reserve0, uint112 reserve1,) = IDexPair(pair).getReserves();
        if (reserve0 == 0 && reserve1 == 0) {
            (amount0, amount1) = (amountADesired, amountBDesired);
        } else if (tokenA == token0) {
            uint amount1Optimal = quote(amountADesired, reserve0, reserve1);
            if (amount1Optimal <= amountBDesired) {
                require(amount1Optimal >= amountBMin, "INSUFFICIENT_B");
                (amount0, amount1) = (amountADesired, amount1Optimal);
            } else {
                uint amount0Optimal = quote(amountBDesired, reserve1, reserve0);
                require(amount0Optimal >= amountAMin, "INSUFFICIENT_A");
                (amount0, amount1) = (amount0Optimal, amountBDesired);
            }
        } else {
            uint amount1Optimal = quote(amountADesired, reserve1, reserve0);
            if (amount1Optimal <= amountBDesired) {
                require(amount1Optimal >= amountBMin, "INSUFFICIENT_B");
                (amount0, amount1) = (amountADesired, amount1Optimal);
            } else {
                uint amount0Optimal = quote(amountBDesired, reserve0, reserve1);
                require(amount0Optimal >= amountAMin, "INSUFFICIENT_A");
                (amount0, amount1) = (amount0Optimal, amountBDesired);
            }
        }
    }

    // Pricing helpers
    function quote(uint amountA, uint reserveA, uint reserveB) public pure returns (uint amountB) {
        require(amountA > 0, "INSUFFICIENT_AMOUNT");
        require(reserveA > 0 && reserveB > 0, "INSUFFICIENT_LIQUIDITY");
        amountB = (amountA * reserveB) / reserveA;
    }

    function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts) {
        amounts = new uint[](path.length);
        amounts[0] = amountIn;
        for (uint i; i < path.length - 1; i++) {
            address pair = IDexFactory(factory).getPair(path[i], path[i + 1]);
            (uint112 reserveIn, uint112 reserveOut,) = _getOrderedReserves(pair, path[i], path[i + 1]);
            amounts[i + 1] = _getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }

    function _getOrderedReserves(address pair, address tokenA, address tokenB) internal view returns (uint112 reserveIn, uint112 reserveOut, bool ordered) {
        (address token0,) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        (uint112 reserve0, uint112 reserve1,) = IDexPair(pair).getReserves();
        if (tokenA == token0) {
            return (reserve0, reserve1, true);
        } else {
            return (reserve1, reserve0, false);
        }
    }

    function _getAmountOut(uint amountIn, uint112 reserveIn, uint112 reserveOut) internal pure returns (uint amountOut) {
        require(amountIn > 0, "INSUFFICIENT_INPUT");
        require(reserveIn > 0 && reserveOut > 0, "INSUFFICIENT_LIQUIDITY");
        uint amountInWithFee = amountIn * 9970 / 10000; // 0.30% fee retained in pool
        amountOut = (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee);
    }
}
