#!/bin/bash
set -e

# Get the project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

# Backend port
BACKEND_PORT=${PORT:-3000}

# Firebase Auth emulator port (for Google OAuth)
AUTH_EMULATOR_PORT=9099

# Get the Firebase project ID from .firebaserc
cd "$PROJECT_ROOT"
PROJECT_ID=$(node -e "console.log(JSON.parse(require('fs').readFileSync('./.firebaserc','utf8')).projects.default)" 2>/dev/null || echo "demo-project")
echo -e "${BLUE}Using Firebase project: ${PROJECT_ID}${NC}"

# Check if backend port is in use
check_port() {
    local port=$1
    local pid
    pid=$(lsof -ti :"$port" -sTCP:LISTEN 2>/dev/null | head -1)
    if [ -n "$pid" ]; then
        echo "$pid"
    fi
}

BACKEND_PID_EXISTING=$(check_port "$BACKEND_PORT")
if [ -n "$BACKEND_PID_EXISTING" ]; then
    echo -e "${YELLOW}Port $BACKEND_PORT already in use (PID: $BACKEND_PID_EXISTING)${NC}"
    echo "  1) Kill it and start fresh"
    echo "  2) Abort"
    read -r -p "Choose [1/2]: " choice
    case "$choice" in
        1) kill "$BACKEND_PID_EXISTING" 2>/dev/null; sleep 1 ;;
        *) echo "Aborted."; exit 0 ;;
    esac
fi

# Start Firebase Auth emulator (for Google OAuth in dev)
EMU_PID=""
AUTH_PID_EXISTING=$(check_port "$AUTH_EMULATOR_PORT")
if [ -n "$AUTH_PID_EXISTING" ]; then
    echo -e "${GREEN}Auth emulator already running on port $AUTH_EMULATOR_PORT${NC}"
else
    NODE_BIN="$(mise which node 2>/dev/null || echo node)"
    FIREBASE_BIN="$(realpath "$(which firebase)" 2>/dev/null || echo firebase)"
    echo -e "${BLUE}Starting Firebase Auth Emulator (node=$NODE_BIN)...${NC}"
    cd "$PROJECT_ROOT"
    "$NODE_BIN" "$FIREBASE_BIN" emulators:start --only auth --project "$PROJECT_ID" &
    EMU_PID=$!

    # Wait for auth emulator
    for i in {1..30}; do
        if curl -s "http://localhost:$AUTH_EMULATOR_PORT" >/dev/null 2>&1; then
            break
        fi
        if [ -n "$EMU_PID" ] && ! kill -0 "$EMU_PID" 2>/dev/null; then
            echo -e "${RED}Auth emulator failed to start${NC}"
            exit 1
        fi
        sleep 1
    done
    echo -e "${GREEN}Auth emulator ready!${NC}"
fi

# Export emulator env vars so firebase-admin SDK connects to local emulator
export FIREBASE_AUTH_EMULATOR_HOST="localhost:$AUTH_EMULATOR_PORT"
export GCLOUD_PROJECT="$PROJECT_ID"

# Start backend Bun server
echo -e "${BLUE}Starting Backend (Bun server on port $BACKEND_PORT)...${NC}"
cd "$PROJECT_ROOT/packages/backend"
PORT=$BACKEND_PORT bun run --watch src/index.ts &
BE_PID=$!

# Wait for backend to be ready
for i in {1..30}; do
    RESPONSE=$(curl -s "http://localhost:$BACKEND_PORT/api/v1/health" 2>/dev/null || echo "")
    if echo "$RESPONSE" | grep -q '"status":"healthy"'; then
        break
    fi
    if ! kill -0 "$BE_PID" 2>/dev/null; then
        echo -e "${RED}Backend failed to start${NC}"
        exit 1
    fi
    sleep 1
done
echo -e "${GREEN}Backend ready!${NC}"

# Start frontend
echo -e "${BLUE}Starting Frontend...${NC}"
cd "$PROJECT_ROOT/packages/frontend"
bun run dev &
FE_PID=$!

# Start AI service if configured
AI_PID=""
AI_ENV="$PROJECT_ROOT/packages/ai-service/.env"
if [ -f "$AI_ENV" ] && grep -q "GEMINI_API_KEY=." "$AI_ENV"; then
    echo -e "${BLUE}Starting AI Service...${NC}"
    cd "$PROJECT_ROOT/packages/ai-service"
    bun run dev &
    AI_PID=$!
else
    echo -e "${YELLOW}AI Service skipped (no packages/ai-service/.env with GEMINI_API_KEY)${NC}"
fi

sleep 3

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Local development environment ready!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "  Frontend:     http://localhost:5173"
echo "  Backend API:  http://localhost:$BACKEND_PORT/api/v1"
echo "  Swagger:      http://localhost:$BACKEND_PORT/api/v1/swagger"
echo "  Auth Emulator: http://localhost:$AUTH_EMULATOR_PORT"
if [ -n "$AI_PID" ]; then
echo "  AI Service:   http://localhost:3001"
fi
echo ""
echo "Press Ctrl+C to stop all services"

# Handle Ctrl+C
cleanup() {
    echo 'Shutting down...'
    [ -n "$FE_PID" ] && kill "$FE_PID" 2>/dev/null
    [ -n "$BE_PID" ] && kill "$BE_PID" 2>/dev/null
    [ -n "$AI_PID" ] && kill "$AI_PID" 2>/dev/null
    [ -n "$EMU_PID" ] && kill "$EMU_PID" 2>/dev/null
    exit 0
}
trap cleanup INT TERM

wait
