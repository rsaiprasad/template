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
- [Terraform](https://developer.hashicorp.com/terraform/downloads) (`>= 1.0`)
- [Bun](https://bun.sh) runtime
- A Google Cloud billing account (Terraform links it automatically, which activates the Blaze plan)

## Setup Infrastructure (Terraform)

Terraform provisions all GCP/Firebase infrastructure: project, APIs, Firestore, Identity Platform, service account, monitoring, and generates `.env` files.

### 1. Configure Variables

```bash
cd infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your values:

```hcl
project_id        = "my-dashboard-project"    # Must be globally unique
super_admin_email = "admin@company.com"
project_name      = "Admin Dashboard"
region            = "us-central1"
create_project    = true                       # false to use an existing project
billing_account   = "XXXXXX-XXXXXX-XXXXXX"     # Required if create_project = true
```

### 2. Run Setup

```bash
# Interactive setup (recommended): checks prereqs, plans, confirms, applies, generates .env
./infrastructure/scripts/setup-terraform.sh

# Or run manually:
cd infrastructure/terraform
terraform init
terraform plan
terraform apply
```

### 3. Generate Environment Files

If you ran the interactive setup, `.env` files are already generated. Otherwise:

```bash
./infrastructure/scripts/setup-terraform.sh env
```

This creates:
- `.env` — backend config (service account path, super admin email)
- `packages/frontend/.env` — Firebase SDK config (API key, auth domain, etc.)
- `.firebaserc` — Firebase project alias

### 4. Create Service Account Key

```bash
gcloud iam service-accounts keys create ./service-account.json \
  --iam-account=admin-dashboard-dev@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

### 5. Enable Google Sign-In

Google Sign-In requires OAuth 2.0 credentials. For personal GCP projects (not belonging to an organization), OAuth clients can only be created via the Cloud Console UI.

**Step-by-step:**

1. **Configure OAuth consent screen:**
   - Go to [GCP Console > APIs & Services > OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent?project=YOUR_PROJECT_ID)
   - Choose **External** user type
   - Fill in App name (e.g., "Admin Dashboard") and User support email
   - Add your email as a developer contact
   - Click **Save and Continue** through the remaining steps (no scopes or test users needed)

2. **Create OAuth 2.0 Client ID:**
   - Go to [GCP Console > APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials?project=YOUR_PROJECT_ID)
   - Click **Create Credentials** > **OAuth client ID**
   - Application type: **Web application**
   - Name: "Admin Dashboard Web Client" (or any name)
   - Under **Authorized redirect URIs**, add: `https://YOUR_PROJECT_ID.firebaseapp.com/__/auth/handler`
   - Click **Create** and copy the **Client ID** and **Client secret**

3. **Configure Terraform with the credentials:**
   Add to your `terraform.tfvars`:
   ```hcl
   enable_google_signin = true
   oauth_client_id      = "YOUR_CLIENT_ID.apps.googleusercontent.com"
   oauth_client_secret  = "YOUR_CLIENT_SECRET"
   ```

4. **Apply:**
   ```bash
   cd infrastructure/terraform
   terraform apply
   ```

> **For org-based projects:** Terraform can create OAuth clients automatically via the IAP API (`google_iap_brand` + `google_iap_client` resources), eliminating the manual step above.

> **Alternative (no Terraform):** You can also enable Google Sign-In directly in the [Firebase Console > Authentication > Sign-in method](https://console.firebase.google.com/project/YOUR_PROJECT_ID/authentication/providers) — click Google, toggle Enable, set support email, and Save. This approach doesn't require OAuth credentials in `terraform.tfvars`.

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
# Health check
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

## Manual Setup (Alternative)

If you prefer not to use Terraform, you can set up infrastructure manually.

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

Go to [Firebase Console](https://console.firebase.google.com) > your project > Authentication > Sign-in method > Enable **Google**.

### 5. Upgrade to Blaze Plan

Firebase Console > Usage & Billing > Modify plan > Blaze (pay-as-you-go).

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

Create `packages/frontend/.env`:
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

Create `.env` in the project root:
```bash
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
SUPER_ADMIN_EMAIL=admin@company.com
```

The `SUPER_ADMIN_EMAIL` determines who gets full admin access on first login.

---

## Custom Domain (Optional)

```bash
# Add a custom domain via Firebase Console
# Firebase Console > Hosting > Add custom domain

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
   - `FIREBASE_SERVICE_ACCOUNT`: Service account JSON key (from GCP Console > IAM > Service Accounts)

2. The workflow triggers on push to `main` and runs:
   ```
   bun install > bun run build > bun run typecheck > firebase deploy
   ```

---

## Monitoring

### Terraform Monitoring

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

### Basic Health Monitoring

The `/api/v1/health` endpoint can be used with any uptime monitor (UptimeRobot, Pingdom, GCP Uptime Checks).

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

### "Error: auth/operation-not-allowed"

Google Sign-In is not enabled. Either:
- Enable via [Firebase Console > Authentication > Sign-in method > Google](https://console.firebase.google.com/project/YOUR_PROJECT_ID/authentication/providers)
- Or set `enable_google_signin = true` with valid `oauth_client_id` and `oauth_client_secret` in `terraform.tfvars` and run `terraform apply`

See [Enable Google Sign-In](#5-enable-google-sign-in) above.

### "Error: auth/invalid-api-key"

The Firebase API key is missing or wrong in the frontend build. Verify `packages/frontend/.env` has the correct `PUBLIC_FIREBASE_API_KEY`, then rebuild and redeploy:
```bash
bun run build && firebase deploy --only hosting
```

### "Error: Cloud Functions deployment requires the Blaze plan"

Upgrade to Blaze in Firebase Console > Usage & Billing. If billing is already linked via Terraform, this should already be done.

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

### Blank page after deploy

Check the browser console for errors. Common causes:
- Missing or incorrect Firebase config in `packages/frontend/.env` — rebuild after fixing
- CDN caching stale assets — the build uses content-hashed filenames, so a fresh `bun run build && firebase deploy --only hosting` should resolve this
