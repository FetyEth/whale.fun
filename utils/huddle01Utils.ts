/**
 * Utility functions for Huddle01 RTMP URL creation and validation
 */

export interface StreamingPlatform {
  url: string;
  key: string;
}

/**
 * Create YouTube RTMP URL from stream URL and key
 */
export function createYouTubeRTMP(
  streamUrl: string,
  streamKey: string
): string {
  return `${streamUrl}/${streamKey}`;
}

/**
 * Create multiple platform RTMP URLs
 */
export function createMultiPlatformRTMP(
  platforms: StreamingPlatform[]
): string[] {
  return platforms.map((platform) => `${platform.url}/${platform.key}`);
}

/**
 * Validate RTMP URL format
 */
export function isValidRTMPUrl(url: string): boolean {
  const rtmpRegex = /^rtmp[s]?:\/\/.+/i;
  return rtmpRegex.test(url);
}

/**
 * Common RTMP URLs for popular platforms
 */
export const STREAMING_PLATFORMS = {
  YOUTUBE: {
    name: "YouTube",
    baseUrl: "rtmp://a.rtmp.youtube.com/live2",
    description: "YouTube Live streaming",
  },
  TWITCH: {
    name: "Twitch",
    baseUrl: "rtmp://live.twitch.tv/live",
    description: "Twitch streaming",
  },
  FACEBOOK: {
    name: "Facebook",
    baseUrl: "rtmps://live-api-s.facebook.com:443/rtmp",
    description: "Facebook Live streaming",
  },
  LINKEDIN: {
    name: "LinkedIn",
    baseUrl: "rtmp://1.rtmp.livepeer.com/live",
    description: "LinkedIn Live streaming",
  },
} as const;

/**
 * Create RTMP URL for a specific platform
 */
export function createPlatformRTMP(
  platform: keyof typeof STREAMING_PLATFORMS,
  streamKey: string
): string {
  const platformConfig = STREAMING_PLATFORMS[platform];
  return createYouTubeRTMP(platformConfig.baseUrl, streamKey);
}

/**
 * Validate stream key format (basic validation)
 */
export function isValidStreamKey(key: string): boolean {
  return key.length >= 8 && /^[a-zA-Z0-9_-]+$/.test(key);
}

/**
 * Parse RTMP URL to extract base URL and stream key
 */
export function parseRTMPUrl(
  rtmpUrl: string
): { baseUrl: string; streamKey: string } | null {
  if (!isValidRTMPUrl(rtmpUrl)) {
    return null;
  }

  const lastSlashIndex = rtmpUrl.lastIndexOf("/");
  if (lastSlashIndex === -1 || lastSlashIndex === rtmpUrl.length - 1) {
    return null;
  }

  return {
    baseUrl: rtmpUrl.substring(0, lastSlashIndex),
    streamKey: rtmpUrl.substring(lastSlashIndex + 1),
  };
}
