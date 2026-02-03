# Infrastructure as Code (Terraform)

This directory contains Terraform configurations for provisioning Firebase and GCP infrastructure.

## Prerequisites

1. **Terraform CLI** (free, open-source)
   ```bash
   # macOS
   brew install terraform

   # Linux
   # Download from https://developer.hashicorp.com/terraform/downloads
   ```

2. **Google Cloud SDK**
   ```bash
   # macOS
   brew install google-cloud-sdk

   # Linux/Windows
   # https://cloud.google.com/sdk/docs/install
   ```

3. **Authenticate with GCP**
   ```bash
   gcloud auth login
   gcloud auth application-default login
   ```

## Quick Start

### Option 1: Using the Setup Script (Recommended)

```bash
# Run the interactive setup
bun run setup:terraform

# Or run directly
./infrastructure/scripts/setup-terraform.sh
```

### Option 2: Manual Terraform Commands

```bash
cd infrastructure/terraform

# 1. Copy and configure variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# 2. Initialize Terraform
terraform init

# 3. Preview changes
terraform plan

# 4. Apply changes
terraform apply

# 5. Generate .env files
../scripts/setup-terraform.sh env
```

## Configuration

Edit `terraform.tfvars` with your values:

```hcl
# Required
project_id        = "my-unique-project-id"
super_admin_email = "admin@company.com"

# Optional
project_name = "Admin Dashboard"
region       = "us-central1"
```

### Enabling Google Sign-In

To enable Google Sign-In via Terraform:

1. Go to [GCP Console > APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Create an OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `https://YOUR_PROJECT.firebaseapp.com/__/auth/handler`
4. Copy Client ID and Secret to `terraform.tfvars`:

```hcl
enable_google_signin = true
oauth_client_id      = "YOUR_CLIENT_ID.apps.googleusercontent.com"
oauth_client_secret  = "YOUR_CLIENT_SECRET"
```

## Available Commands

| Command | Description |
|---------|-------------|
| `bun run setup:terraform` | Interactive setup (init, plan, apply) |
| `bun run infra:plan` | Preview infrastructure changes |
| `bun run infra:apply` | Apply changes and generate .env files |
| `bun run infra:destroy` | Destroy all infrastructure |

## What Gets Created

| Resource | Description |
|----------|-------------|
| Firebase Project | Enables Firebase on the GCP project |
| Required APIs | Firestore, Cloud Functions, Identity Platform, etc. |
| Firestore Database | Native mode database in specified region |
| Firestore Rules | Security rules from `firebase/firestore.rules` |
| Firebase Web App | Web application with SDK configuration |
| Identity Platform | Authentication configuration |
| Service Account | Development service account with necessary roles |

## State Management

Terraform state is stored locally in `terraform.tfstate`. This file:

- Contains sensitive data (API keys, secrets)
- Is gitignored (do not commit)
- Should be backed up securely
- Can optionally be stored in a GCS bucket for team collaboration

### Using Remote State (Optional)

For team collaboration, configure GCS backend:

```hcl
# backend.tf
terraform {
  backend "gcs" {
    bucket = "your-terraform-state-bucket"
    prefix = "admin-dashboard"
  }
}
```

## Manual Steps Required

Some steps cannot be automated via Terraform:

1. **Upgrade to Blaze Plan** - Required for Cloud Functions
   - Go to Firebase Console > Usage & Billing

2. **Create Service Account Key** (if not using Terraform)
   ```bash
   gcloud iam service-accounts keys create ./service-account.json \
     --iam-account=admin-dashboard-dev@YOUR_PROJECT.iam.gserviceaccount.com
   ```

## Importing Existing Resources

If you have existing resources, import them:

```bash
cd infrastructure/terraform

# Import Firebase project
terraform import google_firebase_project.default YOUR_PROJECT_ID

# Import Firestore database
terraform import google_firestore_database.default "projects/YOUR_PROJECT_ID/databases/(default)"

# Import web app
terraform import google_firebase_web_app.default "projects/YOUR_PROJECT_ID/webApps/APP_ID"
```

## Destroying Infrastructure

```bash
bun run infra:destroy
# or
cd infrastructure/terraform && terraform destroy
```

**Warning**: This will delete all resources. Firestore data will be lost.

## Troubleshooting

### "Error creating Project: googleapi: Error 403: Request had insufficient authentication scopes"

Run:
```bash
gcloud auth application-default login
```

### "Error: Provider produced inconsistent result after apply"

This can happen with Firebase resources. Try:
```bash
terraform refresh
terraform apply
```

### "The billing account is not valid"

Either:
- The billing account ID is incorrect
- Your account doesn't have permission to use the billing account
- The billing account is closed

Check your billing accounts:
```bash
gcloud billing accounts list
```
