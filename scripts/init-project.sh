#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# init-project.sh — Rename the template for a new project
# ============================================================================
# Usage: ./scripts/init-project.sh <project-name> <npm-scope>
#
# Example: ./scripts/init-project.sh my-saas-app @mycompany
#
# This script renames all occurrences of:
#   - "admin-dashboard-template" → <project-name>
#   - "@admin-dashboard" → <npm-scope>
#
# Run this once after creating a new repo from the template.
# ============================================================================

OLD_PROJECT="admin-dashboard-template"
OLD_SCOPE="@admin-dashboard"

if [ $# -lt 2 ]; then
  echo "Usage: $0 <project-name> <npm-scope>"
  echo ""
  echo "Example: $0 my-saas-app @mycompany"
  echo ""
  echo "  <project-name>  Kebab-case project name (e.g., my-saas-app)"
  echo "  <npm-scope>     npm scope with @ prefix (e.g., @mycompany)"
  exit 1
fi

PROJECT_NAME="$1"
NPM_SCOPE="$2"

# Validate project name (kebab-case)
if ! echo "$PROJECT_NAME" | grep -qE '^[a-z][a-z0-9-]*$'; then
  echo "Error: Project name must be kebab-case (lowercase letters, numbers, hyphens)."
  echo "  Got: $PROJECT_NAME"
  exit 1
fi

# Validate npm scope (must start with @)
if ! echo "$NPM_SCOPE" | grep -qE '^@[a-z][a-z0-9-]*$'; then
  echo "Error: npm scope must start with @ and be lowercase (e.g., @mycompany)."
  echo "  Got: $NPM_SCOPE"
  exit 1
fi

echo "Renaming template..."
echo "  Project: $OLD_PROJECT → $PROJECT_NAME"
echo "  Scope:   $OLD_SCOPE → $NPM_SCOPE"
echo ""

# Find all files to update (exclude node_modules, dist, .git, binary files)
COUNT=0
while IFS= read -r FILE; do
  [ -z "$FILE" ] && continue
  if grep -q "$OLD_SCOPE\|$OLD_PROJECT" "$FILE" 2>/dev/null; then
    # Use portable sed syntax (works on both macOS and Linux)
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s|$OLD_SCOPE|$NPM_SCOPE|g" "$FILE"
      sed -i '' "s|$OLD_PROJECT|$PROJECT_NAME|g" "$FILE"
    else
      sed -i "s|$OLD_SCOPE|$NPM_SCOPE|g" "$FILE"
      sed -i "s|$OLD_PROJECT|$PROJECT_NAME|g" "$FILE"
    fi
    COUNT=$((COUNT + 1))
  fi
done < <(find . \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/*' \
  -not -path '*/dist/*' \
  -not -path '*/scripts/init-project.sh' \
  -type f \
  \( -name '*.ts' -o -name '*.tsx' -o -name '*.json' -o -name '*.md' \
     -o -name '*.js' -o -name '*.mjs' -o -name '*.sh' -o -name '*.yaml' \
     -o -name '*.yml' -o -name '*.toml' -o -name '*.env*' \) \
  2>/dev/null || true)

echo "Updated $COUNT files."
echo ""

# Check for any remaining references
REMAINING=$(grep -r "$OLD_SCOPE\|$OLD_PROJECT" \
  --include='*.ts' --include='*.tsx' --include='*.json' --include='*.md' \
  --include='*.js' --include='*.sh' --include='*.yaml' --include='*.yml' \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git \
  . 2>/dev/null | grep -v 'init-project.sh' || true)

if [ -n "$REMAINING" ]; then
  echo "Warning: Some references may still exist:"
  echo "$REMAINING"
  echo ""
  echo "Review and update these manually if needed."
else
  echo "No remaining references to the old names found."
fi

echo ""
echo "Done! Next steps:"
echo "  1. Run 'bun install' to update lockfile"
echo "  2. Run 'bun run build' to verify everything compiles"
echo "  3. Commit the changes"
