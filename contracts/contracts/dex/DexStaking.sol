// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DexStaking
 * @notice Simple MasterChef-like staking for LP tokens to earn a reward token.
 * - Owner can add pools and adjust allocation points.
 * - Emission measured per second for EVM-agnostic simplicity.
 */
contract DexStaking is Ownable {
    using SafeERC20 for IERC20;

    struct PoolInfo {
        IERC20 lpToken;           // Address of LP token contract.
        uint256 allocPoint;       // How many allocation points assigned to this pool. Determines share of rewards.
        uint256 lastRewardTime;   // Last timestamp that rewards distribution occurs.
        uint256 accRewardPerShare;// Accumulated rewards per share, scaled by 1e12.
    }

    struct UserInfo {
        uint256 amount;     // How many LP tokens the user has provided.
        int256 rewardDebt;  // Reward debt (signed to handle precision): user.amount * accRewardPerShare / 1e12
    }

    IERC20 public immutable rewardToken;
    uint256 public rewardPerSec; // emissions per second

    PoolInfo[] public poolInfo;
    mapping(uint256 => mapping(address => UserInfo)) public userInfo; // poolId => user => info
    uint256 public totalAllocPoint;

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount, address indexed to);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount, address indexed to);
    event Harvest(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount, address indexed to);
    event RewardPerSecUpdated(uint256 oldValue, uint256 newValue);

    constructor(IERC20 _rewardToken, uint256 _rewardPerSec, address _owner) Ownable(_owner) {
        rewardToken = _rewardToken;
        rewardPerSec = _rewardPerSec;
    }

    function poolLength() external view returns (uint256) { return poolInfo.length; }

    function add(uint256 _allocPoint, IERC20 _lpToken) external onlyOwner {
        totalAllocPoint += _allocPoint;
        poolInfo.push(PoolInfo({
            lpToken: _lpToken,
            allocPoint: _allocPoint,
            lastRewardTime: block.timestamp,
            accRewardPerShare: 0
        }));
    }

    function set(uint256 _pid, uint256 _allocPoint) external onlyOwner {
        totalAllocPoint = totalAllocPoint - poolInfo[_pid].allocPoint + _allocPoint;
        poolInfo[_pid].allocPoint = _allocPoint;
    }

    function pendingReward(uint256 _pid, address _user) external view returns (uint256 pending) {
        PoolInfo memory pool = poolInfo[_pid];
        UserInfo memory user = userInfo[_pid][_user];
        uint256 accRewardPerShare = pool.accRewardPerShare;
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        if (block.timestamp > pool.lastRewardTime && lpSupply != 0) {
            uint256 timeElapsed = block.timestamp - pool.lastRewardTime;
            uint256 reward = (timeElapsed * rewardPerSec * pool.allocPoint) / (totalAllocPoint == 0 ? 1 : totalAllocPoint);
            accRewardPerShare += (reward * 1e12) / lpSupply;
        }
        pending = uint256(int256((user.amount * accRewardPerShare) / 1e12) - user.rewardDebt);
    }

    function updatePool(uint256 _pid) public returns (PoolInfo memory pool) {
        pool = poolInfo[_pid];
        if (block.timestamp > pool.lastRewardTime) {
            uint256 lpSupply = pool.lpToken.balanceOf(address(this));
            if (lpSupply > 0) {
                uint256 timeElapsed = block.timestamp - pool.lastRewardTime;
                uint256 reward = (timeElapsed * rewardPerSec * pool.allocPoint) / (totalAllocPoint == 0 ? 1 : totalAllocPoint);
                pool.accRewardPerShare += (reward * 1e12) / lpSupply;
            }
            pool.lastRewardTime = block.timestamp;
            poolInfo[_pid] = pool;
        }
    }

    function deposit(uint256 _pid, uint256 _amount, address _to) external {
        PoolInfo memory pool = updatePool(_pid);
        UserInfo storage user = userInfo[_pid][_to];
        if (user.amount > 0) {
            int256 accumulatedReward = int256((user.amount * pool.accRewardPerShare) / 1e12);
            int256 pending = accumulatedReward - user.rewardDebt;
            if (pending > 0) {
                rewardToken.safeTransfer(_to, uint256(pending));
                emit Harvest(_to, _pid, uint256(pending));
            }
        }
        if (_amount > 0) {
            poolInfo[_pid].lpToken.safeTransferFrom(msg.sender, address(this), _amount);
            user.amount += _amount;
        }
        user.rewardDebt = int256((user.amount * pool.accRewardPerShare) / 1e12);
        emit Deposit(msg.sender, _pid, _amount, _to);
    }

    function withdraw(uint256 _pid, uint256 _amount, address _to) external {
        PoolInfo memory pool = updatePool(_pid);
        UserInfo storage user = userInfo[_pid][msg.sender];
        require(user.amount >= _amount, "withdraw: not good");

        int256 accumulatedReward = int256((user.amount * pool.accRewardPerShare) / 1e12);
        int256 pending = accumulatedReward - user.rewardDebt;
        if (pending > 0) {
            rewardToken.safeTransfer(_to, uint256(pending));
            emit Harvest(msg.sender, _pid, uint256(pending));
        }
        if (_amount > 0) {
            user.amount -= _amount;
            poolInfo[_pid].lpToken.safeTransfer(_to, _amount);
        }
        user.rewardDebt = int256((user.amount * pool.accRewardPerShare) / 1e12);
        emit Withdraw(msg.sender, _pid, _amount, _to);
    }

    function harvest(uint256 _pid, address _to) external {
        PoolInfo memory pool = updatePool(_pid);
        UserInfo storage user = userInfo[_pid][msg.sender];
        int256 accumulatedReward = int256((user.amount * pool.accRewardPerShare) / 1e12);
        int256 pending = accumulatedReward - user.rewardDebt;
        if (pending > 0) {
            rewardToken.safeTransfer(_to, uint256(pending));
            emit Harvest(msg.sender, _pid, uint256(pending));
        }
        user.rewardDebt = accumulatedReward;
    }

    function emergencyWithdraw(uint256 _pid, address _to) external {
        UserInfo storage user = userInfo[_pid][msg.sender];
        uint256 amount = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;
        poolInfo[_pid].lpToken.safeTransfer(_to, amount);
        emit EmergencyWithdraw(msg.sender, _pid, amount, _to);
    }

    function setRewardPerSec(uint256 _rewardPerSec) external onlyOwner {
        emit RewardPerSecUpdated(rewardPerSec, _rewardPerSec);
        rewardPerSec = _rewardPerSec;
    }
}
