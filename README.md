# Aries Router

<p align="center">
  <img src="./public/banner.png" alt="Aries Router UI Preview" width="100%" />
</p>

<p align="center">
  <a href="https://github.com/hardianto77/aries-router"><img src="https://img.shields.io/badge/Aries--Router-Enterprise-E56A4A?style=for-the-badge&logo=github&logoColor=white" alt="Aries Router" /></a>
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-14.2-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" /></a>
  <a href="https://go.dev"><img src="https://img.shields.io/badge/Go-1.26-00ADD8?style=for-the-badge&logo=go&logoColor=white" alt="Golang" /></a>
  <a href="https://sqlite.org"><img src="https://img.shields.io/badge/SQLite-WAL%20Zero--CGO-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" /></a>
</p>

---

## ⚡ Overview

**Aries Router** is an enterprise-grade AI infrastructure gateway engineered for high-throughput multi-provider dispatch, autonomous agents, and resilient proxy rotation. Combining a glassmorphic administration console with sub-millisecond local proxying, Aries Router consolidates **40+ upstream AI models** behind unified OpenAI and Anthropic-compatible wire interfaces.

Native multi-account load balancing, automated dead-key pruning, cache-aware prompt affinity, and deep proxy isolation ensure 100% operational continuity.

---

## 🏛️ System Architecture

```text
 ┌────────────────────────────────────────────────────────────────────────┐
 │                           CLIENT INGRESS                               │
 │   OpenAI SDK / Telegram Bot / cURL     Claude Code / Anthropic SDK     │
 │   POST /v1/chat/completions            POST /v1/messages               │
 └──────────────────┬─────────────────────────────────┬───────────────────┘
                    │                                 │
                    ▼                                 ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                         ARIES ROUTER CORE                              │
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
 │      • TrustMeBro: Tool output cloaking preset for autonomous agents   │
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
  │ Anthropic │  │ Terlalu / │  │ DeepSeek  │  │ Token     │  │ OpenCode  │
  │  Claude   │  │ Kaer X2   │  │ River AI  │  │ Harbor    │  │  Free v2  │
  └───────────┘  └───────────┘  └───────────┘  └───────────┘  └───────────┘
```

---

## 🌟 Key Features

### 1. 📊 Command Center & Analytics
- **Real-Time Telemetry**: Overview KPI cards with structured metric icons (`dns`, `arrow_upward`, `bolt`, `arrow_downward`, `payments`), semantic color accents, and contextual sparkline indicators.
- **Live Requests Stream**: Live pulsing telemetry dots, dedicated provider/channel badges, and high-precision monospace token counters.

### 2. 🚀 OpenCode In-Memory Protocol Engine & DoH IPv6 Resolver
- **Zero CLI Daemon Requirement**: Built-in in-memory protocol execution eliminates external CLI dependencies and socket timeouts.
- **DoH IPv6 Resolver**: Bypasses local DNS hijacking and IPv4 403 `FreeTierError` via Cloudflare (`1.1.1.1`) and Google (`8.8.8.8`) DNS-over-HTTPS.
- **Wire HTTP Fallback**: Prompts exceeding 24KB automatically switch to the high-throughput Wire HTTP Executor.

### 3. ⚓ Token Harbor Multi-Account Rotator
- **1,000+ Account Concurrency**: Manages large pools of Token Harbor keys with round-robin load distribution.
- **Instant 429 Rotation**: When an individual key or IP reaches rate limits, the request immediately falls back to the next available account.
- **Direct Residential Proxy Binding**: Enforces direct residential IP routing without Vercel or Cloudflare intermediary delays.

### 4. 🛡️ TrustMeBro Model-Bypass Preset
- **Tool Output Cloaking**: Neutralizes aggressive provider filtering on intermediate tool outputs, code executions, and terminal logs.
- **Agent Uncensoring**: Guarantees uninterrupted operation for autonomous developer workflows and security audits.

### 5. 🎁 Public Distribution Faucet & Anti-Abuse Vouchers ("Bansos")
- **1-Click Claim Portal (`/claim`)**: Distribute scoped quotas without requiring user registration.
- **Biometric & Hardware Defense**: WebGL/Canvas hardware fingerprinting, carrier `/16` subnet locking, and velocity checks prevent automated bot abuse.
- **Persistent Key Reclaim**: Users who clear browser cookies can recover existing vouchers via cryptographic receipts.

### 6. ⚡ Dual Wire Interfaces
- **OpenAI Compatible**: `https://<your-domain>/v1` (`/v1/chat/completions`, `/v1/models`, `/v1/embeddings`).
- **Anthropic Compatible**: Native `/v1/messages` endpoint with full support for Claude thinking blocks and structured tool calling.

---

## 🚀 Quick Start

### Standalone Build

```bash
# Clone repository
git clone https://github.com/hardianto77/aries-router.git
cd aries-router

# Setup environment
cp .env.example .env

# Install dependencies & build Next.js dashboard
npm install
npm run build

# Start production server
npm start
```

### Production Service (systemd)

```ini
[Unit]
Description=Aries Router Gateway
After=network.target

[Service]
Type=simple
User=user
WorkingDirectory=/data/aries-router
Environment=NODE_ENV=production
Environment=PORT=21008
Environment=DATA_DIR=/data/aries-home/.aries
ExecStart=/usr/bin/node /data/aries-router/server.js
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
    base_url="https://<your-domain>/v1",
    api_key="sk-your-virtual-api-key"
)

response = client.chat.completions.create(
    model="Rv/deepseek-ai/DeepSeek-V4.1-Flash",
    messages=[
        {"role": "system", "content": "You are a precise systems engineer."},
        {"role": "user", "content": "Hello Aries Router!"}
    ]
)

print(response.choices[0].message.content)
```

### 2. Streaming cURL

```bash
curl -N https://<your-domain>/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-your-virtual-api-key" \
  -d '{
    "model": "Rv/deepseek-ai/DeepSeek-V4.1-Flash",
    "messages": [{"role": "user", "content": "Ping"}],
    "stream": true
  }'
```

---

## ⚙️ Configuration Reference

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `21008` | Ingress HTTP port for gateway and dashboard |
| `DATA_DIR` | `~/.aries` | Path for SQLite database, logs, and state persistence |
| `INITIAL_PASSWORD` | auto-generated | First-time root password for administration console |
| `RESIDENTIAL_PROXY_URL` | - | Primary residential proxy upstream for IP-restricted providers |
| `OPENCODE_V2_ROUTE` | - | Custom residential route override for OpenCode v2 network channel |
| `NEXT_TELEMETRY_DISABLED` | `1` | Disables telemetry for hardened enterprise deployment |

---

## 🤝 Repositories & Collaboration

- **Repository**: [hardianto77/aries-router](https://github.com/hardianto77/aries-router)
- **Framework Upstream**: [serenhope/9router](https://github.com/serenhope/9router)
- **Feature Modules**: [johsua092-ui/xrouter](https://github.com/johsua092-ui/xrouter)

---

## 📄 License

Distributed under the **MIT License**. Built with craft and conviction by **Aries AI**.
