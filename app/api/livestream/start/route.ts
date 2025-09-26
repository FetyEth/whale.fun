import { NextRequest, NextResponse } from "next/server";
import {
  createHuddle01Service,
  Huddle01Service,
} from "@/lib/services/huddle01";
import {
  createYouTubeRTMP,
  createMultiPlatformRTMP,
  isValidRTMPUrl,
  createPlatformRTMP,
  STREAMING_PLATFORMS,
} from "@/utils/huddle01Utils";

export async function POST(request: NextRequest) {
  try {
    const { roomId, rtmpUrls, youtubeStream, platforms, platformStream } =
      await request.json();

    if (!roomId) {
      return NextResponse.json(
        { success: false, error: "Room ID is required" },
        { status: 400 }
      );
    }

    let finalRtmpUrls: string[] = [];

    // Handle different input formats from client
    if (rtmpUrls && Array.isArray(rtmpUrls)) {
      finalRtmpUrls = rtmpUrls;
    } else if (youtubeStream) {
      // Handle YouTube specific format
      const { streamUrl, streamKey } = youtubeStream;
      if (streamUrl && streamKey) {
        finalRtmpUrls = [createYouTubeRTMP(streamUrl, streamKey)];
      }
    } else if (platforms && Array.isArray(platforms)) {
      // Handle multiple platforms
      finalRtmpUrls = createMultiPlatformRTMP(platforms);
    } else if (platformStream) {
      // Handle specific platform streaming
      const { platform, streamKey } = platformStream;
      if (platform && streamKey && platform in STREAMING_PLATFORMS) {
        finalRtmpUrls = [
          createPlatformRTMP(
            platform as keyof typeof STREAMING_PLATFORMS,
            streamKey
          ),
        ];
      }
    }

    // If still empty, fall back to server-side defaults via env vars
    if (finalRtmpUrls.length === 0) {
      // 1) Support prebuilt RTMP URLs list (comma-separated)
      const envRtmpList = process.env.LIVESTREAM_RTMP_URLS?.split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (envRtmpList && envRtmpList.length > 0) {
        finalRtmpUrls = envRtmpList;
      } else {
        // 2) Support platform-based defaults: LIVESTREAM_DEFAULT_PLATFORMS=YOUTUBE,TWITCH
        const defaultPlatforms =
          process.env.LIVESTREAM_DEFAULT_PLATFORMS?.split(",")
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean) as
            | (keyof typeof STREAMING_PLATFORMS)[]
            | undefined;

        if (defaultPlatforms && defaultPlatforms.length > 0) {
          const urls: string[] = [];
          for (const platform of defaultPlatforms) {
            const keyEnv = `LIVESTREAM_${platform}_KEY` as const;
            const streamKey = process.env[keyEnv];
            if (streamKey && STREAMING_PLATFORMS[platform]) {
              urls.push(createPlatformRTMP(platform, streamKey));
            }
          }
          finalRtmpUrls = urls;
        }
      }
    }

    if (finalRtmpUrls.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No RTMP configuration provided. Configure env or send stream details.",
        },
        { status: 400 }
      );
    }

    // Validate RTMP URLs
    const invalidUrls = finalRtmpUrls.filter((url) => !isValidRTMPUrl(url));
    if (invalidUrls.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid RTMP URLs: ${invalidUrls.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Create Huddle01 service instance
    const huddle01Service = createHuddle01Service();

    // Start livestream
    const result = await huddle01Service.startLivestream(roomId, finalRtmpUrls);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Livestream started successfully",
      livestream: result.data,
      rtmpUrls: finalRtmpUrls,
    });
  } catch (error) {
    console.error("Error starting livestream:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");
    const youtubeStreamUrl = searchParams.get("youtubeStreamUrl");
    const youtubeStreamKey = searchParams.get("youtubeStreamKey");

    if (!roomId) {
      return NextResponse.json(
        { success: false, error: "Room ID is required" },
        { status: 400 }
      );
    }

    if (!youtubeStreamUrl || !youtubeStreamKey) {
      return NextResponse.json(
        {
          success: false,
          error: "YouTube stream URL and key are required for GET method",
        },
        { status: 400 }
      );
    }

    // Create RTMP URL for YouTube using static method
    const rtmpUrl = Huddle01Service.createYouTubeRTMP(
      youtubeStreamUrl,
      youtubeStreamKey
    );

    // Create Huddle01 service instance
    const huddle01Service = createHuddle01Service();

    // Start livestream
    const result = await huddle01Service.startLivestream(roomId, [rtmpUrl]);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Livestream started successfully",
      livestream: result.data,
      rtmpUrls: [rtmpUrl],
    });
  } catch (error) {
    console.error("Error starting livestream:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
