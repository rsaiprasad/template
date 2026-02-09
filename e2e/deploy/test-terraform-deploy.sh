#!/usr/bin/env bash

# E2E Test: Terraform Deployment
# Tests full Terraform apply/destroy cycle against a real GCP project.
#
# Usage: BILLING_ACCOUNT=XXX TEST_ADMIN_EMAIL=you@example.com ./e2e/deploy/test-terraform-deploy.sh
#
# Flags:
#   --skip-functions  Skip Cloud Function deployment verification
#   --keep-project    Don't delete the GCP project after the test

set -euo pipefail

source "$(dirname "$0")/helpers.sh"

# Parse flags
SKIP_FUNCTIONS=false
KEEP_PROJECT=false
for arg in "$@"; do
    case "$arg" in
        --skip-functions) SKIP_FUNCTIONS=true ;;
        --keep-project)   KEEP_PROJECT=true ;;
    esac
done

TERRAFORM_DIR="$PROJECT_ROOT/infrastructure/terraform"
PROJECT_ID=""
STATE_BACKUP_DIR=""

# Cleanup handler
on_exit() {
    local exit_code=$?
    echo ""

    # Clean up test terraform state
    rm -f "$TERRAFORM_DIR/terraform.tfstate" "$TERRAFORM_DIR/terraform.tfstate.backup" 2>/dev/null || true
    rm -f "$TERRAFORM_DIR/tfplan" 2>/dev/null || true
    rm -f "$TERRAFORM_DIR/terraform.tfvars.e2e" 2>/dev/null || true

    # Restore original state files if they existed
    if [ -n "$STATE_BACKUP_DIR" ] && [ -d "$STATE_BACKUP_DIR" ]; then
        for f in "$STATE_BACKUP_DIR"/*; do
            [ -f "$f" ] && /bin/cp "$f" "$TERRAFORM_DIR/"
        done
        rm -rf "$STATE_BACKUP_DIR"
        print_info "Restored original Terraform state"
    fi

    # Delete the project
    if [ -n "$PROJECT_ID" ] && [ "$KEEP_PROJECT" = "false" ]; then
        cleanup_project "$PROJECT_ID"
    elif [ -n "$PROJECT_ID" ]; then
        print_warning "Keeping project $PROJECT_ID (--keep-project)"
    fi

    cleanup_local_files

    print_summary "Terraform Deploy" || true
    exit $exit_code
}
trap on_exit EXIT

# --- Test Start ---

print_header "E2E Test: Terraform Deploy"

check_prerequisites
require_command "terraform"

PROJECT_ID=$(generate_project_id)
print_info "Generated project ID: $PROJECT_ID"

# Step 1: Create terraform.tfvars with test values (and back up existing state)
create_tfvars() {
    # Back up existing state files so the test starts clean
    if [ -f "$TERRAFORM_DIR/terraform.tfstate" ] || [ -f "$TERRAFORM_DIR/terraform.tfvars" ]; then
        STATE_BACKUP_DIR=$(mktemp -d)
        for f in terraform.tfstate terraform.tfstate.backup terraform.tfvars; do
            [ -f "$TERRAFORM_DIR/$f" ] && /bin/cp "$TERRAFORM_DIR/$f" "$STATE_BACKUP_DIR/"
        done
        rm -f "$TERRAFORM_DIR/terraform.tfstate" "$TERRAFORM_DIR/terraform.tfstate.backup"
        print_info "Backed up existing Terraform state to $STATE_BACKUP_DIR"
    fi

    cat > "$TERRAFORM_DIR/terraform.tfvars" << EOF
project_id        = "$PROJECT_ID"
super_admin_email = "$TEST_ADMIN_EMAIL"
project_name      = "E2E Test Dashboard"
region            = "us-central1"
create_project    = true
billing_account   = "$BILLING_ACCOUNT"

enable_google_signin = false

monitoring = {
  enabled = false
}
EOF
    # Mark that we created it for test purposes
    touch "$TERRAFORM_DIR/terraform.tfvars.e2e"
    print_success "Created terraform.tfvars for project $PROJECT_ID"
}

# Step 2: Terraform init
tf_init() {
    cd "$TERRAFORM_DIR"
    terraform init -input=false 2>&1
}

# Step 3: Terraform apply
tf_apply() {
    cd "$TERRAFORM_DIR"
    terraform apply -auto-approve -input=false 2>&1
}

# Step 4: Generate .env files from Terraform outputs
generate_env_from_tf() {
    cd "$TERRAFORM_DIR"

    local project_id
    project_id=$(terraform output -raw project_id)
    local api_key
    api_key=$(terraform output -raw firebase_api_key)
    local auth_domain
    auth_domain=$(terraform output -raw firebase_auth_domain)
    local storage_bucket
    storage_bucket=$(terraform output -raw firebase_storage_bucket)
    local messaging_sender_id
    messaging_sender_id=$(terraform output -raw firebase_messaging_sender_id)
    local app_id
    app_id=$(terraform output -raw firebase_app_id)
    local super_admin_email
    super_admin_email=$(terraform output -raw super_admin_email)

    cat > "$PROJECT_ROOT/.env" << EOF
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
SUPER_ADMIN_EMAIL=${super_admin_email}
NODE_ENV=development
EOF

    cat > "$PROJECT_ROOT/packages/frontend/.env" << EOF
PUBLIC_API_BASE_URL=/api/v1
PUBLIC_FIREBASE_API_KEY=${api_key}
PUBLIC_FIREBASE_AUTH_DOMAIN=${auth_domain}
PUBLIC_FIREBASE_PROJECT_ID=${project_id}
PUBLIC_FIREBASE_STORAGE_BUCKET=${storage_bucket}
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${messaging_sender_id}
PUBLIC_FIREBASE_APP_ID=${app_id}
EOF

    cat > "$PROJECT_ROOT/.firebaserc" << EOF
{
  "projects": {
    "default": "${project_id}"
  }
}
EOF

    print_success "Generated .env files from Terraform outputs"
}

# Step 5: Verify env files
check_env_files() {
    verify_env_files
}

# Step 6: Link billing (Terraform creates the project, but Blaze plan
# upgrade is manual. Billing should already be linked by Terraform's
# billing_account variable, but verify.)
verify_billing() {
    local linked
    linked=$(gcloud billing projects describe "$PROJECT_ID" --format="value(billingEnabled)" 2>/dev/null || echo "false")
    if [ "$linked" = "True" ]; then
        print_success "Billing is linked"
        return 0
    fi
    print_warning "Billing not linked, attempting to link..."
    gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING_ACCOUNT" --quiet 2>&1
}

# Step 7: Build
build_project() {
    cd "$PROJECT_ROOT"
    bun install --frozen-lockfile 2>&1 || bun install 2>&1
    bun run build 2>&1
}

# Step 8: Deploy
deploy_project() {
    cd "$PROJECT_ROOT"
    if [ "$SKIP_FUNCTIONS" = "true" ]; then
        firebase deploy --only hosting,firestore --project="$PROJECT_ID" --force 2>&1
    else
        firebase deploy --project="$PROJECT_ID" --force 2>&1
    fi
}

# Step 9: Wait
wait_for_propagation() {
    print_info "Waiting 30s for deployment propagation..."
    sleep 30
}

# Step 10: Verify
run_verification() {
    verify_deployment "$PROJECT_ID" "$SKIP_FUNCTIONS"
}

# Step 11: Terraform destroy
tf_destroy() {
    cd "$TERRAFORM_DIR"
    terraform destroy -auto-approve -input=false 2>&1
}

# Run all steps
run_step "Create terraform.tfvars" create_tfvars
run_step "Terraform init" tf_init
run_step "Terraform apply" tf_apply
run_step "Generate .env files from Terraform outputs" generate_env_from_tf
run_step "Verify env files" check_env_files
run_step "Verify billing linked" verify_billing
run_step "Build project (bun install + bun run build)" build_project
run_step "Deploy to Firebase" deploy_project
run_step "Wait for propagation" wait_for_propagation
run_step "Verify deployment" run_verification
run_step "Terraform destroy" tf_destroy
