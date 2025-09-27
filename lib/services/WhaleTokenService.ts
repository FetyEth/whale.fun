import { ContractTransactionResponse, EventLog } from "ethers";
import {
  BaseContractService,
  TransactionOptions,
  EventFilterOptions,
  ContractConfig,
} from "./BaseContractService";
import WhaleTokenABI from "@/config/abi/WhaleToken.json";

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
 * Proposal details interface
 */
export interface ProposalDetails {
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
 * Vote choice enumeration
 */
export enum VoteChoice {
  FOR = 0,
  AGAINST = 1,
  ABSTAIN = 2,
}

/**
 * Proposal state enumeration
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
 * MEV Configuration interface
 */
export interface MEVConfig {
  maxSlippage: bigint;
  priceImpactThreshold: bigint;
  timeWindow: bigint;
  maxTransactionSize: bigint;
  commitRevealDelay: bigint;
  sandwichProtectionEnabled: boolean;
  frontRunningProtectionEnabled: boolean;
}

/**
 * Rate limit information interface
 */
export interface RateLimit {
  totalVolume: bigint;
  lastResetTime: bigint;
  transactionCount: bigint;
}

/**
 * Transaction commit interface
 */
export interface TransactionCommit {
  commitHash: string;
  commitTime: bigint;
  user: string;
  revealed: boolean;
  executed: boolean;
}

/**
 * WhaleToken contract deployment configuration
 */
const WHALE_TOKEN_CONFIG: ContractConfig = {
  name: "WhaleToken",
  abi: WhaleTokenABI,
  deployments: {
    // Add your deployment addresses here
    84532: {
      // Base Sepolia
      address: "0x...", // Replace with actual deployment address
      deployedAt: 0, // Replace with deployment block number
      verified: false,
    },
    // Add other networks as needed
  },
};

/**
 * WhaleToken Service
 * Provides comprehensive functionality for the WHALE platform token including:
 * - ERC20 operations
 * - Staking and rewards
 * - Governance
 * - Revenue sharing
 * - Cross-chain operations
 * - MEV protection
 */
export class WhaleTokenService extends BaseContractService {
  constructor() {
    super(WHALE_TOKEN_CONFIG);
  }

  // ==================== ERC20 Operations ====================

  /**
   * Get token name
   */
  async getName(chainId?: number): Promise<string> {
    return await this.callMethod("name", [], chainId);
  }

  /**
   * Get token symbol
   */
  async getSymbol(chainId?: number): Promise<string> {
    return await this.callMethod("symbol", [], chainId);
  }

  /**
   * Get token decimals
   */
  async getDecimals(chainId?: number): Promise<number> {
    return await this.callMethod("decimals", [], chainId);
  }

  /**
   * Get total supply
   */
  async getTotalSupply(chainId?: number): Promise<bigint> {
    return await this.callMethod("totalSupply", [], chainId);
  }

  /**
   * Get balance of address
   */
  async getBalance(address: string, chainId?: number): Promise<bigint> {
    return await this.callMethod("balanceOf", [address], chainId);
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
    return await this.executeMethod("transfer", [to, amount], options, chainId);
  }

  /**
   * Approve spender
   */
  async approve(
    spender: string,
    amount: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return await this.executeMethod(
      "approve",
      [spender, amount],
      options,
      chainId
    );
  }

  /**
   * Get allowance
   */
  async getAllowance(
    owner: string,
    spender: string,
    chainId?: number
  ): Promise<bigint> {
    return await this.callMethod("allowance", [owner, spender], chainId);
  }

  // ==================== Staking Operations ====================

  /**
   * Stake tokens to earn rewards and gain voting power
   */
  async stake(
    amount: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return await this.executeMethod("stake", [amount], options, chainId);
  }

  /**
   * Unstake tokens and claim rewards
   */
  async unstake(
    amount: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return await this.executeMethod("unstake", [amount], options, chainId);
  }

  /**
   * Claim staking rewards without unstaking
   */
  async claimRewards(
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return await this.executeMethod("claimRewards", [], options, chainId);
  }

  /**
   * Calculate pending staking rewards for a user
   */
  async calculatePendingRewards(
    user: string,
    chainId?: number
  ): Promise<bigint> {
    return await this.callMethod("calculatePendingRewards", [user], chainId);
  }

  /**
   * Get comprehensive staking information for a user
   */
  async getStakingInfo(user: string, chainId?: number): Promise<StakingInfo> {
    const result = await this.callMethod("getStakingInfo", [user], chainId);
    return {
      staked: result[0],
      earned: result[1],
      pending: result[2],
      voting: result[3],
      revenueShare: result[4],
    };
  }

  /**
   * Get staked balance for user
   */
  async getStakedBalance(user: string, chainId?: number): Promise<bigint> {
    return await this.callMethod("stakedBalance", [user], chainId);
  }

  /**
   * Get stake timestamp for user
   */
  async getStakeTimestamp(user: string, chainId?: number): Promise<bigint> {
    return await this.callMethod("stakeTimestamp", [user], chainId);
  }

  /**
   * Get rewards earned for user
   */
  async getRewardsEarned(user: string, chainId?: number): Promise<bigint> {
    return await this.callMethod("rewardsEarned", [user], chainId);
  }

  /**
   * Get total staked amount
   */
  async getTotalStaked(chainId?: number): Promise<bigint> {
    return await this.callMethod("totalStaked", [], chainId);
  }

  /**
   * Get current staking reward rate
   */
  async getStakingRewardRate(chainId?: number): Promise<bigint> {
    return await this.callMethod("stakingRewardRate", [], chainId);
  }

  // ==================== Governance Operations ====================

  /**
   * Get voting power for user
   */
  async getVotingPower(user: string, chainId?: number): Promise<bigint> {
    return await this.callMethod("votingPower", [user], chainId);
  }

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
    return await this.executeMethod(
      "createProposal",
      [title, description, targetContract, callData],
      options,
      chainId
    );
  }

  /**
   * Vote on a proposal with detailed choice
   */
  async voteDetailed(
    proposalId: bigint,
    choice: VoteChoice,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return await this.executeMethod(
      "voteDetailed",
      [proposalId, choice],
      options,
      chainId
    );
  }

  /**
   * Simple vote function (for interface compatibility)
   */
  async vote(
    proposalId: string,
    support: boolean,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return await this.executeMethod(
      "vote",
      [proposalId, support],
      options,
      chainId
    );
  }

  /**
   * Execute a successful proposal
   */
  async executeProposal(
    proposalId: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return await this.executeMethod(
      "executeProposal",
      [proposalId],
      options,
      chainId
    );
  }

  /**
   * Cancel a proposal
   */
  async cancelProposal(
    proposalId: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return await this.executeMethod(
      "cancelProposal",
      [proposalId],
      options,
      chainId
    );
  }

  /**
   * Get proposal details
   */
  async getProposal(
    proposalId: bigint,
    chainId?: number
  ): Promise<ProposalDetails> {
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
    return await this.callMethod("hasVoted", [proposalId, user], chainId);
  }

  /**
   * Get proposal count
   */
  async getProposalCount(chainId?: number): Promise<bigint> {
    return await this.callMethod("proposalCount", [], chainId);
  }

  // ==================== Revenue Sharing ====================

  /**
   * Distribute trading fees to stakers (only owner)
   */
  async distributeFees(
    feeAmount: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    const txOptions = { ...options, value: feeAmount };
    return await this.executeMethod("distributeFees", [], txOptions, chainId);
  }

  /**
   * Claim revenue share from trading fees
   */
  async claimRevenueShare(
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return await this.executeMethod("claimRevenueShare", [], options, chainId);
  }

  /**
   * Get total fee pool
   */
  async getTotalFeePool(chainId?: number): Promise<bigint> {
    return await this.callMethod("totalFeePool", [], chainId);
  }

  /**
   * Get last claimed block for user
   */
  async getLastClaimedBlock(user: string, chainId?: number): Promise<bigint> {
    return await this.callMethod("lastClaimedBlock", [user], chainId);
  }

  // ==================== Cross-Chain Operations ====================

  /**
   * Mint tokens (only authorized bridges)
   */
  async mint(
    to: string,
    amount: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return await this.executeMethod("mint", [to, amount], options, chainId);
  }

  /**
   * Burn tokens (only authorized bridges)
   */
  async burn(
    from: string,
    amount: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return await this.executeMethod("burn", [from, amount], options, chainId);
  }

  /**
   * Check if bridge is authorized
   */
  async isAuthorizedBridge(bridge: string, chainId?: number): Promise<boolean> {
    return await this.callMethod("authorizedBridges", [bridge], chainId);
  }

  /**
   * Check if chain is supported
   */
  async isSupportedChain(
    chainId: number,
    targetChainId?: number
  ): Promise<boolean> {
    return await this.callMethod("supportedChains", [chainId], targetChainId);
  }

  // ==================== MEV Protection ====================

  /**
   * Get MEV configuration
   */
  async getMEVConfig(chainId?: number): Promise<MEVConfig> {
    const result = await this.callMethod("mevConfig", [], chainId);
    return {
      maxSlippage: result[0],
      priceImpactThreshold: result[1],
      timeWindow: result[2],
      maxTransactionSize: result[3],
      commitRevealDelay: result[4],
      sandwichProtectionEnabled: result[5],
      frontRunningProtectionEnabled: result[6],
    };
  }

  /**
   * Get user rate limits
   */
  async getUserRateLimit(user: string, chainId?: number): Promise<RateLimit> {
    const result = await this.callMethod("userRateLimits", [user], chainId);
    return {
      totalVolume: result[0],
      lastResetTime: result[1],
      transactionCount: result[2],
    };
  }

  /**
   * Get last transaction block for user
   */
  async getLastTransactionBlock(
    user: string,
    chainId?: number
  ): Promise<bigint> {
    return await this.callMethod("lastTransactionBlock", [user], chainId);
  }

  /**
   * Get transaction commit
   */
  async getTransactionCommit(
    commitHash: string,
    chainId?: number
  ): Promise<TransactionCommit> {
    const result = await this.callMethod(
      "transactionCommits",
      [commitHash],
      chainId
    );
    return {
      commitHash: result[0],
      commitTime: result[1],
      user: result[2],
      revealed: result[3],
      executed: result[4],
    };
  }

  // ==================== Admin Operations ====================

  /**
   * Set bridge authorization (only owner)
   */
  async setBridgeAuthorization(
    bridge: string,
    authorized: boolean,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return await this.executeMethod(
      "setBridgeAuthorization",
      [bridge, authorized],
      options,
      chainId
    );
  }

  /**
   * Set supported chain (only owner)
   */
  async setSupportedChain(
    chainIdToSet: number,
    supported: boolean,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return await this.executeMethod(
      "setSupportedChain",
      [chainIdToSet, supported],
      options,
      chainId
    );
  }

  /**
   * Set staking reward rate (only owner)
   */
  async setStakingRewardRate(
    newRate: bigint,
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return await this.executeMethod(
      "setStakingRewardRate",
      [newRate],
      options,
      chainId
    );
  }

  /**
   * Pause contract (only owner)
   */
  async pause(
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return await this.executeMethod("pause", [], options, chainId);
  }

  /**
   * Unpause contract (only owner)
   */
  async unpause(
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return await this.executeMethod("unpause", [], options, chainId);
  }

  /**
   * Check if contract is paused
   */
  async isPaused(chainId?: number): Promise<boolean> {
    return await this.callMethod("paused", [], chainId);
  }

  /**
   * Emergency withdraw (only owner)
   */
  async emergencyWithdraw(
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    return await this.executeMethod("emergencyWithdraw", [], options, chainId);
  }

  // ==================== Constants ====================

  /**
   * Get total supply constant
   */
  async getTotalSupplyConstant(chainId?: number): Promise<bigint> {
    return await this.callMethod("TOTAL_SUPPLY", [], chainId);
  }

  /**
   * Get minimum stake duration
   */
  async getMinStakeDuration(chainId?: number): Promise<bigint> {
    return await this.callMethod("MIN_STAKE_DURATION", [], chainId);
  }

  /**
   * Get maximum APY
   */
  async getMaxAPY(chainId?: number): Promise<bigint> {
    return await this.callMethod("MAX_APY", [], chainId);
  }

  /**
   * Get voting period
   */
  async getVotingPeriod(chainId?: number): Promise<bigint> {
    return await this.callMethod("VOTING_PERIOD", [], chainId);
  }

  /**
   * Get voting delay
   */
  async getVotingDelay(chainId?: number): Promise<bigint> {
    return await this.callMethod("VOTING_DELAY", [], chainId);
  }

  /**
   * Get quorum percentage
   */
  async getQuorumPercentage(chainId?: number): Promise<bigint> {
    return await this.callMethod("QUORUM_PERCENTAGE", [], chainId);
  }

  /**
   * Get proposal threshold
   */
  async getProposalThreshold(chainId?: number): Promise<bigint> {
    return await this.callMethod("PROPOSAL_THRESHOLD", [], chainId);
  }

  // ==================== Event Listening ====================

  /**
   * Listen to Staked events
   */
  async onStaked(
    callback: (event: EventLog) => void,
    chainId?: number
  ): Promise<void> {
    await this.listenToEvent("Staked", callback, chainId);
  }

  /**
   * Listen to Unstaked events
   */
  async onUnstaked(
    callback: (event: EventLog) => void,
    chainId?: number
  ): Promise<void> {
    await this.listenToEvent("Unstaked", callback, chainId);
  }

  /**
   * Listen to RewardsClaimed events
   */
  async onRewardsClaimed(
    callback: (event: EventLog) => void,
    chainId?: number
  ): Promise<void> {
    await this.listenToEvent("RewardsClaimed", callback, chainId);
  }

  /**
   * Listen to FeeDistributed events
   */
  async onFeeDistributed(
    callback: (event: EventLog) => void,
    chainId?: number
  ): Promise<void> {
    await this.listenToEvent("FeeDistributed", callback, chainId);
  }

  /**
   * Listen to ProposalCreated events
   */
  async onProposalCreated(
    callback: (event: EventLog) => void,
    chainId?: number
  ): Promise<void> {
    await this.listenToEvent("ProposalCreated", callback, chainId);
  }

  /**
   * Listen to VoteCast events
   */
  async onVoteCast(
    callback: (event: EventLog) => void,
    chainId?: number
  ): Promise<void> {
    await this.listenToEvent("VoteCast", callback, chainId);
  }

  /**
   * Listen to Transfer events
   */
  async onTransfer(
    callback: (event: EventLog) => void,
    chainId?: number
  ): Promise<void> {
    await this.listenToEvent("Transfer", callback, chainId);
  }

  /**
   * Listen to Approval events
   */
  async onApproval(
    callback: (event: EventLog) => void,
    chainId?: number
  ): Promise<void> {
    await this.listenToEvent("Approval", callback, chainId);
  }

  // ==================== Utility Methods ====================

  /**
   * Get all staking events for a user
   */
  async getUserStakingEvents(
    user: string,
    filterOptions: EventFilterOptions = {},
    chainId?: number
  ): Promise<EventLog[]> {
    const stakedEvents = await this.getEvents("Staked", filterOptions, chainId);
    const unstakedEvents = await this.getEvents(
      "Unstaked",
      filterOptions,
      chainId
    );
    const rewardsEvents = await this.getEvents(
      "RewardsClaimed",
      filterOptions,
      chainId
    );

    return [...stakedEvents, ...unstakedEvents, ...rewardsEvents]
      .filter(
        (event) =>
          event.args && event.args[0].toLowerCase() === user.toLowerCase()
      )
      .sort((a, b) => Number(a.blockNumber) - Number(b.blockNumber));
  }

  /**
   * Get all proposal events
   */
  async getProposalEvents(
    proposalId?: bigint,
    filterOptions: EventFilterOptions = {},
    chainId?: number
  ): Promise<EventLog[]> {
    const createdEvents = await this.getEvents(
      "ProposalCreated",
      filterOptions,
      chainId
    );
    const votedEvents = await this.getEvents(
      "VoteCast",
      filterOptions,
      chainId
    );
    const executedEvents = await this.getEvents(
      "ProposalExecuted",
      filterOptions,
      chainId
    );
    const cancelledEvents = await this.getEvents(
      "ProposalCancelled",
      filterOptions,
      chainId
    );

    let allEvents = [
      ...createdEvents,
      ...votedEvents,
      ...executedEvents,
      ...cancelledEvents,
    ];

    if (proposalId !== undefined) {
      allEvents = allEvents.filter(
        (event) => event.args && event.args[0] === proposalId
      );
    }

    return allEvents.sort(
      (a, b) => Number(a.blockNumber) - Number(b.blockNumber)
    );
  }
}

// Create and export a singleton instance
export const whaleTokenService = new WhaleTokenService();
export default whaleTokenService;
