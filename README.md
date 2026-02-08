# Admin Dashboard Template

A production-ready, fully-typed admin dashboard template built with modern technologies. Designed as a foundation for B2C/B2B SaaS applications and internal tools.

## Features

- **Authentication**: Google OAuth via Firebase Authentication
- **Authorization**: Role-based access control (RBAC) with customizable groups and permissions
- **User Management**: CRUD operations, disable/enable accounts, group assignment
- **Group Management**: Create custom groups with granular permissions
- **Audit Logging**: Track all sensitive operations with detailed logs
- **Security**: Rate limiting, CORS whitelist, token validation, super admin protection
- **Theme Support**: Light/dark mode with system preference detection
- **OpenAPI Compliant**: Full OpenAPI 3.1 spec with generated TypeScript client

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Bun |
| **Frontend** | React 18, TanStack Query, Zustand, shadcn/ui, Tailwind CSS |
| **Backend** | Hono (OpenAPI), Firebase Cloud Functions |
| **Database** | Firestore |
| **Authentication** | Firebase Auth (Google OAuth) |
| **Linting** | Biome |

## Project Structure

```
admin-dashboard-template/
├── docs/
│   ├── BRD.md             # Business Requirements Document
│   ├── EXTENDING.md       # How to add features
│   └── UPGRADING.md       # How to pull template updates
│
├── packages/
│   ├── shared/            # Shared TypeScript types & utilities
│   │   └── src/
│   │       ├── core/      # Template infra: API types, permission types, utils
│   │       ├── types/     # Domain types (user, group, audit, settings)
│   │       └── constants/ # Permission definitions
│   │
│   ├── backend/           # Hono REST API
│   │   └── src/
│   │       ├── core/      # Template infra: middleware, Firebase, errors, response helpers
│   │       ├── routes/    # API route handlers (customizable)
│   │       ├── services/  # Business logic (customizable)
│   │       ├── config/    # App configuration (customizable)
│   │       └── openapi/   # API documentation (customizable)
│   │
│   └── frontend/          # React SPA
│       └── src/
│           ├── core/      # Template infra: auth hooks, permission gates, API client
│           ├── pages/     # Page components (customizable)
│           ├── components/# UI components (customizable)
│           ├── hooks/     # Custom hooks (customizable)
│           └── stores/    # State stores (customizable)
│
├── scripts/
│   ├── init-project.sh    # Rename template for new project
│   ├── sync-template.sh   # Pull upstream template updates
│   ├── dev.sh             # Start dev environment
│   └── setup-firebase.sh  # Firebase setup
│
├── firebase.json          # Firebase config (hosting, functions, emulators)
├── .firebaserc            # Firebase project aliases
├── firebase/              # Firestore rules & indexes
├── template.json          # Template version & core/customizable paths
├── TEMPLATE_CHANGELOG.md  # Template version history
├── Claude.md              # AI assistant guidelines
└── README.md              # This file
```

### Core vs. Customizable

Each package has a `core/` directory containing template infrastructure (auth, permissions, API client, middleware). **Don't edit core files** — they receive updates from the template.

Everything outside `core/` is yours to customize: routes, services, pages, components, types, and configuration. See [docs/EXTENDING.md](./docs/EXTENDING.md) for details.

## Quick Start

| Prerequisite | Installation |
|--------------|--------------|
| **Bun** | [bun.sh](https://bun.sh/) |
| **Firebase CLI** | `bun install -g firebase-tools` |
| **Google Cloud SDK** | [Install guide](https://cloud.google.com/sdk/docs/install) |
| **Java 11+** | [Adoptium](https://adoptium.net/) (for emulators) |
| **jq** | [jqlang.github.io](https://jqlang.github.io/jq/download/) |

```bash
# Clone or use "Use this template" on GitHub
git clone https://github.com/rsaiprasad/template.git my-project
cd my-project

# Rename for your project
./scripts/init-project.sh my-saas-app @mycompany

# Install and start (emulators + dev servers)
bun install
bun run dev:full     # Start emulators + frontend + backend
```

> **Note:** `bun run dev:full` starts Firebase emulators alongside dev servers.
> Use `bun run dev` if you only want frontend + backend without emulators.
> Firebase/GCP project setup is required for production — see [Deployment Guide](./docs/DEPLOYMENT.md).

## Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development servers |
| `bun run build` | Build all packages |
| `bun run typecheck` | Run TypeScript type checks |
| `bun run lint` | Run Biome linting |
| `bun run lint:fix` | Fix linting issues |
| `bun run test` | Run tests |
| `bun run deploy` | Deploy to Firebase (default project) |
| `bun run deploy:staging` | Deploy to staging |
| `bun run deploy:prod` | Deploy to production |
| `bun run dev:full` | Start emulators + dev servers together |
| `bun run emulators` | Start Firebase emulators only |

## Using This Template

### 1. Create a New Project

Fork or clone this repo, then rename it for your project:

```bash
./scripts/init-project.sh my-saas-app @mycompany
bun install && bun run build
```

This replaces all references to `admin-dashboard-template` and `@admin-dashboard` with your project name and npm scope across all source files, package.json files, and config.

### 2. Set Up Infrastructure

Follow the [Deployment Guide](./docs/DEPLOYMENT.md) to provision Firebase/GCP. Three options:

- **Option A** (fastest): `./scripts/setup-firebase.sh <project-id> <email>`
- **Option B** (IaC): Terraform in `infrastructure/terraform/`
- **Option C** (manual): Step-by-step in the deployment docs

### 3. Pull Template Updates

When the template gets new features or fixes in `core/` paths, sync them into your project:

```bash
./scripts/sync-template.sh
```

This fetches changes from the template repo, diffs only the `core/` paths (your custom code is untouched), and suggests merge commands. See [docs/UPGRADING.md](./docs/UPGRADING.md) for the full process.

### 4. Extend

Add your own permissions, routes, services, and pages — see [docs/EXTENDING.md](./docs/EXTENDING.md).

## Documentation

| Document | Description |
|----------|-------------|
| [Deployment Guide](./docs/DEPLOYMENT.md) | Firebase/GCP setup, build, deploy to production |
| [Configuration](./docs/CONFIGURATION.md) | Environment variables, CORS, rate limiting |
| [Extending](./docs/EXTENDING.md) | Add permissions, routes, services, pages |
| [Upgrading](./docs/UPGRADING.md) | Pull upstream template updates |
| [Troubleshooting](./docs/TROUBLESHOOTING.md) | Common errors and fixes |
| [API Reference](./packages/backend/docs/api-reference.md) | REST API endpoints |
| [Frontend Docs](./packages/frontend/docs/README.md) | Frontend architecture |
| [Backend Docs](./packages/backend/docs/README.md) | Backend architecture |
| [BRD](./docs/BRD.md) | Business requirements, data models, permissions |
| [Emulator Testing](./docs/EMULATOR_TESTING.md) | Local development with Firebase emulators |
| [Infrastructure](./infrastructure/README.md) | Terraform IaC for GCP |
| [Template Changelog](./TEMPLATE_CHANGELOG.md) | Version history of core changes |

## Contributing

1. Follow the coding standards in `biome.json`
2. Run `bun run typecheck` and `bun run lint` before committing
3. Update `Claude.md` with any architectural decisions

## License

MIT
