# Frontend Documentation

## Table of Contents

1. [Getting Started](#getting-started)
2. [Architecture Overview](#architecture-overview)
3. [Components](#components)
4. [State Management](#state-management)
5. [API Client](#api-client)
6. [Authentication](#authentication)
7. [Permissions](#permissions)
8. [Theming](#theming)
9. [Testing](#testing)

---

## Getting Started

### Prerequisites

- Bun v1.0+
- Firebase project configured

### Installation

```bash
# From monorepo root
bun install

# Configure environment
cp packages/frontend/.env.example packages/frontend/.env
```

### Development

```bash
bun run dev:frontend
```

The development server runs on `http://localhost:5173` with:
- Hot module replacement
- API proxy to backend
- CSS rebuilding on changes

---

## Architecture Overview

### Directory Structure

```
src/
├── api/          # API client (generated from OpenAPI)
├── components/   # React components
├── hooks/        # Custom React hooks
├── lib/          # Utilities and Firebase setup
├── pages/        # Page components (routes)
├── stores/       # Zustand stores
└── types/        # TypeScript types
```

### Key Patterns

1. **Colocation**: Related files are grouped together
2. **Composition**: Small, focused components composed together
3. **Type Safety**: Full TypeScript with strict mode
4. **Server State**: TanStack Query for API data
5. **Client State**: Zustand for UI state

---

## Components

### UI Components

Located in `src/components/ui/`, these are shadcn/ui components:

| Component | Description |
|-----------|-------------|
| `Button` | Primary interaction element with variants |
| `Card` | Content container with header/footer |
| `Dialog` | Modal overlay for forms/confirmations |
| `Form` | Form wrapper with react-hook-form |
| `Input` | Text input with error state |
| `Select` | Dropdown selection |
| `Switch` | Toggle control |
| `Table` | Data table with sorting |
| `Toast` | Notification messages |
| `Badge` | Status indicators |
| `Avatar` | User profile images |
| `Skeleton` | Loading placeholders |

### Usage Example

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Title</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="default" size="sm">
          Click me
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Layout Components

| Component | Description |
|-----------|-------------|
| `AppLayout` | Main app shell with sidebar/header |
| `Sidebar` | Navigation menu |
| `Header` | Top bar with user menu |

### Feature Components

| Component | Description |
|-----------|-------------|
| `PermissionGate` | Conditional rendering by permission |
| `ThemeToggle` | Theme switcher |
| `ErrorBoundary` | Error recovery UI |

---

## State Management

### Server State (TanStack Query)

For data from the API:

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';

// Fetching data
function UserList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['users', 'list', { page: 1 }],
    queryFn: () => api.listUsers({ page: 1, pageSize: 20 }),
  });

  if (isLoading) return <Skeleton />;
  if (error) return <Error />;
  return <Table data={data.data} />;
}

// Mutations
function UpdateUser({ userId }: { userId: string }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: UpdateUserRequest) => api.updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  return <Form onSubmit={mutation.mutate} />;
}
```

### Client State (Zustand)

For UI state that doesn't come from the API:

```tsx
// Auth store
import { useAuthStore } from '@/stores/auth-store';

const { user, isAuthenticated, signIn, signOut } = useAuthStore();

// Theme store
import { useThemeStore } from '@/stores/theme-store';

const { theme, setTheme } = useThemeStore();
```

---

## API Client

### Generated Client

The API client is generated from the backend's OpenAPI spec:

```tsx
import { api } from '@/api';
import type { User, ListUsersParams } from '@/api';

// All methods are fully typed
const response = await api.listUsers({
  page: 1,
  pageSize: 20,
  status: 'active',
});

if (response.success) {
  const users: User[] = response.data;
  const { total, hasMore } = response.meta;
}
```

### Available Methods

#### Auth
- `api.login()` - Login (creates user on first login)
- `api.logout()` - Logout
- `api.getMe()` - Get current user with permissions

#### Users
- `api.listUsers(params)` - List users (paginated)
- `api.getUser(id)` - Get user by ID
- `api.updateUser(id, data)` - Update user
- `api.deleteUser(id)` - Delete user
- `api.disableUser(id)` - Disable user
- `api.enableUser(id)` - Enable user
- `api.changeUserGroup(userId, groupId)` - Change user's group

#### Groups
- `api.listGroups(params)` - List groups
- `api.createGroup(data)` - Create group
- `api.getGroup(id)` - Get group
- `api.updateGroup(id, data)` - Update group
- `api.deleteGroup(id)` - Delete group
- `api.updateGroupPermissions(id, permissions)` - Set group permissions

#### Permissions
- `api.listPermissions()` - List all permissions
- `api.getMyPermissions()` - Get current user's permissions

#### Settings
- `api.getSettings()` - Get app settings
- `api.updateSettings(data)` - Update settings

#### Audit
- `api.listAuditLogs(params)` - List audit logs
- `api.getAuditLog(id)` - Get audit log entry
- `api.getAuditStats()` - Get audit statistics

### Error Handling

```tsx
import { api, ApiRequestError } from '@/api';

try {
  const response = await api.getUser(id);
  if (!response.success) {
    console.error(response.error.message);
  }
} catch (error) {
  if (error instanceof ApiRequestError) {
    console.error(`${error.status}: ${error.message}`);
  }
}
```

---

## Authentication

### Firebase Auth Integration

```tsx
import { useAuth } from '@/hooks/useAuth';

function LoginPage() {
  const { signInWithGoogle, isLoading, error } = useAuth();

  return (
    <Button onClick={signInWithGoogle} disabled={isLoading}>
      Sign in with Google
    </Button>
  );
}
```

### Protected Routes

```tsx
import { RequireAuth } from '@/components/features/permission-gate';

<Route
  element={
    <RequireAuth>
      <AppLayout />
    </RequireAuth>
  }
>
  <Route path="dashboard" element={<Dashboard />} />
</Route>
```

---

## Permissions

### Permission Format

Permissions follow the pattern `resource:action`:

- `users:list`, `users:create`, `users:read`, `users:update`, `users:delete`
- `groups:list`, `groups:create`, `groups:read`, `groups:update`, `groups:delete`
- `settings:read`, `settings:update`
- `audit:list`, `audit:read`

### Checking Permissions

```tsx
import { usePermissions } from '@/hooks/usePermissions';

function AdminPanel() {
  const { hasPermission, hasAnyPermission, isSuperAdmin } = usePermissions();

  // Single permission
  if (!hasPermission('users:delete')) {
    return null;
  }

  // Any of multiple permissions
  if (hasAnyPermission(['users:update', 'users:delete'])) {
    return <ManageUsers />;
  }

  // Super admin bypass
  if (isSuperAdmin) {
    return <SuperAdminPanel />;
  }
}
```

### Permission Gate Component

```tsx
import { PermissionGate } from '@/components/features/permission-gate';

<PermissionGate permission="users:delete" fallback={<Forbidden />}>
  <DeleteUserButton />
</PermissionGate>
```

---

## Theming

### Theme Options

- `light` - Light theme
- `dark` - Dark theme
- `system` - Follow system preference

### Usage

```tsx
import { useThemeStore } from '@/stores/theme-store';

function ThemeSelector() {
  const { theme, setTheme } = useThemeStore();

  return (
    <select value={theme} onChange={(e) => setTheme(e.target.value)}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="system">System</option>
    </select>
  );
}
```

### CSS Variables

Themes are implemented via CSS variables in `src/index.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  /* ... */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... */
}
```

---

## Testing

### Unit Tests

```bash
bun run test
```

Tests use Bun's built-in test runner with React Testing Library.

### E2E Tests

```bash
bun run e2e
```

E2E tests use Playwright for browser automation.

### Test Files

- Unit tests: `*.test.ts` or `*.test.tsx`
- E2E tests: `e2e/*.spec.ts`
