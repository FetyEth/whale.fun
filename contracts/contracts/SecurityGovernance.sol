// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IWhaleToken.sol";

/**
 * @title MultiSigWallet
 * @dev Multi-signature wallet for secure token treasury management
 */
contract MultiSigWallet is ReentrancyGuard {
    using ECDSA for bytes32;
    
    event Deposit(address indexed sender, uint amount);
    event SubmitTransaction(
        address indexed owner,
        uint indexed txIndex,
        address indexed to,
        uint value,
        bytes data
    );
    event ConfirmTransaction(address indexed owner, uint indexed txIndex);
    event RevokeConfirmation(address indexed owner, uint indexed txIndex);
    event ExecuteTransaction(address indexed owner, uint indexed txIndex);
    
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint public numConfirmationsRequired;
    
    struct Transaction {
        address to;
        uint value;
        bytes data;
        bool executed;
        uint numConfirmations;
    }
    
    mapping(uint => mapping(address => bool)) public isConfirmed;
    Transaction[] public transactions;
    
    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not owner");
        _;
    }
    
    modifier txExists(uint _txIndex) {
        require(_txIndex < transactions.length, "Tx does not exist");
        _;
    }
    
    modifier notExecuted(uint _txIndex) {
        require(!transactions[_txIndex].executed, "Tx already executed");
        _;
    }
    
    modifier notConfirmed(uint _txIndex) {
        require(!isConfirmed[_txIndex][msg.sender], "Tx already confirmed");
        _;
    }
    
    constructor(address[] memory _owners, uint _numConfirmationsRequired) {
        require(_owners.length > 0, "Owners required");
        require(
            _numConfirmationsRequired > 0 && _numConfirmationsRequired <= _owners.length,
            "Invalid number of required confirmations"
        );
        
        for (uint i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "Invalid owner");
            require(!isOwner[owner], "Owner not unique");
            
            isOwner[owner] = true;
            owners.push(owner);
        }
        
        numConfirmationsRequired = _numConfirmationsRequired;
    }
    
    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }
    
    function submitTransaction(
        address _to,
        uint _value,
        bytes memory _data
    ) public onlyOwner {
        uint txIndex = transactions.length;
        
        transactions.push(Transaction({
            to: _to,
            value: _value,
            data: _data,
            executed: false,
            numConfirmations: 0
        }));
        
        emit SubmitTransaction(msg.sender, txIndex, _to, _value, _data);
    }
    
    function confirmTransaction(uint _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
        notConfirmed(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];
        transaction.numConfirmations += 1;
        isConfirmed[_txIndex][msg.sender] = true;
        
        emit ConfirmTransaction(msg.sender, _txIndex);
    }
    
    function executeTransaction(uint _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];
        
        require(
            transaction.numConfirmations >= numConfirmationsRequired,
            "Cannot execute tx"
        );
        
        transaction.executed = true;
        
        (bool success, ) = transaction.to.call{value: transaction.value}(transaction.data);
        require(success, "Tx failed");
        
        emit ExecuteTransaction(msg.sender, _txIndex);
    }
    
    function revokeConfirmation(uint _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];
        
        require(isConfirmed[_txIndex][msg.sender], "Tx not confirmed");
        
        transaction.numConfirmations -= 1;
        isConfirmed[_txIndex][msg.sender] = false;
        
        emit RevokeConfirmation(msg.sender, _txIndex);
    }
    
    function getOwners() public view returns (address[] memory) {
        return owners;
    }
    
    function getTransactionCount() public view returns (uint) {
        return transactions.length;
    }
    
    function getTransaction(uint _txIndex)
        public
        view
        returns (
            address to,
            uint value,
            bytes memory data,
            bool executed,
            uint numConfirmations
        )
    {
        Transaction storage transaction = transactions[_txIndex];
        
        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.numConfirmations
        );
    }
}

/**
 * @title TimeLockController
 * @dev Time-locked contract for delayed execution of critical functions
 */
contract TimeLockController is ReentrancyGuard, Ownable {
    event NewDelay(uint indexed newDelay);
    event CancelTransaction(bytes32 indexed txHash);
    event ExecuteTransaction(bytes32 indexed txHash);
    event QueueTransaction(bytes32 indexed txHash);
    
    uint public constant GRACE_PERIOD = 14 days;
    uint public constant MINIMUM_DELAY = 2 days;
    uint public constant MAXIMUM_DELAY = 30 days;
    
    uint public delay;
    mapping(bytes32 => bool) public queuedTransactions;
    
    constructor(uint _delay) Ownable(msg.sender) {
        require(_delay >= MINIMUM_DELAY, "Delay must exceed minimum delay");
        require(_delay <= MAXIMUM_DELAY, "Delay must not exceed maximum delay");
        delay = _delay;
    }
    
    function setDelay(uint _delay) public onlyOwner {
        require(_delay >= MINIMUM_DELAY, "Delay must exceed minimum delay");
        require(_delay <= MAXIMUM_DELAY, "Delay must not exceed maximum delay");
        delay = _delay;
        emit NewDelay(_delay);
    }
    
    function queueTransaction(
        address target,
        uint value,
        string memory signature,
        bytes memory data,
        uint eta
    ) public onlyOwner returns (bytes32) {
        require(
            eta >= block.timestamp + delay,
            "Estimated execution block must satisfy delay"
        );
        
        bytes32 txHash = keccak256(abi.encode(target, value, signature, data, eta));
        queuedTransactions[txHash] = true;
        
        emit QueueTransaction(txHash);
        return txHash;
    }
    
    function cancelTransaction(
        address target,
        uint value,
        string memory signature,
        bytes memory data,
        uint eta
    ) public onlyOwner {
        bytes32 txHash = keccak256(abi.encode(target, value, signature, data, eta));
        queuedTransactions[txHash] = false;
        
        emit CancelTransaction(txHash);
    }
    
    function executeTransaction(
        address target,
        uint value,
        string memory signature,
        bytes memory data,
        uint eta
    ) public payable onlyOwner returns (bytes memory) {
        bytes32 txHash = keccak256(abi.encode(target, value, signature, data, eta));
        
        require(queuedTransactions[txHash], "Transaction hasn't been queued");
        require(block.timestamp >= eta, "Transaction hasn't surpassed time lock");
        require(block.timestamp <= eta + GRACE_PERIOD, "Transaction is stale");
        
        queuedTransactions[txHash] = false;
        
        bytes memory callData;
        if (bytes(signature).length == 0) {
            callData = data;
        } else {
            callData = abi.encodePacked(bytes4(keccak256(bytes(signature))), data);
        }
        
        (bool success, bytes memory returnData) = target.call{value: value}(callData);
        require(success, "Transaction execution reverted");
        
        emit ExecuteTransaction(txHash);
        return returnData;
    }
}

/**
 * @title GovernanceController
 * @dev Decentralized governance system for whale.fun platform
 */
contract GovernanceController is ReentrancyGuard, Ownable {
    IWhaleToken public whaleToken;
    TimeLockController public timeLock;
    
    enum ProposalState {
        Pending,
        Active,
        Canceled,
        Defeated,
        Succeeded,
        Queued,
        Expired,
        Executed
    }
    
    struct Proposal {
        uint id;
        address proposer;
        address[] targets;
        uint[] values;
        string[] signatures;
        bytes[] calldatas;
        uint startBlock;
        uint endBlock;
        string description;
        uint forVotes;
        uint againstVotes;
        uint abstainVotes;
        bool canceled;
        bool executed;
        mapping(address => Receipt) receipts;
    }
    
    struct Receipt {
        bool hasVoted;
        uint8 support;
        uint votes;
    }
    
    enum VoteType {
        Against,
        For,
        Abstain
    }
    
    mapping(uint => Proposal) public proposals;
    uint public proposalCount;
    
    // Governance parameters
    uint public votingDelay = 1 days;
    uint public votingPeriod = 3 days;
    uint public proposalThreshold = 100000 * 10**18; // 100k WHALE tokens
    uint public quorumVotes = 400000 * 10**18; // 400k WHALE tokens
    
    // Events
    event ProposalCreated(
        uint id,
        address proposer,
        address[] targets,
        uint[] values,
        string[] signatures,
        bytes[] calldatas,
        uint startBlock,
        uint endBlock,
        string description
    );
    
    event VoteCast(address indexed voter, uint proposalId, uint8 support, uint votes, string reason);
    event ProposalCanceled(uint id);
    event ProposalQueued(uint id, uint eta);
    event ProposalExecuted(uint id);
    
    constructor(address payable _whaleToken, address _timeLock) Ownable(msg.sender) {
        whaleToken = IWhaleToken(_whaleToken);
        timeLock = TimeLockController(_timeLock);
    }
    
    /**
     * @dev Create a new proposal
     */
    function propose(
        address[] memory targets,
        uint[] memory values,
        string[] memory signatures,
        bytes[] memory calldatas,
        string memory description
    ) public returns (uint) {
        require(
            whaleToken.votingPower(msg.sender) > proposalThreshold,
            "Proposer votes below proposal threshold"
        );
        require(
            targets.length == values.length &&
            targets.length == signatures.length &&
            targets.length == calldatas.length,
            "Proposal function information arity mismatch"
        );
        require(targets.length != 0, "Must provide actions");
        require(targets.length <= 10, "Too many actions");
        
        proposalCount++;
        uint proposalId = proposalCount;
        
        Proposal storage newProposal = proposals[proposalId];
        newProposal.id = proposalId;
        newProposal.proposer = msg.sender;
        newProposal.targets = targets;
        newProposal.values = values;
        newProposal.signatures = signatures;
        newProposal.calldatas = calldatas;
        newProposal.startBlock = block.number + votingDelay;
        newProposal.endBlock = block.number + votingDelay + votingPeriod;
        newProposal.description = description;
        
        emit ProposalCreated(
            proposalId,
            msg.sender,
            targets,
            values,
            signatures,
            calldatas,
            newProposal.startBlock,
            newProposal.endBlock,
            description
        );
        
        return proposalId;
    }
    
    /**
     * @dev Vote on a proposal
     */
    function castVote(uint proposalId, uint8 support) public returns (uint) {
        emit VoteCast(msg.sender, proposalId, support, castVoteInternal(msg.sender, proposalId, support), "");
        return whaleToken.votingPower(msg.sender);
    }
    
    /**
     * @dev Vote on a proposal with reason
     */
    function castVoteWithReason(
        uint proposalId,
        uint8 support,
        string calldata reason
    ) public returns (uint) {
        emit VoteCast(msg.sender, proposalId, support, castVoteInternal(msg.sender, proposalId, support), reason);
        return whaleToken.votingPower(msg.sender);
    }
    
    /**
     * @dev Internal vote casting logic
     */
    function castVoteInternal(address voter, uint proposalId, uint8 support) internal returns (uint) {
        require(state(proposalId) == ProposalState.Active, "Voting is closed");
        require(support <= 2, "Invalid vote type");
        
        Proposal storage proposal = proposals[proposalId];
        Receipt storage receipt = proposal.receipts[voter];
        require(receipt.hasVoted == false, "Voter already voted");
        
        uint votes = whaleToken.votingPower(voter);
        
        if (support == uint8(VoteType.Against)) {
            proposal.againstVotes += votes;
        } else if (support == uint8(VoteType.For)) {
            proposal.forVotes += votes;
        } else if (support == uint8(VoteType.Abstain)) {
            proposal.abstainVotes += votes;
        }
        
        receipt.hasVoted = true;
        receipt.support = support;
        receipt.votes = votes;
        
        return votes;
    }
    
    /**
     * @dev Queue a successful proposal for execution
     */
    function queue(uint proposalId) public {
        require(state(proposalId) == ProposalState.Succeeded, "Proposal can only be queued if it is succeeded");
        
        Proposal storage proposal = proposals[proposalId];
        uint eta = block.timestamp + timeLock.delay();
        
        for (uint i = 0; i < proposal.targets.length; i++) {
            timeLock.queueTransaction(
                proposal.targets[i],
                proposal.values[i],
                proposal.signatures[i],
                proposal.calldatas[i],
                eta
            );
        }
        
        emit ProposalQueued(proposalId, eta);
    }
    
    /**
     * @dev Execute a queued proposal
     */
    function execute(uint proposalId) public payable {
        require(state(proposalId) == ProposalState.Queued, "Proposal can only be executed if it is queued");
        
        Proposal storage proposal = proposals[proposalId];
        proposal.executed = true;
        
        uint eta = block.timestamp + timeLock.delay();
        
        for (uint i = 0; i < proposal.targets.length; i++) {
            timeLock.executeTransaction{value: proposal.values[i]}(
                proposal.targets[i],
                proposal.values[i],
                proposal.signatures[i],
                proposal.calldatas[i],
                eta
            );
        }
        
        emit ProposalExecuted(proposalId);
    }
    
    /**
     * @dev Cancel a proposal
     */
    function cancel(uint proposalId) public {
        require(state(proposalId) != ProposalState.Executed, "Cannot cancel executed proposal");
        
        Proposal storage proposal = proposals[proposalId];
        require(
            msg.sender == proposal.proposer ||
            whaleToken.votingPower(proposal.proposer) < proposalThreshold,
            "Proposer above threshold"
        );
        
        proposal.canceled = true;
        
        emit ProposalCanceled(proposalId);
    }
    
    /**
     * @dev Get proposal state
     */
    function state(uint proposalId) public view returns (ProposalState) {
        require(proposalCount >= proposalId && proposalId > 0, "Invalid proposal id");
        
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.canceled) {
            return ProposalState.Canceled;
        } else if (block.number <= proposal.startBlock) {
            return ProposalState.Pending;
        } else if (block.number <= proposal.endBlock) {
            return ProposalState.Active;
        } else if (proposal.forVotes <= proposal.againstVotes || proposal.forVotes < quorumVotes) {
            return ProposalState.Defeated;
        } else if (proposal.executed) {
            return ProposalState.Executed;
        } else {
            return ProposalState.Succeeded;
        }
    }
    
    /**
     * @dev Get proposal details
     */
    function getProposal(uint proposalId) public view returns (
        uint id,
        address proposer,
        uint startBlock,
        uint endBlock,
        uint forVotes,
        uint againstVotes,
        uint abstainVotes,
        bool canceled,
        bool executed
    ) {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.id,
            proposal.proposer,
            proposal.startBlock,
            proposal.endBlock,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.abstainVotes,
            proposal.canceled,
            proposal.executed
        );
    }
    
    /**
     * @dev Get receipt for a voter on a proposal
     */
    function getReceipt(uint proposalId, address voter) public view returns (Receipt memory) {
        return proposals[proposalId].receipts[voter];
    }
    
    /**
     * @dev Admin functions to update governance parameters
     */
    function setVotingDelay(uint newVotingDelay) external onlyOwner {
        require(newVotingDelay >= 1 && newVotingDelay <= 40320, "Invalid voting delay"); // 1 block to 1 week
        votingDelay = newVotingDelay;
    }
    
    function setVotingPeriod(uint newVotingPeriod) external onlyOwner {
        require(newVotingPeriod >= 5760 && newVotingPeriod <= 80640, "Invalid voting period"); // 1 day to 2 weeks
        votingPeriod = newVotingPeriod;
    }
    
    function setProposalThreshold(uint newProposalThreshold) external onlyOwner {
        proposalThreshold = newProposalThreshold;
    }
    
    function setQuorumVotes(uint newQuorumVotes) external onlyOwner {
        quorumVotes = newQuorumVotes;
    }
}

/**
 * @title SecurityController
 * @dev Security and emergency control system
 */
contract SecurityController is ReentrancyGuard, Ownable {
    IWhaleToken public whaleToken;
    
    // Circuit breaker
    bool public emergencyPause = false;
    mapping(address => bool) public authorizedContracts;
    
    // Rug pull detection
    struct RugPullAlert {
        address token;
        uint256 timestamp;
        string reason;
        bool resolved;
    }
    
    RugPullAlert[] public rugPullAlerts;
    mapping(address => bool) public blacklistedTokens;
    
    // Events
    event EmergencyPauseActivated(address indexed activator);
    event EmergencyPauseDeactivated(address indexed deactivator);
    event RugPullDetected(address indexed token, string reason);
    event TokenBlacklisted(address indexed token, string reason);
    event TokenRemovedFromBlacklist(address indexed token);
    event ContractAuthorized(address indexed contractAddress);
    event ContractDeauthorized(address indexed contractAddress);
    event RugPullResolved(address indexed token, uint256 alertIndex);
    
    constructor(address payable _whaleToken) Ownable(msg.sender) {
        whaleToken = IWhaleToken(_whaleToken);
    }
    
    modifier notPaused() {
        require(!emergencyPause, "System is paused");
        _;
    }
    
    modifier onlyAuthorized() {
        require(authorizedContracts[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }
    
    /**
     * @dev Emergency pause system
     */
    function activateEmergencyPause() external onlyOwner {
        emergencyPause = true;
        whaleToken.pause();
        emit EmergencyPauseActivated(msg.sender);
    }
    
    function deactivateEmergencyPause() external onlyOwner {
        emergencyPause = false;
        whaleToken.unpause();
        emit EmergencyPauseDeactivated(msg.sender);
    }
    
    /**
     * @dev Rug pull detection and prevention
     */
    function reportRugPull(address token, string memory reason) external onlyAuthorized {
        rugPullAlerts.push(RugPullAlert({
            token: token,
            timestamp: block.timestamp,
            reason: reason,
            resolved: false
        }));
        
        emit RugPullDetected(token, reason);
    }
    
    function resolveRugPullAlert(uint256 alertIndex) external onlyOwner {
        require(alertIndex < rugPullAlerts.length, "Invalid alert index");
        rugPullAlerts[alertIndex].resolved = true;
        emit RugPullResolved(rugPullAlerts[alertIndex].token, alertIndex);
    }
    
    function blacklistToken(address token, string memory reason) external onlyOwner {
        blacklistedTokens[token] = true;
        emit TokenBlacklisted(token, reason);
    }
    
    function removeFromBlacklist(address token) external onlyOwner {
        blacklistedTokens[token] = false;
        emit TokenRemovedFromBlacklist(token);
    }
    
    /**
     * @dev Authorization management
     */
    function authorizeContract(address contractAddress) external onlyOwner {
        require(contractAddress != address(0), "Invalid contract address");
        authorizedContracts[contractAddress] = true;
        emit ContractAuthorized(contractAddress);
    }
    
    function deauthorizeContract(address contractAddress) external onlyOwner {
        authorizedContracts[contractAddress] = false;
        emit ContractDeauthorized(contractAddress);
    }
    
    /**
     * @dev Security checks
     */
    function isTokenSafe(address token) external view returns (bool) {
        return !blacklistedTokens[token] && !emergencyPause;
    }
    
    function getRugPullAlerts() external view returns (RugPullAlert[] memory) {
        return rugPullAlerts;
    }
    
    function getRugPullAlertsCount() external view returns (uint256) {
        return rugPullAlerts.length;
    }
    
    function getUnresolvedAlerts() external view returns (RugPullAlert[] memory) {
        uint256 unresolvedCount = 0;
        
        // Count unresolved alerts
        for (uint256 i = 0; i < rugPullAlerts.length; i++) {
            if (!rugPullAlerts[i].resolved) {
                unresolvedCount++;
            }
        }
        
        // Create array of unresolved alerts
        RugPullAlert[] memory unresolved = new RugPullAlert[](unresolvedCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < rugPullAlerts.length; i++) {
            if (!rugPullAlerts[i].resolved) {
                unresolved[index] = rugPullAlerts[i];
                index++;
            }
        }
        
        return unresolved;
    }
    
    /**
     * @dev Emergency functions
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(emergencyPause, "Emergency not activated");
        if (token == address(0)) {
            // Withdraw ETH
            payable(owner()).transfer(amount);
        } else {
            // Withdraw ERC20
            IERC20(token).transfer(owner(), amount);
        }
    }
    
    /**
     * @dev View functions
     */
    function isAuthorized(address account) external view returns (bool) {
        return authorizedContracts[account] || account == owner();
    }
    
    function isPaused() external view returns (bool) {
        return emergencyPause;
    }
}