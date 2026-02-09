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

# Emulator ports (must match firebase.json)
EMULATOR_PORTS=(9099 5001 8080 5000 4000)
EMULATOR_NAMES=("Auth:9099" "Functions:5001" "Firestore:8080" "Hosting:5000" "UI:4000")

# Check which emulator ports are already in use
check_ports() {
    local busy_ports=()
    local busy_pids=()
    for i in "${!EMULATOR_PORTS[@]}"; do
        local port=${EMULATOR_PORTS[$i]}
        local pid
        pid=$(lsof -ti :"$port" -sTCP:LISTEN 2>/dev/null | head -1)
        if [ -n "$pid" ]; then
            busy_ports+=("${EMULATOR_NAMES[$i]}")
            busy_pids+=("$pid")
        fi
    done
    BUSY_PORTS=("${busy_ports[@]}")
    BUSY_PIDS=("${busy_pids[@]}")
}

kill_existing() {
    echo -e "${YELLOW}Stopping existing processes on emulator ports...${NC}"
    for port in "${EMULATOR_PORTS[@]}"; do
        local pids
        pids=$(lsof -ti :"$port" -sTCP:LISTEN 2>/dev/null || true)
        if [ -n "$pids" ]; then
            echo "$pids" | xargs kill 2>/dev/null || true
        fi
    done
    # Wait for ports to free up
    sleep 2
}

# Get the Firebase project ID from .firebaserc (single source of truth).
# We read the file directly instead of `firebase use` because `firebase use`
# validates against real projects, but demo-* projects only exist in the emulator.
cd "$PROJECT_ROOT"
PROJECT_ID=$(node -e "console.log(JSON.parse(require('fs').readFileSync('./.firebaserc','utf8')).projects.default)" 2>/dev/null || echo "demo-project")
echo -e "${BLUE}Using Firebase project: ${PROJECT_ID}${NC}"

# Build backend if dist doesn't exist
if [ ! -f "$PROJECT_ROOT/packages/backend/dist/index.js" ]; then
    echo -e "${BLUE}Building backend...${NC}"
    cd "$PROJECT_ROOT"
    bun run build:backend
fi

# Check for port conflicts
check_ports
SKIP_EMULATORS=false

if [ ${#BUSY_PORTS[@]} -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}Emulator ports already in use:${NC}"
    for p in "${BUSY_PORTS[@]}"; do
        echo -e "  ${YELLOW}  $p${NC}"
    done
    echo ""
    echo "What would you like to do?"
    echo "  1) Kill existing processes and start fresh"
    echo "  2) Use already-running emulators"
    echo "  3) Abort"
    echo ""
    read -r -p "Choose [1/2/3]: " choice

    case "$choice" in
        1)
            kill_existing
            # Re-check to make sure ports are free
            check_ports
            if [ ${#BUSY_PORTS[@]} -gt 0 ]; then
                echo -e "${RED}Failed to free ports: ${BUSY_PORTS[*]}${NC}"
                echo "Try manually killing processes or use option 2."
                exit 1
            fi
            ;;
        2)
            SKIP_EMULATORS=true
            echo -e "${GREEN}Using existing emulators.${NC}"
            ;;
        *)
            echo "Aborted."
            exit 0
            ;;
    esac
fi

EMU_PID=""

if [ "$SKIP_EMULATORS" = false ]; then
    # Start emulators in background
    # Firebase CLI must run on Node, not Bun. Bun reports connection errors as
    # "ConnectionRefused" while Node uses "ECONNREFUSED". The emulator's worker
    # retry logic only checks for the Node error code, so under Bun the emulator
    # gives up on function workers before they finish starting.
    FIREBASE_BIN="$(realpath "$(which firebase)")"
    # bun run creates a fake 'node' shim at /tmp/bun-node-*/node that is
    # actually bun in disguise. Use mise to get the real Node.js binary so
    # the emulator's worker processes use Node (not bun) — required because
    # firebase-tools' retry logic depends on Node-specific error codes.
    NODE_BIN="$(mise which node 2>/dev/null || echo node)"
    echo -e "${BLUE}Starting Firebase Emulators (node=$NODE_BIN)...${NC}"
    cd "$PROJECT_ROOT"
    "$NODE_BIN" "$FIREBASE_BIN" emulators:start --project "$PROJECT_ID" &
    EMU_PID=$!

    # Wait for emulators and functions to be ready
    echo -e "${BLUE}Waiting for emulators...${NC}"
    for i in {1..60}; do
        # Check if the api function is loaded by calling the health endpoint
        RESPONSE=$(curl -s "http://localhost:5001/${PROJECT_ID}/us-central1/api/api/v1/health" 2>/dev/null || echo "")
        if echo "$RESPONSE" | grep -q '"status":"healthy"'; then
            break
        fi
        # Check if emulator process died
        if ! kill -0 "$EMU_PID" 2>/dev/null; then
            echo -e "${RED}Emulators failed to start${NC}"
            exit 1
        fi
        sleep 1
    done

    # Verify function is loaded
    RESPONSE=$(curl -s "http://localhost:5001/${PROJECT_ID}/us-central1/api/api/v1/health" 2>/dev/null || echo "")
    if ! echo "$RESPONSE" | grep -q '"status":"healthy"'; then
        echo -e "${YELLOW}Warning: Functions may still be loading...${NC}"
    fi

    echo -e "${GREEN}Emulators ready!${NC}"
else
    # Verify existing emulators are actually healthy
    RESPONSE=$(curl -s "http://localhost:5001/${PROJECT_ID}/us-central1/api/api/v1/health" 2>/dev/null || echo "")
    if echo "$RESPONSE" | grep -q '"status":"healthy"'; then
        echo -e "${GREEN}Existing emulators are healthy!${NC}"
    else
        echo -e "${YELLOW}Warning: Existing emulators may not be fully ready. Functions endpoint not responding yet.${NC}"
    fi
fi

# Start frontend
echo -e "${BLUE}Starting Frontend...${NC}"
cd "$PROJECT_ROOT/packages/frontend"
bun run dev &
FE_PID=$!

sleep 3

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Local development environment ready!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "  Frontend:     http://localhost:5173"
echo "  Emulator UI:  http://localhost:4000"
echo "  API:          http://localhost:5001/${PROJECT_ID}/us-central1/api"
echo ""
echo "Press Ctrl+C to stop all services"

# Handle Ctrl+C - only kill processes we started
cleanup() {
    echo 'Shutting down...'
    [ -n "$FE_PID" ] && kill "$FE_PID" 2>/dev/null
    [ -n "$EMU_PID" ] && kill "$EMU_PID" 2>/dev/null
    exit 0
}
trap cleanup INT TERM

# Wait for either process to exit
wait
