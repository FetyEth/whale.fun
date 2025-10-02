# Whale.fun Creator-Centric Streaming Studio

## Overview
A live streaming studio for token creators to design, present, and launch tokens with real-time audience participation, integrated on-chain analytics, and multi-platform livestreaming via Huddle01.

## End-to-End Flow (Guided Stepper)
1. Room
   - Create room via `POST /api/huddle01/room` and obtain `roomId` (and meeting link if returned).
   - Paste an existing `roomId` if needed.
2. Join Token
   - Generate an access token via `POST /api/huddle01/token` to join as host.
3. Record/Livestream
   - Start/stop recording: `POST /api/recording/start`, `POST /api/recording/stop`.
   - Start/stop livestream: `POST /api/livestream/start`, `POST /api/livestream/stop`.
   - RTMP URLs can be provided in the UI or fall back to env-configured platforms.
4. Token Design
   - Interactive voting for Name/Symbol.
   - Configure total supply and creator fee (bps) following Pump.fun style (0.95% = 95 bps).
   - Drag-and-drop logo upload to IPFS (Pinata) using `lib/services/pintoIPFS.ts`.
   - Live Monaco editor embeds an editable contract snippet that updates with the selections.
5. On-chain Metrics & Trading
   - Creator + Platform metrics via `TokenFactoryService`.
   - Fee structure + dynamic fee via `TradingEngineService`.
   - Simple buy/sell actions calling `TradingEngineService.trade()` during stream.
6. Q&A & Support
   - Live Q&A with basic sentiment scoring (stored in localStorage for persistence).
   - One-click “Request Support” button calling `POST /api/support`.

## Files and Key Components
- `app/studio/page.tsx`
  - Implements the guided stepper with six stages.
  - Huddle01 orchestration (room, token, recording, livestream).
  - Token Design & IPFS upload.
  - Monaco editor (CDN) live contract snippet.
  - On-chain panels (metrics, fees, trading) using configured services.
  - Q&A with basic sentiment and persistence to localStorage.
- `lib/services/pintoIPFS.ts`
  - `uploadFileToPinata(file)` and `uploadJSONToPinata(json)` helpers.
- `utils/Blockchain.ts`
  - Ethers v6 `BrowserProvider` and wallet guard.
  - `SUPPORTED_NETWORKS[84532]` for Base Testnet (Base Sepolia).
  - `switchNetwork()` and `getContractInstance()` utilities.
- Contract services in `config/services/core/`
  - `WhaleTokenService.ts` (0x496468bc6f…)
  - `TokenFactoryService.ts` (0xaa8bafd3a2…)
  - `TradingEngineService.ts` (0x37fabbc03f…)
  - `BossBattleArenaService.ts` (0x99e415c8ba…)
  - `SecurityGovernanceService.ts` (0xd261122e12…)
- `app/api/support/route.ts`
  - Minimal handler to accept support pings (ready to wire to Slack/Discord).

## Networks and Deployments
- Chain: Base Testnet (Base Sepolia), `chainId = 84532`.
- Deployed contract addresses are mapped inside each service’s `deployments` property.

## Environment Variables
- Huddle01
  - `NEXT_PUBLIC_HUDDLE_PROJECT_ID`
  - `NEXT_PUBLIC_HUDDLE_API_KEY`
- Livestream
  - `LIVESTREAM_RTMP_URLS` (comma-separated) or `LIVESTREAM_DEFAULT_PLATFORMS` (YOUTUBE,TWITCH,…)
  - `LIVESTREAM_<PLATFORM>_KEY` (e.g., `LIVESTREAM_YOUTUBE_KEY`)
- Pinata IPFS
  - `NEXT_PUBLIC_PINATA_API_KEY`
  - `NEXT_PUBLIC_PINATA_API_SECRET`
- Network RPC (Base Testnet)
  - `NEXT_PUBLIC_BASE_TESTNET_RPC_URL`

## UX Design Notes
- Stepper-driven flow reduces cognitive load and guarantees readiness before actions.
- Room and Join Token are grouped so creators don’t get lost before going live.
- Token Design happens before analytics and trading, encouraging collaborative creation.
- Monaco editor encourages transparency: contracts are visible while designing.
- Q&A sentiment provides quick audience pulse; persistence prevents losing context on refresh.

## Future Enhancements
- Rich Solidity syntax using a Monaco Solidity language plugin and ABI-based type hints.
- Persist Q&A to a backend or decentralized store.
- Full token launch wiring to `TokenFactoryService.createToken()` with on-chain confirmations in UI.
- Advanced NLP-based sentiment analysis.
- Real Slack/Discord integration for `/api/support`.

## Quickstart
1. Fill env vars in `.env`.
2. Run the app and open `/studio`.
3. Step through the six stages. Use the stepper to navigate back/forth.
4. If on Wrong Network, switch to Base Testnet (84532).

## Safety and Limits
- Trading panel’s `trade()` is a simplified UI for demo; add guards, slippage, and approval flows for production.
- Monaco editor is read-write for the snippet only; no code execution.
- IPFS uploads use client credentials; consider a proxy for secure server-side pinning in production.
