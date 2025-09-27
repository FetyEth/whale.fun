/**
 * Services Index
 * Exports all application services for easy importing
 */

// Base services
export { BaseContractService } from "../../../lib/services/BaseContractService";

// Token & DeFi services
export {
  TokenGraduationService,
  DEFAULT_GRADUATION_CONFIG,
} from "./tokenGraduation";
export { Zer0dexV3Service } from "./zer0dexV3Service";

// Media & Streaming services
export { Huddle01Service } from "../../../lib/services/huddle01";
export { YouTubeService } from "../../../lib/services/youtube";

// Storage & Token services
export type { YoutubeTokens } from "../../../lib/services/tokenStore";

// Re-export types from TokenFactory service (used by graduation)
export type {
  GraduationInfo,
  GraduationThresholds,
  TokenCreationParams,
  FactoryStats,
  CreatorMetrics,
} from "./TokenFactoryService";

// Re-export types from zer0dexV3Service
export type { SwapParams, PoolInfo } from "./zer0dexV3Service";

// Re-export types from media services
export type {
  RecordingResult,
  LivestreamResult,
  HuddleRecording,
} from "../../../lib/services/huddle01";

export type {
  YouTubeAuthConfig,
  CreateYouTubeStreamParams,
  YouTubeStreamResult,
} from "../../../lib/services/youtube";
