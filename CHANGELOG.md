# v0.0.2 (2026-10-24)

## Core & Architecture
- **Golang Core Performance & Footprint Optimization**:
  - Binary size compressed by 68% (from 12 MB to 3.8 MB) using `-trimpath`, `-ldflags="-s -w"`, and UPX LZMA packing.
  - Runtime memory scavenger tuned with `debug.SetGCPercent(50)` and default 64MiB soft limit for rapid OS memory reclamation.
  - Zero-allocation SSE stream proxying using `sync.Pool` byte buffers.
  - Optimized SQLite pool and pragma cache size (`cache_size=-2000`, `temp_store=MEMORY`) with zero feature or query modifications.
  - Bumped version string to `v0.0.2` in `internal/config/config.go` and `package.json`.

## Features & Improvements
- **ADCode Full Auth Flow (Modal & Backend)**:
  - Added dedicated `AdcodeAuthModal` component supporting 3 authentication methods: Sign In, Daftar Akun, and Token Import.
  - Fixed Firebase Web Key configuration to use persistent base64 decoding so registration and login always succeed without requiring manual API keys.
  - Removed quick 1-click temporary domain registration.
- **Custom Plugins Persistence & Fix**:
  - Registered `openaiToolBridge`, `contextSqueezer`, and `antiSlop` in `CUSTOM_PLUGIN_KEYS` and backend dynamic persistence.
  - Fixed switch turning off when models were added, and preserved model selections on refresh.
- **Branding**:
  - Updated OpenSatan logo from official upstream assets.

## Bug Fixes
- **Kiro Model Normalization & Thinking**: Normalize Anthropic snapshot IDs and dash-formatted models onto Kiro upstream aliases in `resolveKiroModel()`, handle `claude-opus-4.7` and `xhigh` effort correctly, and fix MiniMax casing to `minimax-m2.5`.
- **OAuth Endpoint Guard**: Reject non-OAuth providers with a clean 400 Bad Request instead of throwing an unhandled 500 error in `GET /api/oauth/[provider]/[action]`.

# v0.0.1 (2026-10-20)

## Initial Release
- **X Router Go Core Engine**: Initial Go-based gateway architecture with SQLite persistent storage, API key authentication, and high-performance streaming proxy.
