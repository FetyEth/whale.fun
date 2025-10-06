// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title GovernanceManager
 * @dev Manages community governance proposals and voting
 */
contract GovernanceManager is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    
    // Events
    event GovernanceProposal(address indexed token, address indexed proposer, string description, uint256 proposalId);
    event GovernanceVote(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    
    struct Proposal {
        address token;
        address proposer;
        string description;
        uint256 startTime;
        uint256 endTime;
        uint256 forVotes;
        uint256 againstVotes;
        bool executed;
    }
    
    // Storage
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted; // proposalId => voter => hasVoted
    mapping(uint256 => mapping(address => uint256)) public voteWeight; // proposalId => voter => weight
    
    // Configuration
    uint256 public constant GOVERNANCE_VOTING_PERIOD = 7 days;
    uint256 public constant MIN_PROPOSAL_THRESHOLD = 100;
    
    uint256 public nextProposalId;
    address public factoryContract;
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(address _factoryContract) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        
        factoryContract = _factoryContract;
        nextProposalId = 1;
    }
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    modifier onlyFactory() {
        require(msg.sender == factoryContract, "Only factory can call");
        _;
    }
    
    /**
     * @dev Create governance proposal for token community
     */
    function createProposal(address token, string memory description) external returns (uint256) {
        uint256 proposalId = nextProposalId++;
        Proposal storage proposal = proposals[proposalId];
        proposal.token = token;
        proposal.proposer = msg.sender;
        proposal.description = description;
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + GOVERNANCE_VOTING_PERIOD;
        
        emit GovernanceProposal(token, msg.sender, description, proposalId);
        return proposalId;
    }
    
    /**
     * @dev Vote on governance proposal
     */
    function vote(uint256 proposalId, bool support, uint256 tokenWeight) external {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp <= proposal.endTime, "Voting period ended");
        require(!hasVoted[proposalId][msg.sender], "Already voted");
        
        hasVoted[proposalId][msg.sender] = true;
        voteWeight[proposalId][msg.sender] = tokenWeight;
        
        if (support) {
            proposal.forVotes += tokenWeight;
        } else {
            proposal.againstVotes += tokenWeight;
        }
        
        emit GovernanceVote(proposalId, msg.sender, support, tokenWeight);
    }
    
    /**
     * @dev Get proposal details
     */
    function getProposal(uint256 proposalId) external view returns (
        address token,
        address proposer,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        uint256 forVotes,
        uint256 againstVotes,
        bool executed
    ) {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.token,
            proposal.proposer,
            proposal.description,
            proposal.startTime,
            proposal.endTime,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.executed
        );
    }
    
    /**
     * @dev Update factory contract address
     */
    function updateFactoryContract(address newFactory) external onlyOwner {
        factoryContract = newFactory;
    }
}
