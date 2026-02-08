#!/usr/bin/env bash

# Firebase/GCP Setup Script for Admin Dashboard Template
# This script automates the setup of Firebase and Google Cloud for the admin dashboard.
#
# Usage: ./scripts/setup-firebase.sh <project-id> <super-admin-email> [region]
#
# Example: ./scripts/setup-firebase.sh my-dashboard-project admin@company.com us-central1

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
DEFAULT_REGION="us-central1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Print colored messages
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

# Check if a command exists
check_command() {
    if ! command -v "$1" &> /dev/null; then
        print_error "$1 is not installed. Please install it first."
        echo ""
        case "$1" in
            firebase)
                echo "Install with: bun install -g firebase-tools"
                echo "Or: npm install -g firebase-tools"
                ;;
            gcloud)
                echo "Install from: https://cloud.google.com/sdk/docs/install"
                ;;
            jq)
                echo "Install with:"
                echo "  macOS: brew install jq"
                echo "  Ubuntu/Debian: sudo apt-get install jq"
                echo "  Fedora: sudo dnf install jq"
                ;;
        esac
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    check_command "firebase"
    print_success "Firebase CLI found: $(firebase --version)"

    check_command "gcloud"
    print_success "gcloud SDK found: $(gcloud --version | head -1)"

    check_command "jq"
    print_success "jq found: $(jq --version)"

    check_command "bun"
    print_success "Bun found: $(bun --version)"
}

# Check authentication status
check_auth() {
    print_header "Checking Authentication"

    # Check Firebase auth
    if ! firebase projects:list &> /dev/null; then
        print_warning "Not logged into Firebase CLI"
        print_info "Running: firebase login"
        firebase login
    else
        print_success "Firebase CLI authenticated"
    fi

    # Check gcloud auth
    if ! gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>/dev/null | grep -q "@"; then
        print_warning "Not logged into gcloud"
        print_info "Running: gcloud auth login"
        gcloud auth login
    else
        GCLOUD_ACCOUNT=$(gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>/dev/null | head -1)
        print_success "gcloud authenticated as: $GCLOUD_ACCOUNT"
    fi
}

# Create or select Firebase project
setup_project() {
    local project_id="$1"

    print_header "Setting Up Firebase Project"

    # Check if project exists in user's Firebase account
    if firebase projects:list --json 2>/dev/null | jq -e ".result[] | select(.projectId == \"$project_id\")" > /dev/null 2>&1; then
        print_info "Project '$project_id' already exists in your Firebase account"
    else
        # Check if project exists in user's GCP account
        if gcloud projects describe "$project_id" &>/dev/null; then
            print_info "Project '$project_id' exists in GCP but not in Firebase"
            print_info "Adding Firebase to existing GCP project..."
            if ! firebase projects:addfirebase "$project_id"; then
                print_error "Could not add Firebase to project '$project_id'"
                print_info "Make sure you are the owner of this GCP project"
                exit 1
            fi
        else
            print_info "Creating new Firebase project: $project_id"
            if ! firebase projects:create "$project_id" --display-name "Admin Dashboard" 2>&1; then
                echo ""
                print_error "Could not create project '$project_id'"
                echo ""
                echo -e "${YELLOW}This usually means:${NC}"
                echo "  1. The project ID '$project_id' is already taken by someone else"
                echo "     (GCP project IDs are globally unique across all users)"
                echo ""
                echo "  2. You've exceeded your project quota"
                echo ""
                echo -e "${YELLOW}Solutions:${NC}"
                echo "  • Try a more unique project ID, e.g.:"
                echo "    ./scripts/setup-firebase.sh ${project_id}-$(date +%s | tail -c 5) $2"
                echo ""
                echo "  • Or use an existing project from your account:"
                echo "    firebase projects:list"
                echo ""
                exit 1
            fi
        fi
    fi

    # Set as default project (must run from firebase directory)
    print_info "Setting '$project_id' as the default project"
    (cd "${PROJECT_ROOT}" && firebase use "$project_id" --add)

    # Also set for gcloud
    gcloud config set project "$project_id"

    print_success "Project '$project_id' is now active"
}

# Enable required GCP APIs
enable_apis() {
    local project_id="$1"

    print_header "Enabling Required APIs"

    local apis=(
        "firestore.googleapis.com"
        "identitytoolkit.googleapis.com"
        "cloudfunctions.googleapis.com"
        "cloudbuild.googleapis.com"
        "run.googleapis.com"
        "secretmanager.googleapis.com"
        "artifactregistry.googleapis.com"
    )

    for api in "${apis[@]}"; do
        print_info "Enabling $api..."
        if gcloud services enable "$api" --project="$project_id" 2>/dev/null; then
            print_success "Enabled $api"
        else
            print_warning "Could not enable $api (may already be enabled or requires billing)"
        fi
    done
}

# Create Firestore database
setup_firestore() {
    local project_id="$1"
    local region="$2"

    print_header "Setting Up Firestore Database"

    # Check if Firestore already exists
    if gcloud firestore databases describe --project="$project_id" 2>/dev/null; then
        print_info "Firestore database already exists"
    else
        print_info "Creating Firestore database in $region..."
        if gcloud firestore databases create --location="$region" --project="$project_id" 2>/dev/null; then
            print_success "Firestore database created"
        else
            print_warning "Could not create Firestore database (may already exist or require billing)"
        fi
    fi
}

# Create Firebase web app and get config
setup_web_app() {
    local project_id="$1"

    print_header "Setting Up Firebase Web App"

    local app_name="Admin Dashboard Web App"

    # Check if web app already exists
    local existing_app
    existing_app=$(firebase apps:list WEB --project="$project_id" --json 2>/dev/null | jq -r '.result[0].appId // empty')

    if [ -n "$existing_app" ]; then
        print_info "Web app already exists with ID: $existing_app"
        APP_ID="$existing_app"
    else
        print_info "Creating Firebase web app: $app_name"
        firebase apps:create WEB "$app_name" --project="$project_id"

        # Get the new app ID
        APP_ID=$(firebase apps:list WEB --project="$project_id" --json 2>/dev/null | jq -r '.result[0].appId')
        print_success "Web app created with ID: $APP_ID"
    fi

    # Get Firebase config
    print_info "Retrieving Firebase configuration..."
    FIREBASE_CONFIG=$(firebase apps:sdkconfig WEB "$APP_ID" --project="$project_id" --json 2>/dev/null)

    if [ -z "$FIREBASE_CONFIG" ]; then
        print_error "Could not retrieve Firebase configuration"
        exit 1
    fi

    print_success "Firebase configuration retrieved"
}

# Create service account for local development
setup_service_account() {
    local project_id="$1"

    print_header "Setting Up Service Account"

    local sa_name="admin-dashboard-dev"
    local sa_email="${sa_name}@${project_id}.iam.gserviceaccount.com"
    local key_file="${PROJECT_ROOT}/service-account.json"

    # Check if service account exists
    if gcloud iam service-accounts describe "$sa_email" --project="$project_id" 2>/dev/null; then
        print_info "Service account already exists: $sa_email"
    else
        print_info "Creating service account: $sa_name"
        gcloud iam service-accounts create "$sa_name" \
            --display-name="Admin Dashboard Development" \
            --project="$project_id"
        print_success "Service account created"
    fi

    # Grant necessary roles
    print_info "Granting roles to service account..."
    local roles=(
        "roles/datastore.user"
        "roles/firebase.sdkAdminServiceAgent"
    )

    for role in "${roles[@]}"; do
        gcloud projects add-iam-policy-binding "$project_id" \
            --member="serviceAccount:$sa_email" \
            --role="$role" \
            --quiet 2>/dev/null || true
    done

    # Create key file if it doesn't exist
    if [ -f "$key_file" ]; then
        print_warning "Service account key already exists at: $key_file"
        print_info "Delete it manually if you want to regenerate"
    else
        print_info "Creating service account key..."
        gcloud iam service-accounts keys create "$key_file" \
            --iam-account="$sa_email" \
            --project="$project_id"
        print_success "Service account key created at: $key_file"
        print_warning "Keep this file secure and never commit it to version control!"
    fi
}

# Generate environment files
generate_env_files() {
    local project_id="$1"
    local super_admin_email="$2"
    local region="$3"

    print_header "Generating Environment Files"

    # Parse Firebase config
    local api_key=$(echo "$FIREBASE_CONFIG" | jq -r '.result.sdkConfig.apiKey')
    local auth_domain=$(echo "$FIREBASE_CONFIG" | jq -r '.result.sdkConfig.authDomain')
    local storage_bucket=$(echo "$FIREBASE_CONFIG" | jq -r '.result.sdkConfig.storageBucket')
    local messaging_sender_id=$(echo "$FIREBASE_CONFIG" | jq -r '.result.sdkConfig.messagingSenderId')
    local app_id=$(echo "$FIREBASE_CONFIG" | jq -r '.result.sdkConfig.appId')

    # Generate root .env file (backend configuration only)
    local env_file="${PROJECT_ROOT}/.env"
    print_info "Generating $env_file"

    cat > "$env_file" << EOF
# Firebase Admin (Backend)
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json

# Super Admin Email (first user with this email becomes super admin)
SUPER_ADMIN_EMAIL=${super_admin_email}

# Environment
NODE_ENV=development
EOF
    print_success "Created $env_file"

    # Generate frontend .env file
    local frontend_env_file="${PROJECT_ROOT}/packages/frontend/.env"
    print_info "Generating $frontend_env_file"

    cat > "$frontend_env_file" << EOF
# API Configuration
PUBLIC_API_BASE_URL=/api

# Firebase Configuration
PUBLIC_FIREBASE_API_KEY=${api_key}
PUBLIC_FIREBASE_AUTH_DOMAIN=${auth_domain}
PUBLIC_FIREBASE_PROJECT_ID=${project_id}
PUBLIC_FIREBASE_STORAGE_BUCKET=${storage_bucket}
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${messaging_sender_id}
PUBLIC_FIREBASE_APP_ID=${app_id}
EOF
    print_success "Created $frontend_env_file"
}

# Update .firebaserc
update_firebaserc() {
    local project_id="$1"

    print_header "Updating Firebase Configuration"

    local firebaserc="${PROJECT_ROOT}/.firebaserc"

    print_info "Updating $firebaserc"

    cat > "$firebaserc" << EOF
{
  "projects": {
    "default": "${project_id}",
    "staging": "${project_id}-staging",
    "production": "${project_id}-prod"
  }
}
EOF
    print_success "Updated $firebaserc"
}

# Deploy Firestore rules and indexes
deploy_firestore_config() {
    local project_id="$1"

    print_header "Deploying Firestore Rules and Indexes"

    cd "${PROJECT_ROOT}"

    print_info "Deploying Firestore security rules..."
    if firebase deploy --only firestore:rules --project="$project_id"; then
        print_success "Firestore rules deployed"
    else
        print_warning "Could not deploy Firestore rules (may require billing)"
    fi

    print_info "Deploying Firestore indexes..."
    if firebase deploy --only firestore:indexes --project="$project_id"; then
        print_success "Firestore indexes deployed"
    else
        print_warning "Could not deploy Firestore indexes (may require billing)"
    fi

    cd "$PROJECT_ROOT"
}

# Print next steps
print_next_steps() {
    local project_id="$1"

    print_header "Setup Complete!"

    echo -e "${GREEN}Your Firebase project is configured!${NC}"
    echo ""
    echo -e "${YELLOW}Required Manual Steps:${NC}"
    echo ""
    echo "1. ${BLUE}Enable Google Sign-In Provider${NC}"
    echo "   Go to: https://console.firebase.google.com/project/${project_id}/authentication/providers"
    echo "   - Click 'Google' and enable it"
    echo "   - Add your domain to authorized domains"
    echo ""
    echo "2. ${BLUE}Upgrade to Blaze Plan (if deploying functions)${NC}"
    echo "   Go to: https://console.firebase.google.com/project/${project_id}/usage/details"
    echo "   - Cloud Functions require the Blaze (pay-as-you-go) plan"
    echo ""
    echo "3. ${BLUE}Configure OAuth Consent Screen (for custom domains)${NC}"
    echo "   Go to: https://console.cloud.google.com/apis/credentials/consent?project=${project_id}"
    echo ""
    echo -e "${YELLOW}Start Development:${NC}"
    echo ""
    echo "  # Install dependencies"
    echo "  bun install"
    echo ""
    echo "  # Start development servers"
    echo "  bun run dev"
    echo ""
    echo -e "${YELLOW}Deploy to Production:${NC}"
    echo ""
    echo "  # Build and deploy"
    echo "  bun run build && bun run deploy"
    echo ""
    echo -e "${YELLOW}Useful Links:${NC}"
    echo ""
    echo "  Firebase Console: https://console.firebase.google.com/project/${project_id}"
    echo "  GCP Console: https://console.cloud.google.com/home/dashboard?project=${project_id}"
    echo "  Firestore: https://console.firebase.google.com/project/${project_id}/firestore"
    echo ""
}

# Main function
main() {
    # Parse arguments
    if [ $# -lt 2 ]; then
        echo "Usage: $0 <project-id> <super-admin-email> [region]"
        echo ""
        echo "Arguments:"
        echo "  project-id        Firebase/GCP project ID (must be globally unique)"
        echo "  super-admin-email Email address for the super admin user"
        echo "  region            GCP region (default: us-central1)"
        echo ""
        echo "Example:"
        echo "  $0 my-dashboard-project admin@company.com"
        echo "  $0 my-dashboard-project admin@company.com europe-west1"
        exit 1
    fi

    local project_id="$1"
    local super_admin_email="$2"
    local region="${3:-$DEFAULT_REGION}"

    # Validate project ID
    if [[ ! "$project_id" =~ ^[a-z][a-z0-9-]{4,28}[a-z0-9]$ ]]; then
        print_error "Invalid project ID: $project_id"
        echo "Project ID must:"
        echo "  - Start with a lowercase letter"
        echo "  - Be 6-30 characters long"
        echo "  - Contain only lowercase letters, numbers, and hyphens"
        echo "  - End with a letter or number"
        exit 1
    fi

    # Validate email
    if [[ ! "$super_admin_email" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
        print_error "Invalid email address: $super_admin_email"
        exit 1
    fi

    print_header "Firebase/GCP Setup for Admin Dashboard"
    echo "Project ID: $project_id"
    echo "Super Admin: $super_admin_email"
    echo "Region: $region"

    # Run setup steps
    check_prerequisites
    check_auth
    setup_project "$project_id"
    enable_apis "$project_id"
    setup_firestore "$project_id" "$region"
    setup_web_app "$project_id"
    setup_service_account "$project_id"
    generate_env_files "$project_id" "$super_admin_email" "$region"
    update_firebaserc "$project_id"
    deploy_firestore_config "$project_id"
    print_next_steps "$project_id"
}

# Run main function with all arguments
main "$@"
