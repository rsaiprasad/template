#!/usr/bin/env bash
# Strips devDependencies from packages/backend/package.json before Cloud Functions deploy.
# Cloud Functions runs npm install on the server, and npm can't handle bun's workspace:* protocol.
# Since esbuild bundles all non-external code at build time, devDependencies aren't needed.
set -e
PKG="packages/backend/package.json"
/bin/cp "$PKG" "${PKG}.bak"
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('$PKG', 'utf-8'));
delete pkg.devDependencies;
fs.writeFileSync('$PKG', JSON.stringify(pkg, null, 2) + '\n');
"
