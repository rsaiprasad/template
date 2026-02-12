# Infrastructure

This directory contains infrastructure configuration and setup scripts for the Admin Dashboard.

## Overview

The Admin Dashboard runs on your desktop with PostgreSQL, exposed to the internet via Cloudflare Tunnel. The frontend is deployed to Cloudflare Pages.

```
infrastructure/
├── cloudflare/
│   └── tunnel-config.example.yml   # Cloudflare Tunnel config template
├── systemd/
│   ├── admin-dashboard.service     # Backend systemd service
│   └── cloudflared.service         # Cloudflare Tunnel systemd service
└── scripts/
    └── setup-local.sh              # PostgreSQL + env setup wizard
```

## Components

| Component | Purpose | Configuration |
|-----------|---------|---------------|
| **PostgreSQL** | Application database | `DATABASE_URL` in `packages/backend/.env` |
| **systemd (backend)** | Manages the Bun backend server | `systemd/admin-dashboard.service` |
| **systemd (tunnel)** | Manages the Cloudflare Tunnel | `systemd/cloudflared.service` |
| **Cloudflare Tunnel** | Exposes localhost:3000 to the internet | `~/.cloudflared/config.yml` |
| **Cloudflare Pages** | Hosts the static frontend (CDN) | Deployed via `wrangler` CLI |
| **Firebase Auth** | Google OAuth (free tier) | Firebase Console |

## Quick Start (Local Development)

```bash
# Run the interactive setup script
./infrastructure/scripts/setup-local.sh
```

This will:
1. Check that PostgreSQL is installed and running
2. Create a database user and database
3. Generate `packages/backend/.env` with `DATABASE_URL`
4. Run Drizzle migrations to create tables

## Production Setup

See [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) for the full production deployment guide covering:

1. PostgreSQL setup and configuration
2. Backend systemd service installation
3. Cloudflare Pages deployment
4. Cloudflare Tunnel setup
5. Firebase Auth configuration (Google OAuth)
6. Database backups

## systemd Services

### Backend Service

The backend runs as a Bun server on port 3000:

```bash
# Install
sudo cp infrastructure/systemd/admin-dashboard.service /etc/systemd/system/admin-dashboard@.service
sudo systemctl daemon-reload
sudo systemctl enable admin-dashboard@$USER
sudo systemctl start admin-dashboard@$USER

# Check status
sudo systemctl status admin-dashboard@$USER

# View logs
journalctl -u admin-dashboard@$USER -f
```

### Cloudflare Tunnel Service

The tunnel exposes your local backend to the internet:

```bash
# Install
sudo cp infrastructure/systemd/cloudflared.service /etc/systemd/system/cloudflared@.service
sudo systemctl daemon-reload
sudo systemctl enable cloudflared@$USER
sudo systemctl start cloudflared@$USER

# Check status
sudo systemctl status cloudflared@$USER
```

## Cloudflare Tunnel Configuration

Copy the example config and fill in your tunnel details:

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

## Cost

| Component | Cost |
|-----------|------|
| PostgreSQL (local) | Free |
| Bun server (local) | Free |
| Cloudflare Tunnel | Free |
| Cloudflare Pages | Free |
| Firebase Auth | Free (50k MAU) |
| **Total** | **$0/month** |
