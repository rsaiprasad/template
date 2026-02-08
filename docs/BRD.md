# Business Requirements Document (BRD)

## Admin Dashboard Template

| Document Info | Details |
|---------------|---------|
| **Version** | 1.0 |
| **Created** | February 2026 |
| **Status** | Draft |
| **Author** | [Your Name] |

---

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

---

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

- [ ] Users can authenticate via Google OAuth
- [ ] Admins can manage users (create, read, update, disable)
- [ ] Admins can define custom groups and permissions
- [ ] All permission checks enforced at API level
- [ ] Audit trail for all sensitive operations
- [ ] Unit tests achieve 80%+ coverage on critical paths
- [ ] Basic E2E tests pass for core user journeys

---

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

| Role | Responsibility |
|------|----------------|
| **Project Owner** | Defines requirements, approves deliverables |
| **Developer(s)** | Implements features, writes tests |
| **End Users** | Regular users of applications built with this template |
| **Administrators** | Manage users, groups, and permissions |

---

## 3. Goals & Objectives

### 3.1 Primary Goals

| # | Goal | Measurable Outcome |
|---|------|-------------------|
| G1 | Reduce project setup time | New projects start in < 1 hour |
| G2 | Provide secure authentication | Zero auth-related vulnerabilities |
| G3 | Enable flexible authorization | Support any permission structure |
| G4 | Ensure code quality | 80%+ test coverage, zero lint errors |
| G5 | Maintain developer experience | Hot reload, type safety, clear docs |

### 3.2 Secondary Goals

- Establish coding standards and patterns for future projects
- Create documentation that serves as onboarding material
- Build a foundation that supports future multi-tenancy

---

## 4. Scope

### 4.1 In Scope

| Feature | Description |
|---------|-------------|
| **Authentication** | Google OAuth login/logout |
| **Dashboard** | Basic landing page with user greeting |
| **User Management** | CRUD operations for users |
| **Groups Management** | Create, edit, delete permission groups |
| **Permissions System** | API-level permissions (CRUD + search/list) |
| **Settings** | Application settings page |
| **Theming** | Light/dark mode toggle |
| **Audit Logging** | Track sensitive operations |
| **User Disable** | Admins can disable user accounts |

### 4.2 Out of Scope (v1.0)

| Feature | Rationale | Future Version |
|---------|-----------|----------------|
| Multi-tenancy | Complexity; not needed initially | v2.0 |
| Billing/Subscriptions | Requires Stripe integration | v2.0 |
| Additional OAuth providers | Google sufficient for now | v1.1 |
| Email/password auth | OAuth-only simplifies security | v1.1 |
| Force logout sessions | Disable user is sufficient | v1.1 |
| Charts/Analytics dashboard | Not core functionality | v1.1 |
| Task management | From shadcn-admin; not needed | N/A |

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

---

## 5. Functional Requirements

### 5.1 Authentication (FR-AUTH)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-AUTH-01 | Users can sign in using Google OAuth | Must Have |
| FR-AUTH-02 | Users can sign out from the application | Must Have |
| FR-AUTH-03 | New users are automatically created in Firestore on first login | Must Have |
| FR-AUTH-04 | New users are auto-assigned to "Users" group | Must Have |
| FR-AUTH-05 | Protected Super Admin account cannot be deleted or demoted | Must Have |
| FR-AUTH-08 | Super Admin is determined by `SUPER_ADMIN_EMAIL` env var, not first login | Must Have |
| FR-AUTH-09 | Super Admin automatically has all permissions (bypasses all checks) | Must Have |
| FR-AUTH-06 | Disabled users cannot access the application | Must Have |
| FR-AUTH-07 | Auth state persists across browser sessions | Should Have |

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

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-DASH-01 | Display personalized greeting "Hello, [First Name]" | Must Have |
| FR-DASH-02 | Dashboard is the default landing page after login | Must Have |
| FR-DASH-03 | Display user's role/group information | Should Have |
| FR-DASH-04 | Show quick stats (if user has permission) | Nice to Have |

#### User Stories

```
AS A logged-in user
I WANT TO see a personalized dashboard
SO THAT I know I'm authenticated and can navigate the app
```

### 5.3 User Management (FR-USER)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-USER-01 | Admins can view list of all users | Must Have |
| FR-USER-02 | Admins can search/filter users | Must Have |
| FR-USER-03 | Admins can view user details | Must Have |
| FR-USER-04 | Admins can edit user information | Must Have |
| FR-USER-05 | Admins can change user's group assignment | Must Have |
| FR-USER-06 | Admins can disable/enable user accounts | Must Have |
| FR-USER-07 | Admins can delete users (except Super Admin) | Must Have |
| FR-USER-08 | Users can view and edit their own profile | Should Have |
| FR-USER-09 | Pagination for user list | Should Have |

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

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-GROUP-01 | Admins can view all groups | Must Have |
| FR-GROUP-02 | Admins can create new groups | Must Have |
| FR-GROUP-03 | Admins can edit group details and permissions | Must Have |
| FR-GROUP-04 | Admins can delete groups (except default groups) | Must Have |
| FR-GROUP-05 | Admins can view users in a group | Should Have |
| FR-GROUP-06 | Default groups (Admin, Users) cannot be deleted | Must Have |
| FR-GROUP-07 | System prevents deletion of groups with assigned users | Should Have |

#### Default Groups

| Group | Description | Default Permissions |
|-------|-------------|---------------------|
| **Admin** | Full system access | All permissions |
| **Users** | Basic access | Read own profile |

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

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-PERM-01 | Permissions are enforced at API level | Must Have |
| FR-PERM-02 | Permissions follow resource:action format | Must Have |
| FR-PERM-03 | UI elements hidden based on permissions | Must Have |
| FR-PERM-04 | Permission denied returns 403 status | Must Have |
| FR-PERM-05 | Super Admin bypasses all permission checks | Must Have |
| FR-PERM-06 | All available permissions are defined in a shared TypeScript file | Must Have |
| FR-PERM-07 | Group Management screen shows all defined permissions (assigned per group) | Must Have |
| FR-PERM-08 | Developers can extend permissions by adding entries to the shared file | Must Have |
| FR-PERM-09 | New permissions auto-appear in Group Management UI | Must Have |

#### Permission Architecture

Permissions are split between **code** (what permissions exist) and **database** (who has which permissions):

| Layer | Storage | Managed By | Purpose |
|-------|---------|------------|---------|
| **Permission Definitions** | `packages/shared/src/constants/permissions.ts` | Developers (code) | Single source of truth for all available permissions |
| **Group Permissions** | Firestore `groups` collection | Admins (runtime) | Which permissions are assigned to each group |
| **User Group Assignment** | Firestore `users` collection (`groupId` field) | Admins (runtime) | Which group a user belongs to |

#### Permission Definition File

All permissions are defined in a shared TypeScript file (`packages/shared/src/constants/permissions.ts`) that is consumed by both the backend (for API-level enforcement) and the frontend (for conditional UI rendering). This file is the **single source of truth** for what permissions exist in the application.

```typescript
// Example: packages/shared/src/constants/permissions.ts
export const PERMISSIONS: Record<Permission, PermissionDefinition> = {
  'users:create': { resource: 'users', action: 'create', description: 'Create new users' },
  'users:read':   { resource: 'users', action: 'read',   description: 'View user details' },
  // ... more permissions
};
```

**For developers building on this template**: To add permissions for a new feature (e.g., "orders"), add entries to this file. They will automatically appear in the Group Management UI for admins to assign to groups. See [Section 16.3](#163-template-customization-points) for a step-by-step guide.

#### Permission Structure

Permissions follow the format: `resource:action`

**Template default permissions:**

| Resource | Actions | Example Permissions |
|----------|---------|---------------------|
| `users` | create, read, update, delete, list | `users:create`, `users:list` |
| `groups` | create, read, update, delete, list | `groups:update`, `groups:delete` |
| `settings` | create, read, update, delete, list | `settings:read`, `settings:update` |
| `audit` | create, read, update, delete, list | `audit:list` |

**Developer-added permissions (example):**

| Resource | Actions | Example Permissions |
|----------|---------|---------------------|
| `orders` | create, read, update, delete, list | `orders:create`, `orders:list` |
| `reports` | read, list, export | `reports:read`, `reports:export` |

#### Permission Actions

| Action | Description |
|--------|-------------|
| `create` | Create new resources |
| `read` | View single resource details |
| `update` | Modify existing resources |
| `delete` | Remove resources |
| `list` | View collection/search resources |

#### How Permissions Are Checked

| Layer | Mechanism | Example |
|-------|-----------|---------|
| **Backend** | Permission middleware reads user's group permissions from Firestore and checks against required permission for the endpoint | `requirePermission('users:list')` on `GET /api/v1/users` |
| **Frontend** | `useAuth` hook exposes `user.permissions` array; components conditionally render based on permission checks | `{hasPermission('users:create') && <AddUserButton />}` |
| **Super Admin** | Bypasses all checks — backend middleware grants access; frontend treats `isSuperAdmin` as having all permissions | Always passes any permission check |

### 5.6 Settings (FR-SET)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-SET-01 | Users can toggle light/dark theme | Must Have |
| FR-SET-02 | Theme preference persists across sessions | Must Have |
| FR-SET-03 | Admins can configure application settings | Should Have |
| FR-SET-04 | Admins can configure the default group for new users | Must Have |
| FR-SET-05 | Default group permissions are configurable via Group Management | Must Have |

### 5.7 Audit Logging (FR-AUDIT)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-AUDIT-01 | Log all user management actions | Must Have |
| FR-AUDIT-02 | Log all group/permission changes | Must Have |
| FR-AUDIT-03 | Log authentication events | Must Have |
| FR-AUDIT-04 | Admins can view audit logs | Must Have |
| FR-AUDIT-05 | Audit logs cannot be modified or deleted | Must Have |
| FR-AUDIT-06 | Audit logs include timestamp, actor, action, target | Must Have |

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

| Category | Actions |
|----------|---------|
| **Auth** | LOGIN, LOGOUT, LOGIN_FAILED |
| **Users** | USER_CREATED, USER_UPDATED, USER_DISABLED, USER_ENABLED, USER_DELETED |
| **Groups** | GROUP_CREATED, GROUP_UPDATED, GROUP_DELETED, GROUP_PERMISSIONS_CHANGED |
| **Permissions** | USER_GROUP_CHANGED |

---

## 6. Non-Functional Requirements

### 6.1 Performance (NFR-PERF)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-PERF-01 | Page load time | < 3 seconds |
| NFR-PERF-02 | API response time (95th percentile) | < 500ms |
| NFR-PERF-03 | Time to first contentful paint | < 1.5 seconds |
| NFR-PERF-04 | Support concurrent users | 100+ |

### 6.2 Scalability (NFR-SCALE)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-SCALE-01 | Total users supported | 10,000+ |
| NFR-SCALE-02 | Horizontal scaling via Cloud Functions | Automatic |

### 6.3 Availability (NFR-AVAIL)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-AVAIL-01 | Uptime | 99.5% (Firebase SLA) |
| NFR-AVAIL-02 | Graceful degradation on service failure | Required |

### 6.4 Usability (NFR-USE)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-USE-01 | Mobile responsive design | Required |
| NFR-USE-02 | WCAG 2.1 AA compliance | Should Have |
| NFR-USE-03 | Intuitive navigation | Required |

### 6.5 Maintainability (NFR-MAINT)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-MAINT-01 | Code documentation | JSDoc for public APIs |
| NFR-MAINT-02 | Consistent code style | Biome enforced |
| NFR-MAINT-03 | TypeScript strict mode | Required |
| NFR-MAINT-04 | Component modularity | Required |

---

## 7. Technical Architecture

### 7.1 High-Level Architecture

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                         CLIENT LAYER                             â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”‚
â”‚  â”‚                    React + shadcn/ui                      â”‚    â”‚
â”‚  â”‚                    (Firebase Hosting)                     â”‚    â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                              â”‚
                              â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                       FIREBASE SERVICES                          â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚  â”‚   Firebase   â”‚  â”‚   Cloud      â”‚  â”‚      Firestore       â”‚   â”‚
â”‚  â”‚     Auth     â”‚  â”‚  Functions   â”‚  â”‚     (Database)       â”‚   â”‚
â”‚  â”‚  (Google     â”‚  â”‚   (Hono      â”‚  â”‚                      â”‚   â”‚
â”‚  â”‚   OAuth)     â”‚  â”‚    REST)     â”‚  â”‚                      â”‚   â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### 7.2 Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Language** | TypeScript | Type safety, better DX |
| **Runtime** | Bun | Fast, modern, built-in TypeScript |
| **Frontend Framework** | React 18+ | Industry standard, large ecosystem |
| **UI Components** | shadcn/ui | Customizable, accessible, modern |
| **Styling** | Tailwind CSS | Utility-first, works with shadcn |
| **Build Tool** | Vite (via Bun) | Fast builds, HMR |
| **Backend Framework** | Hono | Lightweight, TypeScript-first |
| **Database** | Firestore | Scalable, real-time, serverless |
| **Authentication** | Firebase Auth | Google OAuth, easy integration |
| **Hosting** | Firebase Hosting | Free tier, CDN, easy deployment |
| **Functions** | Cloud Functions | Serverless, auto-scaling |
| **Linting/Formatting** | Biome | Fast, replaces ESLint + Prettier |
| **Monorepo** | Bun Workspaces | Simple, native Bun support |
| **Testing** | Vitest + Playwright | Fast, Vite-compatible |

### 7.3 Project Structure

Each package has a `core/` directory (template infrastructure -- don't edit) and domain code (freely customizable).

```
admin-dashboard-template/
├── package.json                 # Root workspace config
├── bunfig.toml                  # Bun configuration
├── biome.json                   # Biome config (shared)
├── template.json                # Template version & core/customizable paths
├── TEMPLATE_CHANGELOG.md        # Template version history
├── Claude.md                    # AI assistant guidelines
├── README.md
│
├── packages/
│   ├── frontend/                # React application
│   │   ├── package.json
│   │   ├── index.html
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── core/            # Template infra (DON'T EDIT)
│   │   │   │   ├── api/         # AdminDashboardApi client
│   │   │   │   ├── components/  # PermissionGate
│   │   │   │   ├── hooks/       # useAuth, usePermissions
│   │   │   │   ├── lib/         # Firebase client SDK, utils
│   │   │   │   └── stores/      # Auth store (Zustand)
│   │   │   ├── components/
│   │   │   │   ├── ui/          # shadcn components
│   │   │   │   ├── layout/
│   │   │   │   └── features/
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── Login.tsx
│   │   │   │   ├── Settings.tsx
│   │   │   │   ├── AuditLogs.tsx
│   │   │   │   ├── users/       # UserList, UserDetail
│   │   │   │   └── groups/      # GroupList, GroupDetail
│   │   │   ├── hooks/           # Re-export shims + custom hooks
│   │   │   ├── lib/             # Re-export shims (firebase.ts, utils.ts, api.ts)
│   │   │   ├── api/             # API client configuration
│   │   │   ├── stores/          # State stores
│   │   │   └── types/
│   │   └── e2e/                 # Playwright E2E tests
│   │
│   ├── backend/                 # Hono API
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts         # Entry point
│   │   │   ├── app.ts           # Hono app setup
│   │   │   ├── core/            # Template infra (DON'T EDIT)
│   │   │   │   ├── errors/      # Custom error classes
│   │   │   │   ├── lib/         # Firebase Admin SDK init
│   │   │   │   ├── middleware/  # Auth, permissions, audit, rate-limit
│   │   │   │   ├── types/       # Hono context types
│   │   │   │   └── utils/       # Response helpers
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── users.ts
│   │   │   │   ├── groups.ts
│   │   │   │   ├── permissions.ts
│   │   │   │   ├── settings.ts
│   │   │   │   └── audit.ts
│   │   │   ├── services/
│   │   │   │   ├── user.service.ts
│   │   │   │   ├── group.service.ts
│   │   │   │   ├── settings.service.ts
│   │   │   │   └── audit.service.ts
│   │   │   ├── config/          # App configuration
│   │   │   └── openapi/         # OpenAPI documentation
│   │   └── docs/
│   │
│   └── shared/                  # Shared types & utilities
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── core/            # Template infra (DON'T EDIT)
│           │   ├── types/       # API response types, permission types
│           │   └── utils/       # Permission utilities, validation
│           ├── types/
│           │   ├── user.ts
│           │   ├── group.ts
│           │   ├── audit.ts
│           │   └── settings.ts
│           ├── constants/
│           │   └── permissions.ts
│           └── utils/           # Re-export shim for core/utils
│
├── firebase.json                    # Firebase config (project root)
├── .firebaserc                      # Firebase project config (project root)
├── firebase/
│   ├── firestore.rules          # Security rules
│   └── firestore.indexes.json   # Firestore indexes
│
├── scripts/
│   ├── init-project.sh          # Rename template for new project
│   ├── sync-template.sh         # Pull upstream template updates
│   ├── dev.sh                   # Start dev environment
│   └── setup-firebase.sh        # Firebase setup
│
├── infrastructure/              # Terraform IaC for GCP/Firebase
│
└── docs/
    ├── BRD.md                   # This document
    ├── EXTENDING.md             # How to add features
    ├── UPGRADING.md             # How to pull template updates
    └── EMULATOR_TESTING.md      # Firebase emulator guide
```


### 7.4 API Architecture

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                        Hono Application                          â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                                  â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚   Request   â”‚â”€â”€â”€â–¶â”‚    Auth     â”‚â”€â”€â”€â–¶â”‚    Permission       â”‚  â”‚
â”‚  â”‚             â”‚    â”‚  Middleware â”‚    â”‚    Middleware       â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â”‚                                                  â”‚               â”‚
â”‚                                                  â–¼               â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚  Response   â”‚â—€â”€â”€â”€â”‚   Audit     â”‚â—€â”€â”€â”€â”‚      Route          â”‚  â”‚
â”‚  â”‚             â”‚    â”‚  Middleware â”‚    â”‚      Handler        â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â”‚                                                  â”‚               â”‚
â”‚                                                  â–¼               â”‚
â”‚                                        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚                                        â”‚      Service        â”‚  â”‚
â”‚                                        â”‚       Layer         â”‚  â”‚
â”‚                                        â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â”‚                                                  â”‚               â”‚
â”‚                                                  â–¼               â”‚
â”‚                                        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚                                        â”‚     Firestore       â”‚  â”‚
â”‚                                        â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## 8. Data Models

### 8.1 Firestore Collections

```
firestore/
â”œâ”€â”€ users/                 # User documents
â”‚   â””â”€â”€ {userId}/
â”‚       â””â”€â”€ (user data)
â”‚
â”œâ”€â”€ groups/                # Permission groups
â”‚   â””â”€â”€ {groupId}/
â”‚       â””â”€â”€ (group data)
â”‚
â”œâ”€â”€ settings/              # Application settings
â”‚   â””â”€â”€ app/
â”‚       â””â”€â”€ (settings data)
â”‚
â””â”€â”€ auditLogs/             # Audit trail
    â””â”€â”€ {logId}/
        â””â”€â”€ (log entry)
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
  | 'GROUP_PERMISSIONS_CHANGED';
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

---

## 9. API Specifications

### 9.1 API Overview

| Base URL | Format | Auth |
|----------|--------|------|
| `/api/v1` | JSON | Firebase ID Token |

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

### 9.4 Endpoints

#### 9.4.1 Health Check

```
GET /api/v1/health

Response: { status: "ok", timestamp: "..." }
Auth: None
```

#### 9.4.2 Auth Endpoints

```
POST /api/v1/auth/login
- Creates/updates user on first login
- Returns user data with permissions

POST /api/v1/auth/logout
- Logs audit event

GET /api/v1/auth/me
- Returns current user with permissions
```

#### 9.4.3 Users Endpoints

```
GET    /api/v1/users          # List users (paginated)
GET    /api/v1/users/:id      # Get user by ID
PUT    /api/v1/users/:id      # Update user
DELETE /api/v1/users/:id      # Delete user
POST   /api/v1/users/:id/disable   # Disable user
POST   /api/v1/users/:id/enable    # Enable user
PUT    /api/v1/users/:id/group     # Change user group
```

#### 9.4.4 Groups Endpoints

```
GET    /api/v1/groups         # List all groups
POST   /api/v1/groups         # Create group
GET    /api/v1/groups/:id     # Get group by ID
PUT    /api/v1/groups/:id     # Update group
DELETE /api/v1/groups/:id     # Delete group
GET    /api/v1/groups/:id/users    # Get users in group
PUT    /api/v1/groups/:id/permissions  # Update group permissions
```

#### 9.4.5 Permissions Endpoints

```
GET    /api/v1/permissions           # List all available permissions
GET    /api/v1/permissions/my        # Get current user's permissions
```

#### 9.4.6 Settings Endpoints

```
GET    /api/v1/settings       # Get app settings
PUT    /api/v1/settings       # Update app settings
```

#### 9.4.7 Audit Endpoints

```
GET    /api/v1/audit          # List audit logs (paginated)
GET    /api/v1/audit/:id      # Get audit log entry
```

### 9.5 Permission Requirements

| Endpoint | Required Permission |
|----------|---------------------|
| `GET /users` | `users:list` |
| `GET /users/:id` | `users:read` |
| `PUT /users/:id` | `users:update` |
| `DELETE /users/:id` | `users:delete` |
| `POST /users/:id/disable` | `users:update` |
| `POST /users/:id/enable` | `users:update` |
| `PUT /users/:id/group` | `users:update` + `groups:read` |
| `GET /groups` | `groups:list` |
| `POST /groups` | `groups:create` |
| `GET /groups/:id` | `groups:read` |
| `PUT /groups/:id` | `groups:update` |
| `DELETE /groups/:id` | `groups:delete` |
| `GET /settings` | `settings:read` |
| `PUT /settings` | `settings:update` |
| `GET /audit` | `audit:list` |
| `GET /audit/:id` | `audit:read` |

---

## 10. User Interface Requirements

### 10.1 Pages

| Page | Route | Description | Visible To |
|------|-------|-------------|------------|
| Login | `/login` | Google OAuth sign-in | Unauthenticated |
| Dashboard | `/` or `/dashboard` | Welcome page with greeting | All authenticated |
| Users List | `/users` | User management table (list all users, group assignments) | `users:list` permission |
| User Detail | `/users/:id` | View/edit user | `users:read` permission |
| Groups List | `/groups` | Group management (create, edit, assign permissions) | `groups:list` permission |
| Group Detail | `/groups/:id` | View/edit group and its permissions | `groups:read` permission |
| Settings | `/settings` | App settings (default group, app name) & profile | `settings:read` permission |
| Audit Logs | `/audit` | View audit trail | `audit:list` permission |

#### Super Admin Sidebar Navigation

The Super Admin sees all sidebar links. Two key management sections:

| Menu Link | Route | Purpose |
|-----------|-------|---------|
| **User Management** | `/users` | List all users, view group assignments, disable/enable/delete users, change user groups |
| **Group Management** | `/groups` | Create/edit/delete groups, assign permissions from the shared permission definitions to groups, set default group for new users |

Admins can configure the **default group** (via Settings) that new users are automatically assigned to on first login. The permissions of this default group are also configurable through the Group Management screen.

### 10.2 Layout Components

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  [Logo]     Admin Dashboard              [Theme] [User Avatar â–¼]â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚            â”‚                                                     â”‚
â”‚  Dashboard â”‚    Page Content Area                               â”‚
â”‚            â”‚                                                     â”‚
â”‚  Users     â”‚    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚            â”‚    â”‚                                             â”‚ â”‚
â”‚  Groups    â”‚    â”‚                                             â”‚ â”‚
â”‚            â”‚    â”‚                                             â”‚ â”‚
â”‚  Settings  â”‚    â”‚                                             â”‚ â”‚
â”‚            â”‚    â”‚                                             â”‚ â”‚
â”‚  Audit     â”‚    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”‚  Logs      â”‚                                                     â”‚
â”‚            â”‚                                                     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### 10.3 UI Components (shadcn/ui)

| Component | Usage |
|-----------|-------|
| Button | Actions, navigation |
| Card | Content containers |
| Table | User lists, audit logs |
| Dialog | Confirmations, forms |
| Form | User edit, group edit |
| Input | Text inputs |
| Select | Dropdowns |
| Switch | Toggle settings |
| Badge | Status indicators |
| Avatar | User photos |
| DropdownMenu | User menu, actions |
| Toast | Notifications |
| Skeleton | Loading states |

### 10.4 Theme Requirements

| Aspect | Light Mode | Dark Mode |
|--------|------------|-----------|
| Background | White (#FFFFFF) | Slate 950 (#020617) |
| Text | Slate 900 | Slate 50 |
| Primary | Brand color | Brand color |
| Borders | Slate 200 | Slate 800 |

---

## 11. Security Requirements

### 11.1 Authentication Security

| Requirement | Implementation |
|-------------|----------------|
| OAuth 2.0 | Google OAuth via Firebase |
| Token validation | Verify Firebase ID tokens on every request |
| Token expiry | Follow Firebase defaults (1 hour) |
| Secure cookies | HttpOnly, Secure, SameSite |

### 11.2 Authorization Security

| Requirement | Implementation |
|-------------|----------------|
| RBAC | Group-based permissions |
| Least privilege | Default "Users" group has minimal permissions |
| Permission checks | Server-side enforcement on every endpoint |
| Super Admin protection | Cannot be deleted or demoted |

### 11.3 Data Security

| Requirement | Implementation |
|-------------|----------------|
| Encryption in transit | HTTPS (TLS 1.3) |
| Encryption at rest | Firestore default encryption |
| Input validation | Zod schemas on all inputs |
| XSS prevention | React default escaping |
| CSRF protection | SameSite cookies |

### 11.4 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.groupId == 'admin';
    }
    
    function isSuperAdmin() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isSuperAdmin == true;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      allow write: if isAdmin();
    }
    
    // Groups collection
    match /groups/{groupId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // Audit logs - read only, write via admin SDK
    match /auditLogs/{logId} {
      allow read: if isAdmin();
      allow write: if false;
    }
    
    // Settings
    match /settings/{doc} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
  }
}
```

---

## 12. Testing Requirements

### 12.1 Testing Strategy

| Test Type | Tool | Coverage Target |
|-----------|------|-----------------|
| Unit Tests | Vitest | 80% (critical paths) |
| Integration Tests | Vitest | Key API flows |
| E2E Tests | Playwright | Core user journeys |

### 12.2 Unit Test Requirements

#### Frontend

| Component | Tests Required |
|-----------|----------------|
| Auth hooks | Token handling, login/logout |
| Permission utils | Permission checking logic |
| Form validation | Input validation |
| State management | Store actions |

#### Backend

| Component | Tests Required |
|-----------|----------------|
| Auth middleware | Token validation, user extraction |
| Permission middleware | Permission checking |
| Services | Business logic |
| Validators | Input validation |

### 12.3 E2E Test Scenarios

| Scenario | Steps |
|----------|-------|
| User Login | Visit â†’ Click Google Sign In â†’ Redirect â†’ Dashboard |
| User Management | Login as Admin â†’ Navigate to Users â†’ Edit User â†’ Save |
| Group Management | Login as Admin â†’ Create Group â†’ Assign Permissions |
| Permission Denied | Login as User â†’ Try to access Users â†’ See 403 |
| Theme Toggle | Click theme toggle â†’ Verify UI updates |

---

## 13. Deployment & Infrastructure

### 13.1 Environments

| Environment | Purpose | Firebase Project |
|-------------|---------|------------------|
| Development | Local development | (emulators) |
| Staging | Testing before prod | project-staging |
| Production | Live users | project-prod |

### 13.2 Firebase Services (Free Tier)

| Service | Free Tier Limit | Usage |
|---------|-----------------|-------|
| Authentication | 50k MAU | User auth |
| Firestore | 1 GiB storage, 50k reads/day | Database |
| Cloud Functions | 2M invocations/month | API |
| Hosting | 10 GB storage, 360 MB/day | Frontend |

### 13.3 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run test
      - run: bun run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
```

### 13.4 Deployment Commands

```bash
# Development
bun run dev              # Start all services locally

# Build
bun run build            # Build all packages

# Deploy
bun run deploy           # Deploy to Firebase
bun run deploy:staging   # Deploy to staging
bun run deploy:prod      # Deploy to production
```

---

## 14. Timeline & Milestones

### 14.1 Phases

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| **Phase 1: Setup** | Week 1 | Project structure, Firebase config, Biome setup |
| **Phase 2: Auth** | Week 2 | Google OAuth, user creation, basic UI |
| **Phase 3: Core API** | Week 3 | User & Group CRUD APIs |
| **Phase 4: Permissions** | Week 4 | Permission middleware, UI integration |
| **Phase 5: UI** | Week 5 | All pages, theme support |
| **Phase 6: Audit & Polish** | Week 6 | Audit logging, testing, documentation |

### 14.2 Milestone Checklist

#### Milestone 1: Project Foundation
- [ ] Monorepo setup with Bun workspaces
- [ ] Biome configuration
- [ ] TypeScript strict mode
- [ ] Firebase project created
- [ ] Basic CI/CD pipeline

#### Milestone 2: Authentication
- [ ] Firebase Auth configured
- [ ] Google OAuth working
- [ ] User document created on first login
- [ ] Login/logout UI

#### Milestone 3: Core Functionality
- [ ] User CRUD API
- [ ] Group CRUD API
- [ ] Permission middleware
- [ ] Admin can manage users

#### Milestone 4: UI Complete
- [ ] Dashboard page
- [ ] Users page with table
- [ ] Groups page
- [ ] Settings page
- [ ] Theme toggle

#### Milestone 5: Production Ready
- [ ] Audit logging implemented
- [ ] Unit tests passing (80%+ coverage)
- [ ] E2E tests passing
- [ ] Security rules deployed
- [ ] Documentation complete

---

## 15. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Firebase free tier limits exceeded | High | Medium | Monitor usage, implement caching |
| Google OAuth changes | Medium | Low | Abstract auth layer, follow deprecation notices |
| Bun compatibility issues | Medium | Medium | Have Node.js fallback plan |
| Security vulnerability | High | Low | Regular audits, dependency updates |
| Scope creep | Medium | High | Strict adherence to this BRD |

---

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
- [ ] API rate limiting
- [ ] Webhooks for events

### 16.3 Template Customization Points

When using this template for new projects, customize:

| Component | How to Customize |
|-----------|------------------|
| Branding | Update logo, colors in Tailwind config |
| Permissions | Add new resources/actions in the shared permissions file (see guide below) |
| Data models | Add new Firestore collections |
| API routes | Add new route files in backend |
| Pages | Add new pages in frontend |

#### Developer Guide: Adding New Permissions

When building an application on top of this template, you will need to define permissions for your new features. All permissions are defined in a single shared file that is used by both the backend and frontend.

**Step 1: Define the permission in the shared package**

Edit `packages/shared/src/constants/permissions.ts`:

```typescript
// Add your new resource permissions
'orders:create': { resource: 'orders', action: 'create', description: 'Create new orders' },
'orders:read':   { resource: 'orders', action: 'read',   description: 'View order details' },
'orders:update': { resource: 'orders', action: 'update', description: 'Update orders' },
'orders:delete': { resource: 'orders', action: 'delete', description: 'Delete orders' },
'orders:list':   { resource: 'orders', action: 'list',   description: 'View list of orders' },
```

Also update the Permission type in `packages/shared/src/core/types/permission.ts` to include `'orders'` as a resource and the new permission strings.

**Step 2: Protect backend routes**

In your backend route handler, use the permission middleware:

```typescript
// packages/backend/src/routes/orders.ts
import { requirePermission } from '../core/middleware/permissions';

app.get('/api/v1/orders', requirePermission('orders:list'), async (c) => { ... });
app.post('/api/v1/orders', requirePermission('orders:create'), async (c) => { ... });
```

**Step 3: Conditionally render in frontend**

Use the user's permissions from the auth context:

```typescript
// In a React component
const { user } = useAuth();
const canCreateOrders = user?.isSuperAdmin || user?.permissions?.includes('orders:create');

return (
  <>
    {canCreateOrders && <Button>Create Order</Button>}
  </>
);
```

**Step 4: Assign permissions to groups**

Once deployed, the Super Admin will see the new permissions in the Group Management screen. They can then assign these permissions to existing or new groups.

**Key points:**
- The shared permissions file is the **single source of truth** — if a permission is not in this file, it does not exist in the system
- Super Admin always has all permissions (no configuration needed)
- New permissions automatically appear in the Group Management UI for admins to assign
- Both backend middleware and frontend conditional rendering use the same permission strings from the shared package

---

## 17. Appendix

### 17.1 Glossary

| Term | Definition |
|------|------------|
| **RBAC** | Role-Based Access Control |
| **OAuth** | Open Authorization protocol |
| **Firestore** | Firebase's NoSQL document database |
| **MAU** | Monthly Active Users |
| **CRUD** | Create, Read, Update, Delete |
| **E2E** | End-to-End (testing) |
| **HMR** | Hot Module Replacement |

### 17.2 References

- [shadcn-admin Repository](https://github.com/satnaing/shadcn-admin)
- [football-stats-app Repository](https://github.com/imran-codes/football-stats-app)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Hono Documentation](https://hono.dev/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Bun Documentation](https://bun.sh/docs)
- [Biome Documentation](https://biomejs.dev/)

### 17.3 Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | February 2026 | [Author] | Initial draft |

---

## Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Project Owner | | | |
| Technical Lead | | | |
| Developer | | | |

---

*This document serves as the authoritative source for project requirements. Any changes must be documented and approved by stakeholders.*
