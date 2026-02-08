# E2E Deployment Tests

End-to-end tests that verify the template's deployment methods work against a real Firebase/GCP project.

Each test creates a new GCP project, provisions infrastructure, builds, deploys, verifies the deployment, and tears everything down.

## Prerequisites

- **GCP billing account** — needed to create projects and enable Blaze plan
- **Authenticated CLIs:**
  ```bash
  gcloud auth login
  gcloud auth application-default login
  firebase login
  ```
- **Installed tools:** `gcloud`, `firebase`, `bun`, `jq`, `curl`
- **Terraform** (for the Terraform test only)

## Environment Variables

| Variable | Description |
|---|---|
| `BILLING_ACCOUNT` | GCP billing account ID (`XXXXXX-XXXXXX-XXXXXX`) |
| `TEST_ADMIN_EMAIL` | Email for the super admin user |

## Cost

Each test creates a real GCP project and deletes it after. The brief usage is well within the free tier — these tests cost nothing to run.

The Blaze plan upgrade is required for Cloud Functions but must be done manually in the Firebase Console. If not on Blaze, tests will still verify hosting and Firestore but skip function deployment checks using `--skip-functions`.

## Running Tests

```bash
# Set required env vars
export BILLING_ACCOUNT="XXXXXX-XXXXXX-XXXXXX"
export TEST_ADMIN_EMAIL="you@example.com"

# Test the setup script (Option A)
./e2e/deploy/test-script-deploy.sh

# Test Terraform (Option B)
./e2e/deploy/test-terraform-deploy.sh

# Run both
./e2e/deploy/test-script-deploy.sh && ./e2e/deploy/test-terraform-deploy.sh
```

### Flags

- `--skip-functions` — Skip Cloud Function deployment and health checks (useful without Blaze plan)
- `--keep-project` — Don't delete the GCP project after the test (for debugging)

## What Gets Tested

### test-script-deploy.sh (Option A)
1. `scripts/setup-firebase.sh` runs without errors
2. `.env`, `packages/frontend/.env`, `.firebaserc` are generated
3. `bun install && bun run build` succeeds
4. `firebase deploy` succeeds
5. Hosting returns 200
6. Health endpoint returns `{"success": true}`
7. Firestore database exists
8. Cloud Function exists
9. Cleanup deletes the project

### test-terraform-deploy.sh (Option B)
1. `terraform init` succeeds
2. `terraform apply -auto-approve` succeeds
3. `.env` files generated from Terraform outputs
4. `bun install && bun run build` succeeds
5. `firebase deploy` succeeds
6. Hosting returns 200
7. Health endpoint returns `{"success": true}`
8. Firestore database exists
9. Cloud Function exists
10. `terraform destroy -auto-approve` succeeds
11. Cleanup deletes the project
