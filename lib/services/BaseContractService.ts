import { Contract, ContractTransactionResponse, EventLog } from "ethers";
import {
  getContractInstance,
  ContractInstance,
  ContractDeployment,
  waitForTransaction,
  estimateGas,
} from "@/utils/Blockchain";

/**
 * Transaction options interface
 */
export interface TransactionOptions {
  gasLimit?: bigint;
  gasPrice?: bigint;
  value?: bigint;
}

/**
 * Event filter options
 */
export interface EventFilterOptions {
  fromBlock?: number;
  toBlock?: number;
  topics?: string[];
}

/**
 * Contract configuration interface
 */
export interface ContractConfig {
  name: string;
  abi: any;
  deployments: Record<number, ContractDeployment>; // chainId -> deployment info
}

/**
 * Base contract service class providing common functionality
 */
export abstract class BaseContractService<T extends Contract = Contract> {
  protected contractInstance: ContractInstance<T> | null = null;
  protected readonly config: ContractConfig;

  constructor(config: ContractConfig) {
    this.config = config;
  }

  /**
   * Initialize contract connection
   */
  protected async initialize(chainId?: number): Promise<ContractInstance<T>> {
    if (
      this.contractInstance &&
      (!chainId || Number(this.contractInstance.network.chainId) === chainId)
    ) {
      return this.contractInstance;
    }

    // Find deployment for the network
    const deployment = chainId
      ? this.config.deployments[chainId]
      : Object.values(this.config.deployments)[0];

    if (!deployment) {
      const supportedNetworks = Object.keys(this.config.deployments).join(", ");
      throw new Error(
        `${this.config.name} not deployed on network ${chainId}. ` +
          `Supported networks: ${supportedNetworks}`
      );
    }

    this.contractInstance = await getContractInstance<T>(
      deployment.address,
      this.config.abi,
      chainId
    );

    return this.contractInstance;
  }

  /**
   * Get contract instance
   */
  protected async getContract(chainId?: number): Promise<T> {
    const instance = await this.initialize(chainId);
    return instance.contract;
  }

  /**
   * Execute a read-only contract method
   */
  protected async callMethod<R = any>(
    methodName: string,
    args: any[] = [],
    chainId?: number
  ): Promise<R> {
    try {
      const contract = await this.getContract(chainId);
      return await contract[methodName](...args);
    } catch (error) {
      throw new Error(
        `Failed to call ${this.config.name}.${methodName}: ${error}`
      );
    }
  }

  /**
   * Execute a state-changing contract method
   */
  protected async executeMethod(
    methodName: string,
    args: any[] = [],
    options: TransactionOptions = {},
    chainId?: number
  ): Promise<ContractTransactionResponse> {
    try {
      const contract = await this.getContract(chainId);

      // Estimate gas if not provided
      if (!options.gasLimit) {
        options.gasLimit = await estimateGas(contract, methodName, args);
      }

      return await contract[methodName](...args, options);
    } catch (error) {
      throw new Error(
        `Failed to execute ${this.config.name}.${methodName}: ${error}`
      );
    }
  }

  /**
   * Wait for transaction confirmation
   */
  protected async waitForConfirmation(
    txResponse: ContractTransactionResponse,
    confirmations: number = 1
  ) {
    return await waitForTransaction(txResponse.hash, confirmations);
  }

  /**
   * Get contract events
   */
  protected async getEvents(
    eventName: string,
    filterOptions: EventFilterOptions = {},
    chainId?: number
  ): Promise<EventLog[]> {
    try {
      const contract = await this.getContract(chainId);
      const filter = contract.filters[eventName]();

      return (await contract.queryFilter(
        filter,
        filterOptions.fromBlock || -10000,
        filterOptions.toBlock || "latest"
      )) as EventLog[];
    } catch (error) {
      throw new Error(
        `Failed to get ${this.config.name} events for ${eventName}: ${error}`
      );
    }
  }

  /**
   * Listen to contract events
   */
  protected async listenToEvent(
    eventName: string,
    callback: (event: EventLog) => void,
    chainId?: number
  ): Promise<void> {
    try {
      const contract = await this.getContract(chainId);
      contract.on(eventName, callback);
    } catch (error) {
      throw new Error(
        `Failed to listen to ${this.config.name} event ${eventName}: ${error}`
      );
    }
  }

  /**
   * Stop listening to contract events
   */
  protected async stopListening(
    eventName?: string,
    chainId?: number
  ): Promise<void> {
    try {
      const contract = await this.getContract(chainId);
      if (eventName) {
        contract.off(eventName);
      } else {
        contract.removeAllListeners();
      }
    } catch (error) {
      throw new Error(
        `Failed to stop listening to ${this.config.name} events: ${error}`
      );
    }
  }

  /**
   * Get contract address for current network
   */
  async getContractAddress(chainId?: number): Promise<string> {
    const instance = await this.initialize(chainId);
    return await instance.contract.getAddress();
  }

  /**
   * Get current user's account
   */
  async getCurrentAccount(chainId?: number): Promise<string> {
    const instance = await this.initialize(chainId);
    return instance.account;
  }

  /**
   * Check if contract is deployed and verified
   */
  async isContractVerified(chainId?: number): Promise<boolean> {
    const deployment = chainId
      ? this.config.deployments[chainId]
      : Object.values(this.config.deployments)[0];
    return deployment?.verified || false;
  }

  /**
   * Get all supported networks for this contract
   */
  getSupportedNetworks(): number[] {
    return Object.keys(this.config.deployments).map(Number);
  }

  /**
   * Get deployment info for a specific network
   */
  getDeploymentInfo(chainId: number): ContractDeployment | null {
    return this.config.deployments[chainId] || null;
  }

  /**
   * Reset contract instance (force re-initialization)
   */
  reset(): void {
    this.contractInstance = null;
  }
}
