#!/usr/bin/env bash
# Restores packages/backend/package.json after Cloud Functions deploy.
set -e
PKG="packages/backend/package.json"
if [ -f "${PKG}.bak" ]; then
  mv "${PKG}.bak" "$PKG"
fi
