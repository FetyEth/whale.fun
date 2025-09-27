import { NextRequest, NextResponse } from "next/server";
import { tokenGraduationService } from "@/config/services/core/tokenGraduation";

// POST /api/graduation/graduate
// Graduate a token if eligible
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokenAddress, creatorAddress } = body;

    if (!tokenAddress) {
      return NextResponse.json(
        { success: false, error: "Token address is required" },
        { status: 400 }
      );
    }

    // Check eligibility first
    const eligibilityCheck = await tokenGraduationService.canTokenGraduate(
      tokenAddress
    );

    if (!eligibilityCheck.eligible) {
      return NextResponse.json(
        {
          success: false,
          error: "Token not eligible for graduation",
          reasons: eligibilityCheck.reasons,
          currentStatus: eligibilityCheck.info,
        },
        { status: 400 }
      );
    }

    // Execute graduation
    const result = await tokenGraduationService.graduateTokenSafely(
      tokenAddress,
      {} // Use default transaction options
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Token graduated successfully!",
      data: {
        tokenAddress,
        txHash: result.txHash,
        liquidityPair: result.liquidityPair,
        finalStatus: eligibilityCheck.info,
      },
    });
  } catch (error: any) {
    console.error("Error graduating token:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to graduate token",
      },
      { status: 500 }
    );
  }
}

// GET /api/graduation/graduate?ready=true
// Get tokens ready to graduate
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ready = searchParams.get("ready") === "true";
    const minProgress = searchParams.get("minProgress")
      ? parseInt(searchParams.get("minProgress")!)
      : 70;

    if (ready) {
      // Get tokens nearing graduation
      const tokensNearingGraduation =
        await tokenGraduationService.getTokensNearingGraduation(minProgress);

      return NextResponse.json({
        success: true,
        data: {
          count: tokensNearingGraduation.length,
          tokens: tokensNearingGraduation,
          minProgress,
        },
      });
    }

    // Check if any tokens are ready
    const hasReadyTokens =
      await tokenGraduationService.hasTokensReadyToGraduate();

    return NextResponse.json({
      success: true,
      data: {
        hasReadyTokens,
      },
    });
  } catch (error: any) {
    console.error("Error checking graduation status:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to check graduation status",
      },
      { status: 500 }
    );
  }
}
