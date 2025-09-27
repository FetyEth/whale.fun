import { NextRequest, NextResponse } from "next/server";

interface CreateCampaignRequest {
  name: string;
  description: string;
  tokenAddress?: string;
  rewardAmount: string; // In wei string format
  maxRewardsPerUser: number;
  maxTotalRewards: number;
  locationRestricted: boolean;
  allowedLocations?: string[];
  durationDays: number;
  createdBy: string;
}

interface UpdateCampaignRequest {
  name?: string;
  description?: string;
  rewardAmount?: string;
  maxRewardsPerUser?: number;
  maxTotalRewards?: number;
  locationRestricted?: boolean;
  allowedLocations?: string[];
  isActive?: boolean;
  endTime?: number;
}

interface RewardCampaign {
  id: string;
  name: string;
  description: string;
  tokenAddress?: string;
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
  updatedAt: number;
}

// In-memory storage - in production use database
const campaigns = new Map<string, RewardCampaign>();

/**
 * Create a new reward campaign
 */
export async function POST(request: NextRequest) {
  try {
    const data: CreateCampaignRequest = await request.json();

    // Validate required fields
    if (!data.name || !data.description || !data.rewardAmount) {
      return NextResponse.json(
        { error: "Name, description, and reward amount are required" },
        { status: 400 }
      );
    }

    if (!data.createdBy) {
      return NextResponse.json(
        { error: "Created by field is required" },
        { status: 400 }
      );
    }

    // Validate numeric fields
    if (
      data.maxRewardsPerUser <= 0 ||
      data.maxTotalRewards <= 0 ||
      data.durationDays <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Max rewards per user, max total rewards, and duration must be positive numbers",
        },
        { status: 400 }
      );
    }

    // Validate reward amount
    let rewardAmountBigInt: bigint;
    try {
      rewardAmountBigInt = BigInt(data.rewardAmount);
      if (rewardAmountBigInt <= 0) {
        throw new Error("Reward amount must be positive");
      }
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid reward amount format" },
        { status: 400 }
      );
    }

    // Validate location restrictions
    if (
      data.locationRestricted &&
      (!data.allowedLocations || data.allowedLocations.length === 0)
    ) {
      return NextResponse.json(
        {
          error:
            "Allowed locations must be specified when location restricted is enabled",
        },
        { status: 400 }
      );
    }

    const campaignId = `campaign-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const now = Date.now();

    const campaign: RewardCampaign = {
      id: campaignId,
      name: data.name.trim(),
      description: data.description.trim(),
      tokenAddress: data.tokenAddress,
      rewardAmount: rewardAmountBigInt,
      maxRewardsPerUser: data.maxRewardsPerUser,
      maxTotalRewards: data.maxTotalRewards,
      currentRewardsDistributed: 0,
      isActive: true,
      locationRestricted: data.locationRestricted,
      allowedLocations: data.allowedLocations
        ?.map((loc) => loc.trim())
        .filter(Boolean),
      startTime: now,
      endTime: now + data.durationDays * 24 * 60 * 60 * 1000,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    campaigns.set(campaignId, campaign);

    return NextResponse.json({
      success: true,
      campaignId,
      campaign: {
        ...campaign,
        rewardAmount: campaign.rewardAmount.toString(),
      },
      message: "Campaign created successfully",
    });
  } catch (error) {
    console.error("Campaign creation error:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}

/**
 * Get all campaigns or specific campaign
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("id");
    const includeInactive = searchParams.get("includeInactive") === "true";
    const createdBy = searchParams.get("createdBy");

    if (campaignId) {
      // Get specific campaign
      const campaign = campaigns.get(campaignId);
      if (!campaign) {
        return NextResponse.json(
          { error: "Campaign not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        campaign: {
          ...campaign,
          rewardAmount: campaign.rewardAmount.toString(),
          remainingRewards:
            campaign.maxTotalRewards - campaign.currentRewardsDistributed,
          progressPercentage: Math.round(
            (campaign.currentRewardsDistributed / campaign.maxTotalRewards) *
              100
          ),
          isExpired: Date.now() > campaign.endTime,
          daysRemaining: Math.ceil(
            (campaign.endTime - Date.now()) / (24 * 60 * 60 * 1000)
          ),
        },
      });
    }

    // Get all campaigns with filters
    let allCampaigns = Array.from(campaigns.values());

    if (!includeInactive) {
      allCampaigns = allCampaigns.filter((campaign) => campaign.isActive);
    }

    if (createdBy) {
      allCampaigns = allCampaigns.filter(
        (campaign) => campaign.createdBy === createdBy
      );
    }

    // Sort by creation date (newest first)
    allCampaigns.sort((a, b) => b.createdAt - a.createdAt);

    const campaignsWithStats = allCampaigns.map((campaign) => ({
      ...campaign,
      rewardAmount: campaign.rewardAmount.toString(),
      remainingRewards:
        campaign.maxTotalRewards - campaign.currentRewardsDistributed,
      progressPercentage: Math.round(
        (campaign.currentRewardsDistributed / campaign.maxTotalRewards) * 100
      ),
      isExpired: Date.now() > campaign.endTime,
      daysRemaining: Math.ceil(
        (campaign.endTime - Date.now()) / (24 * 60 * 60 * 1000)
      ),
    }));

    // Calculate overall stats
    const stats = {
      totalCampaigns: campaigns.size,
      activeCampaigns: allCampaigns.filter(
        (c) => c.isActive && Date.now() <= c.endTime
      ).length,
      expiredCampaigns: allCampaigns.filter((c) => Date.now() > c.endTime)
        .length,
      totalRewardsDistributed: allCampaigns.reduce(
        (sum, c) => sum + c.currentRewardsDistributed,
        0
      ),
      totalMaxRewards: allCampaigns.reduce(
        (sum, c) => sum + c.maxTotalRewards,
        0
      ),
    };

    return NextResponse.json({
      campaigns: campaignsWithStats,
      stats,
    });
  } catch (error) {
    console.error("GET campaigns error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve campaigns" },
      { status: 500 }
    );
  }
}

/**
 * Update existing campaign
 */
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("id");

    if (!campaignId) {
      return NextResponse.json(
        { error: "Campaign ID is required" },
        { status: 400 }
      );
    }

    const campaign = campaigns.get(campaignId);
    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    const updateData: UpdateCampaignRequest = await request.json();

    // Update campaign fields
    if (updateData.name !== undefined) {
      campaign.name = updateData.name.trim();
    }
    if (updateData.description !== undefined) {
      campaign.description = updateData.description.trim();
    }
    if (updateData.rewardAmount !== undefined) {
      try {
        campaign.rewardAmount = BigInt(updateData.rewardAmount);
      } catch (error) {
        return NextResponse.json(
          { error: "Invalid reward amount format" },
          { status: 400 }
        );
      }
    }
    if (updateData.maxRewardsPerUser !== undefined) {
      if (updateData.maxRewardsPerUser <= 0) {
        return NextResponse.json(
          { error: "Max rewards per user must be positive" },
          { status: 400 }
        );
      }
      campaign.maxRewardsPerUser = updateData.maxRewardsPerUser;
    }
    if (updateData.maxTotalRewards !== undefined) {
      if (updateData.maxTotalRewards <= 0) {
        return NextResponse.json(
          { error: "Max total rewards must be positive" },
          { status: 400 }
        );
      }
      // Don't allow reducing below current distributed amount
      if (updateData.maxTotalRewards < campaign.currentRewardsDistributed) {
        return NextResponse.json(
          {
            error:
              "Cannot reduce max total rewards below already distributed amount",
          },
          { status: 400 }
        );
      }
      campaign.maxTotalRewards = updateData.maxTotalRewards;
    }
    if (updateData.locationRestricted !== undefined) {
      campaign.locationRestricted = updateData.locationRestricted;
    }
    if (updateData.allowedLocations !== undefined) {
      campaign.allowedLocations = updateData.allowedLocations
        .map((loc) => loc.trim())
        .filter(Boolean);
    }
    if (updateData.isActive !== undefined) {
      campaign.isActive = updateData.isActive;
    }
    if (updateData.endTime !== undefined) {
      // Don't allow setting end time in the past
      if (updateData.endTime <= Date.now()) {
        return NextResponse.json(
          { error: "End time cannot be in the past" },
          { status: 400 }
        );
      }
      campaign.endTime = updateData.endTime;
    }

    campaign.updatedAt = Date.now();
    campaigns.set(campaignId, campaign);

    return NextResponse.json({
      success: true,
      campaign: {
        ...campaign,
        rewardAmount: campaign.rewardAmount.toString(),
      },
      message: "Campaign updated successfully",
    });
  } catch (error) {
    console.error("Campaign update error:", error);
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    );
  }
}

/**
 * Delete campaign
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("id");

    if (!campaignId) {
      return NextResponse.json(
        { error: "Campaign ID is required" },
        { status: 400 }
      );
    }

    const campaign = campaigns.get(campaignId);
    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Check if campaign has distributed rewards
    if (campaign.currentRewardsDistributed > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete campaign that has already distributed rewards",
          rewardsDistributed: campaign.currentRewardsDistributed,
        },
        { status: 400 }
      );
    }

    campaigns.delete(campaignId);

    return NextResponse.json({
      success: true,
      message: "Campaign deleted successfully",
      deletedCampaignId: campaignId,
    });
  } catch (error) {
    console.error("Campaign deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete campaign" },
      { status: 500 }
    );
  }
}
