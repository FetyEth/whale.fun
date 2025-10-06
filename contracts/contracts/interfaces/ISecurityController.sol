// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ISecurityController
 * @dev Interface for security and emergency controls
 */
interface ISecurityController {
    function activateEmergencyPause() external;
    function deactivateEmergencyPause() external;
    function isSystemPaused() external view returns (bool);
    
    function isTokenSafe(address token) external view returns (bool);
    function reportRugPull(address token, string memory reason) external;
    function blacklistToken(address token, string memory reason) external;
    
    function authorizeContract(address contractAddress) external;
    function deauthorizeContract(address contractAddress) external;
    function isAuthorized(address contractAddress) external view returns (bool);
    
    event EmergencyPauseActivated(address indexed activator);
    event EmergencyPauseDeactivated(address indexed deactivator);
    event RugPullDetected(address indexed token, string reason);
    event TokenBlacklisted(address indexed token, string reason);
}
