import { NextRequest, NextResponse } from "next/server";
import { tokenGraduationService } from "@/config/services/core/tokenGraduation";

// GET /api/graduation/[tokenAddress]
// Get graduation info and progress for a specific token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tokenAddress: string }> }
) {
  try {
    const { tokenAddress } = await params;

    if (!tokenAddress) {
      return NextResponse.json(
        { success: false, error: "Token address is required" },
        { status: 400 }
      );
    }

    // Get comprehensive graduation data
    const [graduationCheck, progress] = await Promise.all([
      tokenGraduationService.canTokenGraduate(tokenAddress),
      tokenGraduationService.getGraduationProgress(tokenAddress),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        tokenAddress,
        canGraduate: graduationCheck.eligible,
        reasons: graduationCheck.reasons,
        progress: progress.progress,
        info: graduationCheck.info,
        timeToGraduation: progress.timeToGraduation,
        recommendedActions: progress.recommendedActions,
      },
    });
  } catch (error: any) {
    console.error("Error getting graduation info:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to get graduation info",
      },
      { status: 500 }
    );
  }
}
