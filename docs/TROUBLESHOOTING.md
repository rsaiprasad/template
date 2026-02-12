# Troubleshooting

## Backend

### Backend won't start

**Cause:** Missing dependencies, build errors, or database connection issues.

```bash
# Check systemd logs (production)
journalctl -u admin-dashboard@$USER -n 50

# Test manually
cd packages/backend
bun run src/index.ts
```

### "Super admin not working"

The `SUPER_ADMIN_EMAIL` env var must be set **before** the first login with that email. If you logged in before setting it, update the user record in PostgreSQL:

```sql
UPDATE users SET is_super_admin = true WHERE email = 'admin@yourdomain.com';
```

Or use Drizzle Studio to edit the record:

```bash
cd packages/backend
bun run db:studio
```

### Build errors

```bash
# Run type checking
bun run typecheck

# Rebuild from scratch
bun run clean
bun install
bun run build
```

## Database (PostgreSQL)

### Database connection failed

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U admin_user -d admin_dashboard -c "SELECT 1"
```

### "FATAL: role 'admin_user' does not exist"

Create the database user and database:

```bash
sudo -u postgres createuser --password admin_user
sudo -u postgres createdb admin_dashboard -O admin_user
```

Or run the setup script:

```bash
./infrastructure/scripts/setup-local.sh
```

### Schema out of sync

If you see errors about missing columns or tables:

```bash
cd packages/backend
bun run db:push
```

### Data not persisting

Unlike the Firebase emulator, PostgreSQL data persists across restarts by default. If data seems missing:

1. Verify you are connecting to the correct database (`DATABASE_URL` in `.env`)
2. Check that migrations have run: `bun run db:push`
3. Inspect the database directly: `bun run db:studio`

## Authentication

### "Sign-in failed" or auth errors

1. Verify Google Sign-In is enabled in Firebase Console > Authentication > Sign-in method
2. Check authorized domains include your production URL (Cloudflare Pages domain)
3. Verify `PUBLIC_FIREBASE_AUTH_DOMAIN` matches `your-project-id.firebaseapp.com`

### Auth emulator not connecting

**Cause:** Emulator not running or environment not set to development.

```bash
# Check if the Auth emulator port is in use
lsof -i :9099

# Verify NODE_ENV=development is set
# The app auto-connects to the emulator at http://localhost:9099 in development mode
```

### User created in emulator but can't sign in

1. Use Google Sign-In (the emulator shows a popup to select/create a test user)
2. Check the emulator UI at http://localhost:9099 to verify the user exists
3. Clear browser storage and try again

## CORS

### CORS errors in browser

**Cause:** Origin not in allowed list.

**Solution:**
1. Update `CORS_ORIGINS` in `packages/backend/.env` to include your frontend domain
2. Restart the backend server

```bash
# Example
CORS_ORIGINS=https://your-app.pages.dev,https://admin.yourdomain.com
```

Ensure your domain is also listed in Firebase Console > Authentication > Settings > Authorized domains.

## Cloudflare Tunnel

### Tunnel not connecting

```bash
# Check tunnel status
cloudflared tunnel info admin-dashboard

# Check systemd logs
journalctl -u cloudflared@$USER -n 50

# Test manually
cloudflared tunnel run admin-dashboard
```

### "failed to connect to origin" errors

1. Verify the backend is running on port 3000: `curl http://localhost:3000/api/v1/health`
2. Check `~/.cloudflared/config.yml` points to `http://localhost:3000`
3. Verify the tunnel credentials file exists at the path specified in the config

### DNS not resolving

After creating a tunnel route, DNS propagation can take a few minutes:

```bash
# Verify the DNS record was created
cloudflared tunnel route dns admin-dashboard api.yourdomain.com

# Test resolution
dig api.yourdomain.com
```

## Frontend

### Frontend shows "Failed to load users" or similar API errors

1. Verify the backend is running: `curl http://localhost:3000/api/v1/health`
2. Check `PUBLIC_API_BASE_URL` in `packages/frontend/.env` points to the correct backend URL
3. Check the browser console for specific error messages

### Blank page after deploy to Cloudflare Pages

1. Verify the build output exists: `ls packages/frontend/dist/`
2. Check that all `PUBLIC_*` environment variables are set in Cloudflare Pages settings
3. Ensure the SPA fallback is configured (Cloudflare Pages handles this by default for `index.html`)

## Local Development

### Port already in use

```bash
# Check what's using the port
lsof -i :3000  # Backend
lsof -i :5173  # Frontend
lsof -i :9099  # Auth emulator

# Kill the process
kill -9 <PID>
```

### Firebase Auth emulator requires Java

The Firebase Auth emulator requires Java 11 or later:

```bash
# Check Java version
java -version

# Install on Ubuntu/Debian
sudo apt install openjdk-11-jdk
```

## See Also

- [Local Development Guide](./LOCAL_DEVELOPMENT.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Configuration](./CONFIGURATION.md)
