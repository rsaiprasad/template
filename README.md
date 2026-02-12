# Admin Dashboard Template

A production-ready, fully-typed admin dashboard template built with modern technologies. Designed as a foundation for B2C/B2B SaaS applications and internal tools.

Runs entirely on your desktop with PostgreSQL, exposed to the internet via Cloudflare Tunnel. Zero monthly cost.

## Architecture

```
Browser --> Cloudflare Pages (static frontend)
        --> Cloudflare Tunnel --> Desktop Bun Server (Hono API, port 3000)
                               --> PostgreSQL (local)
        --> Firebase Auth (free tier, Google OAuth)
```

## Features

- **Authentication**: Google OAuth via Firebase Authentication (free tier)
- **Authorization**: Role-based access control (RBAC) with customizable groups and permissions
- **User Management**: CRUD operations, disable/enable accounts, multi-group assignment
- **Group Management**: Create custom groups with granular permissions
- **Audit Logging**: Track all sensitive operations with detailed logs
- **Security**: Rate limiting, CORS whitelist, token validation, super admin protection
- **Theme Support**: Light/dark mode with system preference detection
- **AI Assistant**: Conversational AI for dashboard operations with voice and text chat modes (Gemini)
- **OpenAPI Compliant**: Full OpenAPI 3.1 spec with generated TypeScript client

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Bun |
| **Frontend** | React 18, TanStack Query, Zustand, shadcn/ui, Tailwind CSS |
| **Backend** | Hono (OpenAPI), standalone Bun server |
| **Database** | PostgreSQL with Drizzle ORM |
| **Authentication** | Firebase Auth (Google OAuth, free tier) |
| **Frontend Hosting** | Cloudflare Pages (free tier) |
| **Backend Exposure** | Cloudflare Tunnel (free tier) |
| **Linting** | Biome |

## Project Structure

```
admin-dashboard-template/
├── docs/
│   ├── BRD.md             # Business Requirements Document
│   ├── ARCHITECTURE.md    # System architecture reference
│   ├── DEPLOYMENT.md      # Production deployment guide
│   ├── EXTENDING.md       # How to add features
│   ├── UPGRADING.md       # How to pull template updates
│   └── ...
│
├── infrastructure/
│   ├── cloudflare/        # Cloudflare Tunnel config template
│   ├── systemd/           # systemd service files for backend + tunnel
│   └── scripts/           # setup-local.sh (PostgreSQL + env setup)
│
├── packages/
│   ├── shared/            # Shared TypeScript types & utilities
│   │   └── src/
│   │       ├── core/      # Template infra: API types, permission types, utils
│   │       ├── types/     # Domain types (user, group, audit, settings)
│   │       └── constants/ # Permission definitions
│   │
│   ├── backend/           # Hono REST API (Bun server)
│   │   └── src/
│   │       ├── core/      # Template infra: middleware, Firebase Auth, errors
│   │       ├── db/        # Drizzle ORM schema and database connection
│   │       ├── routes/    # API route handlers (customizable)
│   │       ├── services/  # Business logic (customizable)
│   │       └── config/    # App configuration (customizable)
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
│   ├── dev.sh             # Start full dev environment
│   ├── init-project.sh    # Rename template for new project
│   └── sync-template.sh   # Pull upstream template updates
│
├── template.json          # Template version & core/customizable paths
├── CLAUDE.md              # AI assistant guidelines
└── README.md              # This file
```

### Core vs. Customizable

Each package has a `core/` directory containing template infrastructure (auth, permissions, API client, middleware). **Don't edit core files** -- they receive updates from the template.

Everything outside `core/` is yours to customize: routes, services, pages, components, types, and configuration. See [docs/EXTENDING.md](./docs/EXTENDING.md) for details.

## Prerequisites

| Prerequisite | Installation |
|--------------|--------------|
| **Bun** (>=1.0) | [bun.sh](https://bun.sh/) |
| **PostgreSQL** | `sudo apt install postgresql` or [postgresql.org](https://www.postgresql.org/download/) |
| **Firebase CLI** | `bun install -g firebase-tools` (for Auth emulator in dev) |
| **cloudflared** (optional, for production) | [Cloudflare Downloads](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) |

## Quick Start

```bash
# Clone or use "Use this template" on GitHub
git clone https://github.com/rsaiprasad/template.git my-project
cd my-project

# Rename for your project
./scripts/init-project.sh my-saas-app @mycompany

# Install dependencies
bun install

# Set up PostgreSQL database and generate .env
./infrastructure/scripts/setup-local.sh

# Fill in Firebase Auth credentials and SUPER_ADMIN_EMAIL in packages/backend/.env

# Start development (backend + frontend + Firebase Auth emulator)
./scripts/dev.sh
```

Once running:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api/v1
- **Swagger**: http://localhost:3000/api/v1/swagger
- **Auth Emulator**: http://localhost:9099

## Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start frontend + backend dev servers |
| `bun run dev:full` | Start everything (backend + frontend + Auth emulator + AI service) |
| `bun run dev:frontend` | Frontend dev server only (port 5173) |
| `bun run dev:backend` | Backend dev server only (port 3000) |
| `bun run build` | Build all packages for production |
| `bun run typecheck` | Run TypeScript type checks |
| `bun run lint` | Run Biome linting |
| `bun run lint:fix` | Fix linting issues |
| `bun run test` | Run tests |
| `bun run setup:local` | Set up PostgreSQL and generate .env |
| `bun run deploy:frontend` | Deploy frontend to Cloudflare Pages |
| `bun run tunnel:start` | Start Cloudflare Tunnel |
| `bun run dev:ai-service` | Start AI service only |
| `bun run build:ai-service` | Build AI service |

### Database Commands

Run from `packages/backend/`:

| Command | Description |
|---------|-------------|
| `bun run db:generate` | Generate Drizzle migration files |
| `bun run db:migrate` | Run pending migrations |
| `bun run db:push` | Push schema changes directly to database |
| `bun run db:studio` | Open Drizzle Studio (database GUI) |

## Deployment

The application deploys as three components:

| Component | Where | How |
|-----------|-------|-----|
| **Frontend** | Cloudflare Pages (free) | `bun run deploy:frontend` via wrangler |
| **Backend** | Your desktop (systemd) | `infrastructure/systemd/admin-dashboard.service` |
| **Tunnel** | Cloudflare Tunnel (free) | `infrastructure/systemd/cloudflared.service` |

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for the full production setup guide.

**Expected monthly cost: $0** -- local compute + Cloudflare free tier + Firebase Auth free tier.

## AI Assistant

The template includes an optional AI Assistant that lets users perform dashboard operations through natural language -- either voice or text chat.

### Setup

1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/)
2. Add it to the AI service environment:
   ```bash
   # packages/ai-service/.env
   GEMINI_API_KEY=your-api-key-here
   ```
3. Start the development environment with AI enabled:
   ```bash
   bun run dev:full    # Starts frontend + backend + AI service (if configured)
   ```

### Configuration

| Setting | Where | Description |
|---------|-------|-------------|
| `aiAssistant` | App Settings (database) | Set to `'voice'`, `'chat'`, or `'disabled'` |
| `ai:use` | Group permissions | Users must have this permission to access the assistant |
| `GEMINI_API_KEY` | `packages/ai-service/.env` | Required API key for Gemini models |
| `AI_SYSTEM_PROMPT` | `packages/ai-service/.env` | Optional custom system prompt |

The AI auto-generates tools from the backend's OpenAPI spec, so any new API endpoint becomes available to the assistant automatically. See [docs/EXTENDING.md](./docs/EXTENDING.md) for customization details.

## Using This Template

### 1. Create a New Project

Fork or clone this repo, then rename it for your project:

```bash
./scripts/init-project.sh my-saas-app @mycompany
bun install && bun run build
```

This replaces all references to `admin-dashboard-template` and `@admin-dashboard` with your project name and npm scope across all source files, package.json files, and config.

### 2. Set Up Local Infrastructure

```bash
./infrastructure/scripts/setup-local.sh
```

This sets up PostgreSQL, creates the database, runs migrations, and generates `.env` files.

### 3. Pull Template Updates

When the template gets new features or fixes in `core/` paths, sync them into your project:

```bash
./scripts/sync-template.sh
```

This fetches changes from the template repo, diffs only the `core/` paths (your custom code is untouched), and suggests merge commands. See [docs/UPGRADING.md](./docs/UPGRADING.md) for the full process.

### 4. Extend

Add your own permissions, routes, services, and pages -- see [docs/EXTENDING.md](./docs/EXTENDING.md).

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](./docs/ARCHITECTURE.md) | System architecture and design decisions |
| [Deployment Guide](./docs/DEPLOYMENT.md) | PostgreSQL, systemd, Cloudflare setup |
| [Configuration](./docs/CONFIGURATION.md) | Environment variables, CORS, rate limiting |
| [Extending](./docs/EXTENDING.md) | Add permissions, routes, services, pages |
| [Upgrading](./docs/UPGRADING.md) | Pull upstream template updates |
| [Troubleshooting](./docs/TROUBLESHOOTING.md) | Common errors and fixes |
| [Local Development](./docs/LOCAL_DEVELOPMENT.md) | Dev environment setup and testing |
| [BRD](./docs/BRD.md) | Business requirements, data models, permissions |
| [Template Changelog](./TEMPLATE_CHANGELOG.md) | Version history of core changes |

## Contributing

1. Follow the coding standards in `biome.json`
2. Run `bun run typecheck` and `bun run lint` before committing
3. Update `CLAUDE.md` with any architectural decisions

## License

MIT
