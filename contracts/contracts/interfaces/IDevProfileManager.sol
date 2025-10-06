// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDevProfileManager {
    function trackCreator(address creator) external;
    function getTokenCreator(address token) external view returns (address);
}
