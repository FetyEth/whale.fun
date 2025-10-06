// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/ITokenFactory.sol";
import "./interfaces/ICreatorToken.sol";
import "./interfaces/IDevProfileManager.sol";
import "./interfaces/ITokenGraduationManager.sol";
contract TokenFactoryCore is 
    Initializable,
    ReentrancyGuardUpgradeable, 
    OwnableUpgradeable,
    UUPSUpgradeable,
    ITokenFactory {
    
    
    uint256 public constant LAUNCH_FEE = 0.1 ether;
    
    address public whaleToken;
    address public devProfileManager;
    address public graduationManager;
    address public creatorTokenFactory;
    address public protocolTreasury;
    
    address[] public allTokens;
    mapping(address => address[]) public creatorTokens;
    mapping(address => bool) public override isValidToken;
    mapping(address => uint256) public creatorTokenCount;
    mapping(address => uint256) public lastTokenCreation;
    
    uint256 public totalTokensCreated;
    uint256 public totalFeesCollected;
    uint256 public maxTokensPerCreator;
        
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _whaleToken,
        address _devProfileManager,
        address _graduationManager,
        address _creatorTokenFactory,
        address _protocolTreasury
    ) public initializer {
        __ReentrancyGuard_init();
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        
        whaleToken = _whaleToken;
        devProfileManager = _devProfileManager;
        graduationManager = _graduationManager;
        creatorTokenFactory = _creatorTokenFactory;
        protocolTreasury = _protocolTreasury;
        maxTokensPerCreator = 10;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    
    function createToken(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        uint256 initialPrice,
        uint256 /* creatorFeePercent */,
        string memory description,
        string memory logoUrl
    ) external payable override returns (address) {
        require(msg.value >= LAUNCH_FEE && totalSupply >= 1e24 && totalSupply <= 1e27, "F1");
        require(initialPrice >= 1 ether && initialPrice <= 1e6 ether, "C1");
        require(bytes(name).length >= 2 && bytes(name).length <= 32, "N1");
        require(bytes(symbol).length >= 2 && bytes(symbol).length <= 10, "Y1");
        require(bytes(description).length <= 500 && bytes(logoUrl).length <= 200, "D1");
        require(block.timestamp >= lastTokenCreation[msg.sender] + 1 hours, "R1");
        require(creatorTokenCount[msg.sender] < maxTokensPerCreator, "M2");
        
        // Deploy new CreatorToken via factory
        (bool success, bytes memory result) = creatorTokenFactory.call(
            abi.encodeWithSignature(
                "deployToken(string,string,uint256,uint256,address,address,address,uint256,string,string,uint256,uint256)",
                name, symbol, totalSupply, initialPrice, msg.sender, whaleToken, protocolTreasury, 0, description, logoUrl, 0, 0
            )
        );
        require(success, "F2");
        address tokenAddress = abi.decode(result, (address));
        
        allTokens.push(tokenAddress);
        creatorTokens[msg.sender].push(tokenAddress);
        isValidToken[tokenAddress] = true;
        totalTokensCreated++;
        creatorTokenCount[msg.sender]++;
        lastTokenCreation[msg.sender] = block.timestamp;
        
        IDevProfileManager(devProfileManager).trackCreator(msg.sender);
        ITokenGraduationManager(graduationManager).initializeToken(tokenAddress);
        
        totalFeesCollected += LAUNCH_FEE;
        if (msg.value > LAUNCH_FEE) {
            payable(msg.sender).transfer(msg.value - LAUNCH_FEE);
        }
        
        emit TokenCreated(tokenAddress, msg.sender, name, symbol, totalSupply, block.timestamp);
        return tokenAddress;
    }
    
    
    function getCreatorTokens(address creator) external view override returns (address[] memory) {
        return creatorTokens[creator];
    }
    
    function getAllTokens() external view override returns (address[] memory) {
        return allTokens;
    }
    
    function getFactoryStats() external view override returns (uint256,uint256,uint256,uint256) {
        return (totalTokensCreated, 0, totalFeesCollected, LAUNCH_FEE);
    }
    
    function tokenToCreator(address token) external view override returns (address) {
        return IDevProfileManager(devProfileManager).getTokenCreator(token);
    }
    
    function updateCreatorTokenFactory(address newFactory) external onlyOwner {
        require(newFactory != address(0), "Invalid factory address");
        creatorTokenFactory = newFactory;
    }
    
    function withdrawFees() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
        
    receive() external payable {}
}
