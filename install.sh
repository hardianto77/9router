#!/usr/bin/env bash
# ==============================================================================
# X Router — High-Performance Multi-Tenant AI Gateway Installer
# https://github.com/johsua092-ui/x-router
# ==============================================================================

set -e

# Terminal colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo -e "${CYAN}${BOLD}"
echo "  __  __   ____   ____   _   _  _____  ______  ____  "
echo "  \ \/ /  |  _ \ / __ \ | | | ||_   _||  ____||  _ \ "
echo "   \  /   | |_) | |  | || | | |  | |  | |__   | |_) |"
echo "   /  \   |  _ <| |  | || | | |  | |  |  __|  |  _ < "
echo "  /_/\_\  |_| \_\\ \__/ /| |_| |  | |  | |____ |_| \_\\"
echo "                   \____/  \___/   |_|  |______||_|   "
echo -e "${NC}"
echo -e "${GREEN}${BOLD}Welcome to X Router Production Installer & Setup Wizard${NC}\n"

# Helper for generating cryptographically secure hex strings
generate_random_hex() {
    local length=${1:-32}
    if command -v openssl >/dev/null 2>&1; then
        openssl rand -hex "$length"
    else
        python3 -c "import secrets; print(secrets.token_hex($length))" 2>/dev/null || \
        node -e "console.log(require('crypto').randomBytes($length).toString('hex'))"
    fi
}

# Defaults
PORT="20128"
PASSWORD=""
JWT_SECRET=""
MACHINE_SALT=""
API_KEY_SECRET=""
DATA_DIR="/var/lib/xrouter"
SERVICE_NAME="xrouter"
NON_INTERACTIVE=false

# Parse flags
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --port) PORT="$2"; shift ;;
        --password) PASSWORD="$2"; shift ;;
        --jwt-secret) JWT_SECRET="$2"; shift ;;
        --salt) MACHINE_SALT="$2"; shift ;;
        --api-key-secret) API_KEY_SECRET="$2"; shift ;;
        --data-dir) DATA_DIR="$2"; shift ;;
        --yes|-y) NON_INTERACTIVE=true ;;
        --help|-h)
            echo "Usage: bash install.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --port <port>             Listen port (default: 20128)"
            echo "  --password <pw>           Initial admin dashboard password"
            echo "  --jwt-secret <secret>     JWT session secret (or 'auto')"
            echo "  --salt <salt>             Machine ID salt (or 'auto')"
            echo "  --api-key-secret <secret> API key hash secret (or 'auto')"
            echo "  --data-dir <path>         Database directory (default: /var/lib/xrouter)"
            echo "  -y, --yes                 Non-interactive mode (auto-accept defaults)"
            exit 0
            ;;
        *) echo -e "${RED}Unknown option: $1${NC}"; exit 1 ;;
    esac
    shift
done

# Check Root privileges for service installation
IS_ROOT=false
if [ "$EUID" -eq 0 ]; then
    IS_ROOT=true
fi

# Interactive Prompts
if [ "$NON_INTERACTIVE" = false ]; then
    echo -e "${YELLOW}Please configure your X Router instance:${NC}\n"

    read -p "Port to run on [${PORT}]: " INPUT_PORT
    PORT="${INPUT_PORT:-$PORT}"

    read -p "Dashboard initial password (leave empty to generate secure random): " INPUT_PW
    PASSWORD="${INPUT_PW:-}"

    read -p "JWT Secret [Enter for auto-generated 64-char hex]: " INPUT_JWT
    JWT_SECRET="${INPUT_JWT:-}"

    read -p "Machine ID Salt [Enter for auto-generated 32-char hex]: " INPUT_SALT
    MACHINE_SALT="${INPUT_SALT:-}"
fi

# Auto-generate empty secrets
if [ -z "$PASSWORD" ]; then
    PASSWORD=$(generate_random_hex 8)
    GENERATED_PW_FLAG=true
fi

if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "auto" ]; then
    JWT_SECRET=$(generate_random_hex 32)
fi

if [ -z "$MACHINE_SALT" ] || [ "$MACHINE_SALT" = "auto" ]; then
    MACHINE_SALT=$(generate_random_hex 16)
fi

if [ -z "$API_KEY_SECRET" ] || [ "$API_KEY_SECRET" = "auto" ]; then
    API_KEY_SECRET=$(generate_random_hex 16)
fi

echo -e "\n${CYAN}Generating .env configuration...${NC}"

# Write .env file
ENV_FILE=".env"
cat <<EOF > "$ENV_FILE"
# X Router environment configuration
# Generated at $(date -u +"%Y-%m-%dT%H:%M:%SZ") via install.sh

# Authentication & Security
JWT_SECRET=${JWT_SECRET}
INITIAL_PASSWORD=${PASSWORD}
API_KEY_SECRET=${API_KEY_SECRET}
MACHINE_ID_SALT=${MACHINE_SALT}

# Runtime & Server
PORT=${PORT}
NODE_ENV=production
DATA_DIR=${DATA_DIR}
ENABLE_REQUEST_LOGS=false
OBSERVABILITY_ENABLED=true
AUTH_COOKIE_SECURE=false
REQUIRE_API_KEY=false

# URLs
BASE_URL=http://localhost:${PORT}
NEXT_PUBLIC_BASE_URL=http://localhost:${PORT}
CLOUD_URL=https://xrouter.com
NEXT_PUBLIC_CLOUD_URL=https://xrouter.com
EOF

chmod 600 "$ENV_FILE"
echo -e "${GREEN}✓ .env configuration created successfully.${NC}"

# Ensure data directory exists
if [ "$IS_ROOT" = true ]; then
    mkdir -p "$DATA_DIR"
    chmod 755 "$DATA_DIR"
fi

# Install dependencies and build if package.json exists in current directory
if [ -f "package.json" ]; then
    echo -e "\n${CYAN}Installing dependencies and building Next.js application...${NC}"
    if command -v npm >/dev/null 2>&1; then
        npm install
        npm run build
        echo -e "${GREEN}✓ Build completed successfully.${NC}"
    fi
fi

# Setup systemd service if running as root
if [ "$IS_ROOT" = true ] && command -v systemctl >/dev/null 2>&1; then
    echo -e "\n${CYAN}Configuring systemd service (${SERVICE_NAME}.service)...${NC}"
    APP_DIR="$(pwd)"
    NODE_PATH="$(which node || echo '/usr/bin/node')"

    cat <<EOF > "/etc/systemd/system/${SERVICE_NAME}.service"
[Unit]
Description=X Router High-Performance Multi-Tenant AI Gateway
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}
ExecStart=${NODE_PATH} custom-server.js --port ${PORT}
Restart=always
RestartSec=5
Environment=NODE_ENV=production
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable "${SERVICE_NAME}.service"
    systemctl restart "${SERVICE_NAME}.service"
    echo -e "${GREEN}✓ Systemd service ${SERVICE_NAME} enabled and started.${NC}"
fi

echo -e "\n${GREEN}${BOLD}================================================================${NC}"
echo -e "${GREEN}${BOLD}              X ROUTER SETUP COMPLETE! 🎉                      ${NC}"
echo -e "${GREEN}${BOLD}================================================================${NC}"
echo -e "Dashboard URL   : ${BOLD}http://localhost:${PORT}/dashboard${NC}"
echo -e "API Endpoint    : ${BOLD}http://localhost:${PORT}/v1${NC}"
echo -e "Admin Password  : ${BOLD}${PASSWORD}${NC}"
echo -e "Data Directory  : ${DATA_DIR}"
echo -e "Config File     : $(pwd)/.env"
echo -e "${GREEN}================================================================${NC}\n"
