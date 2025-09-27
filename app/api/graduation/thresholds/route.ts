import { NextRequest, NextResponse } from "next/server";
import { tokenGraduationService } from "@/config/services/core/tokenGraduation";

// GET /api/graduation/thresholds
// Get current default graduation thresholds
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ethPrice = parseFloat(searchParams.get("ethPrice") || "2000");

    const thresholds = await tokenGraduationService.getDefaultThresholdsUSD(
      ethPrice
    );

    return NextResponse.json({
      success: true,
      data: {
        thresholds,
        ethPriceUsed: ethPrice,
        note: "Default thresholds for new tokens. Individual tokens can have custom thresholds.",
      },
    });
  } catch (error: any) {
    console.error("Error getting graduation thresholds:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to get graduation thresholds",
      },
      { status: 500 }
    );
  }
}

// POST /api/graduation/thresholds
// Update default graduation thresholds (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      marketCapUSD,
      volumeUSD,
      holders,
      ethPrice = 2000,
      adminAddress,
    } = body;

    // Basic validation
    if (!marketCapUSD || !volumeUSD || !holders) {
      return NextResponse.json(
        {
          success: false,
          error: "marketCapUSD, volumeUSD, and holders are required",
        },
        { status: 400 }
      );
    }

    if (marketCapUSD < 1 || marketCapUSD > 1000000) {
      return NextResponse.json(
        {
          success: false,
          error: "Market cap must be between $1 and $1,000,000",
        },
        { status: 400 }
      );
    }

    if (holders < 10 || holders > 10000) {
      return NextResponse.json(
        {
          success: false,
          error: "Holder count must be between 10 and 10,000",
        },
        { status: 400 }
      );
    }

    // Execute threshold update (this will fail if not admin)
    const result = await tokenGraduationService.updateDefaultThresholds(
      marketCapUSD,
      volumeUSD,
      holders,
      ethPrice
    );

    return NextResponse.json({
      success: true,
      message: "Default graduation thresholds updated successfully",
      data: {
        newThresholds: {
          marketCapUSD,
          volumeUSD,
          holders,
        },
        txHash: result.hash,
      },
    });
  } catch (error: any) {
    console.error("Error updating graduation thresholds:", error);

    // Handle specific contract errors
    let errorMessage =
      error.message || "Failed to update graduation thresholds";

    if (error.message.includes("Ownable: caller is not the owner")) {
      errorMessage = "Only admin can update default graduation thresholds";
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: error.message.includes("Ownable") ? 403 : 500 }
    );
  }
}
