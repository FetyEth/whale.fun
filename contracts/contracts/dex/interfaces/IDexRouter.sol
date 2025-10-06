// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IDexRouter {
    struct AddLiquidityParams {
        address tokenA;
        address tokenB;
        uint amountADesired;
        uint amountBDesired;
        uint amountAMin;
        uint amountBMin;
        address to;
        uint deadline;
    }

    struct RemoveLiquidityParams {
        address tokenA;
        address tokenB;
        uint liquidity;
        uint amountAMin;
        uint amountBMin;
        address to;
        uint deadline;
    }

    function factory() external view returns (address);

    function addLiquidity(AddLiquidityParams calldata p)
        external
        returns (uint amountA, uint amountB, uint liquidity);

    function removeLiquidity(RemoveLiquidityParams calldata p)
        external
        returns (uint amountA, uint amountB);

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}
