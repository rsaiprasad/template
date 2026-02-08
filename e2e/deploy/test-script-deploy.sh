#!/usr/bin/env bash

# E2E Test: Setup Script Deployment (Option A)
# Tests scripts/setup-firebase.sh end-to-end against a real GCP project.
#
# Usage: BILLING_ACCOUNT=XXX TEST_ADMIN_EMAIL=you@example.com ./e2e/deploy/test-script-deploy.sh
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

PROJECT_ID=""

# Cleanup handler — always runs on exit
on_exit() {
    local exit_code=$?
    echo ""
    if [ -n "$PROJECT_ID" ] && [ "$KEEP_PROJECT" = "false" ]; then
        cleanup_project "$PROJECT_ID"
    elif [ -n "$PROJECT_ID" ]; then
        print_warning "Keeping project $PROJECT_ID (--keep-project)"
    fi
    cleanup_local_files
    print_summary "Setup Script Deploy (Option A)" || true
    exit $exit_code
}
trap on_exit EXIT

# --- Test Start ---

print_header "E2E Test: Setup Script Deploy (Option A)"

check_prerequisites

PROJECT_ID=$(generate_project_id)
print_info "Generated project ID: $PROJECT_ID"

# Step 1: Create GCP project and link billing first.
# setup-firebase.sh will detect the existing project and add Firebase to it.
# Billing must be linked before API enablement (some APIs require it).
create_project_with_billing() {
    gcloud projects create "$PROJECT_ID" --name="E2E Test" --quiet 2>&1
    gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING_ACCOUNT" --quiet 2>&1
}

# Step 2: Run the setup script (detects existing project, adds Firebase, enables APIs, etc.)
run_setup_script() {
    "$PROJECT_ROOT/scripts/setup-firebase.sh" "$PROJECT_ID" "$TEST_ADMIN_EMAIL" us-central1
}

# Step 3: Verify env files were generated
check_env_files() {
    verify_env_files
}

# Step 4: Build
build_project() {
    cd "$PROJECT_ROOT"
    bun install --frozen-lockfile 2>&1 || bun install 2>&1
    bun run build 2>&1
}

# Step 5: Deploy
deploy_project() {
    cd "$PROJECT_ROOT"
    if [ "$SKIP_FUNCTIONS" = "true" ]; then
        firebase deploy --only hosting,firestore --project="$PROJECT_ID" --force 2>&1
    else
        firebase deploy --project="$PROJECT_ID" --force 2>&1
    fi
}

# Step 6: Wait for propagation
wait_for_propagation() {
    print_info "Waiting 30s for deployment propagation..."
    sleep 30
}

# Step 7: Verify
run_verification() {
    verify_deployment "$PROJECT_ID" "$SKIP_FUNCTIONS"
}

# Run all steps
run_step "Create GCP project and link billing" create_project_with_billing
run_step "Run setup-firebase.sh" run_setup_script
run_step "Verify env files generated" check_env_files
run_step "Build project (bun install + bun run build)" build_project
run_step "Deploy to Firebase" deploy_project
run_step "Wait for propagation" wait_for_propagation
run_step "Verify deployment" run_verification
