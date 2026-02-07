# Business Requirements Document (BRD)

## Admin Dashboard Template

|Document Info|Details      |
|-------------|-------------|
|**Version**  |1.0          |
|**Created**  |February 2026|
|**Status**   |Draft        |
|**Author**   |[Your Name]  |

-----

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Overview](#2-project-overview)
3. [Goals & Objectives](#3-goals--objectives)
4. [Scope](#4-scope)
5. [Functional Requirements](#5-functional-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Technical Architecture](#7-technical-architecture)
8. [Data Models](#8-data-models)
9. [API Specifications](#9-api-specifications)
10. [User Interface Requirements](#10-user-interface-requirements)
11. [Security Requirements](#11-security-requirements)
12. [Testing Requirements](#12-testing-requirements)
13. [Deployment & Infrastructure](#13-deployment--infrastructure)
14. [Timeline & Milestones](#14-timeline--milestones)
15. [Risks & Mitigations](#15-risks--mitigations)
16. [Future Considerations](#16-future-considerations)
17. [Appendix](#17-appendix)

-----

## 1. Executive Summary

### 1.1 Purpose

This document outlines the business and technical requirements for building a **reusable Admin Dashboard Template**. The template is designed to serve as a foundation for:

- **B2C/B2B SaaS Applications** (e.g., laundry management, stock portfolio management)
- **Internal Tools & Back-office Systems**

### 1.2 Key Highlights

- **Authentication**: Google OAuth via Firebase Authentication
- **Authorization**: Role-based access control (RBAC) with customizable groups and permissions
- **Tech Stack**: TypeScript, React, Bun, Hono, Firestore, shadcn/ui
- **Architecture**: Monorepo with separate frontend and backend packages
- **Deployment**: Firebase Hosting + Cloud Functions (free tier)

### 1.3 Success Criteria

- [x] Users can authenticate via Google OAuth
- [x] Admins can manage users (create, read, update, disable)
- [x] Admins can define custom groups and permissions
- [x] All permission checks enforced at API level
- [x] Audit trail for all sensitive operations
- [ ] Unit tests achieve 80%+ coverage on critical paths
- [ ] Basic E2E tests pass for core user journeys

-----

## 2. Project Overview

### 2.1 Background

Modern applications require robust user management and permission systems. This template eliminates the need to rebuild these foundational features for every new project by providing a production-ready starting point.

### 2.2 Problem Statement

Building authentication, authorization, and user management from scratch for each project leads to:

- Duplicated effort and inconsistent implementations
- Security vulnerabilities from rushed implementations
- Delayed time-to-market for core business features

### 2.3 Proposed Solution

A well-architected, fully-typed, and tested template that includes:

- Pre-configured authentication with Google OAuth
- Flexible RBAC system with API-level permissions
- Clean separation between frontend and backend
- Modern tooling (Bun, Biome, shadcn/ui)

### 2.4 Stakeholders

|Role              |Responsibility                                        |
|------------------|------------------------------------------------------|
|**Project Owner** |Defines requirements, approves deliverables           |
|**Developer(s)**  |Implements features, writes tests                     |
|**End Users**     |Regular users of applications built with this template|
|**Administrators**|Manage users, groups, and permissions                 |

-----

## 3. Goals & Objectives

### 3.1 Primary Goals

|# |Goal                         |Measurable Outcome                  |
|--|-----------------------------|------------------------------------|
|G1|Reduce project setup time    |New projects start in < 1 hour      |
|G2|Provide secure authentication|Zero auth-related vulnerabilities   |
|G3|Enable flexible authorization|Support any permission structure    |
|G4|Ensure code quality          |80%+ test coverage, zero lint errors|
|G5|Maintain developer experience|Hot reload, type safety, clear docs |

### 3.2 Secondary Goals

- Establish coding standards and patterns for future projects
- Create documentation that serves as onboarding material
- Build a foundation that supports future multi-tenancy

-----

## 4. Scope

### 4.1 In Scope

|Feature               |Description                               |
|----------------------|------------------------------------------|
|**Authentication**    |Google OAuth login/logout                 |
|**Dashboard**         |Basic landing page with user greeting     |
|**User Management**   |CRUD operations for users                 |
|**Groups Management** |Create, edit, delete permission groups    |
|**Permissions System**|API-level permissions (CRUD + search/list)|
|**Settings**          |Application settings page                 |
|**Theming**           |Light/dark mode toggle                    |
|**Audit Logging**     |Track sensitive operations                |
|**User Disable**      |Admins can disable user accounts          |

### 4.2 Out of Scope (v1.0)

|Feature                   |Rationale                       |Future Version|
|--------------------------|--------------------------------|--------------|
|Multi-tenancy             |Complexity; not needed initially|v2.0          |
|Billing/Subscriptions     |Requires Stripe integration     |v2.0          |
|Additional OAuth providers|Google sufficient for now       |v1.1          |
|Email/password auth       |OAuth-only simplifies security  |v1.1          |
|Force logout sessions     |Disable user is sufficient      |v1.1          |
|Charts/Analytics dashboard|Not core functionality          |v1.1          |
|Task management           |From shadcn-admin; not needed   |N/A           |

### 4.3 Assumptions

1. Users have Google accounts for authentication
2. Firebase free tier is sufficient for initial deployment
3. Single-tenant deployment is acceptable
4. English is the primary language (i18n can be added later)

### 4.4 Constraints

1. Must use free tier of Firebase services
2. Must use TypeScript exclusively
3. Must use Bun as runtime and package manager
4. Must use Biome instead of ESLint/Prettier

-----

## 5. Functional Requirements

### 5.1 Authentication (FR-AUTH)

|ID        |Requirement                                                    |Priority   |Status|
|----------|---------------------------------------------------------------|-----------|------|
|FR-AUTH-01|Users can sign in using Google OAuth                           |Must Have  |Done  |
|FR-AUTH-02|Users can sign out from the application                        |Must Have  |Done  |
|FR-AUTH-03|New users are automatically created in Firestore on first login|Must Have  |Done  |
|FR-AUTH-04|New users are auto-assigned to "Users" group                   |Must Have  |Done  |
|FR-AUTH-05|Protected Super Admin account cannot be deleted or demoted     |Must Have  |Done  |
|FR-AUTH-06|Disabled users cannot access the application                   |Must Have  |Done  |
|FR-AUTH-07|Auth state persists across browser sessions                    |Should Have|Done  |

#### User Stories

```
AS A visitor
I WANT TO sign in with my Google account
SO THAT I can access the application

AS A user
I WANT TO sign out
SO THAT I can secure my session

AS A disabled user
I WANT TO see a clear message
SO THAT I understand why I cannot access the application
```

### 5.2 Dashboard (FR-DASH)

|ID        |Requirement                                        |Priority    |Status|
|----------|---------------------------------------------------|------------|------|
|FR-DASH-01|Display personalized greeting "Hello, [First Name]"|Must Have   |Done  |
|FR-DASH-02|Dashboard is the default landing page after login  |Must Have   |Done  |
|FR-DASH-03|Display user's role/group information              |Should Have |Done  |
|FR-DASH-04|Show quick stats (if user has permission)          |Nice to Have|Done  |

#### User Stories

```
AS A logged-in user
I WANT TO see a personalized dashboard
SO THAT I know I'm authenticated and can navigate the app
```

### 5.3 User Management (FR-USER)

|ID        |Requirement                                 |Priority   |Status|
|----------|--------------------------------------------|-----------|------|
|FR-USER-01|Admins can view list of all users           |Must Have  |Done  |
|FR-USER-02|Admins can search/filter users              |Must Have  |Done  |
|FR-USER-03|Admins can view user details                |Must Have  |Done  |
|FR-USER-04|Admins can edit user information            |Must Have  |Done  |
|FR-USER-05|Admins can change user's group assignment   |Must Have  |Done  |
|FR-USER-06|Admins can disable/enable user accounts     |Must Have  |Done  |
|FR-USER-07|Admins can delete users (except Super Admin)|Must Have  |Done  |
|FR-USER-08|Users can view and edit their own profile   |Should Have|Done  |
|FR-USER-09|Pagination for user list                    |Should Have|Done  |

#### User Stories

```
AS AN admin
I WANT TO view all users in the system
SO THAT I can manage user access

AS AN admin
I WANT TO disable a user account
SO THAT I can revoke access without deleting data

AS AN admin
I WANT TO change a user's group
SO THAT I can adjust their permissions

AS A user
I WANT TO view my profile
SO THAT I can see my account information
```

### 5.4 Groups Management (FR-GROUP)

|ID         |Requirement                                           |Priority   |Status|
|-----------|------------------------------------------------------|-----------|------|
|FR-GROUP-01|Admins can view all groups                            |Must Have  |Done  |
|FR-GROUP-02|Admins can create new groups                          |Must Have  |Done  |
|FR-GROUP-03|Admins can edit group details and permissions         |Must Have  |Done  |
|FR-GROUP-04|Admins can delete groups (except default groups)      |Must Have  |Done  |
|FR-GROUP-05|Admins can view users in a group                      |Should Have|Done  |
|FR-GROUP-06|Default groups (Admin, Users) cannot be deleted       |Must Have  |Done  |
|FR-GROUP-07|System prevents deletion of groups with assigned users|Should Have|Done  |

#### Default Groups

|Group    |Description       |Default Permissions|
|---------|------------------|-------------------|
|**Admin**|Full system access|All permissions    |
|**Users**|Basic access      |Read own profile   |

#### User Stories

```
AS AN admin
I WANT TO create custom groups
SO THAT I can define different access levels

AS AN admin
I WANT TO assign permissions to groups
SO THAT I can control what members can do
```

### 5.5 Permissions System (FR-PERM)

|ID        |Requirement                               |Priority |Status|
|----------|------------------------------------------|---------|------|
|FR-PERM-01|Permissions are enforced at API level     |Must Have|Done  |
|FR-PERM-02|Permissions follow resource:action format |Must Have|Done  |
|FR-PERM-03|UI elements hidden based on permissions   |Must Have|Done  |
|FR-PERM-04|Permission denied returns 403 status      |Must Have|Done  |
|FR-PERM-05|Super Admin bypasses all permission checks|Must Have|Done  |

#### Permission Structure

Permissions follow the format: `resource:action`

|Resource  |Actions                           |Example Permissions               |
|----------|----------------------------------|----------------------------------|
|`users`   |create, read, update, delete, list|`users:create`, `users:list`      |
|`groups`  |create, read, update, delete, list|`groups:update`, `groups:delete`  |
|`settings`|read, update                      |`settings:read`, `settings:update`|
|`audit`   |read, list                        |`audit:list`                      |

#### Permission Actions

|Action  |Description                     |
|--------|--------------------------------|
|`create`|Create new resources            |
|`read`  |View single resource details    |
|`update`|Modify existing resources       |
|`delete`|Remove resources                |
|`list`  |View collection/search resources|

### 5.6 Settings (FR-SET)

|ID       |Requirement                              |Priority   |Status|
|---------|-----------------------------------------|-----------|------|
|FR-SET-01|Users can toggle light/dark theme        |Must Have  |Done  |
|FR-SET-02|Theme preference persists across sessions|Must Have  |Done  |
|FR-SET-03|Admins can configure application settings|Should Have|Done  |

### 5.7 Audit Logging (FR-AUDIT)

|ID         |Requirement                                        |Priority |Status|
|-----------|---------------------------------------------------|---------|------|
|FR-AUDIT-01|Log all user management actions                    |Must Have|Done  |
|FR-AUDIT-02|Log all group/permission changes                   |Must Have|Done  |
|FR-AUDIT-03|Log authentication events                          |Must Have|Done  |
|FR-AUDIT-04|Admins can view audit logs                         |Must Have|Done  |
|FR-AUDIT-05|Audit logs cannot be modified or deleted           |Must Have|Done  |
|FR-AUDIT-06|Audit logs include timestamp, actor, action, target|Must Have|Done  |

#### Audit Log Entry Structure

```typescript
interface AuditLogEntry {
  id: string;
  timestamp: Timestamp;
  actorId: string;        // User who performed action
  actorEmail: string;     // For readability
  action: AuditAction;    // e.g., "USER_DISABLED", "GROUP_CREATED"
  resource: string;       // e.g., "users", "groups"
  resourceId: string;     // ID of affected resource
  changes?: {             // For updates
    before: object;
    after: object;
  };
  ipAddress?: string;
  userAgent?: string;
}
```

#### Audited Actions

|Category       |Actions                                                               |
|---------------|----------------------------------------------------------------------|
|**Auth**       |LOGIN, LOGOUT, LOGIN_FAILED                                           |
|**Users**      |USER_CREATED, USER_UPDATED, USER_DISABLED, USER_ENABLED, USER_DELETED |
|**Groups**     |GROUP_CREATED, GROUP_UPDATED, GROUP_DELETED, GROUP_PERMISSIONS_CHANGED|
|**Permissions**|USER_GROUP_CHANGED                                                    |
|**Settings**   |SETTINGS_UPDATED                                                      |

-----

## 6. Non-Functional Requirements

### 6.1 Performance (NFR-PERF)

|ID         |Requirement                        |Target       |
|-----------|-----------------------------------|-------------|
|NFR-PERF-01|Page load time                     |< 3 seconds  |
|NFR-PERF-02|API response time (95th percentile)|< 500ms      |
|NFR-PERF-03|Time to first contentful paint     |< 1.5 seconds|
|NFR-PERF-04|Support concurrent users           |100+         |

### 6.2 Scalability (NFR-SCALE)

|ID          |Requirement                           |Target   |
|------------|--------------------------------------|---------|
|NFR-SCALE-01|Total users supported                 |10,000+  |
|NFR-SCALE-02|Horizontal scaling via Cloud Functions|Automatic|

### 6.3 Availability (NFR-AVAIL)

|ID          |Requirement                            |Target              |
|------------|---------------------------------------|--------------------|
|NFR-AVAIL-01|Uptime                                 |99.5% (Firebase SLA)|
|NFR-AVAIL-02|Graceful degradation on service failure|Required            |

### 6.4 Usability (NFR-USE)

|ID        |Requirement             |Target     |
|----------|------------------------|-----------|
|NFR-USE-01|Mobile responsive design|Required   |
|NFR-USE-02|WCAG 2.1 AA compliance  |Should Have|
|NFR-USE-03|Intuitive navigation    |Required   |

### 6.5 Maintainability (NFR-MAINT)

|ID          |Requirement           |Target               |
|------------|----------------------|---------------------|
|NFR-MAINT-01|Code documentation    |JSDoc for public APIs|
|NFR-MAINT-02|Consistent code style |Biome enforced       |
|NFR-MAINT-03|TypeScript strict mode|Required             |
|NFR-MAINT-04|Component modularity  |Required             |

-----

## 7. Technical Architecture

### 7.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    React + shadcn/ui                         │    │
│  │                    (Firebase Hosting)                        │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       FIREBASE SERVICES                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │   Firebase   │  │   Cloud      │  │      Firestore           │   │
│  │     Auth     │  │  Functions   │  │     (Database)           │   │
│  │  (Google     │  │   (Hono      │  │                          │   │
│  │   OAuth)     │  │    REST)     │  │                          │   │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2 Technology Stack

|Layer                 |Technology         |Rationale                         |
|----------------------|-------------------|----------------------------------|
|**Language**          |TypeScript         |Type safety, better DX            |
|**Runtime**           |Bun                |Fast, modern, built-in TypeScript |
|**Frontend Framework**|React 18+          |Industry standard, large ecosystem|
|**UI Components**     |shadcn/ui          |Customizable, accessible, modern  |
|**Styling**           |Tailwind CSS       |Utility-first, works with shadcn  |
|**Build Tool**        |Bun                |Fast builds, native bundler       |
|**Backend Framework** |Hono               |Lightweight, TypeScript-first     |
|**Database**          |Firestore          |Scalable, real-time, serverless   |
|**Authentication**    |Firebase Auth      |Google OAuth, easy integration    |
|**Hosting**           |Firebase Hosting   |Free tier, CDN, easy deployment   |
|**Functions**         |Cloud Functions    |Serverless, auto-scaling          |
|**Linting/Formatting**|Biome              |Fast, replaces ESLint + Prettier  |
|**Monorepo**          |Bun Workspaces     |Simple, native Bun support        |
|**Testing**           |Bun Test + Playwright|Fast, Bun-compatible            |
|**API Spec**          |OpenAPI 3.1        |Standard, client generation       |

### 7.3 Project Structure

```
admin-dashboard-template/
├── package.json                 # Root workspace config
├── bunfig.toml                  # Bun configuration
├── biome.json                   # Biome config (shared)
├── README.md
├── Claude.md                    # AI assistant guidelines
│
├── docs/
│   └── BRD.md                   # This document
│
├── packages/
│   ├── frontend/                # React application
│   │   ├── package.json
│   │   ├── index.html
│   │   ├── build.ts
│   │   ├── tsconfig.json
│   │   ├── README.md
│   │   ├── docs/
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── api/             # Generated OpenAPI client
│   │       │   ├── generated/
│   │       │   └── index.ts
│   │       ├── components/
│   │       │   ├── ui/          # shadcn components
│   │       │   ├── layout/
│   │       │   └── features/
│   │       ├── pages/
│   │       ├── hooks/
│   │       ├── lib/
│   │       ├── stores/
│   │       └── types/
│   │
│   ├── backend/                 # Hono API
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── README.md
│   │   ├── openapi.json         # Generated OpenAPI spec
│   │   ├── docs/
│   │   └── src/
│   │       ├── index.ts         # Entry point
│   │       ├── app.ts           # Hono app setup
│   │       ├── config/          # Environment config
│   │       ├── errors/          # Custom error classes
│   │       ├── openapi/         # OpenAPI definitions
│   │       │   ├── schemas.ts
│   │       │   └── routes/
│   │       ├── routes/
│   │       ├── middleware/
│   │       ├── services/
│   │       ├── lib/
│   │       └── types/
│   │
│   └── shared/                  # Shared types & utilities
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── types/
│           ├── constants/
│           └── utils/
│
└── firebase/
    ├── firebase.json            # Firebase config
    ├── firestore.rules          # Security rules
    ├── firestore.indexes.json   # Firestore indexes
    └── .firebaserc              # Firebase project config
```

### 7.4 API Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Hono Application                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐  │
│  │   Request   │───▶│  Rate Limit │───▶│    CORS Middleware      │  │
│  │             │    │  Middleware │    │    (Config-driven)      │  │
│  └─────────────┘    └─────────────┘    └─────────────────────────┘  │
│                                                  │                   │
│                                                  ▼                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐  │
│  │  Response   │◀───│   Audit     │◀───│    Permission           │  │
│  │             │    │  Middleware │    │    Middleware           │  │
│  └─────────────┘    └─────────────┘    └─────────────────────────┘  │
│                                                  │                   │
│                                                  ▼                   │
│                                        ┌─────────────────────────┐  │
│                                        │      Route Handler      │  │
│                                        └─────────────────────────┘  │
│                                                  │                   │
│                                                  ▼                   │
│                                        ┌─────────────────────────┐  │
│                                        │      Service Layer      │  │
│                                        │      (Singletons)       │  │
│                                        └─────────────────────────┘  │
│                                                  │                   │
│                                                  ▼                   │
│                                        ┌─────────────────────────┐  │
│                                        │       Firestore         │  │
│                                        └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

-----

## 8. Data Models

### 8.1 Firestore Collections

```
firestore/
├── users/                 # User documents
│   └── {userId}/
│       └── (user data)
│
├── groups/                # Permission groups
│   └── {groupId}/
│       └── (group data)
│
├── settings/              # Application settings
│   └── app/
│       └── (settings data)
│
└── auditLogs/             # Audit trail
    └── {logId}/
        └── (log entry)
```

### 8.2 User Model

```typescript
interface User {
  // Identity
  id: string;                    // Firebase Auth UID
  email: string;                 // From Google OAuth
  displayName: string;           // From Google OAuth
  photoURL: string | null;       // From Google OAuth

  // Authorization
  groupId: string;               // Reference to group
  isSuperAdmin: boolean;         // Protected super admin flag

  // Status
  status: 'active' | 'disabled';
  disabledAt?: Timestamp;
  disabledBy?: string;           // Admin user ID

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp;

  // Preferences
  preferences: {
    theme: 'light' | 'dark' | 'system';
  };
}
```

### 8.3 Group Model

```typescript
interface Group {
  id: string;
  name: string;                  // e.g., "Admin", "Users", "Managers"
  description: string;

  // Permissions
  permissions: string[];         // e.g., ["users:read", "users:list"]

  // Metadata
  isDefault: boolean;            // Cannot be deleted if true
  isSystem: boolean;             // System-managed group
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;             // User ID
  updatedBy: string;             // User ID
}
```

### 8.4 Audit Log Model

```typescript
interface AuditLog {
  id: string;

  // When
  timestamp: Timestamp;

  // Who
  actorId: string;
  actorEmail: string;
  actorName: string;

  // What
  action: AuditAction;
  resource: 'users' | 'groups' | 'settings' | 'auth';
  resourceId: string;

  // Details
  description: string;
  changes?: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  };

  // Context
  ipAddress?: string;
  userAgent?: string;
}

type AuditAction =
  // Auth
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  // Users
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DISABLED'
  | 'USER_ENABLED'
  | 'USER_DELETED'
  | 'USER_GROUP_CHANGED'
  // Groups
  | 'GROUP_CREATED'
  | 'GROUP_UPDATED'
  | 'GROUP_DELETED'
  | 'GROUP_PERMISSIONS_CHANGED'
  // Settings
  | 'SETTINGS_UPDATED';
```

### 8.5 Settings Model

```typescript
interface AppSettings {
  id: 'app';                     // Singleton document

  // General
  appName: string;

  // Defaults
  defaultGroupId: string;        // For new users

  // Features
  features: {
    auditLogging: boolean;
    userRegistration: boolean;
  };

  // Metadata
  updatedAt: Timestamp;
  updatedBy: string;
}
```

-----

## 9. API Specifications

### 9.1 API Overview

|Base URL |Format|Auth             |Spec      |
|---------|------|-----------------|----------|
|`/api/v1`|JSON  |Firebase ID Token|OpenAPI 3.1|

### 9.2 Authentication

All API endpoints (except health check) require a valid Firebase ID token in the Authorization header:

```
Authorization: Bearer <firebase-id-token>
```

### 9.3 Response Format

#### Success Response

```typescript
interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
    nextCursor?: string;
  };
}
```

#### Error Response

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

### 9.4 API Documentation

- **Swagger UI**: `/api/v1/swagger`
- **OpenAPI JSON**: `/api/v1/doc`
- **Generated Spec**: `packages/backend/openapi.json`

### 9.5 Endpoints Summary

| Category | Endpoints | Description |
|----------|-----------|-------------|
| Auth | 4 | Login, logout, me, verify |
| Users | 7 | CRUD, disable, enable, change group |
| Groups | 7 | CRUD, get users, update permissions |
| Permissions | 4 | List, my permissions, check, resources |
| Settings | 5 | Get, update, features, toggle |
| Audit | 7 | List, get, stats, by user, by resource |

See [API Reference](../packages/backend/docs/api-reference.md) for complete documentation.

-----

## 10. User Interface Requirements

### 10.1 Pages

|Page        |Route              |Description               |Status|
|------------|-------------------|--------------------------|------|
|Login       |`/login`           |Google OAuth sign-in      |Done  |
|Dashboard   |`/` or `/dashboard`|Welcome page with greeting|Done  |
|Users List  |`/users`           |User management table     |Done  |
|User Detail |`/users/:id`       |View/edit user            |Done  |
|Groups List |`/groups`          |Group management          |Done  |
|Group Detail|`/groups/:id`      |View/edit group           |Done  |
|Settings    |`/settings`        |App settings & profile    |Done  |
|Audit Logs  |`/audit`           |View audit trail          |Done  |

### 10.2 Layout Components

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Logo]     Admin Dashboard              [Theme] [User Avatar ▼]   │
├────────────┬────────────────────────────────────────────────────────┤
│            │                                                        │
│  Dashboard │    Page Content Area                                   │
│            │                                                        │
│  Users     │    ┌─────────────────────────────────────────────────┐ │
│            │    │                                                 │ │
│  Groups    │    │                                                 │ │
│            │    │                                                 │ │
│  Settings  │    │                                                 │ │
│            │    │                                                 │ │
│  Audit     │    └─────────────────────────────────────────────────┘ │
│  Logs      │                                                        │
│            │                                                        │
└────────────┴────────────────────────────────────────────────────────┘
```

### 10.3 UI Components (shadcn/ui)

|Component   |Usage                 |
|------------|----------------------|
|Button      |Actions, navigation   |
|Card        |Content containers    |
|Table       |User lists, audit logs|
|Dialog      |Confirmations, forms  |
|Form        |User edit, group edit |
|Input       |Text inputs           |
|Select      |Dropdowns             |
|Switch      |Toggle settings       |
|Badge       |Status indicators     |
|Avatar      |User photos           |
|DropdownMenu|User menu, actions    |
|Toast       |Notifications         |
|Skeleton    |Loading states        |

### 10.4 Theme Requirements

|Aspect    |Light Mode     |Dark Mode          |
|----------|---------------|-------------------|
|Background|White (#FFFFFF)|Slate 950 (#020617)|
|Text      |Slate 900      |Slate 50           |
|Primary   |Brand color    |Brand color        |
|Borders   |Slate 200      |Slate 800          |

-----

## 11. Security Requirements

### 11.1 Authentication Security

|Requirement     |Implementation                            |Status|
|----------------|------------------------------------------|------|
|OAuth 2.0       |Google OAuth via Firebase                 |Done  |
|Token validation|Verify Firebase ID tokens on every request|Done  |
|Token expiry    |Follow Firebase defaults (1 hour)         |Done  |
|Revocation check|`verifyIdToken(token, true)`              |Done  |

### 11.2 Authorization Security

|Requirement           |Implementation                               |Status|
|----------------------|---------------------------------------------|------|
|RBAC                  |Group-based permissions                      |Done  |
|Least privilege       |Default "Users" group has minimal permissions|Done  |
|Permission checks     |Server-side enforcement on every endpoint    |Done  |
|Super Admin protection|Cannot be deleted or demoted                 |Done  |

### 11.3 API Security

|Requirement     |Implementation                            |Status|
|----------------|------------------------------------------|------|
|Rate limiting   |100 req/min general, 10 req/min auth      |Done  |
|CORS            |Config-driven origin whitelist            |Done  |
|Input validation|Zod schemas on all inputs                 |Done  |
|Error handling  |Custom error classes, no stack traces     |Done  |

### 11.4 Data Security

|Requirement          |Implementation              |
|---------------------|----------------------------|
|Encryption in transit|HTTPS (TLS 1.3)             |
|Encryption at rest   |Firestore default encryption|
|XSS prevention       |React default escaping      |
|CSRF protection      |SameSite cookies            |

-----

## 12. Testing Requirements

### 12.1 Testing Strategy

|Test Type        |Tool      |Coverage Target     |
|-----------------|----------|--------------------|
|Unit Tests       |Bun Test  |80% (critical paths)|
|Integration Tests|Bun Test  |Key API flows       |
|E2E Tests        |Playwright|Core user journeys  |

### 12.2 Unit Test Requirements

#### Frontend

|Component       |Tests Required              |
|----------------|----------------------------|
|Auth hooks      |Token handling, login/logout|
|Permission utils|Permission checking logic   |
|Form validation |Input validation            |
|State management|Store actions               |

#### Backend

|Component            |Tests Required                   |
|---------------------|---------------------------------|
|Auth middleware      |Token validation, user extraction|
|Permission middleware|Permission checking              |
|Services             |Business logic                   |
|Validators           |Input validation                 |

### 12.3 E2E Test Scenarios

|Scenario         |Steps                                                      |
|-----------------|-----------------------------------------------------------|
|User Login       |Visit → Click Google Sign In → Redirect → Dashboard       |
|User Management  |Login as Admin → Navigate to Users → Edit User → Save     |
|Group Management |Login as Admin → Create Group → Assign Permissions        |
|Permission Denied|Login as User → Try to access Users → See 403             |
|Theme Toggle     |Click theme toggle → Verify UI updates                     |

-----

## 13. Deployment & Infrastructure

### 13.1 Environments

|Environment|Purpose            |Firebase Project|
|-----------|-------------------|----------------|
|Development|Local development  |(emulators)     |
|Staging    |Testing before prod|project-staging |
|Production |Live users         |project-prod    |

### 13.2 Firebase Services (Free Tier)

|Service        |Free Tier Limit             |Usage    |
|---------------|----------------------------|---------|
|Authentication |50k MAU                     |User auth|
|Firestore      |1 GiB storage, 50k reads/day|Database |
|Cloud Functions|2M invocations/month        |API      |
|Hosting        |10 GB storage, 360 MB/day   |Frontend |

### 13.3 Deployment Commands

```bash
# Development
bun run dev              # Start all services locally

# Build
bun run build            # Build all packages

# Deploy
bun run deploy           # Deploy to Firebase
firebase deploy --only hosting    # Frontend only
firebase deploy --only functions  # Backend only
```

-----

## 14. Implementation Status

### Completed Features

- [x] Monorepo setup with Bun workspaces
- [x] Biome configuration
- [x] TypeScript strict mode
- [x] Firebase Auth with Google OAuth
- [x] User document creation on first login
- [x] Login/logout UI
- [x] User CRUD API
- [x] Group CRUD API
- [x] Permission middleware
- [x] Admin can manage users
- [x] Dashboard page
- [x] Users page with table
- [x] Groups page
- [x] Settings page
- [x] Theme toggle
- [x] Audit logging implemented
- [x] Security rules deployed
- [x] Rate limiting
- [x] Config-driven CORS
- [x] OpenAPI specification
- [x] Generated API client
- [x] Documentation complete

### Pending

- [ ] Unit tests (80%+ coverage)
- [ ] E2E tests

-----

## 15. Risks & Mitigations

|Risk                              |Impact|Probability|Mitigation                                     |
|----------------------------------|------|-----------|-----------------------------------------------|
|Firebase free tier limits exceeded|High  |Medium     |Monitor usage, implement caching               |
|Google OAuth changes              |Medium|Low        |Abstract auth layer, follow deprecation notices|
|Bun compatibility issues          |Medium|Medium     |Have Node.js fallback plan                     |
|Security vulnerability            |High  |Low        |Regular audits, dependency updates             |
|Scope creep                       |Medium|High       |Strict adherence to this BRD                   |

-----

## 16. Future Considerations

### 16.1 Version 1.1 (Near-term)

- [ ] Additional OAuth providers (Apple, Microsoft)
- [ ] Email/password authentication
- [ ] Password reset flow
- [ ] Dashboard analytics/charts
- [ ] Export users to CSV
- [ ] Bulk user operations

### 16.2 Version 2.0 (Long-term)

- [ ] Multi-tenancy support
- [ ] Billing integration (Stripe)
- [ ] Advanced audit (export, retention)
- [ ] i18n (internationalization)
- [ ] Two-factor authentication (2FA)
- [ ] API rate limiting per user
- [ ] Webhooks for events

### 16.3 Template Customization Points

When using this template for new projects, customize:

|Component  |How to Customize                      |
|-----------|--------------------------------------|
|Branding   |Update logo, colors in Tailwind config|
|Permissions|Add new resources/actions in constants|
|Data models|Add new Firestore collections         |
|API routes |Add new route files in backend        |
|Pages      |Add new pages in frontend             |

-----

## 17. Appendix

### 17.1 Glossary

|Term         |Definition                        |
|-------------|----------------------------------|
|**RBAC**     |Role-Based Access Control         |
|**OAuth**    |Open Authorization protocol       |
|**Firestore**|Firebase's NoSQL document database|
|**MAU**      |Monthly Active Users              |
|**CRUD**     |Create, Read, Update, Delete      |
|**E2E**      |End-to-End (testing)              |
|**HMR**      |Hot Module Replacement            |
|**OpenAPI**  |API specification standard        |

### 17.2 References

- [Firebase Documentation](https://firebase.google.com/docs)
- [Hono Documentation](https://hono.dev/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Bun Documentation](https://bun.sh/docs)
- [Biome Documentation](https://biomejs.dev/)
- [OpenAPI Specification](https://spec.openapis.org/oas/v3.1.0)

### 17.3 Document Revision History

|Version|Date         |Author|Changes                    |
|-------|-------------|------|---------------------------|
|1.0    |February 2026|      |Initial draft              |
|1.1    |February 2026|Claude|Updated with implementation status|

-----

*This document serves as the authoritative source for project requirements. Any changes must be documented and approved by stakeholders.*
