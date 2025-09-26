import { NextRequest, NextResponse } from "next/server";
import { YouTubeService } from "@/lib/services/youtube";
import { createYouTubeRTMP } from "@/utils/huddle01Utils";
import { createHuddle01Service } from "@/lib/services/huddle01";
import { getYoutubeTokens } from "@/lib/services/tokenStore";

export async function POST(request: NextRequest) {
  try {
    const { roomId, title, description, privacyStatus } = await request.json();

    if (!roomId) {
      return NextResponse.json(
        { success: false, error: "Room ID is required" },
        { status: 400 }
      );
    }

    const clientId = process.env.YT_CLIENT_ID;
    const clientSecret = process.env.YT_CLIENT_SECRET;

    const tokens = await getYoutubeTokens();

    if (!clientId || !clientSecret || !tokens?.refresh_token) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing YouTube credentials. Authenticate first.",
        },
        { status: 400 }
      );
    }

    const yt = new YouTubeService({
      clientId,
      clientSecret,
      refreshToken: tokens.refresh_token,
    });

    const ytRes = await yt.createLiveAndGetRTMP({
      title: title || `LaunchDAO Live: ${roomId}`,
      description,
      privacyStatus: privacyStatus || "unlisted",
    });

    if (!ytRes.success || !ytRes.streamKey || !ytRes.ingestionAddress) {
      return NextResponse.json(
        {
          success: false,
          error: ytRes.error || "Failed to create YouTube stream",
        },
        { status: 500 }
      );
    }

    const rtmpUrl = createYouTubeRTMP(ytRes.ingestionAddress, ytRes.streamKey);

    // start Huddle livestream
    const huddle = createHuddle01Service();
    const startRes = await huddle.startLivestream(roomId, [rtmpUrl]);

    if (!startRes.success) {
      return NextResponse.json(
        {
          success: false,
          error: startRes.error || "Failed to start livestream",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "YouTube stream created and livestream started",
      youtube: {
        broadcastId: ytRes.broadcastId,
        streamId: ytRes.streamId,
        ingestionAddress: ytRes.ingestionAddress,
      },
      rtmpUrl,
      livestream: startRes.data,
    });
  } catch (err) {
    console.error("Livestream error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
