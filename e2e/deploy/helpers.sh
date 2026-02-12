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

require_command() {
    local cmd="$1"
    if ! command -v "$cmd" &>/dev/null; then
        print_fail "Required command '$cmd' not found"
        exit 1
    fi
}

check_prerequisites() {
    print_header "Checking Prerequisites"

    for cmd in gcloud bun jq curl; do
        require_command "$cmd"
    done
    print_success "Required CLI tools found (gcloud, bun, jq, curl)"

    # Check gcloud auth
    if ! gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>/dev/null | grep -q "@"; then
        print_fail "Not authenticated with gcloud. Run: gcloud auth login"
        exit 1
    fi
    print_success "gcloud authenticated"
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
        print_warning "Step ${STEP_COUNT}: ${description} (skipped)"
        TEST_SKIPPED=$((TEST_SKIPPED + 1))
    fi
    return 0
}

# --- Verification Checks ---

# Verify that a GCP project has the required APIs enabled
verify_required_apis() {
    local project_id="$1"
    local failures=0

    local required_apis=(
        "identitytoolkit.googleapis.com"
        "firebase.googleapis.com"
    )

    local enabled_apis
    enabled_apis=$(gcloud services list --project="$project_id" --enabled --format="value(config.name)" 2>/dev/null || echo "")

    for api in "${required_apis[@]}"; do
        if echo "$enabled_apis" | grep -q "$api"; then
            print_success "API enabled: $api"
        else
            print_fail "API not enabled: $api"
            ((failures++)) || true
        fi
    done

    if [ "$failures" -eq 0 ]; then
        return 0
    fi
    return 1
}

# Verify that Firebase is enabled on the project
verify_firebase_project() {
    local project_id="$1"

    local enabled_apis
    enabled_apis=$(gcloud services list --project="$project_id" --enabled --format="value(config.name)" 2>/dev/null || echo "")

    if echo "$enabled_apis" | grep -q "firebase.googleapis.com"; then
        print_success "Firebase is enabled on project '$project_id'"
        return 0
    fi

    print_fail "Firebase does not appear to be enabled on project '$project_id'"
    return 1
}

# Verify that Firebase Auth (Identity Toolkit) is configured
verify_firebase_auth() {
    local project_id="$1"

    local enabled_apis
    enabled_apis=$(gcloud services list --project="$project_id" --enabled --format="value(config.name)" 2>/dev/null || echo "")

    if echo "$enabled_apis" | grep -q "identitytoolkit.googleapis.com"; then
        print_success "Firebase Auth (Identity Toolkit) is enabled on project '$project_id'"
        return 0
    fi

    print_fail "Firebase Auth (Identity Toolkit) is not enabled on project '$project_id'"
    return 1
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
