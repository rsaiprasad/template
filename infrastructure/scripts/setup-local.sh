#!/usr/bin/env bash
set -euo pipefail

# Local Development Setup Script
# Sets up PostgreSQL, runs migrations, and generates .env

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/packages/backend"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "========================================="
echo "  Admin Dashboard - Local Setup"
echo "========================================="
echo ""

# --- 1. Check PostgreSQL ---
info "Checking PostgreSQL installation..."

if ! command -v psql &> /dev/null; then
    error "PostgreSQL is not installed."
    echo "  Install it with:"
    echo "    Ubuntu/Debian: sudo apt install postgresql"
    echo "    macOS:         brew install postgresql@16"
    echo "    Arch:          sudo pacman -S postgresql"
    exit 1
fi
ok "PostgreSQL client found: $(psql --version)"

if systemctl is-active --quiet postgresql 2>/dev/null; then
    ok "PostgreSQL service is running"
elif pg_isready &>/dev/null; then
    ok "PostgreSQL is accepting connections"
else
    error "PostgreSQL does not appear to be running."
    echo "  Start it with: sudo systemctl start postgresql"
    exit 1
fi

# --- 2. Database Setup ---
info "Setting up database..."

DB_USER="admin_user"
DB_NAME="admin_dashboard"
DEFAULT_PASSWORD="admin_local_dev"

echo ""
read -rp "Database password for '$DB_USER' [default: $DEFAULT_PASSWORD]: " DB_PASSWORD
DB_PASSWORD="${DB_PASSWORD:-$DEFAULT_PASSWORD}"

# Create user if not exists
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
    ok "User '$DB_USER' already exists"
    sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" > /dev/null 2>&1
    ok "Updated password for '$DB_USER'"
else
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" > /dev/null 2>&1
    ok "Created user '$DB_USER'"
fi

# Create database if not exists
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1; then
    ok "Database '$DB_NAME' already exists"
else
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" > /dev/null 2>&1
    ok "Created database '$DB_NAME'"
fi

# Grant privileges
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" > /dev/null 2>&1
ok "Granted privileges"

DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"

# --- 3. Generate .env ---
info "Generating backend .env file..."

ENV_FILE="$BACKEND_DIR/.env"

if [ -f "$ENV_FILE" ]; then
    warn ".env file already exists at $ENV_FILE"
    read -rp "Overwrite? [y/N]: " OVERWRITE
    if [[ ! "$OVERWRITE" =~ ^[Yy]$ ]]; then
        info "Keeping existing .env file"
    else
        cat > "$ENV_FILE" << EOF
# Database
DATABASE_URL=$DATABASE_URL

# Server
PORT=3000
NODE_ENV=development

# Firebase Auth (get from Firebase Console > Project Settings > Service Accounts)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Super Admin
SUPER_ADMIN_EMAIL=
EOF
        ok "Generated $ENV_FILE"
    fi
else
    cat > "$ENV_FILE" << EOF
# Database
DATABASE_URL=$DATABASE_URL

# Server
PORT=3000
NODE_ENV=development

# Firebase Auth (get from Firebase Console > Project Settings > Service Accounts)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Super Admin
SUPER_ADMIN_EMAIL=
EOF
    ok "Generated $ENV_FILE"
fi

# --- 4. Run Drizzle Migrations ---
info "Running database migrations..."

if [ -d "$BACKEND_DIR" ]; then
    cd "$BACKEND_DIR"
    DATABASE_URL="$DATABASE_URL" bunx drizzle-kit push
    ok "Migrations complete"
else
    error "Backend directory not found at $BACKEND_DIR"
    exit 1
fi

# --- 5. Check cloudflared (optional) ---
echo ""
info "Checking for cloudflared (optional)..."

if command -v cloudflared &> /dev/null; then
    ok "cloudflared found: $(cloudflared --version)"
else
    warn "cloudflared is not installed (optional — only needed for production tunnel)"
    echo "  Install: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
    echo "  Config template: infrastructure/cloudflare/tunnel-config.example.yml"
fi

# --- Done ---
echo ""
echo "========================================="
echo -e "  ${GREEN}Setup Complete!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Fill in Firebase credentials in packages/backend/.env"
echo "  2. Set SUPER_ADMIN_EMAIL in packages/backend/.env"
echo "  3. Start development:"
echo "       bun run dev"
echo ""
echo "  Optional (production tunnel):"
echo "  4. Install cloudflared and create a tunnel"
echo "  5. Copy infrastructure/cloudflare/tunnel-config.example.yml to ~/.cloudflared/config.yml"
echo "  6. Start tunnel: bun run tunnel:start"
echo ""
