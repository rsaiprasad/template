#!/bin/bash
set -e

# Get the project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get the Firebase project ID for the emulator
cd "$PROJECT_ROOT/firebase"
export EMULATOR_PROJECT_ID=$(firebase use 2>/dev/null | tail -1)
echo -e "${BLUE}Using Firebase project: ${EMULATOR_PROJECT_ID}${NC}"

# Build backend if dist doesn't exist
if [ ! -f "$PROJECT_ROOT/packages/backend/dist/index.js" ]; then
    echo -e "${BLUE}Building backend...${NC}"
    cd "$PROJECT_ROOT"
    bun run build:backend
fi

# Start emulators in background
echo -e "${BLUE}Starting Firebase Emulators...${NC}"
cd "$PROJECT_ROOT/firebase"
firebase emulators:start &
EMU_PID=$!

# Wait for emulators and functions to be ready
echo -e "${BLUE}Waiting for emulators...${NC}"
for i in {1..60}; do
    # Check if the api function is loaded by calling the health endpoint
    RESPONSE=$(curl -s "http://localhost:5001/${EMULATOR_PROJECT_ID}/us-central1/api/api/v1/health" 2>/dev/null || echo "")
    if echo "$RESPONSE" | grep -q '"status":"healthy"'; then
        break
    fi
    sleep 1
done

# Check if emulators started
if ! kill -0 $EMU_PID 2>/dev/null; then
    echo "Emulators failed to start"
    exit 1
fi

# Verify function is loaded
RESPONSE=$(curl -s "http://localhost:5001/${EMULATOR_PROJECT_ID}/us-central1/api/api/v1/health" 2>/dev/null || echo "")
if ! echo "$RESPONSE" | grep -q '"status":"healthy"'; then
    echo -e "${BLUE}Warning: Functions may still be loading...${NC}"
fi

echo -e "${GREEN}Emulators ready!${NC}"

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
echo "  API:          http://localhost:5001/${EMULATOR_PROJECT_ID}/us-central1/api"
echo ""
echo "Press Ctrl+C to stop all services"

# Handle Ctrl+C
trap "echo 'Shutting down...'; kill $EMU_PID $FE_PID 2>/dev/null; exit 0" INT TERM

# Wait for either process to exit
wait
