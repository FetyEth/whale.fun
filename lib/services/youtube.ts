import { google, youtube_v3 } from "googleapis";

export interface YouTubeAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
  refreshToken: string;
}

export interface CreateYouTubeStreamParams {
  title: string;
  description?: string;
  privacyStatus?: "public" | "unlisted" | "private";
  scheduledStartTime?: string;
}

export interface YouTubeStreamResult {
  success: boolean;
  error?: string;
  streamKey?: string;
  ingestionAddress?: string;
  broadcastId?: string;
  streamId?: string;
}

export class YouTubeService {
  private oauth2Client: any;
  private youtube: youtube_v3.Youtube;

  constructor(cfg: YouTubeAuthConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      cfg.clientId,
      cfg.clientSecret,
      cfg.redirectUri || "urn:ietf:wg:oauth:2.0:oob"
    );
    this.oauth2Client.setCredentials({ refresh_token: cfg.refreshToken });
    this.youtube = google.youtube({ version: "v3", auth: this.oauth2Client });
  }

  // Creates a liveBroadcast and a liveStream and binds them. Returns ingest URL + key
  async createLiveAndGetRTMP(
    params: CreateYouTubeStreamParams
  ): Promise<YouTubeStreamResult> {
    try {
      // 1) Create liveBroadcast
      const broadcastRes = await this.youtube.liveBroadcasts.insert({
        part: ["id", "snippet", "status", "contentDetails"],
        requestBody: {
          snippet: {
            title: params.title,
            description: params.description || "",
            scheduledStartTime:
              params.scheduledStartTime || new Date().toISOString(),
          },
          status: {
            privacyStatus: params.privacyStatus || "unlisted",
            selfDeclaredMadeForKids: false,
          },
          contentDetails: {
            enableAutoStart: true,
            enableAutoStop: true,
          },
        },
      });

      const broadcastId = broadcastRes.data.id as string;
      if (!broadcastId) throw new Error("Failed to create YouTube broadcast");

      // 2) Create liveStream
      const streamRes = await this.youtube.liveStreams.insert({
        part: ["id", "snippet", "cdn", "status"],
        requestBody: {
          snippet: { title: params.title + " Stream" },
          cdn: {
            frameRate: "variable",
            ingestionType: "rtmp",
            resolution: "variable",
          },
        },
      });

      const streamId = streamRes.data.id as string;
      const ingestionInfo = streamRes.data.cdn?.ingestionInfo;
      if (
        !streamId ||
        !ingestionInfo?.ingestionAddress ||
        !ingestionInfo.streamName
      ) {
        throw new Error(
          "Failed to create YouTube stream or missing ingestion info"
        );
      }

      // 3) Bind stream to broadcast
      await this.youtube.liveBroadcasts.bind({
        id: broadcastId,
        part: ["id", "snippet", "status", "contentDetails"],
        streamId: streamId,
      });

      return {
        success: true,
        broadcastId,
        streamId,
        ingestionAddress: ingestionInfo.ingestionAddress,
        streamKey: ingestionInfo.streamName,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("YouTube createLiveAndGetRTMP error:", err);
      return { success: false, error: msg };
    }
  }
}
