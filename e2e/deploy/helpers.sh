#!/usr/bin/env bash

# Shared helpers for E2E deployment tests
# Source this file from test scripts: source "$(dirname "$0")/helpers.sh"

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Paths
HELPERS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$HELPERS_DIR/../.." && pwd)"

# Test state
TEST_PASSED=0
TEST_FAILED=0
TEST_SKIPPED=0
STEP_COUNT=0

# --- Output Helpers ---

print_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[PASS]${NC} $1"; }
print_fail()    { echo -e "${RED}[FAIL]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# --- Prerequisite Checks ---

require_env() {
    local var_name="$1"
    if [ -z "${!var_name:-}" ]; then
        print_fail "Required environment variable $var_name is not set"
        exit 1
    fi
}

require_command() {
    local cmd="$1"
    if ! command -v "$cmd" &>/dev/null; then
        print_fail "Required command '$cmd' not found"
        exit 1
    fi
}

check_prerequisites() {
    print_header "Checking Prerequisites"

    require_env "BILLING_ACCOUNT"
    require_env "TEST_ADMIN_EMAIL"
    print_success "Environment variables set"

    for cmd in gcloud firebase bun jq curl; do
        require_command "$cmd"
    done
    print_success "Required CLI tools found"

    # Check gcloud auth
    if ! gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>/dev/null | grep -q "@"; then
        print_fail "Not authenticated with gcloud. Run: gcloud auth login"
        exit 1
    fi
    print_success "gcloud authenticated"

    # Check firebase auth
    if ! firebase projects:list --json 2>/dev/null | jq -e '.result | length > 0' >/dev/null 2>&1; then
        print_fail "Not authenticated with Firebase CLI. Run: firebase login"
        exit 1
    fi
    print_success "Firebase CLI authenticated"
}

# --- Project ID Generation ---

generate_project_id() {
    # Generate a unique project ID: e2etest-<random>-<timestamp>
    # GCP project IDs: 6-30 chars, lowercase letters/digits/hyphens, start with letter
    local random_suffix
    random_suffix=$(head -c 4 /dev/urandom | od -An -tx1 | tr -d ' \n' | head -c 6)
    local ts
    ts=$(date +%s | tail -c 6)
    echo "e2etest-${random_suffix}-${ts}"
}

# --- Step Runner ---

# Run a named step and track pass/fail
# Usage: run_step "Step description" command arg1 arg2 ...
run_step() {
    local description="$1"
    shift
    STEP_COUNT=$((STEP_COUNT + 1))

    echo ""
    print_info "Step ${STEP_COUNT}: ${description}"

    if "$@" 2>&1; then
        print_success "Step ${STEP_COUNT}: ${description}"
        TEST_PASSED=$((TEST_PASSED + 1))
        return 0
    else
        print_fail "Step ${STEP_COUNT}: ${description}"
        TEST_FAILED=$((TEST_FAILED + 1))
        return 1
    fi
}

# Run a step but don't fail the whole test if it fails
run_step_optional() {
    local description="$1"
    shift
    STEP_COUNT=$((STEP_COUNT + 1))

    echo ""
    print_info "Step ${STEP_COUNT}: ${description} (optional)"

    if "$@" 2>&1; then
        print_success "Step ${STEP_COUNT}: ${description}"
        TEST_PASSED=$((TEST_PASSED + 1))
    else
        print_warning "Step ${STEP_COUNT}: ${description} (skipped — may require Blaze plan)"
        TEST_SKIPPED=$((TEST_SKIPPED + 1))
    fi
    return 0
}

# --- Verification Checks ---

verify_hosting() {
    local project_id="$1"
    local url="https://${project_id}.web.app"

    print_info "Checking hosting: $url"

    local retries=5
    local wait=15
    for ((i = 1; i <= retries; i++)); do
        local status
        status=$(curl -s -o /dev/null -w '%{http_code}' "$url" 2>/dev/null || echo "000")
        if [ "$status" = "200" ]; then
            print_success "Hosting returns 200"
            return 0
        fi
        if [ "$i" -lt "$retries" ]; then
            print_info "Got HTTP $status, retrying in ${wait}s ($i/$retries)..."
            sleep "$wait"
        fi
    done

    print_fail "Hosting returned HTTP $status after $retries attempts"
    return 1
}

verify_health_endpoint() {
    local project_id="$1"
    local url="https://${project_id}.web.app/api/v1/health"

    print_info "Checking health endpoint: $url"

    local retries=5
    local wait=15
    for ((i = 1; i <= retries; i++)); do
        local body
        body=$(curl -s "$url" 2>/dev/null || echo "")
        if echo "$body" | jq -e '.success == true' >/dev/null 2>&1; then
            print_success "Health endpoint returns {\"success\":true}"
            return 0
        fi
        if [ "$i" -lt "$retries" ]; then
            print_info "Health check not ready, retrying in ${wait}s ($i/$retries)..."
            sleep "$wait"
        fi
    done

    print_fail "Health endpoint did not return success after $retries attempts"
    print_info "Last response: $body"
    return 1
}

verify_firestore_exists() {
    local project_id="$1"
    if gcloud firestore databases describe --project="$project_id" 2>/dev/null | grep -q "name:"; then
        print_success "Firestore database exists"
        return 0
    fi
    print_fail "Firestore database not found"
    return 1
}

verify_function_exists() {
    local project_id="$1"
    if gcloud functions list --project="$project_id" --format="value(name)" 2>/dev/null | grep -q "api"; then
        print_success "Cloud Function 'api' exists"
        return 0
    fi
    print_fail "Cloud Function 'api' not found"
    return 1
}

verify_hosting_site_exists() {
    local project_id="$1"
    if firebase hosting:sites:list --project="$project_id" --json 2>/dev/null | jq -e '.result.sites | length > 0' >/dev/null 2>&1; then
        print_success "Hosting site exists"
        return 0
    fi
    print_fail "No hosting site found"
    return 1
}

verify_env_files() {
    local ok=true
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        print_fail "Missing .env"
        ok=false
    fi
    if [ ! -f "$PROJECT_ROOT/packages/frontend/.env" ]; then
        print_fail "Missing packages/frontend/.env"
        ok=false
    fi
    if [ ! -f "$PROJECT_ROOT/.firebaserc" ]; then
        print_fail "Missing .firebaserc"
        ok=false
    fi
    if [ "$ok" = true ]; then
        print_success "All env files generated"
        return 0
    fi
    return 1
}

# Run all deployment verification checks
verify_deployment() {
    local project_id="$1"
    local skip_functions="${2:-false}"

    print_header "Verifying Deployment: $project_id"

    local failures=0

    verify_hosting_site_exists "$project_id" || ((failures++)) || true
    verify_firestore_exists "$project_id" || ((failures++)) || true

    if [ "$skip_functions" = "false" ]; then
        verify_function_exists "$project_id" || ((failures++)) || true
        verify_health_endpoint "$project_id" || ((failures++)) || true
    else
        print_warning "Skipping function/health checks (--skip-functions)"
    fi

    verify_hosting "$project_id" || ((failures++)) || true

    if [ "$failures" -eq 0 ]; then
        print_success "All verification checks passed"
        return 0
    else
        print_fail "$failures verification check(s) failed"
        return 1
    fi
}

# --- Cleanup ---

cleanup_project() {
    local project_id="$1"

    print_header "Cleaning Up: $project_id"

    print_info "Deleting GCP project: $project_id"
    if gcloud projects delete "$project_id" --quiet 2>/dev/null; then
        print_success "Project $project_id deleted"
    else
        print_warning "Could not delete project $project_id (may already be deleted or lack permissions)"
    fi
}

# Restore git-tracked files that tests may have modified (.env, .firebaserc)
cleanup_local_files() {
    print_info "Restoring local files modified by test"
    git -C "$PROJECT_ROOT" checkout -- .firebaserc 2>/dev/null || true
    git -C "$PROJECT_ROOT" checkout -- .env 2>/dev/null || true
    git -C "$PROJECT_ROOT" checkout -- packages/frontend/.env 2>/dev/null || true
    rm -f "$PROJECT_ROOT/service-account.json" 2>/dev/null || true
    # Restore backend package.json if predeploy hook backup exists (deploy failed mid-way)
    if [ -f "$PROJECT_ROOT/packages/backend/package.json.bak" ]; then
        mv "$PROJECT_ROOT/packages/backend/package.json.bak" "$PROJECT_ROOT/packages/backend/package.json"
    fi
}

# --- Summary ---

print_summary() {
    local test_name="$1"

    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE} Test Summary: ${test_name}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  Passed:  ${GREEN}${TEST_PASSED}${NC}"
    echo -e "  Failed:  ${RED}${TEST_FAILED}${NC}"
    echo -e "  Skipped: ${YELLOW}${TEST_SKIPPED}${NC}"
    echo ""

    if [ "$TEST_FAILED" -eq 0 ]; then
        echo -e "  ${GREEN}RESULT: PASS${NC}"
        return 0
    else
        echo -e "  ${RED}RESULT: FAIL${NC}"
        return 1
    fi
}
