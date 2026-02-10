# Backend Documentation

## Table of Contents

1. [Architecture](#architecture)
2. [API Reference](#api-reference)
3. [Authentication](#authentication)
4. [Authorization](#authorization)
5. [Services](#services)
6. [Error Handling](#error-handling)
7. [Audit Logging](#audit-logging)
8. [Configuration](#configuration)
9. [Deployment](#deployment)

---

## Architecture

### Overview

The backend is a Hono-based REST API designed to run on Firebase Cloud Functions. It follows a layered architecture:

```
┌─────────────────────────────────────────────┐
│                   Routes                     │
│  (HTTP handlers, request/response mapping)   │
├─────────────────────────────────────────────┤
│                 Middleware                   │
│  (Auth, Permissions, Rate Limit, Audit)     │
├─────────────────────────────────────────────┤
│                  Services                    │
│  (Business logic, data transformation)      │
├─────────────────────────────────────────────┤
│              Firebase Admin SDK              │
│  (Firestore, Auth)                          │
└─────────────────────────────────────────────┘
```

### Key Components

| Component | Responsibility |
|-----------|----------------|
| Routes | HTTP handling, validation, response formatting |
| Middleware | Cross-cutting concerns (auth, logging, etc.) |
| Services | Business logic, database operations |
| Config | Environment-specific settings |
| Errors | Typed error classes |

---

## API Reference

### Base URL

```
/api/v1
```

### Authentication

All endpoints (except `/health`) require a Bearer token:

```
Authorization: Bearer <firebase-id-token>
```

### Response Format

#### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

#### Paginated Response

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasMore": true,
    "nextCursor": "abc123"
  }
}
```

#### Error Response

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found"
  }
}
```

### Endpoints

#### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Login (creates user on first login) |
| POST | `/auth/logout` | Logout |
| GET | `/auth/me` | Get current user with permissions |
| POST | `/auth/verify` | Verify token validity |

#### Users

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| GET | `/users` | List users | `users:list` |
| GET | `/users/:id` | Get user | `users:read` |
| PUT | `/users/:id` | Update user | `users:update` |
| DELETE | `/users/:id` | Delete user | `users:delete` |
| POST | `/users/:id/disable` | Disable user | `users:update` |
| POST | `/users/:id/enable` | Enable user | `users:update` |
| PUT | `/users/:id/group` | Change group | `users:update` |

#### Groups

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| GET | `/groups` | List groups | `groups:list` |
| POST | `/groups` | Create group | `groups:create` |
| GET | `/groups/:id` | Get group | `groups:read` |
| PUT | `/groups/:id` | Update group | `groups:update` |
| DELETE | `/groups/:id` | Delete group | `groups:delete` |
| GET | `/groups/:id/users` | Get group users | `groups:read` |
| PUT | `/groups/:id/permissions` | Set permissions | `groups:update` |

#### Permissions

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| GET | `/permissions` | List all permissions | Authenticated |
| GET | `/permissions/my` | Get my permissions | Authenticated |
| GET | `/permissions/resources` | List resources | Authenticated |
| POST | `/permissions/check` | Check permission | Authenticated |

#### Settings

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| GET | `/settings` | Get settings | `users:read` |
| PUT | `/settings` | Update settings | `users:list` + `users:update` |
| GET | `/settings/features` | List features | `users:read` |
| PUT | `/settings/features/:feature` | Toggle feature | `users:list` + `users:update` |

#### Audit

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| GET | `/audit` | List audit logs | `audit:list` |
| GET | `/audit/:id` | Get audit log | `audit:list` |
| GET | `/audit/stats` | Get statistics | `audit:list` |
| GET | `/audit/actions` | List actions | `audit:list` |
| GET | `/audit/user/:userId` | User's logs | `audit:list` |
| GET | `/audit/resource/:type/:id` | Resource logs | `audit:list` |

---

## Authentication

### Firebase Auth Integration

The backend validates Firebase ID tokens:

```typescript
// core/middleware/auth.ts
const decodedToken = await auth.verifyIdToken(token, true);
```

The `true` parameter enables revocation checking.

### Token Flow

1. Frontend authenticates with Firebase (Google OAuth)
2. Frontend gets ID token: `await user.getIdToken()`
3. Frontend sends token in `Authorization` header
4. Backend validates token and extracts user info
5. User data is attached to request context

### First-Time Login

On first login:
1. User record created in Firestore
2. Assigned to default group (Users)
3. If email matches `SUPER_ADMIN_EMAIL`, promoted to super admin

---

## Authorization

### Permission Model

Permissions follow the format `resource:action`:

```
users:list
users:create
users:read
users:update
users:delete
```

### Permission Check

```typescript
// In routes
import { requirePermission } from '../core/middleware/permissions';

app.get('/users', requirePermission('users:list'), handler);
```

### Super Admin

Super admins bypass all permission checks:

```typescript
if (user.isSuperAdmin) {
  return next(); // Skip permission check
}
```

### Groups

Users belong to groups, groups have permissions:

```
User → Group → Permissions[]
```

---

## Services

### Service Pattern

Services encapsulate business logic and database operations:

```typescript
// services/user.service.ts
export class UserService {
  async listUsers(params: ListUsersParams): Promise<PaginatedResult<User>> {
    // Query Firestore
    // Apply filters
    // Return paginated results
  }
}
```

### Singleton Instances

Services are instantiated once:

```typescript
// services/index.ts
export const userService = new UserService();
export const groupService = new GroupService();
```

### Available Services

| Service | Responsibility |
|---------|----------------|
| `UserService` | User CRUD, status management |
| `GroupService` | Group CRUD, permission assignment |
| `SettingsService` | App settings management |
| `AuditService` | Audit log operations |

---

## Error Handling

### Custom Error Classes

```typescript
// core/errors/index.ts
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message);
  }
}

export class NotFoundError extends AppError { ... }
export class ForbiddenError extends AppError { ... }
export class ValidationError extends AppError { ... }
export class UnauthorizedError extends AppError { ... }
export class ConflictError extends AppError { ... }
```

### Usage in Services

```typescript
throw new NotFoundError('User');
// Results in: 404 { code: 'NOT_FOUND', message: 'User not found' }

throw new ForbiddenError('Cannot delete super admin');
// Results in: 403 { code: 'FORBIDDEN', message: '...' }
```

### Global Error Handler

```typescript
// app.ts
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({
      success: false,
      error: { code: err.code, message: err.message }
    }, err.statusCode);
  }
  // Handle unexpected errors
});
```

---

## Audit Logging

### Audited Actions

| Category | Actions |
|----------|---------|
| Auth | `LOGIN`, `LOGOUT`, `LOGIN_FAILED` |
| Users | `USER_CREATED`, `USER_UPDATED`, `USER_DISABLED`, `USER_ENABLED`, `USER_DELETED`, `USER_GROUP_ADDED`, `USER_GROUP_REMOVED` |
| Groups | `GROUP_CREATED`, `GROUP_UPDATED`, `GROUP_DELETED`, `GROUP_PERMISSIONS_CHANGED` |
| Settings | `SETTINGS_UPDATED` |

### Audit Log Entry

```typescript
interface AuditLog {
  id: string;
  timestamp: Date;
  actorId: string;
  actorEmail: string;
  actorName: string;
  action: AuditAction;
  resource: 'users' | 'groups' | 'settings' | 'auth';
  resourceId: string;
  description: string;
  changes?: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  };
  ipAddress?: string;
  userAgent?: string;
}
```

### Logging in Routes

```typescript
import { logAuditAction } from '../core/middleware/audit';

await logAuditAction(c, 'USER_UPDATED', 'users', userId, 'Updated user profile', {
  before: { displayName: oldName },
  after: { displayName: newName }
});
```

---

## Configuration

### Config Structure

```typescript
// config/index.ts
export const config = {
  cors: {
    origins: ['http://localhost:5173'],
    credentials: true,
  },
  rateLimit: {
    windowMs: 60 * 1000,
    max: 100,
    authMax: 10,
  },
};
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CORS_ORIGINS` | Allowed origins (comma-separated) | `http://localhost:5173` |
| `SUPER_ADMIN_EMAIL` | Super admin email | - |
| `NODE_ENV` | Environment | `development` |

> **Note:** The Firebase project ID is defined in `.firebaserc` (single source of truth). The Firebase Admin SDK auto-detects the project from the service account credentials or emulator environment.

---

## Deployment

### Firebase Functions

```bash
# Build
bun run build

# Deploy
firebase deploy --only functions
```

### Environment Configuration

```bash
firebase functions:config:set \
  cors.origins="https://app.example.com" \
  app.super_admin_email="admin@example.com"
```

### Health Check

```bash
curl https://your-project.cloudfunctions.net/api/v1/health
# { "status": "ok", "timestamp": "..." }
```
