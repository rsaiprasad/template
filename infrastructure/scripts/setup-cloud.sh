#!/bin/bash
set -euo pipefail

# ─── Setup Cloud Infrastructure ──────────────────────────────────────
# Creates the minimal GCP/Firebase resources needed for the admin dashboard:
#   1. Firebase project (or uses existing one)
#   2. Firebase Auth with Google Sign-In
#   3. Firebase Web App (client config for frontend)
#   4. Service account key (for backend Firebase Admin SDK)
#   5. Authorized domains (for Firebase Auth)
#
# Prerequisites:
#   - gcloud CLI installed and authenticated (gcloud auth login)
#   - firebase CLI installed (npm i -g firebase-tools)
#   - A GCP billing account (for new projects)
#
# Usage:
#   ./setup-cloud.sh                    # Interactive setup
#   ./setup-cloud.sh --project-id=foo   # Specify project ID
# ─────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${BLUE}ℹ ${NC}$1"; }
success() { echo -e "${GREEN}✓ ${NC}$1"; }
warn()    { echo -e "${YELLOW}⚠ ${NC}$1"; }
error()   { echo -e "${RED}✗ ${NC}$1"; }
header()  { echo -e "\n${BOLD}── $1 ──${NC}"; }

# ─── Parse arguments ─────────────────────────────────────────────────

PROJECT_ID=""
SUPER_ADMIN_EMAIL=""
FRONTEND_DOMAIN=""
SKIP_CONFIRM=false

for arg in "$@"; do
  case $arg in
    --project-id=*) PROJECT_ID="${arg#*=}" ;;
    --admin-email=*) SUPER_ADMIN_EMAIL="${arg#*=}" ;;
    --frontend-domain=*) FRONTEND_DOMAIN="${arg#*=}" ;;
    --yes|-y) SKIP_CONFIRM=true ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --project-id=ID         GCP/Firebase project ID"
      echo "  --admin-email=EMAIL     Super admin email address"
      echo "  --frontend-domain=DOMAIN  Frontend domain (e.g., app.example.com)"
      echo "  --yes, -y               Skip confirmation prompts"
      echo "  --help, -h              Show this help"
      exit 0
      ;;
  esac
done

# ─── Check prerequisites ─────────────────────────────────────────────

header "Checking prerequisites"

command -v gcloud >/dev/null 2>&1 || { error "gcloud CLI not found. Install: https://cloud.google.com/sdk/docs/install"; exit 1; }
command -v firebase >/dev/null 2>&1 || { error "firebase CLI not found. Install: npm i -g firebase-tools"; exit 1; }

# Check gcloud auth
if ! gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | head -1 | grep -q '@'; then
  error "Not authenticated with gcloud. Run: gcloud auth login"
  exit 1
fi

GCLOUD_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | head -1)
success "Authenticated as: $GCLOUD_ACCOUNT"

# ─── Gather inputs ───────────────────────────────────────────────────

header "Project configuration"

if [ -z "$PROJECT_ID" ]; then
  # Check if there's an existing project set
  CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
  if [ -n "$CURRENT_PROJECT" ]; then
    read -r -p "$(echo -e "${BLUE}Project ID${NC} [${CURRENT_PROJECT}]: ")" PROJECT_ID
    PROJECT_ID=${PROJECT_ID:-$CURRENT_PROJECT}
  else
    read -r -p "$(echo -e "${BLUE}Project ID${NC}: ")" PROJECT_ID
  fi
fi

if [ -z "$PROJECT_ID" ]; then
  error "Project ID is required"
  exit 1
fi

if [ -z "$SUPER_ADMIN_EMAIL" ]; then
  read -r -p "$(echo -e "${BLUE}Super admin email${NC}: ")" SUPER_ADMIN_EMAIL
fi

if [ -z "$FRONTEND_DOMAIN" ]; then
  read -r -p "$(echo -e "${BLUE}Frontend domain${NC} (e.g., app.example.com, or press Enter to skip): ")" FRONTEND_DOMAIN
fi

echo ""
info "Project ID:        $PROJECT_ID"
info "Super admin:       $SUPER_ADMIN_EMAIL"
[ -n "$FRONTEND_DOMAIN" ] && info "Frontend domain:   $FRONTEND_DOMAIN"

if [ "$SKIP_CONFIRM" != true ]; then
  echo ""
  read -r -p "Continue? [Y/n] " confirm
  if [[ "$confirm" =~ ^[Nn] ]]; then
    echo "Aborted."
    exit 0
  fi
fi

# ─── Step 1: Create or select GCP project ─────────────────────────────

header "Step 1: GCP Project"

if gcloud projects describe "$PROJECT_ID" >/dev/null 2>&1; then
  success "Project '$PROJECT_ID' already exists"
else
  info "Creating project '$PROJECT_ID'..."

  # Check for billing account
  BILLING_ACCOUNTS=$(gcloud billing accounts list --filter=open=true --format='value(name)' 2>/dev/null)
  if [ -z "$BILLING_ACCOUNTS" ]; then
    error "No billing accounts found. Create one at https://console.cloud.google.com/billing"
    exit 1
  fi

  BILLING_ACCOUNT=$(echo "$BILLING_ACCOUNTS" | head -1)
  info "Using billing account: $BILLING_ACCOUNT"

  gcloud projects create "$PROJECT_ID" --name="Admin Dashboard" --set-as-default
  gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING_ACCOUNT"
  success "Project created and billing linked"
fi

gcloud config set project "$PROJECT_ID" 2>/dev/null
success "Active project: $PROJECT_ID"

# ─── Step 2: Enable required APIs ─────────────────────────────────────

header "Step 2: Enable APIs"

REQUIRED_APIS=(
  "identitytoolkit.googleapis.com"
  "firebase.googleapis.com"
  "iam.googleapis.com"
)

for api in "${REQUIRED_APIS[@]}"; do
  if gcloud services list --enabled --filter="name:$api" --format='value(name)' 2>/dev/null | grep -q "$api"; then
    success "$api (already enabled)"
  else
    info "Enabling $api..."
    gcloud services enable "$api" --project="$PROJECT_ID"
    success "$api"
  fi
done

# ─── Step 3: Enable Firebase ──────────────────────────────────────────

header "Step 3: Firebase"

# Add Firebase to the project
info "Adding Firebase to project..."
firebase projects:addfirebase "$PROJECT_ID" 2>/dev/null || success "Firebase already enabled"
success "Firebase enabled on project"

# ─── Step 4: Create Firebase Web App ──────────────────────────────────

header "Step 4: Firebase Web App"

# Check if web app already exists
EXISTING_APP=$(firebase apps:list --project="$PROJECT_ID" 2>/dev/null | grep "WEB" | head -1 || echo "")

if [ -n "$EXISTING_APP" ]; then
  success "Web app already exists"
  # Get the app ID
  APP_ID=$(firebase apps:list --project="$PROJECT_ID" --json 2>/dev/null | python3 -c "
import sys, json
data = json.load(sys.stdin)
if isinstance(data, dict) and 'result' in data:
    data = data['result']
for app in data:
    if app.get('platform') == 'WEB':
        print(app.get('appId', ''))
        break
" 2>/dev/null || echo "")
else
  info "Creating web app..."
  firebase apps:create WEB "Admin Dashboard" --project="$PROJECT_ID" 2>/dev/null
  success "Web app created"

  APP_ID=$(firebase apps:list --project="$PROJECT_ID" --json 2>/dev/null | python3 -c "
import sys, json
data = json.load(sys.stdin)
if isinstance(data, dict) and 'result' in data:
    data = data['result']
for app in data:
    if app.get('platform') == 'WEB':
        print(app.get('appId', ''))
        break
" 2>/dev/null || echo "")
fi

# Get web app config
if [ -n "$APP_ID" ]; then
  info "Fetching web app config..."
  FIREBASE_CONFIG=$(firebase apps:sdkconfig WEB "$APP_ID" --project="$PROJECT_ID" --json 2>/dev/null || echo "")

  if [ -n "$FIREBASE_CONFIG" ]; then
    FIREBASE_API_KEY=$(echo "$FIREBASE_CONFIG" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('sdkConfig',{}).get('apiKey',''))" 2>/dev/null || echo "")
    FIREBASE_AUTH_DOMAIN=$(echo "$FIREBASE_CONFIG" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('sdkConfig',{}).get('authDomain',''))" 2>/dev/null || echo "")
    FIREBASE_STORAGE_BUCKET=$(echo "$FIREBASE_CONFIG" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('sdkConfig',{}).get('storageBucket',''))" 2>/dev/null || echo "")
    FIREBASE_MESSAGING_SENDER_ID=$(echo "$FIREBASE_CONFIG" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('sdkConfig',{}).get('messagingSenderId',''))" 2>/dev/null || echo "")
    FIREBASE_APP_ID=$(echo "$FIREBASE_CONFIG" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('sdkConfig',{}).get('appId',''))" 2>/dev/null || echo "")

    success "Got Firebase config"
  else
    warn "Could not fetch Firebase config. You can get it from the Firebase Console."
  fi
else
  warn "Could not determine app ID. Check Firebase Console for web app config."
fi

# ─── Step 5: Configure Firebase Auth ──────────────────────────────────

header "Step 5: Firebase Auth (Google Sign-In)"

echo ""
info "Google Sign-In requires an OAuth 2.0 Client ID."
info "If you haven't created one yet:"
echo "  1. Go to: https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
echo "  2. Click 'Create Credentials' → 'OAuth client ID'"
echo "  3. Application type: 'Web application'"
echo "  4. Add authorized JavaScript origins:"
echo "     - http://localhost:5173 (dev)"
[ -n "$FRONTEND_DOMAIN" ] && echo "     - https://$FRONTEND_DOMAIN (production)"
echo "  5. Add authorized redirect URIs:"
echo "     - https://$PROJECT_ID.firebaseapp.com/__/auth/handler"
echo ""

read -r -p "$(echo -e "${BLUE}OAuth Client ID${NC} (or press Enter to skip): ")" OAUTH_CLIENT_ID

if [ -n "$OAUTH_CLIENT_ID" ]; then
  read -r -p "$(echo -e "${BLUE}OAuth Client Secret${NC}: ")" OAUTH_CLIENT_SECRET

  if [ -n "$OAUTH_CLIENT_SECRET" ]; then
    # Enable Google Sign-In via Identity Toolkit REST API
    ACCESS_TOKEN=$(gcloud auth print-access-token)

    # Get current config
    CURRENT_CONFIG=$(curl -s \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "x-goog-user-project: $PROJECT_ID" \
      "https://identitytoolkit.googleapis.com/admin/v2/projects/$PROJECT_ID/defaultSupportedIdpConfigs/google.com" 2>/dev/null || echo "")

    # Create or update Google Sign-In config
    if echo "$CURRENT_CONFIG" | grep -q '"name"'; then
      # Update existing
      curl -s -X PATCH \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -H "x-goog-user-project: $PROJECT_ID" \
        -d "{\"enabled\": true, \"clientId\": \"$OAUTH_CLIENT_ID\", \"clientSecret\": \"$OAUTH_CLIENT_SECRET\"}" \
        "https://identitytoolkit.googleapis.com/admin/v2/projects/$PROJECT_ID/defaultSupportedIdpConfigs/google.com?updateMask=enabled,clientId,clientSecret" >/dev/null
    else
      # Create new
      curl -s -X POST \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -H "x-goog-user-project: $PROJECT_ID" \
        -d "{\"enabled\": true, \"clientId\": \"$OAUTH_CLIENT_ID\", \"clientSecret\": \"$OAUTH_CLIENT_SECRET\"}" \
        "https://identitytoolkit.googleapis.com/admin/v2/projects/$PROJECT_ID/defaultSupportedIdpConfigs/google.com" >/dev/null
    fi

    success "Google Sign-In configured"
  fi
else
  warn "Skipping Google Sign-In setup. Configure it later in Firebase Console."
fi

# ─── Step 6: Add authorized domains ──────────────────────────────────

header "Step 6: Authorized Domains"

ACCESS_TOKEN=$(gcloud auth print-access-token)

# Get current authorized domains
CURRENT_DOMAINS=$(curl -s \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-goog-user-project: $PROJECT_ID" \
  "https://identitytoolkit.googleapis.com/admin/v2/projects/$PROJECT_ID/config" 2>/dev/null)

# Extract current authorized domains list
EXISTING_DOMAINS=$(echo "$CURRENT_DOMAINS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
domains = data.get('authorizedDomains', [])
for d in domains:
    print(d)
" 2>/dev/null || echo "")

# Build domains list: keep existing + add new ones
DOMAINS_TO_ADD=()
[ -n "$FRONTEND_DOMAIN" ] && DOMAINS_TO_ADD+=("$FRONTEND_DOMAIN")

# Default domains Firebase adds automatically
DEFAULT_DOMAINS=("localhost" "$PROJECT_ID.firebaseapp.com" "$PROJECT_ID.web.app")

# Merge all domains
ALL_DOMAINS=()
for d in "${DEFAULT_DOMAINS[@]}"; do
  ALL_DOMAINS+=("$d")
done
for d in "${DOMAINS_TO_ADD[@]}"; do
  ALL_DOMAINS+=("$d")
done
# Add any existing domains not in our list
while IFS= read -r d; do
  [ -z "$d" ] && continue
  found=false
  for existing in "${ALL_DOMAINS[@]}"; do
    [ "$existing" = "$d" ] && found=true && break
  done
  [ "$found" = false ] && ALL_DOMAINS+=("$d")
done <<< "$EXISTING_DOMAINS"

# Build JSON array
DOMAINS_JSON=$(printf '"%s",' "${ALL_DOMAINS[@]}" | sed 's/,$//')

curl -s -X PATCH \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-goog-user-project: $PROJECT_ID" \
  -d "{\"authorizedDomains\": [$DOMAINS_JSON]}" \
  "https://identitytoolkit.googleapis.com/admin/v2/projects/$PROJECT_ID/config?updateMask=authorizedDomains" >/dev/null

success "Authorized domains updated:"
for d in "${ALL_DOMAINS[@]}"; do
  echo "  - $d"
done

# ─── Step 7: Create service account key ───────────────────────────────

header "Step 7: Service Account Key"

SA_NAME="firebase-adminsdk"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SA_KEY_PATH="$PROJECT_ROOT/packages/backend/firebase-sa-key.json"

# Check if service account exists
if gcloud iam service-accounts describe "$SA_EMAIL" --project="$PROJECT_ID" >/dev/null 2>&1; then
  success "Service account exists: $SA_EMAIL"
else
  # Firebase creates its own admin SDK service account. Let's find it.
  FIREBASE_SA=$(gcloud iam service-accounts list --project="$PROJECT_ID" --format='value(email)' --filter='displayName:firebase-adminsdk' 2>/dev/null | head -1)

  if [ -n "$FIREBASE_SA" ]; then
    SA_EMAIL="$FIREBASE_SA"
    success "Found Firebase Admin SDK service account: $SA_EMAIL"
  else
    info "Creating service account..."
    gcloud iam service-accounts create "$SA_NAME" \
      --project="$PROJECT_ID" \
      --display-name="Firebase Admin SDK" \
      --description="Service account for Firebase Admin SDK (token verification)"
    success "Service account created: $SA_EMAIL"
  fi
fi

if [ -f "$SA_KEY_PATH" ]; then
  warn "Service account key already exists at: $SA_KEY_PATH"
  read -r -p "Overwrite? [y/N] " overwrite
  if [[ ! "$overwrite" =~ ^[Yy] ]]; then
    info "Keeping existing key"
  else
    gcloud iam service-accounts keys create "$SA_KEY_PATH" \
      --iam-account="$SA_EMAIL" \
      --project="$PROJECT_ID"
    success "New key saved to: $SA_KEY_PATH"
  fi
else
  gcloud iam service-accounts keys create "$SA_KEY_PATH" \
    --iam-account="$SA_EMAIL" \
    --project="$PROJECT_ID"
  success "Key saved to: $SA_KEY_PATH"
fi

warn "Keep this file secure! It's already in .gitignore."

# ─── Step 8: Generate .env files ──────────────────────────────────────

header "Step 8: Generate .env files"

# Backend .env
BACKEND_ENV="$PROJECT_ROOT/packages/backend/.env"
if [ -f "$BACKEND_ENV" ]; then
  warn "Backend .env already exists. Skipping to avoid overwriting."
  info "To regenerate, delete $BACKEND_ENV and re-run this script."
else
  cat > "$BACKEND_ENV" << EOF
# Database
DATABASE_URL=postgresql://admin_user:admin_local_dev@localhost:5432/admin_dashboard

# Server
PORT=3000
NODE_ENV=development

# Firebase Admin SDK (for token verification)
GOOGLE_APPLICATION_CREDENTIALS=./firebase-sa-key.json

# Super Admin (this user gets full access on login)
SUPER_ADMIN_EMAIL=$SUPER_ADMIN_EMAIL

# CORS (comma-separated origins)
CORS_ORIGINS=http://localhost:5173
EOF
  success "Generated: $BACKEND_ENV"
fi

# Frontend .env
FRONTEND_ENV="$PROJECT_ROOT/packages/frontend/.env"
if [ -f "$FRONTEND_ENV" ]; then
  warn "Frontend .env already exists. Skipping to avoid overwriting."
else
  cat > "$FRONTEND_ENV" << EOF
# Backend API URL (dev server proxies to this)
PUBLIC_API_BASE_URL=http://localhost:3000/api/v1

# Firebase Client Config
PUBLIC_FIREBASE_API_KEY=${FIREBASE_API_KEY:-your-api-key}
PUBLIC_FIREBASE_AUTH_DOMAIN=${FIREBASE_AUTH_DOMAIN:-${PROJECT_ID}.firebaseapp.com}
PUBLIC_FIREBASE_PROJECT_ID=$PROJECT_ID
PUBLIC_FIREBASE_STORAGE_BUCKET=${FIREBASE_STORAGE_BUCKET:-}
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${FIREBASE_MESSAGING_SENDER_ID:-}
PUBLIC_FIREBASE_APP_ID=${FIREBASE_APP_ID:-}
EOF
  success "Generated: $FRONTEND_ENV"
fi

# ─── Done! ────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  Cloud infrastructure setup complete!${NC}"
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════${NC}"
echo ""
echo "  Project:          $PROJECT_ID"
echo "  Super admin:      $SUPER_ADMIN_EMAIL"
echo "  SA key:           packages/backend/firebase-sa-key.json"
echo ""
echo "  Firebase Console: https://console.firebase.google.com/project/$PROJECT_ID"
echo "  Auth settings:    https://console.firebase.google.com/project/$PROJECT_ID/authentication/settings"
echo "  GCP Console:      https://console.cloud.google.com/home/dashboard?project=$PROJECT_ID"
echo ""
echo "Next steps:"
echo "  1. Set up PostgreSQL:  ./infrastructure/scripts/setup-local.sh"
echo "  2. Start dev server:   bun run dev:full"
echo "  3. For production deployment, see docs/DEPLOYMENT.md"
echo ""
