# Architecture Document

> **Purpose**: Comprehensive technical reference for the Admin Dashboard Template. Detailed enough for automated documentation tools (e.g., NotebookLM) to generate summaries, walkthroughs, and video content.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Tech Stack Overview](#2-tech-stack-overview)
3. [System Architecture](#3-system-architecture)
4. [Authentication Flow](#4-authentication-flow)
5. [Authorization & Permission System](#5-authorization--permission-system)
6. [API Request Lifecycle](#6-api-request-lifecycle)
7. [Database Design](#7-database-design)
8. [Backend Architecture](#8-backend-architecture)
9. [Frontend Architecture](#9-frontend-architecture)
10. [AI Service Architecture](#10-ai-service-architecture)
11. [Libraries, Frameworks & Design Philosophy](#11-libraries-frameworks--design-philosophy)
12. [Project Structure](#12-project-structure)
13. [Deployment & Operations](#13-deployment--operations)
14. [Security Model](#14-security-model)

---

## 1. Executive Summary

### What Is This?

The **Admin Dashboard Template** is a production-ready, reusable foundation for building B2C and B2B SaaS administration interfaces. It provides user management, group-based permissions, audit logging, application settings, and an AI assistant -- all running on your desktop with PostgreSQL for zero monthly cost.

### Who Is It For?

- **Developers** building SaaS products who need a fully functional admin panel on day one
- **Teams** that want Google OAuth authentication, role-based access control, and audit trails without building from scratch
- **Organizations** that need a template they can fork, customize, and deploy independently

### Key Capabilities

| Capability | Description |
|---|---|
| **User Management** | List, search, create, update, disable, enable, delete users with multi-group assignments |
| **Group Management** | Create permission groups, assign granular permissions, set default groups |
| **Permission System** | 12 built-in permissions across 4 resources, extensible with custom permissions |
| **Audit Logging** | Every admin action logged with actor, action, resource, timestamp, and before/after diffs |
| **AI Assistant** | Text and voice chat powered by Gemini, with permission-aware tool calling |
| **Template System** | Fork-and-customize architecture with upstream sync for core updates |

### Architecture at a Glance

The system is a **monorepo with three packages** (shared, backend, frontend) plus an optional AI service. The backend runs as a standalone Bun server (Hono framework), the frontend is a React SPA deployed to Cloudflare Pages, and the database is PostgreSQL accessed via Drizzle ORM. Authentication uses Google OAuth via Firebase Auth (free tier). The backend is exposed to the internet via Cloudflare Tunnel.

---

## 2. Tech Stack Overview

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Runtime** | Bun | Latest | Package manager, bundler, test runner, dev server |
| **Frontend Framework** | React | 18.2.0 | UI component library |
| **Routing** | React Router | 6.22.0 | Client-side routing with data loaders |
| **State Management** | Zustand | 4.5.0 | Lightweight stores (auth, theme, AI chat) |
| **Server State** | TanStack Query | 5.17.19 | Data fetching, caching, mutations |
| **Tables** | TanStack Table | 8.21.3 | Headless table rendering with sorting, selection |
| **Forms** | React Hook Form | 7.50.1 | Form state management with Zod validation |
| **Validation** | Zod | 3.22-3.23 | Schema validation (shared across frontend/backend) |
| **CSS Framework** | Tailwind CSS | 3.4.1 | Utility-first styling |
| **UI Components** | shadcn/ui + Radix UI | Latest | Accessible, composable primitives |
| **Icons** | Lucide React | 0.323.0 | Icon library |
| **Backend Framework** | Hono | 4.6.0 | Lightweight web framework on Bun |
| **API Documentation** | @hono/zod-openapi | 0.18.0 | OpenAPI spec generation from Zod schemas |
| **Database** | PostgreSQL | >=14 | Relational database |
| **ORM** | Drizzle ORM | 0.45.1 | Type-safe SQL query builder |
| **Database Driver** | postgres.js | 3.4.8 | PostgreSQL client for Node.js/Bun |
| **Authentication** | Firebase Auth | 10.8.0 (client) / 12.7.0 (admin) | Google OAuth provider (free tier) |
| **AI Models** | Google Gemini | 2.0 Flash | Text chat and voice interaction |
| **AI SDK** | @google/generative-ai | 0.21.0 | Gemini API client |
| **Linting** | Biome | Latest | Linter + formatter (replaces ESLint + Prettier) |
| **Frontend Hosting** | Cloudflare Pages | -- | Static site hosting with CDN |
| **Backend Exposure** | Cloudflare Tunnel | -- | Secure tunnel to localhost |

---

## 3. System Architecture

### Diagram

```mermaid
flowchart TB
    subgraph Client["Browser (React SPA)"]
        FE["Frontend<br/>React 18 + Tailwind<br/>Port 5173"]
    end

    subgraph CF["Cloudflare"]
        CFP["Cloudflare Pages<br/>(CDN + Static SPA)"]
        CFT["Cloudflare Tunnel"]
    end

    subgraph Desktop["Desktop Machine"]
        BE["Backend API<br/>Bun + Hono<br/>Port 3000"]
        PG[("PostgreSQL<br/>5 Tables:<br/>users, groups,<br/>user_groups, audit_logs,<br/>settings")]
        AI["AI Service<br/>Hono + WebSocket<br/>Port 3001"]
    end

    subgraph Firebase["Firebase (Free Tier)"]
        FA["Firebase Auth<br/>(Google OAuth)"]
    end

    subgraph Google["Google APIs"]
        GM["Gemini API<br/>2.0 Flash"]
        GML["Gemini Live API<br/>2.0 Flash Live"]
    end

    FE -->|"HTTPS"| CFP
    FE -->|"OAuth popup"| FA
    FE -->|"API calls via tunnel"| CFT
    CFT -->|"localhost:3000"| BE
    FE -->|"WebSocket /ws/chat"| AI

    BE -->|"Drizzle ORM"| PG
    BE -->|"Verify tokens"| FA

    AI -->|"REST API"| GM
    AI -->|"WebSocket"| GML
    AI -->|"HTTP calls<br/>(tool execution)"| BE
    AI -->|"Verify tokens"| FA

    style Client fill:#e1f5fe
    style CF fill:#fff3e0
    style Desktop fill:#e8f5e9
    style Firebase fill:#fce4ec
    style Google fill:#fff9c4
```

### Data Flow Summary

1. **Browser** loads the React SPA from Cloudflare Pages (CDN-backed)
2. **Authentication**: User clicks "Sign in with Google" -> Firebase Auth popup -> returns ID token
3. **API calls**: Frontend sends HTTPS requests -> Cloudflare Tunnel -> Bun backend on localhost:3000 -> Hono processes request -> Drizzle queries PostgreSQL
4. **AI chat**: Frontend opens WebSocket to AI service -> authenticates with Firebase token -> sends text/audio -> AI service calls Gemini -> executes tools via backend API -> streams response back
5. **Data**: All state stored in PostgreSQL. Backend uses Drizzle ORM for type-safe queries.

---

## 4. Authentication Flow

### Diagram

```mermaid
sequenceDiagram
    actor User
    participant Browser as React SPA
    participant Firebase as Firebase Auth
    participant Backend as Hono Backend
    participant DB as PostgreSQL

    User->>Browser: Click "Sign in with Google"
    Browser->>Firebase: signInWithPopup(GoogleAuthProvider)
    Firebase-->>Browser: Firebase User + ID Token

    Browser->>Backend: POST /api/v1/auth/login<br/>Authorization: Bearer {idToken}
    Backend->>Firebase: verifyIdToken(token)
    Firebase-->>Backend: Decoded token (uid, email)

    Backend->>DB: SELECT user WHERE id = uid

    alt New User
        Backend->>DB: INSERT user<br/>(email, displayName, photoURL,<br/>groupIds via user_groups)
        Backend->>DB: Initialize default groups if missing
    else Existing User
        Backend->>DB: UPDATE lastLoginAt,<br/>displayName, photoURL
    end

    alt Email matches SUPER_ADMIN_EMAIL
        Backend->>DB: UPDATE isSuperAdmin = true<br/>INSERT into admin group
    end

    Backend-->>Browser: 200 OK { user, token }

    Browser->>Backend: GET /api/v1/auth/me<br/>Authorization: Bearer {idToken}
    Backend->>DB: SELECT user + JOIN groups for permissions
    Backend-->>Browser: { user, permissions[], groupNames[] }

    Browser->>Browser: Store in Zustand auth store<br/>(sessionStorage persistence)
    Browser->>Browser: Redirect to dashboard (or original URL)

    Note over Browser,DB: Subsequent requests include<br/>Authorization: Bearer {idToken}
```

### Step-by-Step Explanation

1. **Google OAuth Popup**: The React app calls `signInWithPopup()` with `GoogleAuthProvider`. Firebase handles the OAuth flow entirely.
2. **Token Acquisition**: Firebase returns a Firebase User object. The app extracts an ID token (JWT signed by Google).
3. **Backend Login**: The app sends the ID token to `POST /auth/login`. The backend verifies the token using Firebase Admin SDK.
4. **User Upsert**: If the user doesn't exist in PostgreSQL, a new row is created with default group assignments via the `user_groups` junction table. If the user exists, their last login time and profile info are updated.
5. **Super Admin Check**: On every login, the backend checks if the user's email matches `SUPER_ADMIN_EMAIL`. If so, the user gets `isSuperAdmin: true` and is added to the admin group.
6. **Permission Fetch**: The app calls `GET /auth/me` to get the full user profile including merged permissions from all assigned groups.
7. **Client State**: User data (including permissions and group memberships) is stored in the Zustand auth store, persisted to `sessionStorage` (excluding permissions and `isSuperAdmin`, which are always fetched fresh).

### Key Design Decisions

- **Google OAuth only** -- No email/password authentication. Even in development with emulators, Firebase Auth shows a Google sign-in popup.
- **Super Admin by email** -- Determined by `SUPER_ADMIN_EMAIL` environment variable, not by first login or self-registration.
- **Token refresh** -- The API client automatically refreshes tokens on 401 responses using `getIdToken(forceRefresh: true)`.
- **Logout** -- Calls Firebase `signOut()`, clears the auth store, clears TanStack Query cache (prevents data leaks between sessions), and redirects to `/login`.

---

## 5. Authorization & Permission System

### Permission Model

The system uses a **multi-group, permission-based** authorization model:

```
User -> belongs to N Groups -> each Group has M Permissions -> User's effective permissions = union of all group permissions
```

### Permission Definitions

**Core Permissions** (11 -- template infrastructure, defined in `packages/backend/src/core/permissions.ts`):

| Permission | Resource | Action | Description |
|---|---|---|---|
| `users:create` | users | create | Create new users |
| `users:read` | users | read | View user details |
| `users:update` | users | update | Update user information |
| `users:delete` | users | delete | Delete users |
| `users:list` | users | list | View list of users |
| `groups:create` | groups | create | Create new groups |
| `groups:read` | groups | read | View group details |
| `groups:update` | groups | update | Update group information |
| `groups:delete` | groups | delete | Delete groups |
| `groups:list` | groups | list | View list of groups |
| `audit:list` | audit | list | View audit logs |

**Custom Permissions** (defined in `packages/shared/src/constants/permissions.ts`):

| Permission | Resource | Action | Description |
|---|---|---|---|
| `ai:use` | ai | use | Use AI assistant |

Developers add new custom permissions to the `CUSTOM_PERMISSIONS` record. They auto-merge with core permissions and appear in the Group Management UI.

### Default Groups

| Group | ID | System? | Default? | Permissions |
|---|---|---|---|---|
| **Admin** | `admin` | Yes | No | All 12 permissions (core + custom) |
| **Users** | `users` | Yes | Yes | `users:read`, `users:update` |

New users are automatically assigned to the default group on first login. The admin group gets all permissions (including any custom ones added later).

### Permission Resolution

```mermaid
sequenceDiagram
    participant Client as React App
    participant MW as Auth Middleware
    participant PMW as Permission Middleware
    participant Handler as Route Handler
    participant DB as PostgreSQL

    Client->>MW: Request with Bearer token
    MW->>MW: Verify Firebase ID token
    MW->>DB: SELECT user + JOIN user_groups + JOIN groups
    MW->>MW: Merge permissions<br/>(Set union of all group permissions)
    MW->>MW: Attach AuthUser to context<br/>(uid, email, permissions[], isSuperAdmin)

    MW->>PMW: Pass to permission middleware

    alt Super Admin
        PMW->>Handler: Bypass -- always allowed
    else Has Required Permission
        PMW->>Handler: Allow request
    else Missing Permission
        PMW-->>Client: 403 Forbidden<br/>{code: "FORBIDDEN",<br/>message: "Missing permission: users:delete"}
    end
```

### Permission Middleware Variants

The backend provides four permission middleware factories:

| Factory | Usage | Behavior |
|---|---|---|
| `requirePermission(p)` | Most routes | User must have exactly this permission |
| `requireAnyPermission([p1, p2])` | OR logic | User must have at least one |
| `requireAllPermissions([p1, p2])` | AND logic | User must have all listed permissions |
| `requireSuperAdmin()` | Critical ops | Only super admins pass |

### Frontend Permission Enforcement

The frontend mirrors backend checks for UI rendering (not security -- the backend is the authoritative enforcer):

| Component | Purpose |
|---|---|
| `RequireAuth` | Route guard -- redirects to `/login` if unauthenticated |
| `RequirePermission` | Route guard -- redirects to `/forbidden` if missing permission |
| `PermissionGate` | Conditional render -- shows children only if user has permission |
| `WithPermission` | Inline conditional -- renders fallback if no permission |
| `withPermission(Comp, perm)` | HOC -- wraps component with permission check |

The `usePermissions()` hook provides convenience methods:

```typescript
const { hasPermission, hasAnyPermission, isAdmin, canManageUsers } = usePermissions();
```

---

## 6. API Request Lifecycle

### Middleware Chain

Every API request passes through a defined middleware chain before reaching the route handler:

```mermaid
sequenceDiagram
    participant Client as Browser
    participant CORS as CORS Middleware
    participant RL as Rate Limiter
    participant Auth as Auth Middleware
    participant Perm as Permission Middleware
    participant Val as Zod Validation
    participant Handler as Route Handler
    participant Audit as Audit Logger
    participant DB as PostgreSQL
    participant Resp as Response Helper

    Client->>CORS: HTTPS Request

    Note over CORS: Check Origin against<br/>config.cors.origins[]<br/>Set Access-Control headers
    CORS->>RL: Pass

    Note over RL: Key: user:{uid}:{path}<br/>or ip:{ip}:{path}<br/>Window: 60s, Max: 100<br/>(Auth: 10/min)

    alt Rate Limit Exceeded
        RL-->>Client: 429 Too Many Requests<br/>Retry-After: {seconds}
    end
    RL->>Auth: Pass

    Note over Auth: Extract Bearer token<br/>Verify Firebase ID token<br/>Fetch user from PostgreSQL<br/>Merge group permissions

    alt Invalid/Expired Token
        Auth-->>Client: 401 Unauthorized
    end
    alt User Disabled
        Auth-->>Client: 403 USER_DISABLED
    end
    Auth->>Perm: Pass (AuthUser in context)

    Note over Perm: Check user.permissions<br/>includes required permission<br/>(Super admin bypasses)

    alt Missing Permission
        Perm-->>Client: 403 Forbidden
    end
    Perm->>Val: Pass

    Note over Val: Zod schema validates<br/>body, params, query<br/>(via @hono/zod-openapi)

    alt Validation Error
        Val-->>Client: 400 VALIDATION_ERROR<br/>{details: ZodError[]}
    end
    Val->>Handler: Pass (validated data)

    Handler->>DB: Business logic<br/>(Drizzle ORM queries)
    DB-->>Handler: Result

    Handler->>Audit: Log action<br/>(actor, action, resource,<br/>changes, IP, user-agent)
    Audit->>DB: INSERT into audit_logs

    Handler->>Resp: Format response
    Resp-->>Client: 200 OK<br/>{success: true, data: {...}}
```

### Response Format

All API responses follow a consistent envelope:

**Success**:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "hasMore": true
  }
}
```

**Error**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found",
    "details": null
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `INVALID_TOKEN` | 401 | Malformed token |
| `TOKEN_EXPIRED` | 401 | Token has expired |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `ALREADY_EXISTS` | 409 | Duplicate resource |
| `CONFLICT` | 409 | Conflicting state |
| `VALIDATION_ERROR` | 400 | Request body/params invalid |
| `INVALID_INPUT` | 400 | Bad input data |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | Dependent service down |
| `CANNOT_DELETE_SELF` | 403 | Cannot delete own account |
| `CANNOT_DISABLE_SELF` | 403 | Cannot disable own account |
| `CANNOT_MODIFY_SUPER_ADMIN` | 403 | Cannot modify super admin |
| `CANNOT_DELETE_SYSTEM_GROUP` | 403 | System groups are protected |
| `CANNOT_DELETE_DEFAULT_GROUP` | 403 | Default group is protected |
| `GROUP_HAS_USERS` | 400 | Group has members, cannot delete |
| `USER_DISABLED` | 403 | User account is disabled |

---

## 7. Database Design

### PostgreSQL Tables

The application uses 5 PostgreSQL tables managed by Drizzle ORM. All data access goes through the backend service layer using type-safe Drizzle queries.

#### `users` Table

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Firebase Auth UID |
| `email` | TEXT | NOT NULL, UNIQUE | User email (lowercased) |
| `display_name` | TEXT | NOT NULL | Full name from Google profile |
| `photo_url` | TEXT | NULL | Google profile photo URL |
| `status` | TEXT | NOT NULL, DEFAULT 'active' | `'active'` or `'disabled'` |
| `is_super_admin` | BOOLEAN | NOT NULL, DEFAULT false | Whether this user is super admin |
| `disabled_at` | TIMESTAMP | NULL | When the account was disabled |
| `disabled_by` | TEXT | NULL | UID of admin who disabled the account |
| `preferences` | JSONB | DEFAULT `{theme: 'system'}` | User preferences (theme, etc.) |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Account creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last modification timestamp |
| `last_login_at` | TIMESTAMP | NULL | Last login timestamp |

**Indexes**: `users_status_idx` on `status`

#### `groups` Table

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Group identifier (e.g., 'admin', 'users') |
| `name` | TEXT | NOT NULL, UNIQUE | Display name |
| `description` | TEXT | NOT NULL, DEFAULT '' | Group description |
| `permissions` | TEXT[] | NOT NULL, DEFAULT `{}` | Array of permission strings |
| `is_default` | BOOLEAN | NOT NULL, DEFAULT false | Whether new users join this group |
| `is_system` | BOOLEAN | NOT NULL, DEFAULT false | Whether this is a system group (cannot delete) |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last modification timestamp |
| `created_by` | TEXT | NOT NULL | UID of creator |
| `updated_by` | TEXT | NOT NULL | UID of last modifier |

#### `user_groups` Junction Table

| Column | Type | Constraints | Description |
|---|---|---|---|
| `user_id` | TEXT | NOT NULL, FK -> users.id ON DELETE CASCADE | User reference |
| `group_id` | TEXT | NOT NULL, FK -> groups.id ON DELETE CASCADE | Group reference |

**Primary Key**: (`user_id`, `group_id`)

This junction table replaces the Firestore `groupIds` array pattern, enabling proper relational JOINs for permission resolution.

#### `audit_logs` Table

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Unique log entry ID |
| `timestamp` | TIMESTAMP | NOT NULL, DEFAULT NOW() | When the action occurred |
| `actor_id` | TEXT | NOT NULL | UID of the user who performed the action |
| `actor_email` | TEXT | NOT NULL | Email of the actor |
| `actor_name` | TEXT | NOT NULL | Display name of the actor |
| `action` | TEXT | NOT NULL | What was done (e.g., USER_CREATED, GROUP_DELETED) |
| `resource` | TEXT | NOT NULL | What was acted on (users/groups/settings/auth) |
| `resource_id` | TEXT | NOT NULL | ID of the affected resource |
| `description` | TEXT | NOT NULL | Human-readable description |
| `changes` | JSONB | NULL | `{ before: {...}, after: {...} }` -- state diff |
| `ip_address` | TEXT | NULL | Client IP address |
| `user_agent` | TEXT | NULL | Client user-agent string |

**Indexes**: `timestamp`, `actor_id`, `action`, `resource`, `(resource, resource_id)`

**Audit Actions** (15 total):

| Category | Actions |
|---|---|
| Auth | `LOGIN`, `LOGOUT`, `LOGIN_FAILED` |
| Users | `USER_CREATED`, `USER_UPDATED`, `USER_DISABLED`, `USER_ENABLED`, `USER_DELETED`, `USER_GROUP_ADDED`, `USER_GROUP_REMOVED` |
| Groups | `GROUP_CREATED`, `GROUP_UPDATED`, `GROUP_DELETED`, `GROUP_PERMISSIONS_CHANGED` |
| Settings | `SETTINGS_UPDATED` |

#### `settings` Table

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Always `'app'` (singleton row) |
| `app_name` | TEXT | NOT NULL, DEFAULT 'Admin Dashboard' | Application display name |
| `default_group_id` | TEXT | NOT NULL, DEFAULT 'users' | Group assigned to new users |
| `features` | JSONB | NOT NULL | Feature flags (see below) |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last modification timestamp |
| `updated_by` | TEXT | NOT NULL, DEFAULT 'system' | UID of last modifier |

**Feature Flags**:

| Feature | Type | Default | Description |
|---|---|---|---|
| `auditLogging` | boolean | `true` | Enable/disable audit log recording |
| `userRegistration` | boolean | `true` | Allow new user creation |
| `aiAssistant` | `'voice'` \| `'chat'` \| `'disabled'` | `'disabled'` | AI assistant mode |

### Schema Definition (Drizzle ORM)

The database schema is defined in `packages/backend/src/db/schema.ts` using Drizzle's `pgTable` builder. The database connection is configured in `packages/backend/src/db/index.ts` using the `DATABASE_URL` environment variable.

Migrations are managed via `drizzle-kit`:
- `bun run db:push` -- Push schema changes directly (development)
- `bun run db:generate` -- Generate SQL migration files
- `bun run db:migrate` -- Run pending migrations
- `bun run db:studio` -- Open Drizzle Studio GUI

---

## 8. Backend Architecture

### Framework: Hono on Bun

The backend uses [Hono](https://hono.dev), a lightweight web framework running as a standalone Bun server on port 3000. The entry point (`packages/backend/src/index.ts`) creates a `Bun.serve()` instance that delegates to the Hono app.

### Application Setup

The Hono app is configured in `packages/backend/src/app.ts`:

1. CORS middleware (origins from `config.cors.origins`)
2. Request ID generation (attached to context)
3. Rate limiting middleware
4. Route registration (all route groups mounted under `/api/v1`)
5. Global error handler (catches AppError, HTTPException, ZodError, database errors)
6. OpenAPI documentation endpoints (`/explorer`, `/doc`)
7. Health check endpoint (`/health`)

### API Routes

#### Authentication (`/api/v1/auth`)

| Method | Path | Middleware | Purpose |
|---|---|---|---|
| POST | `/login` | Rate limit (10/min) | Verify token, create/update user, initialize default groups |
| POST | `/logout` | `authMiddleware` | Log out and record audit |
| GET | `/me` | `authMiddleware` | Get current user with permissions and group names |
| GET | `/verify` | `authMiddleware` | Verify token validity |

#### Users (`/api/v1/users`)

| Method | Path | Middleware | Purpose |
|---|---|---|---|
| GET | `/` | `authMiddleware`, `requirePermission('users:list')` | List users with pagination, search, filters |
| GET | `/:id` | `authMiddleware`, `requirePermission('users:read')` | Get user by ID with permissions |
| PUT | `/:id` | `authMiddleware`, `requirePermission('users:update')` | Update user details |
| DELETE | `/:id` | `authMiddleware`, `requirePermission('users:delete')` | Delete user (not self, not super admin) |
| POST | `/:id/disable` | `authMiddleware`, `requirePermission('users:update')` | Disable user account |
| POST | `/:id/enable` | `authMiddleware`, `requirePermission('users:update')` | Enable user account |
| POST | `/:id/groups/add` | `authMiddleware`, `requirePermission('users:update')` | Add user to a group |
| POST | `/:id/groups/remove` | `authMiddleware`, `requirePermission('users:update')` | Remove user from a group |

#### Groups (`/api/v1/groups`)

| Method | Path | Middleware | Purpose |
|---|---|---|---|
| GET | `/` | `authMiddleware`, `requirePermission('groups:list')` | List groups with user counts and search |
| POST | `/` | `authMiddleware`, `requirePermission('groups:create')` | Create new group |
| GET | `/:id` | `authMiddleware`, `requirePermission('groups:read')` | Get group by ID |
| PUT | `/:id` | `authMiddleware`, `requirePermission('groups:update')` | Update group name/description |
| DELETE | `/:id` | `authMiddleware`, `requirePermission('groups:delete')` | Delete group (not system, not default, no users) |
| GET | `/:id/users` | `authMiddleware`, `requirePermission('groups:read')` | List users in group |
| PUT | `/:id/permissions` | `authMiddleware`, `requirePermission('groups:update')` | Replace group permissions |

#### Permissions (`/api/v1/permissions`)

| Method | Path | Middleware | Purpose |
|---|---|---|---|
| GET | `/` | `authMiddleware` | List all permissions (filtered by user's access) |
| GET | `/my` | `authMiddleware` | Get current user's permissions |
| GET | `/check/:permission` | `authMiddleware` | Check if user has specific permission |
| GET | `/resources` | `authMiddleware` | List permission resource types |

#### Audit Logs (`/api/v1/audit`)

| Method | Path | Middleware | Purpose |
|---|---|---|---|
| GET | `/` | `authMiddleware`, `requirePermission('audit:list')` | List logs with date range, action, resource filters |
| GET | `/stats` | `authMiddleware`, `requirePermission('audit:list')` | Aggregate stats (by action/resource) |
| GET | `/actions` | `authMiddleware`, `requirePermission('audit:list')` | List valid audit actions |
| GET | `/resources` | `authMiddleware`, `requirePermission('audit:list')` | List valid audit resource types |
| GET | `/user/:userId` | `authMiddleware`, `requirePermission('audit:list')` | Logs for specific actor |
| GET | `/resource/:resource/:resourceId` | `authMiddleware`, `requirePermission('audit:list')` | Logs for specific resource |
| GET | `/:id` | `authMiddleware`, `requirePermission('audit:list')` | Get single audit log |

#### Settings (`/api/v1/settings`)

| Method | Path | Middleware | Purpose |
|---|---|---|---|
| GET | `/` | `authMiddleware`, `requirePermission('users:read')` | Get app settings with default group details |
| PUT | `/` | `authMiddleware`, `requireAllPermissions(['users:list', 'users:update'])` | Update settings |
| GET | `/features` | `authMiddleware`, `requirePermission('users:read')` | Get feature flags only |
| PUT | `/features/:feature` | `authMiddleware`, `requireAllPermissions(['users:list', 'users:update'])` | Toggle a feature flag |

#### Utility Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Returns `{ status: 'healthy', timestamp, version: '1.0.0' }` |
| GET | `/explorer` | API Explorer (Scalar + Firebase Auth, dev only) |
| GET | `/doc` | OpenAPI JSON spec |

### Service Layer

Business logic is encapsulated in singleton services (`packages/backend/src/services/`):

| Service | Key Methods |
|---|---|
| **UserService** | `getUser`, `listUsers`, `createOrUpdateOnLogin`, `updateUser`, `deleteUser`, `disableUser`, `enableUser`, `addUserToGroup`, `removeUserFromGroup` |
| **GroupService** | `listGroups`, `searchGroups`, `createGroup`, `updateGroup`, `deleteGroup`, `updateGroupPermissions`, `initializeDefaultGroups`, `setDefaultGroup` |
| **AuditService** | `createAuditLog`, `listAuditLogs`, `getAuditStats`, `getAuditLogsForResource`, `getAuditLogsForUser`, `cleanupOldLogs` |
| **SettingsService** | `getSettings`, `updateSettings`, `initializeSettings`, `isFeatureEnabled`, `toggleFeature` |

All services use Drizzle ORM for database access with type-safe queries. Transactions use `db.transaction()` for multi-table operations.

### Configuration

All environment-specific settings in `packages/backend/src/config/index.ts`:

| Setting | Environment Variable | Default |
|---|---|---|
| `cors.origins` | `CORS_ORIGINS` | `["http://localhost:5173", "http://localhost:4173"]` |
| `rateLimit.windowMs` | -- | `60000` (1 minute) |
| `rateLimit.max` | -- | `100` requests per window |
| `rateLimit.authMax` | -- | `10` requests per window |
| `audit.maxHistoryDays` | `AUDIT_MAX_HISTORY_DAYS` | `90` days |
| `superAdminEmail` | `SUPER_ADMIN_EMAIL` | Required |
| `database.url` | `DATABASE_URL` | `postgresql://admin_user:admin_local_dev@localhost:5432/admin_dashboard` |

### Rate Limiting

In-memory rate limiter keyed by `user:{uid}:{path}` (authenticated) or `ip:{ip}:{path}` (unauthenticated):

| Scope | Limit | Window |
|---|---|---|
| General API | 100 requests | 1 minute |
| Auth endpoints (`/auth/login`, `/auth/logout`) | 10 requests | 1 minute |

Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`. On 429, includes `Retry-After` header.

---

## 9. Frontend Architecture

### Routing

React Router v6 with data router pattern. All routes defined in `packages/frontend/src/App.tsx`:

```
RootLayout (NavigationProgress + Outlet + Toaster)
+-- /login                -> Login
+-- ProtectedLayout (RequireAuth -> AppLayout)
    +-- /                 -> Dashboard
    +-- /users            -> UserList (requires users:list)
    +-- /users/:id        -> UserDetail (requires users:read)
    +-- /groups           -> GroupList (requires groups:list)
    +-- /groups/new       -> GroupDetail (requires groups:create)
    +-- /groups/:id       -> GroupDetail (requires groups:read)
    +-- /audit-logs       -> AuditLogs (requires audit:list)
    +-- /profile          -> Settings
    +-- /forbidden        -> Forbidden (403)
    +-- /404              -> NotFound (404)
```

### State Management

Three Zustand stores manage client-side state:

#### Auth Store (`core/stores/auth-store.ts`)

- **Persisted** to `sessionStorage` (excludes permissions and `isSuperAdmin` -- always fetched fresh)
- Super admins always return `true` for any permission check
- Supports wildcard permissions (`*`, `resource:*`)

#### Theme Store (`stores/theme-store.ts`)

- **Persisted** to `localStorage`
- Listens to system `prefers-color-scheme` media query
- Applies theme class to `document.documentElement`

#### AI Chat Store (`stores/ai-chat-store.ts`)

- **Not persisted** (in-memory only, reset on page refresh)
- Manages WebSocket connection state and message history

### TanStack Query (Server State)

Data fetching uses TanStack Query v5 with a query key factory. **Defaults**: 5-minute stale time, 1 retry, no auto-refetch on window focus. Cache is cleared on logout.

**Invalidation pattern**: After mutations, invalidate the `all` key to refetch lists, and the specific `detail` key if applicable.

### API Client

The `AdminDashboardApi` class (`core/api/client.ts`) handles all backend communication:

- **Base URL**: From `PUBLIC_API_BASE_URL` env var (e.g., `/api/v1` in dev, `https://api.yourdomain.com/api/v1` in prod)
- **Timeout**: 30 seconds per request
- **Retry**: Up to 3 retries with exponential backoff (1s, 2s, 4s) for GET/HEAD/OPTIONS/PUT on network errors, 5xx, and 429
- **Token management**: Automatically attaches `Authorization: Bearer {token}` header. On 401, force-refreshes the token and retries once.

### Pages

| Page | Component | Key Features |
|---|---|---|
| **Dashboard** | `Dashboard.tsx` | Stats cards (user count, group count, audit count), recent activity feed |
| **Login** | `Login.tsx` | Google OAuth button, theme toggle |
| **User List** | `users/UserList.tsx` | Searchable table, status/group filters, bulk delete, pagination |
| **User Detail** | `users/UserDetail.tsx` | Edit profile, multi-group assignment (add/remove), appearance settings |
| **Group List** | `groups/GroupList.tsx` | Searchable table, member count badges, bulk delete |
| **Group Detail** | `groups/GroupDetail.tsx` | Edit name/description, toggle individual permissions |
| **Audit Logs** | `AuditLogs.tsx` | Date range picker, action/resource filters, detail dialog with JSON diffs |
| **Settings** | `Settings.tsx` | User profile preferences |
| **Forbidden** | `Forbidden.tsx` | 403 error page with back/home buttons |
| **Not Found** | `NotFound.tsx` | 404 error page |

### Shared Feature Components

Reusable components in `components/features/`:

| Component | Purpose |
|---|---|
| `PageHeader` | Simple page title + description |
| `ListHeader` | Title + description + permission-gated create button |
| `SearchFilterBar` | Search input with icon + optional filter children |
| `BulkActionBar` | "N selected" bar with permission-gated delete button |
| `DeleteConfirmationDialog` | Destructive action confirmation dialog |
| `MetadataCard` | Card with icon + label + value rows |
| `PermissionsCard` | Displays permission badges with super admin indicator |
| `NotificationsCard` | Email/push notification toggles (react-hook-form) |
| `AppearanceCard` | Theme selector (light/dark/system) |
| `ErrorStatePage` | Full-page error layout (404, 403) |
| `ThemeToggle` | Light/dark mode toggle button |

### Build Configuration

The frontend builds with **Bun's bundler** (`packages/frontend/build.ts`):

1. Compile Tailwind CSS to `dist/styles.css`
2. Bundle TypeScript/React with tree-shaking, minification, and code splitting
3. Generate content-hashed filenames for cache busting
4. Inject environment variables via `define` (all `PUBLIC_*` variables)
5. Copy static assets

**Path alias**: `@/*` maps to `src/*` (configured in `tsconfig.json`).

---

## 10. AI Service Architecture

### Overview

The AI service is a standalone Hono server running on port 3001 that provides an AI assistant with text and voice modes. It connects the frontend to Google Gemini via WebSocket, with permission-aware tool calling that executes admin operations through the backend API.

### WebSocket Protocol

```mermaid
sequenceDiagram
    actor User
    participant Browser as React SPA
    participant AI as AI Service<br/>(Port 3001)
    participant Gemini as Gemini API
    participant Backend as Hono Backend

    User->>Browser: Open AI chat
    Browser->>AI: WebSocket connect /ws/chat

    Browser->>AI: {type: "auth", token: "..."}
    AI->>AI: Verify Firebase token
    AI->>Backend: GET /auth/me (fetch permissions)
    AI-->>Browser: {type: "authenticated", user: {...}}
    AI-->>Browser: {type: "greeting", content: "Hello! How can I help?"}

    User->>Browser: Type message
    Browser->>AI: {type: "text", content: "Show me all users"}
    AI-->>Browser: {type: "status", status: "thinking"}

    AI->>Gemini: sendMessage("Show me all users")<br/>with tools filtered by user permissions
    Gemini-->>AI: functionCall: listUsers({})

    AI-->>Browser: {type: "tool_call", name: "listUsers", status: "calling"}
    AI->>Backend: GET /users (with user's token)
    Backend-->>AI: {success: true, data: [...]}
    AI-->>Browser: {type: "tool_call", name: "listUsers", status: "done"}

    AI->>Gemini: functionResponse: {users: [...]}
    Gemini-->>AI: "Here are your users: ..."

    AI-->>Browser: {type: "text", content: "Here are your users: ...", done: true}
    AI-->>Browser: {type: "status", status: "idle"}
```

### Tool Registry

Tools are **auto-generated at build time** from the backend's OpenAPI spec:

1. `scripts/generate-tools.ts` reads `packages/backend/openapi.json`
2. Each API operation becomes a Gemini function declaration
3. Permissions are inferred from tag + HTTP method
4. At runtime, `getToolsForUser(permissions, isSuperAdmin)` filters tools to only those the user has permission to use

### Gemini Integration

| Feature | Chat Mode | Voice Mode |
|---|---|---|
| Model | `gemini-2.0-flash` | `gemini-2.0-flash-live-001` |
| Protocol | REST (`sendMessage()`) | WebSocket (Gemini Live bidirectional) |
| Response | Complete text + function calls | Streaming audio + text + function calls |
| Voice | N/A | Prebuilt voice "Aoede" |
| Audio format | N/A | PCM 16kHz |

---

## 11. Libraries, Frameworks & Design Philosophy

### Why Hono (Backend)?

Hono is a lightweight, TypeScript-first web framework. Key benefits:

- **Bun-native** -- Runs directly on Bun's HTTP server with excellent performance
- **Zod-OpenAPI integration** -- Route schemas generate API documentation automatically
- **Middleware ecosystem** -- CORS, rate limiting, error handling all built-in
- **Type safety** -- Context variables (AuthUser, requestId) are fully typed

### Why PostgreSQL + Drizzle ORM (Database)?

PostgreSQL provides a full-featured relational database:

- **ACID transactions** -- Proper multi-table consistency for user-group operations
- **Native arrays** -- `TEXT[]` for permission lists, cleaner than JSON
- **JSONB** -- Flexible storage for preferences and feature flags with indexing
- **JOINs** -- Proper relational queries for user-group-permission resolution
- **pg_dump** -- Simple, reliable backups
- **Free** -- Runs locally on your desktop

Drizzle ORM provides type-safe SQL:

- **Schema-first** -- TypeScript table definitions generate types automatically
- **Lightweight** -- Thin query builder, not a heavy ORM
- **Migration tooling** -- `drizzle-kit` for schema evolution
- **Studio** -- Built-in database GUI for development

### Why Cloudflare Pages + Tunnel?

- **Cloudflare Pages** -- Free CDN-backed static hosting with instant deploys
- **Cloudflare Tunnel** -- Free, secure exposure of localhost to the internet without port forwarding
- **Zero cost** -- Both services are free for personal use
- **Custom domains** -- Full SSL support with automatic certificate management

### Why Keep Firebase Auth?

- **Completely free** -- No usage limits for authentication
- **Google OAuth** -- Handles the entire OAuth flow (popup, token management, session persistence)
- **Minimal coupling** -- Only used for `signInWithPopup()` on frontend and `verifyIdToken()` on backend
- **Maximum code reuse** -- Frontend auth hooks and backend auth middleware work unchanged

### Why Zustand, TanStack Query, Tailwind, Bun, Biome?

See the frontend and backend architecture sections above for detailed rationale on each library choice.

---

## 12. Project Structure

```
admin-dashboard-template/
+-- docs/
|   +-- ARCHITECTURE.md         # This document
|   +-- BRD.md                  # Business Requirements Document
|   +-- DEPLOYMENT.md           # Production deployment guide
|   +-- EXTENDING.md            # How to add features
|   +-- UPGRADING.md            # How to pull template updates
|   +-- CONFIGURATION.md        # Environment variables reference
|   +-- TROUBLESHOOTING.md      # Common errors and fixes
|   +-- LOCAL_DEVELOPMENT.md    # Dev environment and testing
|   +-- MIGRATION_PLAN.md       # Historical: Firebase -> PostgreSQL migration
|
+-- infrastructure/
|   +-- cloudflare/
|   |   +-- tunnel-config.example.yml  # Cloudflare Tunnel config template
|   +-- systemd/
|   |   +-- admin-dashboard.service    # Backend systemd service
|   |   +-- cloudflared.service        # Tunnel systemd service
|   +-- scripts/
|       +-- setup-local.sh            # PostgreSQL + env setup wizard
|
+-- packages/
|   +-- shared/src/                    # Shared types & utilities
|   |   +-- core/                      # Template infrastructure (don't edit)
|   |   +-- types/                     # Domain types (customizable)
|   |   +-- constants/                 # Permission definitions (customizable)
|   |
|   +-- backend/src/                   # Hono API on Bun
|   |   +-- core/                      # Template infrastructure (don't edit)
|   |   +-- db/                        # Drizzle schema + connection
|   |   |   +-- schema.ts             # Table definitions
|   |   |   +-- index.ts              # Database connection
|   |   +-- routes/                    # API route handlers (customizable)
|   |   +-- services/                  # Business logic (customizable)
|   |   +-- config/                    # App configuration (customizable)
|   |   +-- app.ts                     # Hono app setup + middleware chain
|   |   +-- index.ts                   # Bun.serve() entry point
|   |
|   +-- frontend/src/                  # React SPA
|   |   +-- core/                      # Template infrastructure (don't edit)
|   |   +-- pages/                     # Page components (customizable)
|   |   +-- components/                # UI components (customizable)
|   |   +-- stores/                    # State stores (customizable)
|   |   +-- hooks/                     # Custom hooks (customizable)
|   |
|   +-- ai-service/                    # AI assistant service (customizable)
|
+-- scripts/
|   +-- dev.sh                  # Start all dev services
|   +-- init-project.sh         # Rename template for new project
|   +-- sync-template.sh        # Pull upstream template updates
|
+-- drizzle.config.ts           # Drizzle Kit configuration (in packages/backend/)
+-- template.json               # Core vs. customizable path manifest
+-- package.json                # Root workspace scripts
+-- biome.json                  # Biome linter + formatter config
+-- CLAUDE.md                   # AI assistant project guidelines
```

### Core vs. Customizable

The `template.json` manifest defines which paths are template infrastructure (updated via `sync-template.sh`) and which are freely customizable:

| Category | Paths | Editable? |
|---|---|---|
| **Core** | `packages/*/src/core/` | No -- managed by template upstream |
| **Domain types** | `packages/shared/src/types/`, `packages/shared/src/constants/` | Yes |
| **Database** | `packages/backend/src/db/` | Yes |
| **Routes** | `packages/backend/src/routes/` | Yes |
| **Services** | `packages/backend/src/services/` | Yes |
| **Pages** | `packages/frontend/src/pages/` | Yes |
| **Components** | `packages/frontend/src/components/` | Yes |
| **AI Service** | `packages/ai-service/` (entire package) | Yes |

---

## 13. Deployment & Operations

### Development Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd admin-dashboard-template
bun install

# 2. Set up PostgreSQL and generate .env
./infrastructure/scripts/setup-local.sh

# 3. Fill in Firebase Auth credentials in packages/backend/.env

# 4. Start development
./scripts/dev.sh    # Backend + Frontend + Firebase Auth emulator
```

### Development Ports

| Service | Port | URL |
|---|---|---|
| Frontend (Bun dev server) | 5173 | http://localhost:5173 |
| Backend (Bun server) | 3000 | http://localhost:3000 |
| Firebase Auth emulator | 9099 | http://localhost:9099 |
| AI Service | 3001 | http://localhost:3001 |
| PostgreSQL | 5432 | localhost:5432 |

### Production Deployment

| Component | Platform | Deploy Command |
|---|---|---|
| Frontend | Cloudflare Pages | `bun run deploy:frontend` |
| Backend | systemd on desktop | `sudo systemctl start admin-dashboard@$USER` |
| Tunnel | systemd on desktop | `sudo systemctl start cloudflared@$USER` |

See [docs/DEPLOYMENT.md](./DEPLOYMENT.md) for complete step-by-step instructions.

### Template Operations

**Fork for new project**:
```bash
./scripts/init-project.sh my-app @mycompany
# Renames admin-dashboard-template -> my-app and @admin-dashboard -> @mycompany
```

**Pull upstream updates**:
```bash
./scripts/sync-template.sh
# Fetches template upstream and shows diff of core/ path changes
```

---

## 14. Security Model

### Defense in Depth

The application implements security at multiple layers:

```
Layer 1: Backend Middleware Chain
  | CORS -> Rate Limit -> Auth -> Permission -> Validation
Layer 2: Business Logic Guards
  | Super admin protection, self-action prevention, group constraints
Layer 3: Frontend Permission Gates
  | UI elements hidden/disabled based on permissions (UX only, not security)
Layer 4: AI Service Guardrails
  | Permission-filtered tools, system prompt constraints, content filtering
Layer 5: Cloudflare Tunnel
  | No open ports, traffic encrypted between Cloudflare and origin
```

### Layer 1: Backend Middleware

- **CORS**: Only configured origins can make requests
- **Rate limiting**: Per-user/per-IP limits prevent abuse (100/min general, 10/min auth)
- **Authentication**: Firebase ID token verification on every request
- **Permission checking**: Route-level permission requirements
- **Input validation**: Zod schemas validate all request bodies and parameters

### Layer 2: Business Logic Guards

- Super admins cannot be modified or deleted by non-super-admins
- Users cannot delete or disable themselves
- System groups (`admin`, `users`) cannot be deleted
- Default groups cannot be deleted
- Groups with active members cannot be deleted
- Users must belong to at least one group

### Layer 3: Frontend Permission Gates

- `RequireAuth` -- Redirects unauthenticated users to login
- `RequirePermission` -- Redirects unauthorized users to forbidden page
- `PermissionGate` -- Conditionally renders UI elements based on permissions
- Navigation links hidden for inaccessible pages
- Action buttons disabled/hidden without required permissions

### Layer 4: AI Service Guardrails

- Users only see tools matching their permissions (super admins see all)
- System prompt instructs AI to confirm before destructive operations
- Tool calls execute with the user's Firebase token (backend enforces their permissions)
- Content filter strips code blocks from responses
- Session rate limit: 30 messages per 60 seconds
- Session timeout: 1 hour maximum

### Layer 5: Cloudflare Tunnel

- No open ports on the desktop machine
- All traffic encrypted between Cloudflare edge and origin
- Optional: Cloudflare Access for additional authentication layer (free for up to 50 users)

### Sensitive Data Protection

- Environment variables with secrets stored in `.env` files (gitignored)
- Firebase private key stored as environment variable, not as a file
- Database credentials in `.env` only
- Super admin email never exposed in API responses
- PostgreSQL listens on localhost only (not exposed to network)

---

*This document was generated from a comprehensive analysis of the Admin Dashboard Template codebase. For the latest information, always refer to the source code and the [BRD](./BRD.md).*
