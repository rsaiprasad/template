# Deployment Guide

This guide covers deploying the Admin Dashboard to production on Google Cloud Platform using Firebase.

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                  Firebase Hosting                     │
│              (Static React SPA + CDN)                │
│                                                      │
│  yourproject.web.app ──→ /api/** ──→ Cloud Functions │
│                     └──→ /**     ──→ index.html      │
├──────────────────────────────────────────────────────┤
│  Cloud Functions (Hono API)     │  Firebase Auth     │
│  - /api/v1/users                │  - Google OAuth    │
│  - /api/v1/groups               │                    │
│  - /api/v1/audit                │                    │
│  - /api/v1/settings             │                    │
├──────────────────────────────────────────────────────┤
│                    Firestore                          │
│  Collections: users, groups, auditLogs, settings     │
└──────────────────────────────────────────────────────┘
```

## Prerequisites

- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (`gcloud`)
- [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)
- [Bun](https://bun.sh) runtime
- A Google Cloud billing account (Blaze plan required for Cloud Functions)

## Option A: Quick Setup (Script)

The fastest way to get to production. This script handles everything: project creation, API enablement, Firestore setup, web app creation, service account, and `.env` generation.

```bash
# Login to Firebase and GCP
firebase login
gcloud auth login

# Run the setup script
./scripts/setup-firebase.sh <project-id> <super-admin-email> [region]

# Example:
./scripts/setup-firebase.sh my-admin-dash admin@company.com us-central1
```

The script will:
1. Create or link the Firebase/GCP project
2. Enable required APIs (Firestore, Cloud Functions, Identity Platform, etc.)
3. Create a Firestore database
4. Create a Firebase Web App and retrieve SDK config
5. Create a dev service account with key
6. Generate `.env` files (root + frontend)
7. Update `.firebaserc`
8. Deploy Firestore rules and indexes

After the script completes, follow the **Manual Steps** below, then jump to **Build & Deploy**.

## Option B: Terraform (Infrastructure as Code)

For teams that want reproducible, version-controlled infrastructure.

```bash
cd infrastructure/terraform

# 1. Copy and edit variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your project_id, super_admin_email, etc.

# 2. Run the interactive setup
./infrastructure/scripts/setup-terraform.sh
```

Or run manually:
```bash
cd infrastructure/terraform
terraform init
terraform plan
terraform apply

# Generate .env files from Terraform outputs
../scripts/setup-terraform.sh env
```

See `infrastructure/README.md` for full Terraform documentation, including OAuth setup, monitoring configuration, and remote state.

## Option C: Manual Setup

### 1. Create a Firebase Project

```bash
# Create a new project (or use an existing GCP project)
firebase projects:create your-project-id

# Add Firebase to an existing GCP project
firebase projects:addfirebase your-project-id
```

### 2. Enable Required APIs

```bash
gcloud services enable \
  firestore.googleapis.com \
  identitytoolkit.googleapis.com \
  cloudfunctions.googleapis.com \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  --project=your-project-id
```

### 3. Create Firestore Database

```bash
gcloud firestore databases create \
  --location=us-central1 \
  --project=your-project-id
```

### 4. Enable Google Sign-In

Go to [Firebase Console](https://console.firebase.google.com) → your project → Authentication → Sign-in method → Enable **Google**.

### 5. Upgrade to Blaze Plan

Firebase Console → Usage & Billing → Modify plan → Blaze (pay-as-you-go).

Cloud Functions requires the Blaze plan. The free tier is generous (125K invocations/month, 1GB Firestore).

### 6. Get Firebase Config

```bash
# Create a web app if you don't have one
firebase apps:create WEB "Admin Dashboard" --project=your-project-id

# Get the config
firebase apps:sdkconfig WEB --project=your-project-id
```

### 7. Configure Environment

Update `.firebaserc`:
```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

Create `packages/frontend/.env.production` (or update `.env`):
```bash
PUBLIC_API_BASE_URL=/api/v1
PUBLIC_FIREBASE_API_KEY=<from Firebase console>
PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
PUBLIC_FIREBASE_PROJECT_ID=your-project-id
PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<from Firebase console>
PUBLIC_FIREBASE_APP_ID=<from Firebase console>
```

### 8. Set Backend Environment

For Cloud Functions, set environment variables:

```bash
# Using Firebase Functions config (v1)
firebase functions:config:set \
  app.super_admin_email="admin@company.com" \
  cors.origins="https://your-project-id.web.app"

# Or set via GCP Secret Manager / .env.your-project-id (Functions v2)
```

The `SUPER_ADMIN_EMAIL` determines who gets full admin access on first login. The `CORS_ORIGINS` should match your production domain.

---

## Manual Steps (All Options)

Regardless of which setup option you chose, verify these are done:

1. **Google Sign-In is enabled** in Firebase Console → Authentication → Sign-in method
2. **Blaze plan is active** in Firebase Console → Usage & Billing
3. **Authorized domains** include your production domain in Firebase Console → Authentication → Settings → Authorized domains

---

## Build & Deploy

```bash
# Install dependencies
bun install

# Build all packages (backend + frontend)
bun run build

# Deploy everything
firebase deploy --project=your-project-id
```

This deploys:
- **Hosting**: Frontend SPA to `https://your-project-id.web.app`
- **Functions**: Backend API as Cloud Function
- **Firestore**: Security rules and indexes

### Deploy Individually

```bash
# Frontend only
firebase deploy --only hosting

# Backend only
firebase deploy --only functions

# Firestore rules + indexes only
firebase deploy --only firestore
```

---

## Verify Deployment

```bash
# Health check (use the Hosting URL, not the direct Cloud Run URL)
curl https://your-project-id.web.app/api/v1/health
# Should return: {"success":true,"data":{"status":"healthy",...}}

# Open the app
open https://your-project-id.web.app
```

> **Note:** Always access the API through the Firebase Hosting URL (`your-project-id.web.app/api/...`), not the direct Cloud Run URL (`api-xxx.a.run.app`). Cloud Functions 2nd Gen runs on Cloud Run which requires authentication for direct access. Firebase Hosting rewrites handle this automatically via internal auth.

1. Sign in with the email you set as `SUPER_ADMIN_EMAIL`
2. You should have full admin access (all menus visible)
3. Check Users, Groups, and Audit Logs pages load correctly

---

## Custom Domain (Optional)

```bash
# Add a custom domain via Firebase Console
# Firebase Console → Hosting → Add custom domain

# Or via CLI
firebase hosting:channel:deploy production --project=your-project-id
```

Update `CORS_ORIGINS` to include your custom domain:
```bash
firebase functions:config:set cors.origins="https://admin.yourdomain.com"
firebase deploy --only functions
```

---

## CI/CD (GitHub Actions)

The BRD includes a GitHub Actions workflow template. To set it up:

1. Add repository secrets:
   - `FIREBASE_SERVICE_ACCOUNT`: Service account JSON key (from GCP Console → IAM → Service Accounts)

2. The workflow triggers on push to `main` and runs:
   ```
   bun install → bun run build → bun run typecheck → firebase deploy
   ```

---

## Monitoring

### Basic Health Monitoring

The `/api/v1/health` endpoint can be used with any uptime monitor (UptimeRobot, Pingdom, GCP Uptime Checks).

### Terraform Monitoring (Option B)

If you used Terraform, monitoring is configurable via `terraform.tfvars`:

```hcl
monitoring = {
  enabled = true
  alerts = {
    auth_failures    = { enabled = true, threshold = 10 }
    function_errors  = { enabled = true, threshold = 5 }
    high_latency     = { enabled = true, latency_seconds = 5 }
    uptime           = { enabled = true, api_domain = "your-project-id.web.app" }
  }
  notifications = {
    email = "alerts@company.com"
  }
}
```

### GCP Cloud Logging

View function logs:
```bash
# Recent logs
firebase functions:log --project=your-project-id

# Or in GCP Console
# https://console.cloud.google.com/logs/query?project=your-project-id
```

---

## Cost Estimate

Firebase Blaze plan has a generous free tier:

| Resource | Free Tier | Typical Admin Dashboard |
|----------|-----------|------------------------|
| Cloud Functions | 125K invocations/month | Well within free tier |
| Firestore | 1GB storage, 50K reads/day | Well within free tier |
| Hosting | 10GB storage, 360MB/day transfer | Well within free tier |
| Authentication | Unlimited for most providers | Free |

**Expected cost for most admin dashboards: $0/month** (unless you have very high traffic).

---

## Troubleshooting

### "Error: Cloud Functions deployment requires the Blaze plan"

Upgrade to Blaze in Firebase Console → Usage & Billing.

### "Error: CORS policy blocked"

Update `CORS_ORIGINS` to include your domain:
```bash
firebase functions:config:set cors.origins="https://your-domain.com"
firebase deploy --only functions
```

### "Error: Permission denied" on Firestore

Check that Firestore rules are deployed:
```bash
firebase deploy --only firestore:rules
```

### "Sign-in failed" or auth errors

1. Verify Google Sign-In is enabled in Firebase Console
2. Check authorized domains include your production URL
3. Verify `PUBLIC_FIREBASE_AUTH_DOMAIN` matches `your-project-id.firebaseapp.com`

### Functions deploy fails with "Build failed"

```bash
# Verify the build works locally first
bun run build

# Check the backend output
ls packages/backend/dist/
# Should contain index.js
```

### "Super admin not working"

The `SUPER_ADMIN_EMAIL` env var must be set **before** the first login with that email. If you log in before setting it, update the user document in Firestore manually:
- Set `isSuperAdmin: true` on the user document
- Or delete the user document and log in again after setting the env var
