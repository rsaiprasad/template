# E2E Deployment Tests

End-to-end tests that verify the template's Terraform deployment works against a real Firebase/GCP project.

The test creates a new GCP project, provisions infrastructure via Terraform, builds, deploys, verifies the deployment, and tears everything down.

## Prerequisites

- **GCP billing account** — needed to create projects and enable Blaze plan
- **Authenticated CLIs:**
  ```bash
  gcloud auth login
  gcloud auth application-default login
  firebase login
  ```
- **Installed tools:** `gcloud`, `firebase`, `bun`, `jq`, `curl`, `terraform`

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

# Run the Terraform deployment test
./e2e/deploy/test-terraform-deploy.sh
```

### Flags

- `--skip-functions` — Skip Cloud Function deployment and health checks (useful without Blaze plan)
- `--keep-project` — Don't delete the GCP project after the test (for debugging)

## What Gets Tested

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
