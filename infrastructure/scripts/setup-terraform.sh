#!/usr/bin/env bash

# Terraform Setup Script for Admin Dashboard
# This script helps set up the infrastructure using Terraform

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$(dirname "$SCRIPT_DIR")/terraform"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        print_error "Terraform is not installed"
        echo ""
        echo "Install with:"
        echo "  macOS: brew install terraform"
        echo "  Linux: https://developer.hashicorp.com/terraform/downloads"
        exit 1
    fi
    print_success "Terraform found: $(terraform version -json | jq -r '.terraform_version')"

    # Check gcloud
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI is not installed"
        echo "Install from: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    print_success "gcloud found: $(gcloud version 2>/dev/null | head -1)"

    # Check gcloud auth
    if ! gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>/dev/null | grep -q "@"; then
        print_warning "Not authenticated with gcloud"
        print_info "Running: gcloud auth login"
        gcloud auth login
        print_info "Running: gcloud auth application-default login"
        gcloud auth application-default login
    else
        local account=$(gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>/dev/null | head -1)
        print_success "gcloud authenticated as: $account"
    fi

    # Check jq
    if ! command -v jq &> /dev/null; then
        print_error "jq is not installed (required for generating .env files)"
        echo "Install with:"
        echo "  macOS: brew install jq"
        echo "  Ubuntu/Debian: sudo apt-get install jq"
        exit 1
    fi
    print_success "jq found: $(jq --version)"
}

# Check for tfvars file
check_tfvars() {
    print_header "Checking Configuration"

    if [ ! -f "$TERRAFORM_DIR/terraform.tfvars" ]; then
        print_warning "terraform.tfvars not found"
        print_info "Creating from template..."
        cp "$TERRAFORM_DIR/terraform.tfvars.example" "$TERRAFORM_DIR/terraform.tfvars"
        echo ""
        print_error "Please edit $TERRAFORM_DIR/terraform.tfvars with your values"
        echo ""
        echo "Required values:"
        echo "  - project_id: Your GCP project ID"
        echo "  - super_admin_email: Your admin email"
        echo ""
        exit 1
    fi

    print_success "terraform.tfvars found"
}

# Initialize Terraform
init_terraform() {
    print_header "Initializing Terraform"

    cd "$TERRAFORM_DIR"
    terraform init
    print_success "Terraform initialized"
}

# Plan infrastructure changes
plan_terraform() {
    print_header "Planning Infrastructure"

    cd "$TERRAFORM_DIR"
    terraform plan -out=tfplan

    echo ""
    print_info "Review the plan above before applying"
}

# Apply infrastructure changes
apply_terraform() {
    print_header "Applying Infrastructure"

    cd "$TERRAFORM_DIR"

    if [ -f "tfplan" ]; then
        terraform apply tfplan
        rm -f tfplan
    else
        terraform apply
    fi

    print_success "Infrastructure applied"
}

# Generate .env files from Terraform outputs
generate_env() {
    print_header "Generating Environment Files"

    cd "$TERRAFORM_DIR"

    # Check if Terraform state exists
    if [ ! -f "terraform.tfstate" ]; then
        print_error "No Terraform state found. Run 'terraform apply' first."
        exit 1
    fi

    # Get outputs
    local project_id=$(terraform output -raw project_id 2>/dev/null)
    local api_key=$(terraform output -raw firebase_api_key 2>/dev/null)
    local auth_domain=$(terraform output -raw firebase_auth_domain 2>/dev/null)
    local storage_bucket=$(terraform output -raw firebase_storage_bucket 2>/dev/null)
    local messaging_sender_id=$(terraform output -raw firebase_messaging_sender_id 2>/dev/null)
    local app_id=$(terraform output -raw firebase_app_id 2>/dev/null)
    local super_admin_email=$(terraform output -raw super_admin_email 2>/dev/null)
    local service_account_email=$(terraform output -raw service_account_email 2>/dev/null)

    # Generate root .env
    print_info "Generating $PROJECT_ROOT/.env"
    cat > "$PROJECT_ROOT/.env" << EOF
# Firebase Admin (Backend)
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json

# Super Admin Email (first user with this email becomes super admin)
SUPER_ADMIN_EMAIL=${super_admin_email}

# Environment
NODE_ENV=development
EOF
    print_success "Created $PROJECT_ROOT/.env"

    # Generate frontend .env
    print_info "Generating $PROJECT_ROOT/packages/frontend/.env"
    cat > "$PROJECT_ROOT/packages/frontend/.env" << EOF
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
    print_success "Created $PROJECT_ROOT/packages/frontend/.env"

    # Update .firebaserc
    print_info "Updating $PROJECT_ROOT/firebase/.firebaserc"
    cat > "$PROJECT_ROOT/firebase/.firebaserc" << EOF
{
  "projects": {
    "default": "${project_id}",
    "staging": "${project_id}-staging",
    "production": "${project_id}-prod"
  }
}
EOF
    print_success "Updated $PROJECT_ROOT/firebase/.firebaserc"

    # Remind user to create service account key
    echo ""
    print_info "Create service account key for local development:"
    echo "  gcloud iam service-accounts keys create ./service-account.json \\"
    echo "    --iam-account=${service_account_email}"
    echo ""
}

# Print next steps
print_next_steps() {
    local project_id=$(cd "$TERRAFORM_DIR" && terraform output -raw project_id 2>/dev/null)

    print_header "Setup Complete!"

    echo -e "${GREEN}Your infrastructure is deployed!${NC}"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo ""
    echo "1. Enable Google Sign-In (if not done via Terraform):"
    echo "   $(terraform -chdir="$TERRAFORM_DIR" output -raw auth_providers_url 2>/dev/null)"
    echo ""
    echo "2. Upgrade to Blaze Plan (required for Cloud Functions):"
    echo "   https://console.firebase.google.com/project/${project_id}/usage/details"
    echo ""
    echo "3. Create service account key (if not done via Terraform):"
    echo "   gcloud iam service-accounts keys create ./service-account.json \\"
    echo "     --iam-account=admin-dashboard-dev@${project_id}.iam.gserviceaccount.com"
    echo ""
    echo "4. Start development:"
    echo "   bun run dev"
    echo ""
    echo "5. Deploy to Firebase:"
    echo "   bun run build && bun run deploy"
    echo ""
}

# Main
main() {
    local command="${1:-setup}"

    case "$command" in
        setup)
            check_prerequisites
            check_tfvars
            init_terraform
            plan_terraform
            echo ""
            read -p "Apply this plan? (y/N) " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                apply_terraform
                generate_env
                print_next_steps
            else
                print_info "Aborted. Run './setup-terraform.sh apply' when ready."
            fi
            ;;
        init)
            check_prerequisites
            check_tfvars
            init_terraform
            ;;
        plan)
            cd "$TERRAFORM_DIR"
            terraform plan
            ;;
        apply)
            apply_terraform
            generate_env
            print_next_steps
            ;;
        destroy)
            print_warning "This will destroy all infrastructure!"
            read -p "Are you sure? (y/N) " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                cd "$TERRAFORM_DIR"
                terraform destroy
            fi
            ;;
        env)
            generate_env
            ;;
        *)
            echo "Usage: $0 {setup|init|plan|apply|destroy|env}"
            echo ""
            echo "Commands:"
            echo "  setup   - Full setup (init, plan, apply, generate env)"
            echo "  init    - Initialize Terraform"
            echo "  plan    - Show planned changes"
            echo "  apply   - Apply changes and generate .env files"
            echo "  destroy - Destroy all infrastructure"
            echo "  env     - Regenerate .env files from Terraform state"
            exit 1
            ;;
    esac
}

main "$@"
