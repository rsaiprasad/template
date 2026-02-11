#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

# Get project ID from .firebaserc
PROJECT_ID=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$PROJECT_ROOT/.firebaserc','utf8')).projects.default)" 2>/dev/null || echo "demo-project")

# Check if emulators are running
RESPONSE=$(curl -sf "http://localhost:5001/${PROJECT_ID}/us-central1/api/api/v1/health" 2>/dev/null || echo "")
if ! echo "$RESPONSE" | grep -q '"status":"healthy"'; then
    echo ""
    echo -e "${RED}Firebase emulators are not running.${NC}"
    echo -e "${YELLOW}The AI service needs the backend API which runs inside the emulator.${NC}"
    echo ""
    echo "  Run this first:  bun run dev:full"
    echo ""
    echo "  Then in another terminal:  bun run dev:ai-service"
    echo ""
    exit 1
fi

# Check if .env exists with API key
AI_ENV="$PROJECT_ROOT/packages/ai-service/.env"
if [ ! -f "$AI_ENV" ] || ! grep -q "GEMINI_API_KEY=." "$AI_ENV"; then
    echo ""
    echo -e "${RED}Missing AI service configuration.${NC}"
    echo -e "${YELLOW}Copy the example and add your Gemini API key:${NC}"
    echo ""
    echo "  cp packages/ai-service/.env.example packages/ai-service/.env"
    echo "  # Then edit .env and set GEMINI_API_KEY"
    echo ""
    exit 1
fi

cd "$PROJECT_ROOT/packages/ai-service"
exec bun run dev
