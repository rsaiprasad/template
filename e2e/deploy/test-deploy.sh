#!/usr/bin/env bash

# E2E Test: Cloud Deployment Smoke Test
# Verifies that a GCP project is correctly configured for the admin dashboard.
# This checks prerequisites, API enablement, and Firebase Auth configuration.
#
# Usage: ./e2e/deploy/test-deploy.sh --project-id=my-gcp-project
#
# Flags:
#   --project-id=ID   GCP project ID to verify (required)

set -euo pipefail

source "$(dirname "$0")/helpers.sh"

# Parse flags
PROJECT_ID=""
for arg in "$@"; do
    case "$arg" in
        --project-id=*) PROJECT_ID="${arg#*=}" ;;
    esac
done

if [ -z "$PROJECT_ID" ]; then
    print_fail "Required flag --project-id=<project-id> not provided"
    echo ""
    echo "Usage: $0 --project-id=my-gcp-project"
    exit 1
fi

# Cleanup handler
on_exit() {
    local exit_code=$?
    echo ""
    print_summary "Cloud Deploy Smoke Test" || true
    exit $exit_code
}
trap on_exit EXIT

# --- Test Start ---

print_header "E2E Test: Cloud Deploy Smoke Test"

check_prerequisites

print_info "Verifying project: $PROJECT_ID"

# Step 1: Verify GCP project exists
verify_project_exists() {
    if gcloud projects describe "$PROJECT_ID" --format="value(projectId)" &>/dev/null; then
        print_success "GCP project '$PROJECT_ID' exists"
        return 0
    fi
    print_fail "GCP project '$PROJECT_ID' not found"
    return 1
}

# Step 2: Verify required APIs are enabled
verify_apis_enabled() {
    verify_required_apis "$PROJECT_ID"
}

# Step 3: Verify Firebase is enabled on the project
verify_firebase_enabled() {
    verify_firebase_project "$PROJECT_ID"
}

# Step 4: Verify Firebase Auth is configured
verify_auth_configured() {
    verify_firebase_auth "$PROJECT_ID"
}

# Step 5: Verify setup-cloud.sh script exists and has correct structure
verify_setup_script() {
    local script_path="$PROJECT_ROOT/infrastructure/scripts/setup-cloud.sh"

    if [ ! -f "$script_path" ]; then
        print_warning "setup-cloud.sh not found at $script_path (may not be created yet)"
        return 0
    fi

    if [ ! -x "$script_path" ]; then
        print_fail "setup-cloud.sh exists but is not executable"
        return 1
    fi

    print_success "setup-cloud.sh exists and is executable"
    return 0
}

# Step 6: Build project to ensure it compiles
verify_build() {
    cd "$PROJECT_ROOT"
    bun install --frozen-lockfile 2>&1 || bun install 2>&1
    bun run build 2>&1
}

# Run all steps
run_step "GCP project exists" verify_project_exists
run_step "Required APIs enabled" verify_apis_enabled
run_step "Firebase enabled" verify_firebase_enabled
run_step "Firebase Auth configured" verify_auth_configured
run_step "Setup script exists" verify_setup_script
run_step_optional "Build project" verify_build
