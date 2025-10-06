// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IPandaAiToken.sol";
import "./libraries/MEVProtectionLibrary.sol";

/**
 * @title PandaAiToken
 * @dev The native platform token for whale.fun - StreamLaunch platform
 * Features: Governance, Staking, Revenue Sharing, Cross-chain compatibility, MEV Protection
 */
contract PandaAiToken is ERC20, ERC20Permit, ReentrancyGuard, Ownable, Pausable, IPandaAiToken {
    using MEVProtectionLibrary for MEVProtectionLibrary.MEVConfig;
    using MEVProtectionLibrary for MEVProtectionLibrary.RateLimit;
    
    // Total supply: 1 billion tokens
    uint256 public constant TOTAL_SUPPLY = 1000000000 * 10**18;
    
    // MEV Protection
    MEVProtectionLibrary.MEVConfig public mevConfig;
    mapping(address => MEVProtectionLibrary.RateLimit) public userRateLimits;
    mapping(address => uint256) public lastTransactionBlock;
    mapping(bytes32 => MEVProtectionLibrary.TransactionCommit) public transactionCommits;
    
    // Staking variables
    mapping(address => uint256) public stakedBalance;
    mapping(address => uint256) public stakeTimestamp;
    mapping(address => uint256) public rewardsEarned;
    
    // Revenue sharing variables
    mapping(address => uint256) public lastClaimedBlock;
    uint256 public totalFeePool;
    uint256 public totalStaked;
    
    // Governance variables
    mapping(address => uint256) public votingPower;
    
    // Cross-chain variables
    mapping(address => bool) public authorizedBridges;
    
    // Additional events not in interface
    event BridgeAuthorized(address indexed bridge, bool authorized);
    
    // Staking parameters
    uint256 public constant MIN_STAKE_DURATION = 7 days;
    uint256 public constant MAX_APY = 50; // 50% APY
    uint256 public stakingRewardRate = 15; // 15% base APY
    
    constructor() 
        ERC20("Panda AI", "PANDA") 
        ERC20Permit("Panda AI")
        Ownable(msg.sender)
    {
        _mint(msg.sender, TOTAL_SUPPLY);
        
        // Initialize MEV protection
        mevConfig = MEVProtectionLibrary.getDefaultMEVConfig();
    }
    
    /**
     * @dev Stake tokens to earn rewards and gain voting power
     */
    function stake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // Transfer tokens to contract
        _transfer(msg.sender, address(this), amount);
        
        // Calculate pending rewards before updating stake
        if (stakedBalance[msg.sender] > 0) {
            uint256 pendingRewards = calculatePendingRewards(msg.sender);
            rewardsEarned[msg.sender] += pendingRewards;
        }
        
        // Update staking info
        stakedBalance[msg.sender] += amount;
        stakeTimestamp[msg.sender] = block.timestamp;
        totalStaked += amount;
        
        // Update voting power (1:1 ratio with staked amount)
        votingPower[msg.sender] = stakedBalance[msg.sender];
        
        emit Staked(msg.sender, amount, block.timestamp);
    }
    
    /**
     * @dev Unstake tokens and claim rewards
     */
    function unstake(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(stakedBalance[msg.sender] >= amount, "Insufficient staked balance");
        require(
            block.timestamp >= stakeTimestamp[msg.sender] + MIN_STAKE_DURATION,
            "Minimum stake duration not met"
        );
        
        // Calculate and add pending rewards
        uint256 pendingRewards = calculatePendingRewards(msg.sender);
        uint256 totalRewards = rewardsEarned[msg.sender] + pendingRewards;
        
        // Update staking info
        stakedBalance[msg.sender] -= amount;
        totalStaked -= amount;
        rewardsEarned[msg.sender] = 0;
        stakeTimestamp[msg.sender] = block.timestamp;
        
        // Update voting power
        votingPower[msg.sender] = stakedBalance[msg.sender];
        
        // Transfer staked amount back to user
        _transfer(address(this), msg.sender, amount);
        
        // Mint and transfer rewards
        if (totalRewards > 0) {
            _mint(msg.sender, totalRewards);
        }
        
        emit Unstaked(msg.sender, amount, totalRewards);
    }
    
    /**
     * @dev Claim staking rewards without unstaking
     */
    function claimRewards() external nonReentrant {
        uint256 pendingRewards = calculatePendingRewards(msg.sender);
        uint256 totalRewards = rewardsEarned[msg.sender] + pendingRewards;
        
        require(totalRewards > 0, "No rewards to claim");
        
        rewardsEarned[msg.sender] = 0;
        stakeTimestamp[msg.sender] = block.timestamp;
        
        _mint(msg.sender, totalRewards);
        
        emit RewardsClaimed(msg.sender, totalRewards);
    }
    
    /**
     * @dev Calculate pending staking rewards for a user
     */
    function calculatePendingRewards(address user) public view returns (uint256) {
        if (stakedBalance[user] == 0) return 0;
        
        uint256 stakeDuration = block.timestamp - stakeTimestamp[user];
        uint256 annualReward = (stakedBalance[user] * stakingRewardRate) / 100;
        uint256 pendingReward = (annualReward * stakeDuration) / 365 days;
        
        return pendingReward;
    }
    
    /**
     * @dev Distribute trading fees to stakers
     */
    function distributeFees() external payable onlyOwner {
        require(msg.value > 0, "No fees to distribute");
        require(totalStaked > 0, "No stakers to distribute to");
        
        totalFeePool += msg.value;
        
        emit FeeDistributed(msg.value, block.timestamp);
    }
    
    /**
     * @dev Claim revenue share from trading fees
     */
    function claimRevenueShare() external nonReentrant {
        require(stakedBalance[msg.sender] > 0, "No staked balance");
        
        uint256 userShare = (totalFeePool * stakedBalance[msg.sender]) / totalStaked;
        require(userShare > 0, "No revenue share available");
        
        totalFeePool -= userShare;
        
        payable(msg.sender).transfer(userShare);
    }
    
    /**
     * @dev Get user's total staking info
     */
    function getStakingInfo(address user) external view returns (
        uint256 staked,
        uint256 earned,
        uint256 pending,
        uint256 voting,
        uint256 revenueShare
    ) {
        staked = stakedBalance[user];
        earned = rewardsEarned[user];
        pending = calculatePendingRewards(user);
        voting = votingPower[user];
        
        if (totalStaked > 0) {
            revenueShare = (totalFeePool * stakedBalance[user]) / totalStaked;
        }
    }
    
    // Advanced Governance System
    struct Proposal {
        uint256 id;
        address proposer;
        string title;
        string description;
        address targetContract;
        bytes callData;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 votesAbstain;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        bool cancelled;
        ProposalState state;
        mapping(address => Vote) votes;
    }
    
    struct Vote {
        bool hasVoted;
        VoteChoice choice;
        uint256 weight;
        uint256 timestamp;
    }
    
    enum VoteChoice { FOR, AGAINST, ABSTAIN }
    enum ProposalState { PENDING, ACTIVE, SUCCEEDED, FAILED, EXECUTED, CANCELLED }
    
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;
    uint256 public constant VOTING_PERIOD = 7 days;
    uint256 public constant VOTING_DELAY = 1 days;
    uint256 public constant QUORUM_PERCENTAGE = 10; // 10% of total staked tokens
    uint256 public constant PROPOSAL_THRESHOLD = 100000 * 10**18; // 100k WHALE to propose
    
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string title,
        uint256 startTime,
        uint256 endTime
    );
    
    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        VoteChoice choice,
        uint256 weight
    );
    
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId);
    
    /**
     * @dev Create a new governance proposal
     */
    function createProposal(
        string memory title,
        string memory description,
        address targetContract,
        bytes memory callData
    ) external returns (uint256) {
        require(votingPower[msg.sender] >= PROPOSAL_THRESHOLD, "Insufficient voting power to propose");
        
        proposalCount++;
        uint256 proposalId = proposalCount;
        
        Proposal storage newProposal = proposals[proposalId];
        newProposal.id = proposalId;
        newProposal.proposer = msg.sender;
        newProposal.title = title;
        newProposal.description = description;
        newProposal.targetContract = targetContract;
        newProposal.callData = callData;
        newProposal.startTime = block.timestamp + VOTING_DELAY;
        newProposal.endTime = newProposal.startTime + VOTING_PERIOD;
        newProposal.state = ProposalState.PENDING;
        
        emit ProposalCreated(proposalId, msg.sender, title, newProposal.startTime, newProposal.endTime);
        return proposalId;
    }
    
    /**
     * @dev Cast vote on a governance proposal with detailed choice
     */
    function voteDetailed(uint256 proposalId, VoteChoice choice) external {
        require(votingPower[msg.sender] > 0, "No voting power");
        require(proposalId <= proposalCount && proposalId > 0, "Invalid proposal ID");
        
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.votes[msg.sender].hasVoted, "Already voted");
        require(block.timestamp >= proposal.startTime, "Voting not started");
        require(block.timestamp <= proposal.endTime, "Voting period ended");
        require(proposal.state == ProposalState.ACTIVE || proposal.state == ProposalState.PENDING, "Invalid proposal state");
        
        // Update proposal state to active if it was pending
        if (proposal.state == ProposalState.PENDING) {
            proposal.state = ProposalState.ACTIVE;
        }
        
        uint256 weight = votingPower[msg.sender];
        
        // Record the vote
        proposal.votes[msg.sender] = Vote({
            hasVoted: true,
            choice: choice,
            weight: weight,
            timestamp: block.timestamp
        });
        
        // Update vote counts
        if (choice == VoteChoice.FOR) {
            proposal.votesFor += weight;
        } else if (choice == VoteChoice.AGAINST) {
            proposal.votesAgainst += weight;
        } else {
            proposal.votesAbstain += weight;
        }
        
        emit VoteCast(msg.sender, proposalId, choice, weight);
    }
    
    /**
     * @dev Simple vote function for interface compatibility
     */
    function vote(bytes32 proposalId, bool support) external override {
        // Convert bytes32 to uint256 for internal use
        uint256 id = uint256(proposalId);
        VoteChoice choice = support ? VoteChoice.FOR : VoteChoice.AGAINST;
        
        require(votingPower[msg.sender] > 0, "No voting power");
        require(id <= proposalCount && id > 0, "Invalid proposal ID");
        
        Proposal storage proposal = proposals[id];
        require(!proposal.votes[msg.sender].hasVoted, "Already voted");
        require(block.timestamp >= proposal.startTime, "Voting not started");
        require(block.timestamp <= proposal.endTime, "Voting period ended");
        require(proposal.state == ProposalState.ACTIVE || proposal.state == ProposalState.PENDING, "Invalid proposal state");
        
        // Update proposal state to active if it was pending
        if (proposal.state == ProposalState.PENDING) {
            proposal.state = ProposalState.ACTIVE;
        }
        
        uint256 weight = votingPower[msg.sender];
        proposal.votes[msg.sender] = Vote({
            hasVoted: true,
            choice: choice,
            weight: weight,
            timestamp: block.timestamp
        });
        
        // Update vote counts
        if (choice == VoteChoice.FOR) {
            proposal.votesFor += weight;
        } else if (choice == VoteChoice.AGAINST) {
            proposal.votesAgainst += weight;
        } else {
            proposal.votesAbstain += weight;
        }
        
        emit VoteCast(msg.sender, id, choice, weight);
    }
    
    /**
     * @dev Execute a successful proposal
     */
    function executeProposal(uint256 proposalId) external {
        require(proposalId <= proposalCount && proposalId > 0, "Invalid proposal ID");
        
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp > proposal.endTime, "Voting period not ended");
        require(!proposal.executed, "Proposal already executed");
        require(!proposal.cancelled, "Proposal cancelled");
        
        // Update proposal state based on results
        _updateProposalState(proposalId);
        require(proposal.state == ProposalState.SUCCEEDED, "Proposal did not succeed");
        
        proposal.executed = true;
        proposal.state = ProposalState.EXECUTED;
        
        // Execute the proposal call
        if (proposal.targetContract != address(0) && proposal.callData.length > 0) {
            (bool success,) = proposal.targetContract.call(proposal.callData);
            require(success, "Proposal execution failed");
        }
        
        emit ProposalExecuted(proposalId);
    }
    
    /**
     * @dev Get proposal details
     */
    function getProposal(uint256 proposalId) external view returns (
        address proposer,
        string memory title,
        string memory description,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 votesAbstain,
        uint256 startTime,
        uint256 endTime,
        ProposalState state
    ) {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.proposer,
            proposal.title,
            proposal.description,
            proposal.votesFor,
            proposal.votesAgainst,
            proposal.votesAbstain,
            proposal.startTime,
            proposal.endTime,
            proposal.state
        );
    }
    
    /**
     * @dev Check if user has voted on a proposal
     */
    function hasVoted(uint256 proposalId, address user) external view returns (bool) {
        return proposals[proposalId].votes[user].hasVoted;
    }
    
    /**
     * @dev Update proposal state based on voting results
     */
    function _updateProposalState(uint256 proposalId) internal {
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.state != ProposalState.ACTIVE) return;
        
        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain;
        uint256 quorumRequired = (totalStaked * QUORUM_PERCENTAGE) / 100;
        
        // Check quorum and majority
        if (totalVotes >= quorumRequired && proposal.votesFor > proposal.votesAgainst) {
            proposal.state = ProposalState.SUCCEEDED;
        } else {
            proposal.state = ProposalState.FAILED;
        }
    }
    
    /**
     * @dev Cancel a proposal (only by proposer before voting starts)
     */
    function cancelProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(msg.sender == proposal.proposer || msg.sender == owner(), "Unauthorized");
        require(block.timestamp < proposal.startTime, "Voting already started");
        require(!proposal.cancelled, "Already cancelled");
        
        proposal.cancelled = true;
        proposal.state = ProposalState.CANCELLED;
        
        emit ProposalCancelled(proposalId);
    }
    
    /**
     * @dev Cross-chain bridge functions
     */
    function burn(address from, uint256 amount) external {
        require(authorizedBridges[msg.sender], "Unauthorized bridge");
        _burn(from, amount);
    }
    
    function mint(address to, uint256 amount) external {
        require(authorizedBridges[msg.sender], "Unauthorized bridge");
        _mint(to, amount);
    }
    
    /**
     * @dev Admin functions
     */
    function setBridgeAuthorization(address bridge, bool authorized) external onlyOwner {
        authorizedBridges[bridge] = authorized;
        emit BridgeAuthorized(bridge, authorized);
    }
    
    function setStakingRewardRate(uint256 newRate) external onlyOwner {
        require(newRate <= MAX_APY, "Rate exceeds maximum");
        stakingRewardRate = newRate;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Emergency functions
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    // Receive function to accept ETH
    receive() external payable {}
}