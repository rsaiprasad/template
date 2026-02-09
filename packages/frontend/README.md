# Admin Dashboard Frontend

React-based admin dashboard with TypeScript, TanStack Query, Zustand, and shadcn/ui.

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Bun (native bundler)
- **State Management**: Zustand (auth, theme), TanStack Query (server state)
- **UI Components**: shadcn/ui + Radix UI primitives
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod validation
- **API Client**: Generated from OpenAPI spec

## Project Structure

```
src/
├── api/                    # API client
│   ├── generated/          # Generated from OpenAPI spec
│   │   ├── client.ts       # AdminDashboardApi class
│   │   ├── types.ts        # TypeScript types
│   │   └── index.ts
│   └── index.ts            # Configured API instance
│
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── layout/             # App layout (sidebar, header)
│   ├── features/           # Feature components
│   ├── error-boundary.tsx  # Global error boundary
│   └── navigation-progress.tsx
│
├── pages/
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Settings.tsx
│   ├── AuditLogs.tsx
│   ├── users/
│   │   ├── UserList.tsx
│   │   └── UserDetail.tsx
│   └── groups/
│       ├── GroupList.tsx
│       └── GroupDetail.tsx
│
├── hooks/
│   ├── useAuth.ts          # Authentication hook
│   ├── usePermissions.ts   # Permission checking
│   └── useToast.ts         # Toast notifications
│
├── stores/
│   ├── auth-store.ts       # Auth state (Zustand)
│   └── theme-store.ts      # Theme state (Zustand)
│
├── lib/
│   ├── firebase.ts         # Firebase client SDK
│   └── utils.ts            # Utility functions
│
├── types/
│   └── index.ts            # Frontend-specific types
│
├── App.tsx                 # Router setup
├── main.tsx                # Entry point
└── index.css               # Tailwind + CSS variables
```

## Development

### Prerequisites

- Bun v1.0+
- Backend running (for API calls)

### Setup

```bash
# Install dependencies (from monorepo root)
bun install

# Copy environment file
cp .env.example .env
```

### Environment Variables

```env
# Firebase Configuration
PUBLIC_FIREBASE_API_KEY=your-api-key
PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
PUBLIC_FIREBASE_PROJECT_ID=your-project-id
PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
PUBLIC_FIREBASE_APP_ID=your-app-id

# API Configuration
PUBLIC_API_BASE_URL=/api/v1
```

### Commands

```bash
# Start development server
bun run dev

# Type checking
bun run typecheck

# Production build
bun run build

# Preview production build
bun run preview

# Run tests
bun run test

# E2E tests
bun run e2e
```

## Architecture

### API Client

The API client is generated from the backend's OpenAPI spec:

```typescript
import { api } from '@/api';

// List users with pagination
const response = await api.listUsers({ page: 1, pageSize: 20 });
if (response.success) {
  console.log(response.data); // User[]
  console.log(response.meta); // { page, limit, total, hasMore }
}

// Get current user
const me = await api.getMe();

// Update user
await api.updateUser(userId, { displayName: 'New Name' });
```

Features:
- 30-second request timeout
- Automatic retry with exponential backoff
- Token refresh on 401
- Type-safe requests and responses

### State Management

**Auth State (Zustand)**
```typescript
import { useAuthStore } from '@/stores/auth-store';

const { user, isAuthenticated, permissions } = useAuthStore();
```

**Server State (TanStack Query)**
```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';

const { data, isLoading } = useQuery({
  queryKey: ['users', 'list', params],
  queryFn: () => api.listUsers(params),
});
```

### Permission Checking

```typescript
import { usePermissions } from '@/hooks/usePermissions';

function MyComponent() {
  const { hasPermission, canManageUsers } = usePermissions();

  if (!hasPermission('users:update')) {
    return <Forbidden />;
  }

  return <EditUserForm />;
}
```

### Theme Support

```typescript
import { useThemeStore } from '@/stores/theme-store';

const { theme, setTheme } = useThemeStore();
// theme: 'light' | 'dark' | 'system'
```

## Components

### UI Components (shadcn/ui)

All components in `src/components/ui/` follow shadcn/ui patterns:

- `Button` - with variants and loading state
- `Card` - content containers
- `Dialog` - modal dialogs
- `Form` - react-hook-form integration
- `Input`, `Select`, `Switch` - form controls
- `Table` - data tables
- `Toast` - notifications

### Layout Components

- `AppLayout` - main layout with sidebar and header
- `Sidebar` - navigation with permission-based menu items
- `Header` - top bar with user menu and theme toggle

### Feature Components

- `PermissionGate` - conditionally render based on permissions
- `ThemeToggle` - theme switcher dropdown
- `ErrorBoundary` - catches JS errors
- `NavigationProgress` - loading indicator for route transitions

## Testing

### Unit Tests (Bun)

```bash
bun run test
```

### E2E Tests (Playwright)

```bash
bun run e2e
bun run e2e:ui  # With UI
```

## Building

```bash
# Production build
bun run build

# Output in ./dist/
```

The build process:
1. Compiles TypeScript
2. Bundles with Bun's bundler
3. Processes Tailwind CSS
4. Copies public assets

