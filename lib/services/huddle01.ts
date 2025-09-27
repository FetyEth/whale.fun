import { Recorder } from "@huddle01/server-sdk/recorder";
import { AccessToken, Role } from "@huddle01/server-sdk/auth";

export interface RecordingResult {
  success: boolean;
  data?: any;
  error?: string;
  recordingUrl?: string;
  recordingSize?: number;
}

export interface LivestreamResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface HuddleRecording {
  id: string;
  recordingUrl: string;
  recordingSize: number;
}

export class Huddle01Service {
  private recorder: Recorder;
  private projectId: string;
  private apiKey: string;

  constructor(projectId: string, apiKey: string) {
    if (!projectId || !apiKey) {
      throw new Error(
        "Project ID and API Key are required for Huddle01Service"
      );
    }

    this.projectId = projectId;
    this.apiKey = apiKey;
    this.recorder = new Recorder(projectId, apiKey);
  }

  /**
   * Generate access token for the recorder bot
   */
  private async generateAccessToken(roomId: string): Promise<string> {
    const token = new AccessToken({
      apiKey: this.apiKey,
      roomId: roomId,
      role: Role.BOT,
      permissions: {
        admin: true,
        canConsume: true,
        canProduce: true,
        canProduceSources: {
          cam: true,
          mic: true,
          screen: true,
        },
        canRecvData: true,
        canSendData: true,
        canUpdateMetadata: true,
      },
    });

    return await token.toJwt();
  }

  /**
   * Generate access token for a regular user
   */
  async generateUserAccessToken(
    roomId: string,
    userId?: string
  ): Promise<string> {
    try {
      console.log("Creating AccessToken with:", {
        apiKey: this.apiKey.substring(0, 10) + "...",
        roomId,
        role: Role.HOST,
      });
      const token = new AccessToken({
        apiKey: this.apiKey,
        roomId: roomId,
        role: Role.HOST, // or Role.GUEST depending on your needs
        permissions: {
          admin: false,
          canConsume: true,
          canProduce: true,
          canProduceSources: {
            cam: true,
            mic: true,
            screen: false, // Users might not need screen sharing
          },
          canRecvData: true,
          canSendData: true,
          canUpdateMetadata: false,
        },
        options: {
          metadata: {
            displayName: userId || "Anonymous User",
          },
        },
      });

      console.log("Calling token.toJwt()");
      const jwt = await token.toJwt();
      console.log(
        "JWT generated successfully, length:",
        jwt?.length,
        "value:",
        jwt
      );
      if (!jwt) {
        throw new Error("toJwt() returned null/undefined");
      }
      return jwt;
    } catch (error) {
      console.error("Token generation failed:", error);
      throw error instanceof Error
        ? error
        : new Error("Token generation failed");
    }
  }

  /**
   * Start recording a meeting
   */
  async startRecording(roomId: string): Promise<RecordingResult> {
    try {
      const accessToken = await this.generateAccessToken(roomId);

      const recording = await this.recorder.startRecording({
        roomId: roomId,
        token: accessToken,
      });

      return {
        success: true,
        data: recording,
      };
    } catch (error) {
      console.error("Failed to start recording:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Stop recording a meeting and fetch the recording URL
   */
  async stopRecording(roomId: string): Promise<RecordingResult> {
    try {
      const recording = await this.recorder.stop({
        roomId: roomId,
      });

      console.log("Recording stopped:", recording);

      const { msg } = recording;

      if (msg === "Stopped") {
        const recordings = await this.getRecordings();

        if (recordings.length > 0) {
          const latestRecording = recordings[0];
          return {
            success: true,
            data: recording,
            recordingUrl: latestRecording.recordingUrl,
            recordingSize: latestRecording.recordingSize,
          };
        }
      }

      return {
        success: true,
        data: recording,
      };
    } catch (error) {
      console.error("Failed to stop recording:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Start livestreaming a meeting
   */
  async startLivestream(
    roomId: string,
    rtmpUrls: string[]
  ): Promise<LivestreamResult> {
    try {
      if (!rtmpUrls || rtmpUrls.length === 0) {
        throw new Error("At least one RTMP URL is required for livestreaming");
      }

      const accessToken = await this.generateAccessToken(roomId);

      const livestream = await this.recorder.startLivestream({
        roomId: roomId,
        token: accessToken,
        rtmpUrls: rtmpUrls,
      });

      console.log("Livestream started:", livestream);

      return {
        success: true,
        data: livestream,
      };
    } catch (error) {
      console.error("Failed to start livestream:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Stop livestreaming a meeting
   */
  async stopLivestream(roomId: string): Promise<LivestreamResult> {
    try {
      const livestream = await this.recorder.stop({
        roomId: roomId,
      });

      console.log("Livestream stopped:", livestream);

      return {
        success: true,
        data: livestream,
      };
    } catch (error) {
      console.error("Failed to stop livestream:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Get all recordings
   */
  async getRecordings(): Promise<HuddleRecording[]> {
    try {
      const response = await fetch(
        "https://api.huddle01.com/api/v2/sdk/recordings",
        {
          headers: {
            "x-api-key": this.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch recordings: ${response.statusText}`);
      }

      const data = await response.json();
      const { recordings } = data as { recordings: HuddleRecording[] };

      return recordings || [];
    } catch (error) {
      console.error("Failed to get recordings:", error);
      return [];
    }
  }

  /**
   * Get recording by ID
   */
  async getRecordingById(recordingId: string): Promise<HuddleRecording | null> {
    try {
      const recordings = await this.getRecordings();
      return (
        recordings.find((recording) => recording.id === recordingId) || null
      );
    } catch (error) {
      console.error("Failed to get recording by ID:", error);
      return null;
    }
  }

  /**
   * Create YouTube RTMP URL from stream URL and key
   */
  static createYouTubeRTMP(streamUrl: string, streamKey: string): string {
    return `${streamUrl}/${streamKey}`;
  }

  /**
   * Create multiple platform RTMP URLs
   */
  static createMultiPlatformRTMP(
    platforms: Array<{ url: string; key: string }>
  ): string[] {
    return platforms.map((platform) => `${platform.url}/${platform.key}`);
  }

  /**
   * Create a new Huddle01 room (v2 API)
   */
  async createRoom(
    title: string,
    hostWallets?: string[],
    roomType?: "AUDIO" | "VIDEO",
    description?: string,
    roomLocked: boolean = false
  ): Promise<{ roomId: string; meetingLink?: string }> {
    try {
      const response = await fetch(
        "https://api.huddle01.com/api/v2/sdk/rooms/create-room",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": this.apiKey,
          },
          body: JSON.stringify({
            roomLocked,
            metadata: {
              title,
              hostWallets: hostWallets || [],
              roomType: roomType || "VIDEO",
              description,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Huddle01 API Error:", response.status, errorText);
        throw new Error(
          `Failed to create room: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();
      const roomId = data?.data?.roomId || data?.roomId;
      if (!roomId) {
        throw new Error("Invalid create-room response: missing roomId");
      }
      return {
        roomId,
      };
    } catch (error) {
      console.error("Failed to create room:", error);
      throw error instanceof Error ? error : new Error("Failed to create room");
    }
  }

  /**
   * Validate RTMP URL format
   */
  static isValidRTMPUrl(url: string): boolean {
    const rtmpRegex = /^rtmp[s]?:\/\/.+/i;
    return rtmpRegex.test(url);
  }

  /**
   * Get metadata for a specific room
   */
  async getRoomMetadata(roomId: string): Promise<any> {
    try {
      if (!roomId) throw new Error("roomId is required");
      const response = await fetch(
        `https://api.huddle01.com/api/v2/sdk/rooms/get-metadata/${roomId}`,
        {
          headers: {
            "x-api-key": this.apiKey,
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) {
        throw new Error(
          `Failed to get room metadata: ${response.status} ${response.statusText}`
        );
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to get room metadata:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to get room metadata");
    }
  }

  /**
   * Get rooms with optional pagination
   */
  async getRooms(options?: {
    cursor?: number;
    pageSize?: number;
  }): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (options?.cursor !== undefined)
        params.set("cursor", String(options.cursor));
      if (options?.pageSize !== undefined)
        params.set("pageSize", String(options.pageSize));

      const url = `https://api.huddle01.com/api/v2/sdk/rooms/get-rooms${
        params.toString() ? `?${params.toString()}` : ""
      }`;

      const response = await fetch(url, {
        headers: {
          "x-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(
          `Failed to get rooms: ${response.status} ${response.statusText}`
        );
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to get rooms:", error);
      throw error instanceof Error ? error : new Error("Failed to get rooms");
    }
  }

  /**
   * Get all live sessions
   */
  async getLiveSessions(): Promise<any> {
    try {
      const response = await fetch(
        "https://api.huddle01.com/api/v2/sdk/live-sessions",
        {
          headers: {
            "x-api-key": this.apiKey,
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) {
        throw new Error(
          `Failed to get live sessions: ${response.status} ${response.statusText}`
        );
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to get live sessions:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to get live sessions");
    }
  }

  /**
   * Get single live session by roomId
   */
  async getLiveSession(roomId: string): Promise<any> {
    try {
      if (!roomId) throw new Error("roomId is required");
      const response = await fetch(
        `https://api.huddle01.com/api/v2/sdk/live-sessions/${roomId}`,
        {
          headers: {
            "x-api-key": this.apiKey,
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) {
        throw new Error(
          `Failed to get live session: ${response.status} ${response.statusText}`
        );
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to get live session:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to get live session");
    }
  }

  /**
   * Get preview participants for a live session
   */
  async getLiveSessionParticipants(roomId: string): Promise<any> {
    try {
      if (!roomId) throw new Error("roomId is required");
      const response = await fetch(
        `https://api.huddle01.com/api/v2/sdk/live-sessions/participants/${roomId}`,
        {
          headers: {
            "x-api-key": this.apiKey,
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) {
        throw new Error(
          `Failed to get participants: ${response.status} ${response.statusText}`
        );
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to get participants:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to get participants");
    }
  }

  /**
   * Get key metrics
   */
  async getMetrics(): Promise<any> {
    try {
      const response = await fetch(
        "https://api.huddle01.com/api/v2/sdk/metrics",
        {
          headers: {
            "x-api-key": this.apiKey,
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) {
        throw new Error(
          `Failed to get metrics: ${response.status} ${response.statusText}`
        );
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to get metrics:", error);
      throw error instanceof Error ? error : new Error("Failed to get metrics");
    }
  }
}

export const createHuddle01Service = () => {
  const projectId = process.env.NEXT_PUBLIC_HUDDLE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_HUDDLE_API_KEY;

  if (!projectId || !apiKey) {
    throw new Error(
      "NEXT_PUBLIC_HUDDLE_PROJECT_ID and NEXT_PUBLIC_HUDDLE_API_KEY environment variables are required"
    );
  }

  return new Huddle01Service(projectId, apiKey);
};
