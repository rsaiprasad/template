# Admin Dashboard Backend

Hono-based REST API with OpenAPI 3.1 specification, designed for Firebase Cloud Functions.

## Tech Stack

- **Framework**: Hono (OpenAPI)
- **Runtime**: Bun / Node.js (Firebase Functions)
- **Database**: Firestore
- **Authentication**: Firebase Auth
- **Validation**: Zod
- **API Spec**: OpenAPI 3.1

## Project Structure

```
src/
├── core/                   # Template infra (DON'T EDIT)
│   ├── errors/
│   │   └── index.ts        # Custom error classes
│   ├── middleware/
│   │   ├── auth.ts         # Authentication middleware
│   │   ├── permissions.ts  # Authorization middleware
│   │   ├── rate-limit.ts   # Rate limiting
│   │   └── audit.ts        # Audit logging middleware
│   ├── lib/
│   │   └── firebase-admin.ts # Firebase Admin SDK setup
│   ├── utils/
│   │   └── response.ts     # Response helpers
│   ├── types/
│   │   └── context.ts      # Hono context types
│   └── index.ts            # Barrel export for core
│
├── config/
│   └── index.ts            # Environment configuration
│
├── openapi/
│   ├── schemas.ts          # Zod schemas for OpenAPI
│   ├── routes/             # OpenAPI route definitions
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── groups.ts
│   │   ├── permissions.ts
│   │   ├── settings.ts
│   │   └── audit.ts
│   └── index.ts            # OpenAPI app setup
│
├── routes/                 # Route handlers
│   ├── auth.ts
│   ├── users.ts
│   ├── groups.ts
│   ├── permissions.ts
│   ├── settings.ts
│   └── audit.ts
│
├── services/               # Business logic
│   ├── user.service.ts
│   ├── group.service.ts
│   ├── audit.service.ts
│   ├── settings.service.ts
│   └── index.ts            # Singleton instances
│
├── app.ts                  # Main Hono app
└── index.ts                # Firebase Functions entry

scripts/
└── generate-openapi.ts     # OpenAPI spec generator

docs/
├── README.md               # This documentation
└── api-reference.md        # API reference

openapi.json                # Generated OpenAPI spec
```

## Development

### Prerequisites

- Bun v1.0+
- Firebase CLI
- Firebase project with Firestore enabled

### Setup

```bash
# Install dependencies (from monorepo root)
bun install

# Set up environment
cp .env.example .env
```

### Environment Variables

```env
# Firebase
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json

# CORS (comma-separated origins)
CORS_ORIGINS=http://localhost:5173,http://localhost:4173

# Super Admin (user with this email is granted super admin on login)
SUPER_ADMIN_EMAIL=admin@example.com

# Environment
NODE_ENV=development
```

> **Note:** The Firebase project ID is defined in `firebase/.firebaserc` (single source of truth). The Firebase Admin SDK auto-detects the project from the service account credentials or emulator environment.

### Commands

```bash
# Start development server with watch
bun run dev

# Type checking
bun run typecheck

# Build for production
bun run build

# Generate OpenAPI spec
bun run generate:openapi

# Run tests
bun run test
```

## API Documentation

### OpenAPI Spec

The API follows OpenAPI 3.1 specification. Generate the spec:

```bash
bun run generate:openapi
# Outputs: openapi.json
```

### Swagger UI

When running locally, access Swagger UI at:
- `http://localhost:5001/api/v1/swagger`

### OpenAPI JSON

Raw spec available at:
- `http://localhost:5001/api/v1/doc`

## Architecture

### Request Flow

```
Request
  │
  ▼
┌─────────────────┐
│   Rate Limit    │  ← Blocks excessive requests
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│      CORS       │  ← Config-driven origin check
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Auth Middleware│  ← Validates Firebase token
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Permission Check │  ← Verifies user permissions
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Route Handler  │  ← Business logic
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Audit Middleware│  ← Logs sensitive actions
└────────┬────────┘
         │
         ▼
Response
```

### Custom Errors

Use typed errors for consistent error handling:

```typescript
import { NotFoundError, ForbiddenError, ValidationError } from '../core/errors';

// In services
throw new NotFoundError('User');           // 404
throw new ForbiddenError('Access denied'); // 403
throw new ValidationError('Invalid email');// 400
```

### Services

Services are singletons, accessed via `src/services/index.ts`:

```typescript
import { userService, groupService } from './services';

// Don't instantiate services in routes
const users = await userService.listUsers({ page: 1, limit: 20 });
```

### Configuration

All config in `src/config/index.ts`:

```typescript
import { config } from './config';

config.cors.origins     // Allowed CORS origins
config.rateLimit.max    // Requests per window
```

## Security

### Authentication

All endpoints (except `/health`) require a Firebase ID token:

```
Authorization: Bearer <firebase-id-token>
```

### Rate Limiting

| Endpoint Type | Limit |
|---------------|-------|
| General | 100 req/min |
| Auth endpoints | 10 req/min |

### CORS

Origins are configured via `CORS_ORIGINS` environment variable:

```env
CORS_ORIGINS=https://app.example.com,https://admin.example.com
```

### Super Admin

The super admin:
- Is determined by the `SUPER_ADMIN_EMAIL` environment variable (not first login)
- Cannot be deleted or demoted
- Bypasses all permission checks (has all permissions automatically)

### Adding New Permissions (Developer Guide)

When building on this template, you'll add permissions for your new features. Permissions are defined in code (shared package) and enforced at runtime.

#### 1. Define permissions in the shared package

Edit `packages/shared/src/constants/permissions.ts`:

```typescript
// Add entries to the PERMISSIONS record
'orders:create': { resource: 'orders', action: 'create', description: 'Create new orders' },
'orders:read':   { resource: 'orders', action: 'read',   description: 'View order details' },
'orders:update': { resource: 'orders', action: 'update', description: 'Update orders' },
'orders:delete': { resource: 'orders', action: 'delete', description: 'Delete orders' },
'orders:list':   { resource: 'orders', action: 'list',   description: 'View list of orders' },
```

Update the `Permission` and `PermissionResource` types in `packages/shared/src/core/types/permission.ts` to include the new resource.

#### 2. Protect your backend routes

Use the `requirePermission` middleware on your route handlers:

```typescript
import { requirePermission } from '../core/middleware/permissions';

// In your route setup:
app.get('/api/v1/orders', requirePermission('orders:list'), listOrdersHandler);
app.post('/api/v1/orders', requirePermission('orders:create'), createOrderHandler);
app.get('/api/v1/orders/:id', requirePermission('orders:read'), getOrderHandler);
app.put('/api/v1/orders/:id', requirePermission('orders:update'), updateOrderHandler);
app.delete('/api/v1/orders/:id', requirePermission('orders:delete'), deleteOrderHandler);
```

#### 3. How it works at runtime

- The auth middleware verifies the Firebase ID token and loads the user from Firestore
- The permission middleware reads the user's group, looks up the group's permissions, and checks if the required permission is included
- Super Admin (`isSuperAdmin: true`) bypasses all permission checks
- If the check fails, a `403 Forbidden` response is returned
- Admins assign permissions to groups via the Group Management UI — new permissions automatically appear there

## Database

### Collections

| Collection | Description |
|------------|-------------|
| `users` | User documents |
| `groups` | Permission groups |
| `settings` | App settings (singleton) |
| `auditLogs` | Audit trail |

### Indexes

Required Firestore indexes are in `firebase/firestore.indexes.json`.

## Testing

```bash
# Run tests
bun run test

# Watch mode
bun run test:watch
```

## Deployment

### Firebase Functions

```bash
# Deploy to Firebase
firebase deploy --only functions
```

### Environment Variables

Set in Firebase:
```bash
firebase functions:config:set \
  cors.origins="https://app.example.com" \
  app.super_admin_email="admin@example.com"
```

## Documentation

- [API Reference](./docs/api-reference.md)
- [OpenAPI Spec](./openapi.json)
