# Deployment Guide

This guide covers deploying the Admin Dashboard to production using a desktop Bun server, PostgreSQL, Cloudflare Pages, and Cloudflare Tunnel.

## Architecture Overview

```
Browser --> Cloudflare Pages (static frontend, CDN)
        --> Cloudflare Tunnel --> Desktop Bun Server (port 3000)
                               --> PostgreSQL (localhost:5432)
        --> Firebase Auth (Google OAuth, free tier)
```

| Component | Runs On | Cost |
|-----------|---------|------|
| Frontend | Cloudflare Pages | Free |
| Backend | Your desktop (systemd) | Free (your hardware) |
| Database | Your desktop (PostgreSQL) | Free |
| Tunnel | Cloudflare Tunnel | Free |
| Auth | Firebase Auth | Free |

**Total monthly cost: $0**

## Prerequisites

- [Bun](https://bun.sh) (>=1.0)
- [PostgreSQL](https://www.postgresql.org/download/) (>=14)
- [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)
- [wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (for Cloudflare Pages deploy)
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free)
- A [Firebase project](https://console.firebase.google.com/) (for Auth, free tier)

---

## 1. PostgreSQL Setup

### Install PostgreSQL

```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### Create Database and User

```bash
# Create user and database
sudo -u postgres createuser --password admin_user
sudo -u postgres createdb admin_dashboard -O admin_user
```

Or use the setup script (recommended):

```bash
./infrastructure/scripts/setup-local.sh
```

This interactively creates the database, user, generates `.env`, and runs Drizzle migrations.

### Run Migrations

```bash
cd packages/backend
DATABASE_URL="postgresql://admin_user:your_password@localhost:5432/admin_dashboard" \
  bunx drizzle-kit push
```

---

## 2. Backend: systemd Service

The backend runs as a Bun server on port 3000, managed by systemd for auto-restart and boot startup.

### Configure Environment

Create or update `packages/backend/.env`:

```bash
# Database
DATABASE_URL=postgresql://admin_user:your_password@localhost:5432/admin_dashboard

# Server
PORT=3000
NODE_ENV=production

# Firebase Auth (from Firebase Console > Project Settings > Service Accounts)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Super Admin
SUPER_ADMIN_EMAIL=admin@yourdomain.com

# CORS (your Cloudflare Pages domain)
CORS_ORIGINS=https://your-app.pages.dev,https://admin.yourdomain.com
```

### Build

```bash
bun install
bun run build
```

### Install systemd Service

```bash
# Copy service file (replace USER with your username)
sudo cp infrastructure/systemd/admin-dashboard.service /etc/systemd/system/admin-dashboard@.service

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable admin-dashboard@$USER
sudo systemctl start admin-dashboard@$USER

# Check status
sudo systemctl status admin-dashboard@$USER

# View logs
journalctl -u admin-dashboard@$USER -f
```

The service file expects the project at `/home/$USER/workspace/admin-dashboard/`. Edit the `WorkingDirectory` and `EnvironmentFile` paths in the service file if your project is elsewhere.

### Verify

```bash
curl http://localhost:3000/api/v1/health
# Should return: {"success":true,"data":{"status":"healthy",...}}
```

---

## 3. Frontend: Cloudflare Pages

### Configure Frontend Environment

Create `packages/frontend/.env`:

```bash
PUBLIC_API_BASE_URL=https://api.yourdomain.com/api/v1
PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
PUBLIC_FIREBASE_PROJECT_ID=your-project-id
PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
PUBLIC_FIREBASE_APP_ID=1:123:web:abc
```

### Build

```bash
bun run build:frontend
```

Output goes to `packages/frontend/dist/`.

### Deploy to Cloudflare Pages

**Option A: CLI (wrangler)**

```bash
cd packages/frontend
npx wrangler pages deploy dist/

# Or from root:
bun run deploy:frontend
```

**Option B: Cloudflare Dashboard**

1. Go to [Cloudflare Dashboard > Pages](https://dash.cloudflare.com/?to=/:account/pages)
2. Create a project > Connect to Git (or Direct Upload)
3. Build settings:
   - Build command: `bun run build:frontend`
   - Build output directory: `packages/frontend/dist`
   - Root directory: (leave empty for monorepo root)
4. Add environment variables (all `PUBLIC_*` vars from above)

### Custom Domain

In the Cloudflare Pages project settings, add a custom domain (e.g., `admin.yourdomain.com`). Cloudflare handles SSL automatically.

---

## 4. Cloudflare Tunnel

The tunnel exposes your local backend (port 3000) to the internet via a Cloudflare-managed domain.

### Create Tunnel

```bash
# Login to Cloudflare
cloudflared tunnel login

# Create a tunnel
cloudflared tunnel create admin-dashboard

# Route DNS (creates a CNAME record)
cloudflared tunnel route dns admin-dashboard api.yourdomain.com
```

### Configure Tunnel

Copy the example config:

```bash
cp infrastructure/cloudflare/tunnel-config.example.yml ~/.cloudflared/config.yml
```

Edit `~/.cloudflared/config.yml`:

```yaml
tunnel: <YOUR_TUNNEL_ID>
credentials-file: /home/<USER>/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: api.yourdomain.com
    service: http://localhost:3000
    originRequest:
      noTLSVerify: true
  - service: http_status:404
```

### Test Tunnel

```bash
cloudflared tunnel run admin-dashboard
```

Verify: `curl https://api.yourdomain.com/api/v1/health`

### Install systemd Service

```bash
sudo cp infrastructure/systemd/cloudflared.service /etc/systemd/system/cloudflared@.service
sudo systemctl daemon-reload
sudo systemctl enable cloudflared@$USER
sudo systemctl start cloudflared@$USER
```

---

## 5. Firebase Auth Setup (Google OAuth)

Firebase Auth is kept only for Google OAuth (free tier). No Firestore or Cloud Functions are used.

### Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable **Authentication** > **Sign-in method** > **Google**
4. Set your support email

### Get Firebase Credentials

**For backend** (Admin SDK):
1. Firebase Console > Project Settings > Service Accounts
2. Generate New Private Key
3. Copy the values into `packages/backend/.env`:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`

**For frontend** (Client SDK):
1. Firebase Console > Project Settings > General > Your apps > Web app
2. Copy the Firebase config values into `packages/frontend/.env`

### Add Authorized Domains

In Firebase Console > Authentication > Settings > Authorized domains, add:
- `your-app.pages.dev` (Cloudflare Pages domain)
- `admin.yourdomain.com` (custom domain, if using)

---

## 6. Database Backups

### Manual Backup

```bash
pg_dump -U admin_user admin_dashboard > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Automated Backups (cron)

```bash
# Add to crontab: daily backup at 2 AM
crontab -e
```

```cron
0 2 * * * pg_dump -U admin_user admin_dashboard | gzip > /home/$USER/backups/admin_dashboard_$(date +\%Y\%m\%d).sql.gz
```

### Restore

```bash
psql -U admin_user admin_dashboard < backup_20260101_120000.sql
```

---

## 7. Updating and Restarting

### Update Backend

```bash
cd /path/to/project
git pull
bun install
bun run build:backend
sudo systemctl restart admin-dashboard@$USER
```

### Update Frontend

```bash
cd /path/to/project
git pull
bun install
bun run build:frontend
bun run deploy:frontend
```

### Database Schema Changes

```bash
cd packages/backend
bun run db:push     # Push schema changes
# or
bun run db:migrate  # Run migration files
```

---

## Verify Full Deployment

1. **Backend health**: `curl https://api.yourdomain.com/api/v1/health`
2. **Frontend loads**: Open `https://admin.yourdomain.com` in browser
3. **Auth works**: Sign in with the email set as `SUPER_ADMIN_EMAIL`
4. **Full admin access**: Check Users, Groups, and Audit Logs pages load correctly

---

## Troubleshooting

### Backend won't start

```bash
# Check systemd logs
journalctl -u admin-dashboard@$USER -n 50

# Test manually
cd packages/backend
bun run src/index.ts
```

### Tunnel not connecting

```bash
# Check tunnel status
cloudflared tunnel info admin-dashboard

# Check systemd logs
journalctl -u cloudflared@$USER -n 50

# Test locally
cloudflared tunnel run admin-dashboard
```

### CORS errors

Update `CORS_ORIGINS` in `packages/backend/.env` to include your Cloudflare Pages domain. Restart the backend service.

### "Super admin not working"

The `SUPER_ADMIN_EMAIL` env var must be set **before** the first login with that email. If you logged in before setting it, update the user record in PostgreSQL:

```sql
UPDATE users SET is_super_admin = true WHERE email = 'admin@yourdomain.com';
```

### Database connection failed

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U admin_user -d admin_dashboard -c "SELECT 1"
```
