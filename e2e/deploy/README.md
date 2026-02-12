# E2E Deployment Smoke Tests

Smoke tests that verify a GCP project is correctly configured for the admin dashboard.

**Architecture**: Standalone Bun server + PostgreSQL + Cloudflare Pages/Tunnel. Firebase Auth is used for authentication (Google OAuth).

The test takes an existing GCP project ID and verifies that the required APIs and services are enabled. It does **not** create or destroy GCP projects -- it only reads configuration.

## Prerequisites

- **Authenticated gcloud CLI:**
  ```bash
  gcloud auth login
  ```
- **Installed tools:** `gcloud`, `bun`, `jq`, `curl`

## Running Tests

```bash
# Verify a GCP project is configured correctly
./e2e/deploy/test-deploy.sh --project-id=my-gcp-project
```

## What Gets Tested

1. GCP project exists and is accessible
2. Required APIs are enabled:
   - `identitytoolkit.googleapis.com` (Firebase Auth)
   - `firebase.googleapis.com` (Firebase)
3. Firebase is enabled on the project
4. Firebase Auth is configured
5. `setup-cloud.sh` script exists and is executable (if present)
6. Project builds successfully (`bun install && bun run build`) -- optional step

## Files

| File | Purpose |
|---|---|
| `test-deploy.sh` | Main test script -- runs all verification steps |
| `helpers.sh` | Shared helper functions (output formatting, step runner, verification checks) |
| `README.md` | This file |
