# Firebase Emulator Testing Guide

This guide covers how to run the Firebase Auth emulator and perform manual end-to-end testing for the admin dashboard.

## Prerequisites

### Required Software

1. **Bun** (v1.1.0 or later)
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Firebase CLI** (v13.0.0 or later)
   ```bash
   npm install -g firebase-tools
   ```

3. **Java Runtime** (required for Firebase emulators)
   - The Firebase emulators require Java 11 or later
   - Check with: `java -version`

### Project Setup

1. Install dependencies from the project root:
   ```bash
   bun install
   ```

2. Ensure you have a valid Firebase project configured:
   ```bash
   cd firebase
   firebase use <your-project-id>
   ```

3. Copy and configure environment variables:
   ```bash
   cp packages/frontend/.env.example packages/frontend/.env
   ```

   Update the `.env` file with your Firebase configuration:
   ```
   PUBLIC_FIREBASE_API_KEY=your-api-key
   PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   PUBLIC_FIREBASE_APP_ID=your-app-id
   ```

---

## Starting the Emulators

### Option 1: Full Development Environment (Recommended)

Run the complete development environment with all emulators and the frontend:

```bash
bun run dev:full
```

This script will:
1. Build the backend if not already built
2. Start all Firebase emulators (Auth, Firestore, Functions, Hosting)
3. Wait for emulators to be ready
4. Start the frontend development server

Once running, you will have access to:
- **Frontend**: http://localhost:5173
- **Emulator UI**: http://localhost:4000
- **API (Functions)**: http://localhost:5001/{project-id}/us-central1/api

### Option 2: Emulators Only

To start just the emulators without the frontend:

```bash
bun run emulators
```

Or directly:
```bash
cd firebase && firebase emulators:start
```

### Emulator Ports

| Service    | Port  |
|------------|-------|
| Auth       | 9099  |
| Firestore  | 8080  |
| Functions  | 5001  |
| Hosting    | 5000  |
| Emulator UI| 4000  |

---

## Creating Test Users in the Emulator UI

### Accessing the Emulator UI

1. Start the emulators using one of the methods above
2. Open http://localhost:4000 in your browser
3. Click on the **Authentication** tab

### Adding a Test User

1. In the Authentication emulator tab, click **Add user**
2. Fill in the user details:
   - **Email**: Enter a test email (e.g., `admin@test.com`)
   - **Password**: Enter a password (e.g., `password123`)
   - **Display name**: (Optional) Enter a name
   - **Phone number**: (Optional)
   - **Photo URL**: (Optional)
3. Click **Save**

### Creating Users with Different Roles

For testing permissions, create multiple users with different email patterns:

| User Type     | Suggested Email          | Purpose                           |
|---------------|--------------------------|-----------------------------------|
| Super Admin   | `admin@test.com`         | Full access to all features       |
| Manager       | `manager@test.com`       | User and group management         |
| Viewer        | `viewer@test.com`        | Read-only access                  |
| New User      | `newuser@test.com`       | No permissions (default state)    |

**Note**: The super admin is determined by the `SUPER_ADMIN_EMAIL` environment variable in the root `.env` file. The first user with this email to sign in becomes the super admin.

---

## Signing In with Test Users

### Using the Login Page

1. Navigate to http://localhost:5173/login
2. Since you are running in development mode with emulators, the app automatically connects to the Auth emulator on port 9099

### Google Sign-In in Emulator Mode

When using Google Sign-In with emulators:

1. Click **Continue with Google** on the login page
2. The emulator will show a popup to select or create a test user
3. You can create a new user on the fly or select an existing emulator user

### Email/Password Sign-In (For Automated Tests)

The application supports email/password authentication for testing purposes. The `signInWithEmail` function is available in the `useAuth` hook:

```typescript
const { signInWithEmail } = useAuth();
await signInWithEmail('admin@test.com', 'password123');
```

This is primarily used for automated E2E tests but can be useful for manual testing as well.

---

## Manual Testing Checklist

### Authentication Flow

- [ ] **Login Page Display**
  - Visit http://localhost:5173/login
  - Verify the login page displays correctly
  - Check that the "Continue with Google" button is visible
  - Verify the theme toggle works (light/dark mode)

- [ ] **Sign In**
  - Click "Continue with Google"
  - Select or create a test user in the emulator popup
  - Verify redirect to dashboard after successful sign-in

- [ ] **Protected Routes**
  - Try accessing http://localhost:5173/users while logged out
  - Verify redirect to login page
  - Sign in and verify access is granted (with appropriate permissions)

- [ ] **Sign Out**
  - Click the user avatar in the header
  - Click "Sign out"
  - Verify redirect to login page
  - Verify protected routes are no longer accessible

### Dashboard

- [ ] **Dashboard Load**
  - After signing in, verify the dashboard loads
  - Check that the welcome message displays the user's name
  - Verify stat cards display (Total Users, Groups, Recent Activity)

- [ ] **Quick Actions**
  - Verify "Manage Users" link works (if permission granted)
  - Verify "Manage Groups" link works (if permission granted)
  - Verify "View Audit Logs" link works (if permission granted)
  - Verify "Settings" link works

### Users Management

- [ ] **Users List**
  - Navigate to /users
  - Verify users table loads with correct columns
  - Test search functionality
  - Test status filter dropdown
  - Test pagination controls

- [ ] **User Details**
  - Click on a user row to view details
  - Verify user information displays correctly
  - Verify group memberships are shown

- [ ] **User Actions** (requires `users:write` permission)
  - Test "Add User" button
  - Test edit user functionality
  - Test delete user with confirmation dialog

### Groups Management

- [ ] **Groups List**
  - Navigate to /groups
  - Verify groups table loads with correct columns
  - Test search functionality
  - Test pagination controls

- [ ] **Group Details**
  - Click on a group to view details
  - Verify group name and description
  - Verify member list
  - Verify permissions list

- [ ] **Group Actions** (requires `groups:write` permission)
  - Test "Create Group" button and dialog
  - Test edit group functionality
  - Test delete group with confirmation dialog

### Permissions System

- [ ] **Permission Enforcement**
  - Sign in as a user without `users:read` permission
  - Verify /users redirects to /forbidden
  - Sign in as a user without `groups:read` permission
  - Verify /groups redirects to /forbidden

- [ ] **Conditional UI Elements**
  - Verify "Add User" button only appears with `users:write` permission
  - Verify "Create Group" button only appears with `groups:write` permission
  - Verify delete options only appear with appropriate delete permissions

### Audit Logs

- [ ] **Audit Logs View** (requires `audit:read` permission)
  - Navigate to /audit-logs
  - Verify audit entries are displayed
  - Check that action, resource, and timestamp are shown
  - Test pagination if many entries exist

### Settings

- [ ] **Settings Page**
  - Navigate to /settings
  - Verify settings page loads (accessible to all authenticated users)
  - Test any available settings options

### Error Handling

- [ ] **404 Page**
  - Navigate to a non-existent route (e.g., /nonexistent)
  - Verify 404 page displays

- [ ] **Forbidden Page**
  - Try to access a route without required permissions
  - Verify forbidden page displays with appropriate message

---

## Troubleshooting

### Emulators Won't Start

**Issue**: `Error: Could not start Auth Emulator, port taken`

**Solution**:
1. Check if another process is using the port:
   ```bash
   lsof -i :9099
   ```
2. Kill the process or change the port in `firebase/firebase.json`

**Issue**: `Error: JAVA_HOME is not set`

**Solution**: Install Java 11+ and set JAVA_HOME:
```bash
# Ubuntu/Debian
sudo apt install openjdk-11-jdk
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
```

### Authentication Issues

**Issue**: "Auth emulator not connected" or auth requests going to production

**Solution**:
1. Verify `NODE_ENV=development` is set
2. Check that the frontend is connecting to the emulator at `http://localhost:9099`
3. The connection is automatic in development mode (see `src/lib/firebase.ts`)

**Issue**: User created in emulator but can't sign in

**Solution**:
1. Ensure the user has a password set (for email/password auth)
2. Check the emulator UI to verify the user exists
3. Clear browser storage and try again

### Frontend Connection Issues

**Issue**: Frontend shows "Failed to load users" or similar API errors

**Solution**:
1. Verify the backend is built: `bun run build:backend`
2. Check the Functions emulator is running on port 5001
3. Verify the API health endpoint responds:
   ```bash
   curl http://localhost:5001/{project-id}/us-central1/api/api/v1/health
   ```

**Issue**: CORS errors in browser console

**Solution**:
1. Ensure you're accessing the frontend via http://localhost:5173
2. The backend should have CORS configured for localhost

### Database Issues

**Issue**: Data not persisting between emulator restarts

**Solution**: This is expected behavior. Emulator data is cleared on restart unless you export/import:
```bash
# Export data before stopping
firebase emulators:export ./emulator-data

# Start with existing data
firebase emulators:start --import=./emulator-data
```

### Build Issues

**Issue**: TypeScript errors when building

**Solution**:
```bash
# Run type checking
bun run typecheck

# Rebuild from scratch
bun run clean
bun install
bun run build
```

---

## Running Automated E2E Tests

The project includes Playwright tests for automated E2E testing:

```bash
# Run all E2E tests
cd packages/frontend
bun run e2e

# Run tests with UI
bun run e2e:ui
```

**Note**: E2E tests require the frontend dev server to be running. The Playwright config automatically starts it if not already running.

---

## Additional Resources

- [Firebase Emulator Suite Documentation](https://firebase.google.com/docs/emulator-suite)
- [Firebase Auth Emulator](https://firebase.google.com/docs/emulator-suite/connect_auth)
- [Playwright Documentation](https://playwright.dev/docs/intro)
