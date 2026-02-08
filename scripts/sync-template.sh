#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# sync-template.sh — Pull upstream template updates into a downstream project
# ============================================================================
# Usage: ./scripts/sync-template.sh [template-repo-url]
#
# This script:
#   1. Adds the template repo as a git remote (if not already added)
#   2. Fetches the latest changes from the template
#   3. Shows a diff of changes in core/ paths only
#   4. Optionally creates a merge branch for review
#
# The operator reviews the diff and merges manually.
# ============================================================================

TEMPLATE_REMOTE="template-upstream"
TEMPLATE_BRANCH="main"
DEFAULT_TEMPLATE_URL="https://github.com/rsaiprasad/template.git"

TEMPLATE_URL="${1:-$DEFAULT_TEMPLATE_URL}"

if [ -z "$TEMPLATE_URL" ]; then
  echo "Usage: $0 <template-repo-url>"
  echo ""
  echo "Example: $0 https://github.com/your-org/admin-dashboard-template.git"
  echo ""
  echo "Tip: Set DEFAULT_TEMPLATE_URL in this script to avoid passing it each time."
  exit 1
fi

# Check if we're in a git repo
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  echo "Error: Not inside a git repository."
  exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
  echo "Error: You have uncommitted changes. Please commit or stash them first."
  exit 1
fi

echo "Template sync"
echo "  Remote: $TEMPLATE_REMOTE"
echo "  URL:    $TEMPLATE_URL"
echo "  Branch: $TEMPLATE_BRANCH"
echo ""

# Add remote if it doesn't exist
if ! git remote get-url "$TEMPLATE_REMOTE" &>/dev/null; then
  echo "Adding template remote..."
  git remote add "$TEMPLATE_REMOTE" "$TEMPLATE_URL"
else
  echo "Template remote already exists, updating URL..."
  git remote set-url "$TEMPLATE_REMOTE" "$TEMPLATE_URL"
fi

# Fetch latest from template
echo "Fetching template updates..."
git fetch "$TEMPLATE_REMOTE" "$TEMPLATE_BRANCH"

# Core paths that the template owns
CORE_PATHS=(
  "packages/shared/src/core/"
  "packages/backend/src/core/"
  "packages/frontend/src/core/"
)

echo ""
echo "============================================"
echo "Changes in core/ paths since last sync:"
echo "============================================"
echo ""

# Show diff for core paths only
HAS_CHANGES=false
for CORE_PATH in "${CORE_PATHS[@]}"; do
  DIFF=$(git diff HEAD..."$TEMPLATE_REMOTE/$TEMPLATE_BRANCH" -- "$CORE_PATH" 2>/dev/null || true)
  if [ -n "$DIFF" ]; then
    HAS_CHANGES=true
    echo "--- $CORE_PATH ---"
    echo "$DIFF" | head -100
    TOTAL_LINES=$(echo "$DIFF" | wc -l)
    if [ "$TOTAL_LINES" -gt 100 ]; then
      echo "  ... ($TOTAL_LINES total lines, showing first 100)"
    fi
    echo ""
  fi
done

if [ "$HAS_CHANGES" = false ]; then
  echo "No changes in core/ paths."
  echo "Your template core is up to date."
  exit 0
fi

echo ""
echo "============================================"
echo "Summary of all changed files:"
echo "============================================"
git diff --stat HEAD..."$TEMPLATE_REMOTE/$TEMPLATE_BRANCH" -- "${CORE_PATHS[@]}" 2>/dev/null || true

echo ""
echo "To merge these changes, run:"
echo "  git checkout -b template-sync-$(date +%Y%m%d)"
echo "  git merge $TEMPLATE_REMOTE/$TEMPLATE_BRANCH --no-commit"
echo ""
echo "Then review the changes, resolve any conflicts, and commit."
