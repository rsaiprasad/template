# Admin Dashboard Template

A production-ready, fully-typed admin dashboard template built with modern technologies. Designed as a foundation for B2C/B2B SaaS applications and internal tools.

## Features

- **Authentication**: Google OAuth via Firebase Authentication
- **Authorization**: Role-based access control (RBAC) with customizable groups and permissions
- **User Management**: CRUD operations, disable/enable accounts, group assignment
- **Group Management**: Create custom groups with granular permissions
- **Audit Logging**: Track all sensitive operations with detailed logs
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
├── packages/
│   ├── frontend/          # React SPA
│   │   ├── src/
│   │   │   ├── api/       # Generated OpenAPI client
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   └── stores/
│   │   └── docs/          # Frontend documentation
│   │
│   ├── backend/           # Hono REST API
│   │   ├── src/
│   │   │   ├── openapi/   # OpenAPI route definitions
│   │   │   ├── services/
│   │   │   ├── middleware/
│   │   │   └── config/
│   │   ├── docs/          # API documentation
│   │   └── openapi.json   # Generated OpenAPI spec
│   │
│   └── shared/            # Shared TypeScript types
│
├── firebase/              # Firebase configuration
├── Claude.md              # AI assistant guidelines
└── README.md              # This file
```

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) v1.0+
- [Firebase CLI](https://firebase.google.com/docs/cli)
- Google Cloud project with Firebase enabled

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd admin-dashboard-template

# Install dependencies
bun install

# Copy environment files
cp .env.example .env
cp packages/frontend/.env.example packages/frontend/.env
```

### Configuration

1. **Firebase Setup**
   ```bash
   # Login to Firebase
   firebase login

   # Initialize Firebase (select existing project)
   firebase use --add
   ```

2. **Environment Variables**

   Edit `.env` and `packages/frontend/.env`:
   ```env
   # Frontend
   PUBLIC_FIREBASE_API_KEY=your-api-key
   PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   PUBLIC_API_BASE_URL=http://localhost:5001/your-project/us-central1/api

   # Backend
   CORS_ORIGINS=http://localhost:5173,http://localhost:4173
   SUPER_ADMIN_EMAIL=admin@example.com
   ```

### Development

```bash
# Start all services
bun run dev

# Or start individually
bun run dev:frontend    # React app on http://localhost:5173
bun run dev:backend     # API with watch mode
```

### Building for Production

```bash
# Build all packages
bun run build

# Build individually
bun run build:frontend
bun run build:backend
```

### Deployment

```bash
# Deploy to Firebase
bun run deploy

# Deploy only hosting (frontend)
firebase deploy --only hosting

# Deploy only functions (backend)
firebase deploy --only functions
```

## API Documentation

The API follows OpenAPI 3.1 specification. Access documentation at:

- **Swagger UI**: `http://localhost:5001/api/v1/swagger`
- **OpenAPI JSON**: `http://localhost:5001/api/v1/doc`

Generate the OpenAPI spec:
```bash
cd packages/backend
bun run generate:openapi
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start development servers |
| `bun run build` | Build all packages |
| `bun run typecheck` | Run TypeScript checks |
| `bun run lint` | Run Biome linting |
| `bun run lint:fix` | Fix linting issues |
| `bun run test` | Run tests |
| `bun run deploy` | Deploy to Firebase |

## Default Permissions

| Resource | Actions |
|----------|---------|
| `users` | `list`, `create`, `read`, `update`, `delete` |
| `groups` | `list`, `create`, `read`, `update`, `delete` |
| `settings` | `list`, `read`, `update` |
| `audit` | `list`, `read` |

## Default Groups

| Group | Permissions |
|-------|-------------|
| **Admin** | All permissions |
| **Users** | `users:read` (own profile only) |

## Security Features

- **Rate Limiting**: 100 req/min (general), 10 req/min (auth)
- **CORS**: Config-driven origin whitelist
- **Token Validation**: Firebase ID token verification with revocation check
- **Super Admin Protection**: Cannot be deleted or demoted
- **Audit Trail**: All sensitive operations logged

## Documentation

- [Frontend Documentation](./packages/frontend/docs/README.md)
- [Backend Documentation](./packages/backend/docs/README.md)
- [API Reference](./packages/backend/docs/api-reference.md)

## Contributing

1. Follow the coding standards in `biome.json`
2. Run `bun run typecheck` and `bun run lint` before committing
3. Update `Claude.md` with any architectural decisions

## License

MIT
