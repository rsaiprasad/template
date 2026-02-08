# Troubleshooting

## Deployment

### "Permission denied" when deploying functions

**Cause:** Project not on Blaze plan or missing IAM permissions.

**Solution:**
1. Upgrade to Blaze plan in Firebase Console > Usage & Billing
2. Ensure your account has the `Cloud Functions Admin` role

### "Cloud Functions deployment requires the Blaze plan"

Upgrade to Blaze in Firebase Console > Usage & Billing. The free tier is generous (125K invocations/month).

### Functions deploy fails with "Build failed"

```bash
# Verify the build works locally first
bun run build

# Check the backend output exists
ls packages/backend/dist/
# Should contain index.js
```

### "Super admin not working"

The `SUPER_ADMIN_EMAIL` env var must be set **before** the first login with that email. If you logged in before setting it:
- Set `isSuperAdmin: true` on the user document in Firestore manually
- Or delete the user document and log in again after setting the env var

## Firestore

### "Could not create Firestore database"

**Cause:** Database already exists or billing not enabled.

```bash
# Check if database exists
gcloud firestore databases describe --project your-project-id
```

If it doesn't exist, enable billing first.

### "Permission denied" on Firestore

Check that Firestore rules are deployed:

```bash
firebase deploy --only firestore:rules
```

## Authentication

### "Firebase config not found" error

**Cause:** Web app not created or wrong app ID.

```bash
# List all web apps
firebase apps:list WEB --project your-project-id

# Get config for specific app
firebase apps:sdkconfig WEB APP_ID --project your-project-id
```

### "Sign-in failed" or auth errors

1. Verify Google Sign-In is enabled in Firebase Console > Authentication > Sign-in method
2. Check authorized domains include your production URL
3. Verify `PUBLIC_FIREBASE_AUTH_DOMAIN` matches `your-project-id.firebaseapp.com`

## CORS

### CORS errors in browser

**Cause:** Origin not in allowed list.

**Solution:**
- Update CORS origins in backend configuration (see [Configuration](./CONFIGURATION.md))
- Ensure your domain is listed in Firebase Console > Authentication > Authorized domains

For production:
```bash
firebase functions:config:set cors.origins="https://your-domain.com"
firebase deploy --only functions
```

## Performance

### Functions cold start is slow

**Cause:** Node.js initialization time on first invocation.

**Solution:**
- Set `minInstances: 1` in `firebase.json` for critical functions (increases cost)
- Optimize imports and use lazy loading

## Local Development

### "Service account key not found"

**Cause:** Missing `service-account.json` file.

```bash
# Regenerate service account key
gcloud iam service-accounts keys create ./service-account.json \
    --iam-account=admin-dashboard-dev@your-project-id.iam.gserviceaccount.com
```

### Emulator connection issues

**Cause:** Ports already in use or emulators not running.

```bash
# Check if ports are in use
lsof -i :5001 -i :8080 -i :9099

# Kill processes using the ports
kill -9 <PID>

# Restart emulators
bun run emulators
```

See also: [Emulator Testing Guide](./EMULATOR_TESTING.md)
