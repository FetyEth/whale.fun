// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IDexPair} from "./interfaces/IDexPair.sol";
import {IDexFactory} from "./interfaces/IDexFactory.sol";

contract DexPair is ERC20, IDexPair {
    using SafeERC20 for IERC20;

    uint256 private constant MINIMUM_LIQUIDITY = 1000;
    uint256 private constant FEE_BPS = 30; // 0.30% swap fee retained in pool
    uint256 private constant BPS = 10_000;

    address public factory;
    address public token0;
    address public token1;

    uint112 private reserve0; // uses single storage slot, accessible via getReserves
    uint112 private reserve1; // uses single storage slot, accessible via getReserves
    uint32  private blockTimestampLast;

    uint256 private kLast; // reserve0 * reserve1, as of immediately after the most recent liquidity event

    bool private initialized;

    constructor() ERC20("Whale LP", "WLP") {}

    function initialize(address _token0, address _token1) external {
        require(!initialized, "INITED");
        factory = msg.sender;
        token0 = _token0;
        token1 = _token1;
        initialized = true;
    }

    function getReserves() public view override returns (uint112, uint112, uint32) {
        return (reserve0, reserve1, blockTimestampLast);
    }

    function _update(uint balance0, uint balance1, uint112 _reserve0, uint112 _reserve1) private {
        require(balance0 <= type(uint112).max && balance1 <= type(uint112).max, "OVERFLOW");
        uint32 blockTimestamp = uint32(block.timestamp);
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = blockTimestamp;
        emit Sync(reserve0, reserve1);
    }

    function _mintFee(uint112 _reserve0, uint112 _reserve1) private returns (bool feeOn) {
        address feeTo = IDexFactory(factory).feeTo();
        feeOn = feeTo != address(0);
        uint _kLast = kLast; // gas savings
        if (feeOn) {
            if (_kLast != 0) {
                uint rootK = _sqrt(uint(_reserve0) * uint(_reserve1));
                uint rootKLast = _sqrt(_kLast);
                if (rootK > rootKLast) {
                    uint _totalSupply = totalSupply();
                    // liquidity = totalSupply * (rootK - rootKLast) / (rootK * 5 + rootKLast)
                    // This mints roughly 1/6th of the LP growth to feeTo
                    uint numerator = _totalSupply * (rootK - rootKLast);
                    uint denominator = (rootK * 5) + rootKLast;
                    uint liquidity = numerator / denominator;
                    if (liquidity > 0) _mint(feeTo, liquidity);
                }
            }
        } else if (_kLast != 0) {
            kLast = 0;
        }
    }

    function _mintLiquidity(address to, uint liquidity) private {
        _mint(to, liquidity);
    }

    function _burnLiquidity(address from, uint liquidity) private {
        _burn(from, liquidity);
    }

    function mint(address to) external override returns (uint liquidity) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        bool feeOn = _mintFee(_reserve0, _reserve1);
        uint balance0 = IERC20(token0).balanceOf(address(this));
        uint balance1 = IERC20(token1).balanceOf(address(this));
        uint amount0 = balance0 - _reserve0;
        uint amount1 = balance1 - _reserve1;

        uint _totalSupply = totalSupply();
        if (_totalSupply == 0) {
            // initial liquidity
            liquidity = _sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            _mint(address(0), MINIMUM_LIQUIDITY); // lock as per UniswapV2
        } else {
            liquidity = _min((amount0 * _totalSupply) / _reserve0, (amount1 * _totalSupply) / _reserve1);
        }
        require(liquidity > 0, "INSUFFICIENT_LIQUIDITY_MINTED");
        _mintLiquidity(to, liquidity);

        _update(balance0, balance1, _reserve0, _reserve1);
        if (feeOn) kLast = uint(reserve0) * uint(reserve1);
        emit Mint(msg.sender, amount0, amount1);
    }

    function burn(address to) external override returns (uint amount0, uint amount1) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        bool feeOn = _mintFee(_reserve0, _reserve1);
        address _token0 = token0; // gas savings
        address _token1 = token1; // gas savings
        uint balance0 = IERC20(_token0).balanceOf(address(this));
        uint balance1 = IERC20(_token1).balanceOf(address(this));
        uint liquidity = balanceOf(address(this));

        uint _totalSupply = totalSupply();
        amount0 = (liquidity * balance0) / _totalSupply;
        amount1 = (liquidity * balance1) / _totalSupply;
        require(amount0 > 0 && amount1 > 0, "INSUFFICIENT_LIQUIDITY_BURNED");
        _burnLiquidity(address(this), liquidity);

        IERC20(_token0).safeTransfer(to, amount0);
        IERC20(_token1).safeTransfer(to, amount1);

        balance0 = IERC20(_token0).balanceOf(address(this));
        balance1 = IERC20(_token1).balanceOf(address(this));

        _update(balance0, balance1, _reserve0, _reserve1);
        if (feeOn) kLast = uint(reserve0) * uint(reserve1);
        emit Burn(msg.sender, amount0, amount1, to);
    }

    function swap(uint amount0Out, uint amount1Out, address to) external override {
        require(amount0Out > 0 || amount1Out > 0, "INSUFFICIENT_OUTPUT");
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        require(amount0Out < _reserve0 && amount1Out < _reserve1, "INSUFFICIENT_LIQUIDITY");
        address _token0 = token0;
        address _token1 = token1;
        require(to != _token0 && to != _token1, "INVALID_TO");

        if (amount0Out > 0) IERC20(_token0).safeTransfer(to, amount0Out);
        if (amount1Out > 0) IERC20(_token1).safeTransfer(to, amount1Out);

        uint balance0 = IERC20(_token0).balanceOf(address(this));
        uint balance1 = IERC20(_token1).balanceOf(address(this));

        uint amount0In = balance0 > (_reserve0 - amount0Out) ? balance0 - (_reserve0 - amount0Out) : 0;
        uint amount1In = balance1 > (_reserve1 - amount1Out) ? balance1 - (_reserve1 - amount1Out) : 0;
        require(amount0In > 0 || amount1In > 0, "INSUFFICIENT_INPUT");

        // apply swap fee
        uint balance0Adjusted = (balance0 * BPS) - (amount0In * FEE_BPS);
        uint balance1Adjusted = (balance1 * BPS) - (amount1In * FEE_BPS);
        require(balance0Adjusted * balance1Adjusted >= uint(_reserve0) * uint(_reserve1) * (BPS**2), "K");

        _update(balance0, balance1, _reserve0, _reserve1);
        // keep kLast in sync if fee is on
        if (IDexFactory(factory).feeTo() != address(0)) {
            kLast = uint(reserve0) * uint(reserve1);
        }
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    function skim(address to) external override {
        IERC20(token0).safeTransfer(to, IERC20(token0).balanceOf(address(this)) - reserve0);
        IERC20(token1).safeTransfer(to, IERC20(token1).balanceOf(address(this)) - reserve1);
    }

    function sync() external override {
        _update(IERC20(token0).balanceOf(address(this)), IERC20(token1).balanceOf(address(this)), reserve0, reserve1);
    }

    // Utilities
    function _min(uint x, uint y) private pure returns (uint z) { z = x < y ? x : y; }
    function _sqrt(uint y) private pure returns (uint z) {
        if (y > 3) {
            z = y;
            uint x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
