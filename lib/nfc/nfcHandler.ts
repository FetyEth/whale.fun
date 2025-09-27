/**
 * Result interface for NFC tap operations
 */
export interface NFCTapResult {
  success: boolean;
  reward?: {
    type: string;
    amount: string;
    amountFormatted: string;
    recipient: string;
    txHash: string;
    blockNumber?: number;
    timestamp?: number;
  };
  campaign?: {
    id: string;
    name: string;
    description: string;
    userRemainingRewards: number;
    campaignRemainingRewards: number;
  };
  tapData?: {
    nfcId: string;
    timestamp: number;
    location?: string;
  };
  message?: string;
  error?: string;
}

/**
 * Campaign information interface
 */
export interface CampaignInfo {
  id: string;
  name: string;
  description: string;
  rewardAmount: string;
  maxRewardsPerUser: number;
  maxTotalRewards: number;
  currentRewardsDistributed: number;
  remainingRewards: number;
  progressPercentage: number;
  isActive: boolean;
  locationRestricted: boolean;
  allowedLocations?: string[];
  startTime: number;
  endTime: number;
  isExpired: boolean;
  daysRemaining: number;
}

/**
 * Base NFC reward handler class
 */
export class NFCRewardHandler {
  private baseUrl: string;

  constructor(baseUrl: string = "/api/nfc") {
    this.baseUrl = baseUrl;
  }

  /**
   * Process NFC tap and claim rewards
   */
  async handleNFCTap(
    nfcId: string,
    walletAddress?: string,
    location?: string
  ): Promise<NFCTapResult> {
    try {
      console.log(`🏷️ Processing NFC tap: ${nfcId}`);

      const response = await fetch(`${this.baseUrl}/tap-reward`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nfcId,
          walletAddress,
          location,
          timestamp: Date.now(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(`❌ NFC tap failed: ${data.error}`);
        return {
          success: false,
          error: data.error || "Failed to process NFC tap",
        };
      }

      console.log(`✅ NFC tap successful: ${data.message}`);
      return {
        success: true,
        reward: data.reward,
        campaign: data.campaign,
        tapData: data.tapData,
        message: data.message,
      };
    } catch (error) {
      console.error("🚨 NFC tap network error:", error);
      return {
        success: false,
        error: "Network error occurred while processing tap",
      };
    }
  }

  /**
   * Register an NFC tag with a campaign
   */
  async registerNFCTag(
    nfcId: string,
    campaignId: string,
    location?: string,
    isActive: boolean = true
  ) {
    try {
      console.log(
        `📝 Registering NFC tag: ${nfcId} to campaign: ${campaignId}`
      );

      const response = await fetch(`${this.baseUrl}/tap-reward`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nfcId,
          campaignId,
          location,
          isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to register NFC tag");
      }

      console.log(`✅ NFC tag registered successfully`);
      return data;
    } catch (error) {
      console.error("Failed to register NFC tag:", error);
      throw error;
    }
  }

  /**
   * Get information about an NFC tag
   */
  async getNFCTagInfo(nfcId: string) {
    try {
      const response = await fetch(
        `${this.baseUrl}/tap-reward?nfcId=${encodeURIComponent(nfcId)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get NFC tag info");
      }

      return data;
    } catch (error) {
      console.error("Failed to get NFC tag info:", error);
      throw error;
    }
  }

  /**
   * Get all active campaigns
   */
  async getCampaigns(): Promise<{ campaigns: CampaignInfo[]; stats: any }> {
    try {
      console.log("📋 Fetching active campaigns...");

      const response = await fetch(`${this.baseUrl}/tap-reward`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch campaigns");
      }

      console.log(`✅ Fetched ${data.campaigns.length} active campaigns`);
      return data;
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
      throw error;
    }
  }

  /**
   * Get specific campaign information
   */
  async getCampaign(campaignId: string): Promise<{ campaign: CampaignInfo }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/tap-reward?campaignId=${encodeURIComponent(
          campaignId
        )}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch campaign");
      }

      return data;
    } catch (error) {
      console.error("Failed to fetch campaign:", error);
      throw error;
    }
  }
}

/**
 * Web NFC API handler with browser integration
 */
export class WebNFCHandler extends NFCRewardHandler {
  private reader: any = null;
  private isScanning: boolean = false;
  private controller: AbortController | null = null;

  constructor(baseUrl?: string) {
    super(baseUrl);
  }

  /**
   * Check if Web NFC is supported
   */
  static isSupported(): boolean {
    return "NDEFReader" in window;
  }

  /**
   * Request NFC permission
   */
  async requestPermission(): Promise<boolean> {
    try {
      if (!WebNFCHandler.isSupported()) {
        throw new Error("Web NFC not supported in this browser");
      }

      // Check if we already have permission
      const permissionStatus = await navigator.permissions.query({
        name: "nfc" as any,
      });

      if (permissionStatus.state === "granted") {
        return true;
      }

      if (permissionStatus.state === "denied") {
        throw new Error("NFC permission denied");
      }

      // Permission will be requested when we try to scan
      return true;
    } catch (error) {
      console.error("NFC permission check failed:", error);
      return false;
    }
  }

  /**
   * Start NFC scanning for rewards
   */
  async startNFCScanning(
    walletAddress?: string,
    location?: string,
    options: {
      onSuccess?: (result: NFCTapResult) => void;
      onError?: (error: string) => void;
      onTagDetected?: (nfcId: string) => void;
    } = {}
  ): Promise<void> {
    try {
      if (!WebNFCHandler.isSupported()) {
        throw new Error("Web NFC not supported in this browser");
      }

      if (this.isScanning) {
        throw new Error("NFC scanning already in progress");
      }

      console.log("🚀 Starting NFC scanning...");

      this.reader = new (window as any).NDEFReader();
      this.controller = new AbortController();
      this.isScanning = true;

      // Start scanning
      await this.reader.scan({ signal: this.controller.signal });

      console.log("👂 NFC scanning active - ready for tags");

      // Listen for NFC tag reads
      this.reader.addEventListener("reading", async (event: any) => {
        const { message, serialNumber } = event;

        console.log(`📱 NFC tag detected: ${serialNumber}`);
        options.onTagDetected?.(serialNumber);

        try {
          // Process the NFC tap
          const result = await this.handleNFCTap(
            serialNumber,
            walletAddress,
            location
          );

          if (result.success) {
            console.log("🎉 Reward claimed successfully!");
            options.onSuccess?.(result);
          } else {
            console.error("❌ Reward claim failed:", result.error);
            options.onError?.(result.error || "Failed to claim reward");
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : "Unknown error occurred";
          console.error("🚨 NFC processing error:", errorMsg);
          options.onError?.(errorMsg);
        }
      });

      // Listen for scanning errors
      this.reader.addEventListener("readingerror", (event: any) => {
        console.error("🚨 NFC reading error:", event.error);
        options.onError?.(
          `NFC reading error: ${event.error?.message || "Unknown error"}`
        );
      });
    } catch (error) {
      this.isScanning = false;
      const errorMsg =
        error instanceof Error ? error.message : "Failed to start NFC scanning";
      console.error("🚨 NFC scanning start failed:", errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Stop NFC scanning
   */
  stopNFCScanning(): void {
    try {
      if (this.controller) {
        this.controller.abort();
        this.controller = null;
      }

      if (this.reader) {
        this.reader = null;
      }

      this.isScanning = false;
      console.log("🛑 NFC scanning stopped");
    } catch (error) {
      console.error("Error stopping NFC scanning:", error);
    }
  }

  /**
   * Check if currently scanning
   */
  isScanningActive(): boolean {
    return this.isScanning;
  }

  /**
   * Write data to NFC tag (for admin/setup purposes)
   */
  async writeNFCTag(data: {
    campaignId: string;
    location?: string;
  }): Promise<void> {
    try {
      if (!WebNFCHandler.isSupported()) {
        throw new Error("Web NFC not supported in this browser");
      }

      const writer = new (window as any).NDEFWriter();

      const message = {
        records: [
          {
            recordType: "text",
            data: JSON.stringify({
              type: "whale_nfc_reward",
              campaignId: data.campaignId,
              location: data.location,
              timestamp: Date.now(),
            }),
          },
        ],
      };

      await writer.write(message);
      console.log("✅ NFC tag written successfully");
    } catch (error) {
      console.error("Failed to write NFC tag:", error);
      throw error;
    }
  }
}

/**
 * Utility functions for NFC operations
 */
export const NFCUtils = {
  /**
   * Generate a unique NFC ID
   */
  generateNFCId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substr(2, 8);
    return `nfc-${timestamp}-${randomStr}`;
  },

  /**
   * Validate NFC ID format
   */
  isValidNFCId(nfcId: string): boolean {
    return typeof nfcId === "string" && nfcId.length > 0 && nfcId.length <= 100;
  },

  /**
   * Format reward amount for display
   */
  formatRewardAmount(amount: string | bigint, decimals: number = 18): string {
    try {
      if (typeof amount === "bigint") {
        amount = amount.toString();
      }

      const num = parseFloat(amount) / Math.pow(10, decimals);

      if (num >= 1000000) {
        return `${(num / 1000000).toFixed(1)}M`;
      } else if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}K`;
      } else if (num >= 1) {
        return num.toFixed(2);
      } else {
        return num.toFixed(6);
      }
    } catch (error) {
      return "0";
    }
  },

  /**
   * Calculate time remaining for campaign
   */
  getTimeRemaining(endTime: number): {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  } {
    const now = Date.now();
    const diff = endTime - now;

    if (diff <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        expired: true,
      };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return {
      days,
      hours,
      minutes,
      seconds,
      expired: false,
    };
  },

  /**
   * Format time remaining as human readable string
   */
  formatTimeRemaining(endTime: number): string {
    const remaining = NFCUtils.getTimeRemaining(endTime);

    if (remaining.expired) {
      return "Expired";
    }

    if (remaining.days > 0) {
      return `${remaining.days}d ${remaining.hours}h remaining`;
    } else if (remaining.hours > 0) {
      return `${remaining.hours}h ${remaining.minutes}m remaining`;
    } else if (remaining.minutes > 0) {
      return `${remaining.minutes}m ${remaining.seconds}s remaining`;
    } else {
      return `${remaining.seconds}s remaining`;
    }
  },
};

// Export instances
export const nfcRewardHandler = new NFCRewardHandler();
export const webNFCHandler = new WebNFCHandler();
