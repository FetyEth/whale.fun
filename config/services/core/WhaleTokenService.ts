import { ContractTransactionResponse } from "ethers";
import {
  BaseContractService,
  TransactionOptions,
} from "@/lib/services/BaseContractService";
import WhaleTokenABI from "../../abi/WhaleToken.json";

/**
 * Staking information interface
 */
export interface StakingInfo {
  staked: bigint;
  earned: bigint;
  pending: bigint;
  voting: bigint;
  revenueShare: bigint;
}

/**
 * Proposal interface
 */
export interface Proposal {
  proposer: string;
  title: string;
  description: string;
  votesFor: bigint;
  votesAgainst: bigint;
  votesAbstain: bigint;
  startTime: bigint;
  endTime: bigint;
  state: ProposalState;
}

/**
 * Proposal states enum
 */
export enum ProposalState {
  PENDING = 0,
  ACTIVE = 1,
  SUCCEEDED = 2,
  FAILED = 3,
  EXECUTED = 4,
  CANCELLED = 5,
}

/**
 * Vote choice enum
 */
export enum VoteChoice {
  FOR = 0,
  AGAINST = 1,
  ABSTAIN = 2,
}

/**
 * Whale Token Service
 * Handles all interactions with the WhaleToken contract including ERC20, staking, governance, and cross-chain functionality
 */
export class WhaleTokenService extends BaseContractService {
  constructor() {
    super({
      name: "WhaleToken",
      abi: WhaleTokenABI,
      deployments: {
        // Add your deployment addresses here
        // 1: { // Ethereum Mainnet
        //   address: "0x...",
        //   deployedAt: 1234567890,
        //   verified: true
        // },
        // 137: { // Polygon
        //   address: "0x...",
        //   deployedAt: 1234567890,
        //   verified: true
        // }
      },
    });
  }

  // ==================== ERC20 BASIC FUNCTIONS ====================

  /**
   * Get token basic information
   */
  async getTokenInfo(chainId?: number) {
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      this.callMethod<string>("name", [], chainId),
      this.callMethod<string>("symbol", [], chainId),
      this.callMethod<number>("decimals", [], chainId),
      this.callMethod<bigint>("totalSupply", [], chainId),
    ]);

    return {
      name,
      symbol,
      decimals,
      totalSupply,
      contractAddress: await this.getContractAddress(chainId),
    };
  }

  /**
   * Get token balance for an address
   */
  async getBalance(address: string, chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("balanceOf", [address], chainId);
  }

  /**
   * Get allowance between owner and spender
   */
  async getAllowance(
    owner: string,
    spender: string,
    chainId?: number
  ): Promise<bigint> {
    return this.callMethod<bigint>("allowance", [owner, spender], chainId);
  }

  /**
   * Transfer tokens
   */
  async transfer(
    to: string,
    amount: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod("transfer", [to, amount], options, chainId);
  }

  /**
   * Transfer tokens from another address (requires allowance)
   */
  async transferFrom(
    from: string,
    to: string,
    amount: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod(
      "transferFrom",
      [from, to, amount],
      options,
      chainId
    );
  }

  /**
   * Approve spender to transfer tokens
   */
  async approve(
    spender: string,
    amount: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod("approve", [spender, amount], options, chainId);
  }

  // ==================== STAKING SYSTEM ====================

  /**
   * Stake tokens to earn rewards and gain voting power
   */
  async stake(
    amount: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod("stake", [amount], options, chainId);
  }

  /**
   * Unstake tokens and claim rewards
   */
  async unstake(
    amount: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod("unstake", [amount], options, chainId);
  }

  /**
   * Claim staking rewards without unstaking
   */
  async claimRewards(
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod("claimRewards", [], options, chainId);
  }

  /**
   * Get user's staking information
   */
  async getStakingInfo(
    address: string,
    chainId?: number
  ): Promise<StakingInfo> {
    const result = await this.callMethod("getStakingInfo", [address], chainId);
    return {
      staked: result[0],
      earned: result[1],
      pending: result[2],
      voting: result[3],
      revenueShare: result[4],
    };
  }

  /**
   * Get user's staked balance
   */
  async getStakedBalance(address: string, chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("stakedBalance", [address], chainId);
  }

  /**
   * Calculate pending staking rewards for a user
   */
  async calculatePendingRewards(
    address: string,
    chainId?: number
  ): Promise<bigint> {
    return this.callMethod<bigint>(
      "calculatePendingRewards",
      [address],
      chainId
    );
  }

  /**
   * Get total staked amount
   */
  async getTotalStaked(chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("totalStaked", [], chainId);
  }

  /**
   * Get staking reward rate (APY)
   */
  async getStakingRewardRate(chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("stakingRewardRate", [], chainId);
  }

  // ==================== REVENUE SHARING ====================

  /**
   * Distribute trading fees to stakers (admin only)
   */
  async distributeFees(
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod("distributeFees", [], options, chainId);
  }

  /**
   * Claim revenue share from trading fees
   */
  async claimRevenueShare(
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod("claimRevenueShare", [], options, chainId);
  }

  /**
   * Get total fee pool for distribution
   */
  async getTotalFeePool(chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("totalFeePool", [], chainId);
  }

  // ==================== GOVERNANCE SYSTEM ====================

  /**
   * Create a new governance proposal
   */
  async createProposal(
    title: string,
    description: string,
    targetContract: string,
    callData: string,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod(
      "createProposal",
      [title, description, targetContract, callData],
      options,
      chainId
    );
  }

  /**
   * Cast a detailed vote on a proposal
   */
  async voteDetailed(
    proposalId: bigint,
    choice: VoteChoice,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod(
      "voteDetailed",
      [proposalId, choice],
      options,
      chainId
    );
  }

  /**
   * Cast a simple vote (interface compatibility)
   */
  async vote(
    proposalId: string, // bytes32
    support: boolean,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod("vote", [proposalId, support], options, chainId);
  }

  /**
   * Execute a successful proposal
   */
  async executeProposal(
    proposalId: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod(
      "executeProposal",
      [proposalId],
      options,
      chainId
    );
  }

  /**
   * Cancel a proposal (only by proposer before voting starts)
   */
  async cancelProposal(
    proposalId: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod("cancelProposal", [proposalId], options, chainId);
  }

  /**
   * Get proposal details
   */
  async getProposal(proposalId: bigint, chainId?: number): Promise<Proposal> {
    const result = await this.callMethod("getProposal", [proposalId], chainId);
    return {
      proposer: result[0],
      title: result[1],
      description: result[2],
      votesFor: result[3],
      votesAgainst: result[4],
      votesAbstain: result[5],
      startTime: result[6],
      endTime: result[7],
      state: result[8],
    };
  }

  /**
   * Check if user has voted on a proposal
   */
  async hasVoted(
    proposalId: bigint,
    user: string,
    chainId?: number
  ): Promise<boolean> {
    return this.callMethod<boolean>("hasVoted", [proposalId, user], chainId);
  }

  /**
   * Get total number of proposals
   */
  async getProposalCount(chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("proposalCount", [], chainId);
  }

  /**
   * Get user's voting power
   */
  async getVotingPower(address: string, chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("votingPower", [address], chainId);
  }

  // ==================== CROSS-CHAIN BRIDGE FUNCTIONS ====================

  /**
   * Burn tokens (bridge function)
   */
  async burn(
    from: string,
    amount: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod("burn", [from, amount], options, chainId);
  }

  /**
   * Mint tokens (bridge function)
   */
  async mint(
    to: string,
    amount: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod("mint", [to, amount], options, chainId);
  }

  /**
   * Check if bridge is authorized
   */
  async isAuthorizedBridge(bridge: string, chainId?: number): Promise<boolean> {
    return this.callMethod<boolean>("authorizedBridges", [bridge], chainId);
  }

  /**
   * Check if chain is supported
   */
  async isSupportedChain(chainId: number): Promise<boolean> {
    return this.callMethod<boolean>("supportedChains", [chainId]);
  }

  // ==================== ADMIN FUNCTIONS ====================

  /**
   * Set bridge authorization (admin only)
   */
  async setBridgeAuthorization(
    bridge: string,
    authorized: boolean,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod(
      "setBridgeAuthorization",
      [bridge, authorized],
      options,
      chainId
    );
  }

  /**
   * Set supported chain (admin only)
   */
  async setSupportedChain(
    chainId: number,
    supported: boolean,
    options: TransactionOptions = {},
    currentChainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod(
      "setSupportedChain",
      [chainId, supported],
      options,
      currentChainId
    );
  }

  /**
   * Set staking reward rate (admin only)
   */
  async setStakingRewardRate(
    newRate: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod(
      "setStakingRewardRate",
      [newRate],
      options,
      chainId
    );
  }

  /**
   * Pause the contract (admin only)
   */
  async pause(
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod("pause", [], options, chainId);
  }

  /**
   * Unpause the contract (admin only)
   */
  async unpause(
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod("unpause", [], options, chainId);
  }

  /**
   * Emergency withdraw (admin only)
   */
  async emergencyWithdraw(
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return this.executeMethod("emergencyWithdraw", [], options, chainId);
  }

  // ==================== CONSTANTS ====================

  /**
   * Get total supply constant
   */
  async getTotalSupplyConstant(chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("TOTAL_SUPPLY", [], chainId);
  }

  /**
   * Get minimum stake duration
   */
  async getMinStakeDuration(chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("MIN_STAKE_DURATION", [], chainId);
  }

  /**
   * Get maximum APY
   */
  async getMaxAPY(chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("MAX_APY", [], chainId);
  }

  /**
   * Get voting period
   */
  async getVotingPeriod(chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("VOTING_PERIOD", [], chainId);
  }

  /**
   * Get voting delay
   */
  async getVotingDelay(chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("VOTING_DELAY", [], chainId);
  }

  /**
   * Get quorum percentage
   */
  async getQuorumPercentage(chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("QUORUM_PERCENTAGE", [], chainId);
  }

  /**
   * Get proposal threshold
   */
  async getProposalThreshold(chainId?: number): Promise<bigint> {
    return this.callMethod<bigint>("PROPOSAL_THRESHOLD", [], chainId);
  }

  // ==================== EVENTS ====================

  /**
   * Get Transfer events
   */
  async getTransferEvents(
    fromBlock: number = -10000,
    toBlock?: number,
    chainId?: number
  ) {
    return this.getEvents("Transfer", { fromBlock, toBlock }, chainId);
  }

  /**
   * Get Approval events
   */
  async getApprovalEvents(
    fromBlock: number = -10000,
    toBlock?: number,
    chainId?: number
  ) {
    return this.getEvents("Approval", { fromBlock, toBlock }, chainId);
  }

  /**
   * Get Staked events
   */
  async getStakedEvents(
    fromBlock: number = -10000,
    toBlock?: number,
    chainId?: number
  ) {
    return this.getEvents("Staked", { fromBlock, toBlock }, chainId);
  }

  /**
   * Get Unstaked events
   */
  async getUnstakedEvents(
    fromBlock: number = -10000,
    toBlock?: number,
    chainId?: number
  ) {
    return this.getEvents("Unstaked", { fromBlock, toBlock }, chainId);
  }

  /**
   * Get ProposalCreated events
   */
  async getProposalCreatedEvents(
    fromBlock: number = -10000,
    toBlock?: number,
    chainId?: number
  ) {
    return this.getEvents("ProposalCreated", { fromBlock, toBlock }, chainId);
  }

  /**
   * Get VoteCast events
   */
  async getVoteCastEvents(
    fromBlock: number = -10000,
    toBlock?: number,
    chainId?: number
  ) {
    return this.getEvents("VoteCast", { fromBlock, toBlock }, chainId);
  }

  // ==================== EVENT LISTENERS ====================

  /**
   * Listen to Transfer events
   */
  async onTransfer(
    callback: (from: string, to: string, value: bigint) => void,
    chainId?: number
  ) {
    return this.listenToEvent(
      "Transfer",
      (event: any) => {
        callback(event.args.from, event.args.to, event.args.value);
      },
      chainId
    );
  }

  /**
   * Listen to Approval events
   */
  async onApproval(
    callback: (owner: string, spender: string, value: bigint) => void,
    chainId?: number
  ) {
    return this.listenToEvent(
      "Approval",
      (event: any) => {
        callback(event.args.owner, event.args.spender, event.args.value);
      },
      chainId
    );
  }

  /**
   * Listen to Staked events
   */
  async onStaked(
    callback: (user: string, amount: bigint, timestamp: bigint) => void,
    chainId?: number
  ) {
    return this.listenToEvent(
      "Staked",
      (event: any) => {
        callback(event.args.user, event.args.amount, event.args.timestamp);
      },
      chainId
    );
  }

  /**
   * Listen to Unstaked events
   */
  async onUnstaked(
    callback: (user: string, amount: bigint, rewards: bigint) => void,
    chainId?: number
  ) {
    return this.listenToEvent(
      "Unstaked",
      (event: any) => {
        callback(event.args.user, event.args.amount, event.args.rewards);
      },
      chainId
    );
  }

  /**
   * Listen to ProposalCreated events
   */
  async onProposalCreated(
    callback: (
      proposalId: bigint,
      proposer: string,
      title: string,
      startTime: bigint,
      endTime: bigint
    ) => void,
    chainId?: number
  ) {
    return this.listenToEvent(
      "ProposalCreated",
      (event: any) => {
        callback(
          event.args.proposalId,
          event.args.proposer,
          event.args.title,
          event.args.startTime,
          event.args.endTime
        );
      },
      chainId
    );
  }

  /**
   * Listen to VoteCast events
   */
  async onVoteCast(
    callback: (
      voter: string,
      proposalId: bigint,
      choice: VoteChoice,
      weight: bigint
    ) => void,
    chainId?: number
  ) {
    return this.listenToEvent(
      "VoteCast",
      (event: any) => {
        callback(
          event.args.voter,
          event.args.proposalId,
          event.args.choice,
          event.args.weight
        );
      },
      chainId
    );
  }

  /**
   * Listen to FeeDistributed events
   */
  async onFeeDistributed(
    callback: (amount: bigint, timestamp: bigint) => void,
    chainId?: number
  ) {
    return this.listenToEvent(
      "FeeDistributed",
      (event: any) => {
        callback(event.args.amount, event.args.timestamp);
      },
      chainId
    );
  }

  /**
   * Listen to RewardsClaimed events
   */
  async onRewardsClaimed(
    callback: (user: string, amount: bigint) => void,
    chainId?: number
  ) {
    return this.listenToEvent(
      "RewardsClaimed",
      (event: any) => {
        callback(event.args.user, event.args.amount);
      },
      chainId
    );
  }
}
