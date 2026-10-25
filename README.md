# 9Router & X Router Enterprise (v0.5.310)

<p align="center">
  <img src="./public/banner.png" alt="9Router & X Router Banner" width="100%" />
</p>

<p align="center">
  <a href="https://github.com/hardianto77/9router"><img src="https://img.shields.io/badge/Release-v0.5.310--Enterprise-E56A4A?style=for-the-badge&logo=github&logoColor=white" alt="Release v0.5.310" /></a>
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-14.2-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" /></a>
  <a href="https://go.dev"><img src="https://img.shields.io/badge/Go-1.26-00ADD8?style=for-the-badge&logo=go&logoColor=white" alt="Golang" /></a>
  <a href="https://sqlite.org"><img src="https://img.shields.io/badge/SQLite-WAL%20Zero--CGO-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" /></a>
</p>

---

## ⚡ Overview

**9Router & X Router Enterprise** is an ultra-high-performance AI routing gateway engineered for teams, autonomous agents, and high-volume multi-account infrastructure. Combining the bulletproof upstream architecture of **9Router (v0.5.310)** with **X Router Go Core and security presets**, it delivers sub-millisecond dispatch latency, zero-CGO SQLite WAL persistence, and seamless translation across all major AI interfaces.

Consolidate **40+ upstream AI providers**—including Claude, OpenAI, DeepSeek, River AI, Token Harbor, OpenCode, Dahl, Grok, Gemini, Antigravity, and custom OpenAI-compatible backends—behind a unified, authenticated gateway.

---

## 🏛️ System Architecture

```text
 ┌────────────────────────────────────────────────────────────────────────┐
 │                           CLIENT INGRESS                               │
 │   OpenAI SDK / Hermes / cURL           Claude Code / Anthropic SDK     │
 │   POST /v1/chat/completions            POST /v1/messages               │
 └──────────────────┬─────────────────────────────────┬───────────────────┘
                    │                                 │
                    ▼                                 ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                   9ROUTER & X ROUTER ENTERPRISE CORE                   │
 │                                                                        │
 │  [1. Authentication & Virtual Key Gate]                                │
 │      • Virtual API Key validation & Multi-tenant rate limiting         │
 │      • IP Whitelisting & Granular Allowed-Models access control        │
 │                                                                        │
 │  [2. Cache-Aware Session Stickiness & RAM Prompt Cache]                │
 │      • Preserves provider prompt caching TTL (Claude 5m, Gemini 60m)   │
 │      • Up to 90% input token cost reduction via warm affinity          │
 │      • Instant ~10ms responses for recurring cron & eval queries       │
 │                                                                        │
 │  [3. Prompt Cloaking, Uncensoring & Bridge Plugins]                    │
 │      • TrustMeBro: Tool output cloaking preset for agents              │
 │      • Anti-Slop: Strips repetitive AI cliches (Lite/Full/Ultra)       │
 │      • OpenAI Tool Bridge: Converts tool calls across wire protocols   │
 │                                                                        │
 │  [4. Multi-Account Ring, Failover & Residential Proxy Routing]         │
 │      • Direct Residential Proxy pool isolation (zero Vercel relays)    │
 │      • OpenCode In-Memory Engine + DoH IPv6 resolver                   │
 │      • Token Harbor 1,000+ key rotator with instant 429 auto-retry     │
 │      • Auto-Prune: Immediate eviction of 401/403/exhausted accounts   │
 └──────┬──────────────┬──────────────┬──────────────┬──────────────┬─────┘
        │              │              │              │              │
        ▼              ▼              ▼              ▼              ▼
  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
  │ Anthropic │  │ OpenAI /  │  │ DeepSeek  │  │ Token     │  │ OpenCode  │
  │  Claude   │  │ Antigrav  │  │ River AI  │  │ Harbor    │  │  Free v2  │
  └───────────┘  └───────────┘  └───────────┘  └───────────┘  └───────────┘
```

---

## 🌟 Key Capabilities & Upgrades in v0.5.310

### 1. 🚀 OpenCode In-Memory Protocol Engine & DoH IPv6 Resolver
- **Zero CLI Daemon Requirement**: Built-in in-memory protocol execution eliminates external CLI dependencies and socket timeouts.
- **DoH IPv6 Resolver**: Bypasses local DNS hijacking and IPv4 403 `FreeTierError` via Cloudflare (`1.1.1.1`) and Google (`8.8.8.8`) DNS-over-HTTPS.
- **Wire HTTP Fallback**: Prompts exceeding 24KB (e.g. multi-turn agent sessions or large codebases) automatically switch to the high-throughput Wire HTTP Executor.

### 2. ⚓ Token Harbor High-Capacity Multi-Account Ring
- **1,000+ Account Concurrency**: Manages large pools of Token Harbor keys with round-robin load distribution.
- **Instant 429 Rotation**: When an individual key or IP reaches rate limits, the request immediately falls back to the next available account.
- **Direct Residential Proxy Binding**: Enforces direct residential IP routing without Vercel or Cloudflare intermediary delays.

### 3. 🛡️ TrustMeBro Model-Bypass Preset
- **Tool Output Cloaking**: Neutralizes aggressive provider filtering on intermediate tool outputs, code executions, and terminal logs.
- **Agent Uncensoring**: Guarantees uninterrupted operation for autonomous developer workflows and security audits.

### 4. 🎁 Public Distribution Faucet & Anti-Abuse Vouchers ("Bansos")
- **1-Click Claim Portal (`/claim`)**: Distribute scoped quotas without requiring user registration.
- **Biometric & Hardware Defense**: WebGL/Canvas hardware fingerprinting, carrier `/16` subnet locking, and velocity checks prevent automated bot abuse.
- **Persistent Key Reclaim**: Users who clear browser cookies can recover existing vouchers via cryptographic receipts.

### 5. ⚡ Dual Wire Interfaces
- **OpenAI Compatible**: `https://<domain>/v1` (`/v1/chat/completions`, `/v1/models`, `/v1/embeddings`).
- **Anthropic Compatible**: Native `/v1/messages` endpoint with full support for Claude thinking blocks and structured tool calling.

---

## 🚀 Quick Start

### Option 1: Standalone Build

```bash
# Clone repository
git clone https://github.com/hardianto77/9router.git
cd 9router

# Setup environment
cp .env.example .env

# Install dependencies & build Next.js dashboard
npm install
npm run build

# Start production server
npm start
```

### Option 2: Production Service (systemd)

```ini
[Unit]
Description=9Router & X Router Enterprise Gateway
After=network.target

[Service]
Type=simple
User=user
WorkingDirectory=/data/9router-app
Environment=NODE_ENV=production
Environment=PORT=21008
Environment=DATA_DIR=/data/9router-home/.9router
ExecStart=/usr/bin/node /data/9router-app/server.js
Restart=always
RestartSec=5
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

---

## 💻 Client Integration Examples

### 1. OpenAI Python SDK

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://router.aries.ai.id/v1",
    api_key="sk-your-virtual-api-key"
)

response = client.chat.completions.create(
    model="Rv/deepseek-ai/DeepSeek-V4.1-Flash-1017",
    messages=[
        {"role": "system", "content": "You are a precise systems engineer."},
        {"role": "user", "content": "Write an ultra-fast zero-alloc RingBuffer in Go."}
    ],
    temperature=0.2
)

print(response.choices[0].message.content)
```

### 2. Anthropic Python SDK

```python
from anthropic import Anthropic

client = Anthropic(
    base_url="https://router.aries.ai.id",
    api_key="sk-your-virtual-api-key"
)

message = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=2048,
    messages=[{"role": "user", "content": "Explain raft consensus state machine."}]
)

print(message.content[0].text)
```

### 3. Streaming cURL

```bash
curl -N https://router.aries.ai.id/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-your-virtual-api-key" \
  -d '{
    "model": "Rv/deepseek-ai/DeepSeek-V4.1-Flash",
    "messages": [{"role": "user", "content": "Hi!"}],
    "stream": true
  }'
```

---

## ⚙️ Configuration Reference

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `21008` | Ingress HTTP port for gateway and dashboard |
| `DATA_DIR` | `~/.9router` | Path for SQLite database, logs, and state persistence |
| `INITIAL_PASSWORD` | auto-generated | First-time root password for administration console |
| `RESIDENTIAL_PROXY_URL` | - | Primary residential proxy upstream for IP-restricted providers |
| `OPENCODE_V2_ROUTE` | - | Custom residential route override for OpenCode v2 network channel |
| `NEXT_TELEMETRY_DISABLED` | `1` | Disables telemetry for hardened enterprise deployment |

---

## 🤝 Repositories & Lineage

- **Primary Repository**: [hardianto77/9router](https://github.com/hardianto77/9router)
- **Feature Upstream**: [johsua092-ui/xrouter](https://github.com/johsua092-ui/xrouter)
- **Base Architecture**: [serenhope/9router](https://github.com/serenhope/9router)

---

## 📄 License

Distributed under the **MIT License**. Engineered for resilience and speed.
