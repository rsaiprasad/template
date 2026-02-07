# Admin Dashboard Template

A production-ready, fully-typed admin dashboard template built with modern technologies. Designed as a foundation for B2C/B2B SaaS applications and internal tools.

## Features

- **Authentication**: Google OAuth via Firebase Authentication
- **Authorization**: Role-based access control (RBAC) with customizable groups and permissions
- **User Management**: CRUD operations, disable/enable accounts, group assignment
- **Group Management**: Create custom groups with granular permissions
- **Audit Logging**: Track all sensitive operations with detailed logs
- **Theme Support**: Light/dark mode with system preference detection
- **OpenAPI Compliant**: Full OpenAPI 3.1 spec with generated TypeScript client

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Bun |
| **Frontend** | React 18, TanStack Query, Zustand, shadcn/ui, Tailwind CSS |
| **Backend** | Hono (OpenAPI), Firebase Cloud Functions |
| **Database** | Firestore |
| **Authentication** | Firebase Auth (Google OAuth) |
| **Linting** | Biome |

## Project Structure

```
admin-dashboard-template/
├── docs/
│   └── BRD.md             # Business Requirements Document
│
├── packages/
│   ├── frontend/          # React SPA
│   │   ├── src/
│   │   │   ├── api/       # Generated OpenAPI client
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   └── stores/
│   │   └── docs/          # Frontend documentation
│   │
│   ├── backend/           # Hono REST API
│   │   ├── src/
│   │   │   ├── openapi/   # OpenAPI route definitions
│   │   │   ├── services/
│   │   │   ├── middleware/
│   │   │   └── config/
│   │   ├── docs/          # API documentation
│   │   └── openapi.json   # Generated OpenAPI spec
│   │
│   └── shared/            # Shared TypeScript types
│
├── firebase/              # Firebase configuration
├── Claude.md              # AI assistant guidelines
└── README.md              # This file
```

## Quick Start

### Prerequisites

The following tools are required to develop and deploy this project:

| Tool | Purpose | Installation |
|------|---------|--------------|
| **Bun** | JavaScript runtime and package manager | [bun.sh](https://bun.sh/) |
| **Java 11+** | Required for Firebase Emulators (local development) | [Adoptium](https://adoptium.net/) |
| **Firebase CLI** | Deploy to Firebase Hosting and Cloud Functions | [Firebase CLI Docs](https://firebase.google.com/docs/cli) |
| **Google Cloud SDK** | Manage GCP resources, APIs, and service accounts | [Cloud SDK Install Guide](https://cloud.google.com/sdk/docs/install) |
| **jq** | JSON processor (required for setup script) | [jqlang.github.io](https://jqlang.github.io/jq/download/) |

#### Installation Commands

**Bun:**
```bash
curl -fsSL https://bun.sh/install | bash
```

**Firebase CLI:**
```bash
bun install -g firebase-tools
# Or: npm install -g firebase-tools
```

**Google Cloud SDK:**
- **macOS:** `brew install google-cloud-sdk`
- **Linux/Windows:** Follow the [official installation guide](https://cloud.google.com/sdk/docs/install)

**jq:**
- **macOS:** `brew install jq`
- **Ubuntu/Debian:** `sudo apt-get install jq`
- **Fedora:** `sudo dnf install jq`
- **Windows:** `choco install jq` or download from [jqlang.github.io](https://jqlang.github.io/jq/download/)

**Java (for Firebase Emulators):**
- **macOS:** `brew install openjdk@17`
- **Ubuntu/Debian:** `sudo apt-get install default-jdk`
- **Fedora:** `sudo dnf install java-17-openjdk`
- **Windows:** Download from [Adoptium](https://adoptium.net/) or `choco install temurin17`

Verify installation: `java -version`

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd admin-dashboard-template

# Install dependencies
bun install
```

---

## Firebase/GCP Setup

Choose one of the following setup methods:

| Method | Best For | Tools Required |
|--------|----------|----------------|
| **Terraform** | Production, Teams, IaC | Terraform, gcloud |
| **Shell Script** | Quick start, Single dev | Firebase CLI, gcloud, jq |
| **Manual** | Learning, Custom setup | Firebase CLI, gcloud |

### Option 1: Terraform (Recommended for Production)

Infrastructure as Code approach with state management and reproducibility.

```bash
# 1. Install Terraform
brew install terraform  # macOS
# or download from https://developer.hashicorp.com/terraform/downloads

# 2. Configure variables
cd infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# 3. Run setup
bun run setup:terraform
```

See [infrastructure/README.md](./infrastructure/README.md) for detailed documentation.

**Advantages:**
- State tracking (knows what's deployed)
- Plan before apply (preview changes)
- Idempotent (safe to run multiple times)
- Easy multi-environment support

### Option 2: Shell Script (Quick Start)

Run the setup script with your project ID and super admin email:

```bash
./scripts/setup-firebase.sh <project-id> <super-admin-email> [region]

# Example:
./scripts/setup-firebase.sh my-dashboard-app admin@company.com us-central1
```

The script will:
- Verify prerequisites (Firebase CLI, gcloud, jq)
- Authenticate with Firebase and Google Cloud
- Create a new Firebase project (or use existing)
- Enable required APIs
- Create Firestore database
- Create Firebase web app and retrieve configuration
- Create service account for local development
- Generate `.env` and `packages/frontend/.env` files
- Update `firebase/.firebaserc` with your project ID
- Deploy Firestore rules and indexes

**After running the script, complete these manual steps:**

1. **Enable Google Sign-In Provider**
   - Go to [Firebase Console > Authentication > Providers](https://console.firebase.google.com/project/_/authentication/providers)
   - Click "Google" and enable it
   - Add your domain to authorized domains

2. **Upgrade to Blaze Plan** (required for Cloud Functions)
   - Go to [Firebase Console > Usage & Billing](https://console.firebase.google.com/project/_/usage/details)
   - Upgrade to the Blaze (pay-as-you-go) plan

### Option 3: Manual Setup

#### Step 1: Authentication

```bash
# Login to Firebase CLI
firebase login

# Login to Google Cloud
gcloud auth login
```

#### Step 2: Create or Select Project

```bash
# Create a new Firebase project
firebase projects:create my-dashboard-app --display-name "Admin Dashboard"

# Or add Firebase to existing GCP project
firebase projects:addfirebase my-dashboard-app

# Set as default project
firebase use my-dashboard-app

# Set for gcloud
gcloud config set project my-dashboard-app
```

#### Step 3: Enable Required APIs

```bash
gcloud services enable \
    firestore.googleapis.com \
    identitytoolkit.googleapis.com \
    cloudfunctions.googleapis.com \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    secretmanager.googleapis.com \
    artifactregistry.googleapis.com \
    --project my-dashboard-app
```

#### Step 4: Create Firestore Database

```bash
gcloud firestore databases create --location=us-central1 --project my-dashboard-app
```

#### Step 5: Create Firebase Web App

```bash
# Create web app
firebase apps:create WEB "Admin Dashboard Web App" --project my-dashboard-app

# Get Firebase configuration
firebase apps:sdkconfig WEB --project my-dashboard-app
```

Copy the output values to your environment files.

#### Step 6: Create Service Account (for local development)

```bash
# Create service account
gcloud iam service-accounts create admin-dashboard-dev \
    --display-name="Admin Dashboard Development" \
    --project my-dashboard-app

# Grant necessary roles
gcloud projects add-iam-policy-binding my-dashboard-app \
    --member="serviceAccount:admin-dashboard-dev@my-dashboard-app.iam.gserviceaccount.com" \
    --role="roles/datastore.user"

# Create key file
gcloud iam service-accounts keys create ./service-account.json \
    --iam-account=admin-dashboard-dev@my-dashboard-app.iam.gserviceaccount.com
```

#### Step 7: Configure Environment Variables

Create `.env` in the project root (for backend):

```env
# Firebase Admin (Backend)
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json

# Super Admin Email
SUPER_ADMIN_EMAIL=admin@company.com

# Environment
NODE_ENV=development
```

Create `packages/frontend/.env`:

```env
# API Configuration
PUBLIC_API_BASE_URL=/api

# Firebase Configuration
PUBLIC_FIREBASE_API_KEY=your-api-key
PUBLIC_FIREBASE_AUTH_DOMAIN=my-dashboard-app.firebaseapp.com
PUBLIC_FIREBASE_PROJECT_ID=my-dashboard-app
PUBLIC_FIREBASE_STORAGE_BUCKET=my-dashboard-app.appspot.com
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
PUBLIC_FIREBASE_APP_ID=your-app-id
```

#### Step 8: Update .firebaserc

Update `firebase/.firebaserc` with your project ID:

```json
{
  "projects": {
    "default": "my-dashboard-app",
    "staging": "my-dashboard-app-staging",
    "production": "my-dashboard-app-prod"
  }
}
```

#### Step 9: Deploy Firestore Rules and Indexes

```bash
cd firebase
firebase deploy --only firestore:rules,firestore:indexes --project my-dashboard-app
```

---

## Development

```bash
# Start all services
bun run dev

# Or start individually
bun run dev:frontend    # React app on http://localhost:5173
bun run dev:backend     # API with watch mode

# Run with Firebase emulators (optional)
bun run emulators
```

---

## Building for Production

```bash
# Build all packages
bun run build

# Build individually
bun run build:frontend
bun run build:backend
```

---

## Deployment

### Initial Deployment

```bash
# Build and deploy everything
bun run build && bun run deploy
```

### Updating an Existing Deployment

#### Deploy Everything (Frontend + Backend)

```bash
bun run build && bun run deploy
```

#### Deploy Frontend Only (Hosting)

For UI changes that don't affect the backend:

```bash
bun run build:frontend
firebase deploy --only hosting
```

#### Deploy Backend Only (Functions)

For API changes:

```bash
bun run build:backend
firebase deploy --only functions
```

#### Deploy Firestore Rules Only

If you've updated `firebase/firestore.rules`:

```bash
firebase deploy --only firestore:rules
```

#### Deploy Firestore Indexes Only

If you've updated `firebase/firestore.indexes.json`:

```bash
firebase deploy --only firestore:indexes
```

#### Deploy to Staging/Production

```bash
# Staging
bun run deploy:staging

# Production
bun run deploy:prod
```

### Viewing Logs and Debugging

```bash
# View Cloud Functions logs
firebase functions:log

# View logs for specific function
firebase functions:log --only api

# Stream logs in real-time
firebase functions:log --follow
```

### Rollback a Deployment

```bash
# List hosting releases
firebase hosting:releases:list --limit 10

# Rollback to a previous release (use version number from list)
firebase hosting:rollback

# Clone a specific version to live
firebase hosting:clone my-dashboard-app:VERSION_ID my-dashboard-app:live
```

### Delete and Redeploy a Function

```bash
# Delete a specific function
firebase functions:delete api

# Redeploy
firebase deploy --only functions
```

---

## Environment Variable Reference

### Root `.env` (Backend Configuration)

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account | `./service-account.json` |
| `SUPER_ADMIN_EMAIL` | Super admin email | `admin@company.com` |
| `NODE_ENV` | Environment | `development` |

> **Note:** The Firebase project ID is defined in `firebase/.firebaserc` (single source of truth). The Firebase Admin SDK auto-detects the project from the service account credentials or emulator environment.

### Frontend `.env` (`packages/frontend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `PUBLIC_API_BASE_URL` | API base URL (relative in prod) | `/api` |
| `PUBLIC_FIREBASE_API_KEY` | Firebase API key | `AIzaSy...` |
| `PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | `project.firebaseapp.com` |
| `PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | `my-dashboard-app` |
| `PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | `project.appspot.com` |
| `PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | `123456789` |
| `PUBLIC_FIREBASE_APP_ID` | Firebase app ID | `1:123:web:abc` |

---

## Post-Deployment Configuration

### Configure OAuth Redirect URIs

After deploying, add your domain to authorized redirect URIs:

1. Go to [GCP Console > APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Click on your OAuth 2.0 Client ID
3. Add authorized redirect URIs:
   - `https://your-project.web.app/__/auth/handler`
   - `https://your-custom-domain.com/__/auth/handler`

### Add Authorized Domains

1. Go to [Firebase Console > Authentication > Settings](https://console.firebase.google.com/project/_/authentication/settings)
2. Add your custom domains to "Authorized domains"

---

## Troubleshooting

### "Permission denied" when deploying functions

**Cause:** Project not on Blaze plan or missing IAM permissions.

**Solution:**
1. Upgrade to Blaze plan in Firebase Console
2. Ensure your account has `Cloud Functions Admin` role

### "Could not create Firestore database"

**Cause:** Database already exists or billing not enabled.

**Solution:**
```bash
# Check if database exists
gcloud firestore databases describe --project my-dashboard-app

# If it doesn't exist, enable billing first
```

### "Firebase config not found" error

**Cause:** Web app not created or wrong app ID.

**Solution:**
```bash
# List all web apps
firebase apps:list WEB --project my-dashboard-app

# Get config for specific app
firebase apps:sdkconfig WEB APP_ID --project my-dashboard-app
```

### Functions cold start is slow

**Cause:** Node.js initialization time.

**Solution:**
- Use `minInstances: 1` in firebase.json for critical functions (increases cost)
- Optimize imports and use lazy loading

### CORS errors in browser

**Cause:** Origin not in allowed list.

**Solution:**
- Check `CORS_ORIGINS` in backend configuration
- Ensure your domain is listed in Firebase Authentication authorized domains

### "Service account key not found"

**Cause:** Missing `service-account.json` file.

**Solution:**
```bash
# Regenerate service account key
gcloud iam service-accounts keys create ./service-account.json \
    --iam-account=admin-dashboard-dev@my-dashboard-app.iam.gserviceaccount.com
```

### Emulator connection issues

**Cause:** Ports already in use or emulators not running.

**Solution:**
```bash
# Check if ports are in use
lsof -i :5001 -i :8080 -i :9099

# Kill processes using the ports
kill -9 <PID>

# Restart emulators
bun run emulators
```

## API Documentation

The API follows OpenAPI 3.1 specification. Access documentation at:

- **Swagger UI**: `http://localhost:5001/api/v1/swagger`
- **OpenAPI JSON**: `http://localhost:5001/api/v1/doc`

Generate the OpenAPI spec:
```bash
cd packages/backend
bun run generate:openapi
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start development servers |
| `bun run build` | Build all packages |
| `bun run typecheck` | Run TypeScript checks |
| `bun run lint` | Run Biome linting |
| `bun run lint:fix` | Fix linting issues |
| `bun run test` | Run tests |
| `bun run deploy` | Deploy to Firebase |

## Default Permissions

| Resource | Actions |
|----------|---------|
| `users` | `list`, `create`, `read`, `update`, `delete` |
| `groups` | `list`, `create`, `read`, `update`, `delete` |
| `settings` | `list`, `read`, `update` |
| `audit` | `list`, `read` |

## Default Groups

| Group | Permissions |
|-------|-------------|
| **Admin** | All permissions |
| **Users** | `users:read` (own profile only) |

## Security Features

- **Rate Limiting**: 100 req/min (general), 10 req/min (auth)
- **CORS**: Config-driven origin whitelist
- **Token Validation**: Firebase ID token verification with revocation check
- **Super Admin Protection**: Cannot be deleted or demoted
- **Audit Trail**: All sensitive operations logged

## Documentation

- [Business Requirements Document](./docs/BRD.md) - Complete project requirements and specifications
- [Frontend Documentation](./packages/frontend/docs/README.md)
- [Backend Documentation](./packages/backend/docs/README.md)
- [API Reference](./packages/backend/docs/api-reference.md)

## Contributing

1. Follow the coding standards in `biome.json`
2. Run `bun run typecheck` and `bun run lint` before committing
3. Update `Claude.md` with any architectural decisions

## License

MIT
