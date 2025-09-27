import { NextRequest, NextResponse } from "next/server";
import { nfcRewardService } from "@/lib/services/NFCRewardService";

interface NFCTapData {
  nfcId: string;
  userId?: string;
  walletAddress?: string;
  location?: string;
  timestamp: number;
  tokenAddress?: string;
  campaignId?: string;
}

interface RewardCampaign {
  id: string;
  name: string;
  description: string;
  tokenAddress?: string; // If null, rewards WHALE tokens
  rewardAmount: bigint;
  maxRewardsPerUser: number;
  maxTotalRewards: number;
  currentRewardsDistributed: number;
  isActive: boolean;
  locationRestricted: boolean;
  allowedLocations?: string[];
  startTime: number;
  endTime: number;
  createdBy: string;
  createdAt: number;
}

interface NFCTagConfig {
  campaignId: string;
  location?: string;
  isActive: boolean;
  createdAt: number;
}

// In-memory storage (in production, use Redis or database)
const rewardCampaigns = new Map<string, RewardCampaign>();
const userRewardHistory = new Map<string, Map<string, number>>(); // userId -> campaignId -> rewardCount
const nfcTagRegistry = new Map<string, NFCTagConfig>();

// Initialize default campaigns
const initializeCampaigns = () => {
  if (rewardCampaigns.size === 0) {
    // WHALE token daily reward campaign
    rewardCampaigns.set("whale-daily-rewards", {
      id: "whale-daily-rewards",
      name: "Daily WHALE Rewards",
      description:
        "Tap NFC tags daily to earn WHALE tokens! Limited to 3 rewards per user per day.",
      rewardAmount: BigInt("100000000000000000000"), // 100 WHALE tokens
      maxRewardsPerUser: 3,
      maxTotalRewards: 1000,
      currentRewardsDistributed: 0,
      isActive: true,
      locationRestricted: false,
      startTime: Date.now(),
      endTime: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      createdBy: "system",
      createdAt: Date.now(),
    });

    // Event-based location reward
    rewardCampaigns.set("venue-special", {
      id: "venue-special",
      name: "Venue Special Rewards",
      description:
        "Exclusive rewards for visiting specific venue locations. One-time reward per location.",
      rewardAmount: BigInt("250000000000000000000"), // 250 WHALE tokens
      maxRewardsPerUser: 5, // Can claim from up to 5 different locations
      maxTotalRewards: 500,
      currentRewardsDistributed: 0,
      isActive: true,
      locationRestricted: true,
      allowedLocations: [
        "conference-hall-1",
        "booth-a12",
        "main-stage",
        "networking-area",
        "demo-zone",
      ],
      startTime: Date.now(),
      endTime: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      createdBy: "system",
      createdAt: Date.now(),
    });

    // High-value limited campaign
    rewardCampaigns.set("whale-genesis", {
      id: "whale-genesis",
      name: "WHALE Genesis Collection",
      description:
        "Limited-time high-value rewards for early adopters. Extremely limited supply!",
      rewardAmount: BigInt("1000000000000000000000"), // 1000 WHALE tokens
      maxRewardsPerUser: 1,
      maxTotalRewards: 50,
      currentRewardsDistributed: 0,
      isActive: true,
      locationRestricted: false,
      startTime: Date.now(),
      endTime: Date.now() + 3 * 24 * 60 * 60 * 1000, // 3 days only
      createdBy: "system",
      createdAt: Date.now(),
    });

    // Register some example NFC tags
    nfcTagRegistry.set("nfc-001", {
      campaignId: "whale-daily-rewards",
      isActive: true,
      createdAt: Date.now(),
    });
    nfcTagRegistry.set("nfc-venue-01", {
      campaignId: "venue-special",
      location: "conference-hall-1",
      isActive: true,
      createdAt: Date.now(),
    });
    nfcTagRegistry.set("nfc-genesis-01", {
      campaignId: "whale-genesis",
      isActive: true,
      createdAt: Date.now(),
    });
  }
};

// Initialize on first load
initializeCampaigns();

/**
 * Handle NFC tap for rewards
 */
export async function POST(request: NextRequest) {
  try {
    const tapData: NFCTapData = await request.json();

    if (!tapData.nfcId) {
      return NextResponse.json(
        { error: "NFC ID is required" },
        { status: 400 }
      );
    }

    if (!tapData.walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required to receive rewards" },
        { status: 400 }
      );
    }

    // Get NFC tag configuration
    const nfcConfig = nfcTagRegistry.get(tapData.nfcId);
    if (!nfcConfig || !nfcConfig.isActive) {
      return NextResponse.json(
        { error: "NFC tag not registered or inactive" },
        { status: 404 }
      );
    }

    // Get campaign
    const campaign = rewardCampaigns.get(nfcConfig.campaignId);
    if (!campaign || !campaign.isActive) {
      return NextResponse.json(
        { error: "Campaign not active or not found" },
        { status: 400 }
      );
    }

    // Check campaign timing
    const now = Date.now();
    if (now < campaign.startTime || now > campaign.endTime) {
      return NextResponse.json(
        {
          error: "Campaign not within active period",
          campaignStart: campaign.startTime,
          campaignEnd: campaign.endTime,
          currentTime: now,
        },
        { status: 400 }
      );
    }

    // Check total rewards limit
    if (campaign.currentRewardsDistributed >= campaign.maxTotalRewards) {
      return NextResponse.json(
        { error: "Campaign rewards exhausted" },
        { status: 429 }
      );
    }

    // Check location restriction
    if (campaign.locationRestricted && campaign.allowedLocations) {
      const userLocation = tapData.location || nfcConfig.location;
      if (!userLocation || !campaign.allowedLocations.includes(userLocation)) {
        return NextResponse.json(
          {
            error: "Invalid location for this campaign",
            allowedLocations: campaign.allowedLocations,
            userLocation: userLocation,
          },
          { status: 400 }
        );
      }
    }

    // Check user reward limits
    const userId = tapData.walletAddress.toLowerCase();
    const userHistory = userRewardHistory.get(userId) || new Map();
    const userRewardCount = userHistory.get(campaign.id) || 0;

    if (userRewardCount >= campaign.maxRewardsPerUser) {
      return NextResponse.json(
        {
          error: "Maximum rewards reached for this user in this campaign",
          maxRewards: campaign.maxRewardsPerUser,
          currentRewards: userRewardCount,
        },
        { status: 429 }
      );
    }

    // Process reward - mint WHALE tokens using NFCRewardService
    let rewardTxHash = "";
    let rewardDetails = {};

    try {
      // Validate the reward transaction first
      const validation = await nfcRewardService.validateRewardTransaction(
        userId,
        campaign.rewardAmount,
        campaign.id
      );

      if (!validation.valid) {
        return NextResponse.json(
          { error: `Reward validation failed: ${validation.reason}` },
          { status: 400 }
        );
      }

      // Mint the reward using the NFCRewardService
      const mintResult = await nfcRewardService.mintReward(
        userId,
        campaign.rewardAmount,
        campaign.id,
        tapData.nfcId
      );

      if (!mintResult.success) {
        throw new Error("Reward minting failed");
      }

      rewardDetails = {
        type: "whale_token",
        amount: mintResult.amount,
        amountFormatted: mintResult.amountFormatted,
        recipient: mintResult.recipient,
        txHash: mintResult.transactionHash,
        blockNumber: mintResult.blockNumber,
        timestamp: mintResult.timestamp,
      };

      rewardTxHash = mintResult.transactionHash;

      console.log(`✅ NFC reward minted successfully: ${rewardTxHash}`);
    } catch (error) {
      console.error("Failed to mint WHALE tokens:", error);
      return NextResponse.json(
        { error: "Failed to process reward transaction" },
        { status: 500 }
      );
    }

    // Update user history and campaign stats
    userHistory.set(campaign.id, userRewardCount + 1);
    userRewardHistory.set(userId, userHistory);
    campaign.currentRewardsDistributed += 1;

    // Log the successful reward
    console.log(
      `✅ NFC Reward Success: ${userId} tapped ${tapData.nfcId} and received ${campaign.rewardAmount} WHALE tokens`
    );

    // Calculate remaining rewards
    const userRemainingRewards =
      campaign.maxRewardsPerUser - (userRewardCount + 1);
    const campaignRemainingRewards =
      campaign.maxTotalRewards - campaign.currentRewardsDistributed;

    return NextResponse.json({
      success: true,
      reward: rewardDetails,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        userRemainingRewards,
        campaignRemainingRewards,
        totalRewardsDistributed: campaign.currentRewardsDistributed,
        maxTotalRewards: campaign.maxTotalRewards,
      },
      tapData: {
        nfcId: tapData.nfcId,
        timestamp: tapData.timestamp,
        location: tapData.location || nfcConfig.location,
      },
      message: `🎉 Congratulations! You've earned ${(
        Number(campaign.rewardAmount) / 1e18
      ).toFixed(0)} WHALE tokens!`,
    });
  } catch (error) {
    console.error("NFC tap reward error:", error);
    return NextResponse.json(
      { error: "Internal server error occurred while processing reward" },
      { status: 500 }
    );
  }
}

/**
 * Register or update NFC tags
 */
export async function PUT(request: NextRequest) {
  try {
    const {
      nfcId,
      campaignId,
      location,
      isActive = true,
    } = await request.json();

    if (!nfcId || !campaignId) {
      return NextResponse.json(
        { error: "NFC ID and campaign ID are required" },
        { status: 400 }
      );
    }

    const campaign = rewardCampaigns.get(campaignId);
    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Register or update the NFC tag
    nfcTagRegistry.set(nfcId, {
      campaignId,
      location,
      isActive,
      createdAt: Date.now(),
    });

    return NextResponse.json({
      success: true,
      message: "NFC tag registered successfully",
      nfcTag: {
        nfcId,
        campaignId,
        location,
        isActive,
        campaignName: campaign.name,
      },
    });
  } catch (error) {
    console.error("NFC registration error:", error);
    return NextResponse.json(
      { error: "Internal server error occurred during registration" },
      { status: 500 }
    );
  }
}

/**
 * Get campaign status and NFC tag info
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId");
    const nfcId = searchParams.get("nfcId");

    if (nfcId) {
      // Get specific NFC tag info
      const nfcConfig = nfcTagRegistry.get(nfcId);
      if (!nfcConfig) {
        return NextResponse.json(
          { error: "NFC tag not found" },
          { status: 404 }
        );
      }

      const campaign = rewardCampaigns.get(nfcConfig.campaignId);
      return NextResponse.json({
        nfcTag: {
          nfcId,
          ...nfcConfig,
        },
        campaign: campaign || null,
      });
    }

    if (campaignId) {
      // Get specific campaign
      const campaign = rewardCampaigns.get(campaignId);
      if (!campaign) {
        return NextResponse.json(
          { error: "Campaign not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ campaign });
    }

    // Return all active campaigns with stats
    const activeCampaigns = Array.from(rewardCampaigns.values())
      .filter((campaign) => campaign.isActive)
      .map((campaign) => ({
        ...campaign,
        rewardAmount: campaign.rewardAmount.toString(),
        remainingRewards:
          campaign.maxTotalRewards - campaign.currentRewardsDistributed,
        progressPercentage: Math.round(
          (campaign.currentRewardsDistributed / campaign.maxTotalRewards) * 100
        ),
      }));

    // Also include NFC tags count
    const totalNFCTags = nfcTagRegistry.size;
    const activeNFCTags = Array.from(nfcTagRegistry.values()).filter(
      (tag) => tag.isActive
    ).length;

    return NextResponse.json({
      campaigns: activeCampaigns,
      stats: {
        totalCampaigns: rewardCampaigns.size,
        activeCampaigns: activeCampaigns.length,
        totalNFCTags,
        activeNFCTags,
      },
    });
  } catch (error) {
    console.error("GET request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
