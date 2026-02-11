# Extending the Template

This guide explains how to add new features to your project built from the Admin Dashboard Template.

## Architecture Overview

The codebase is split into **core** (template infrastructure) and **customizable** (your domain code):

```
packages/
  shared/src/
    core/           # Permission types, API types, utils — DON'T EDIT
    types/          # Domain types (user, group, audit, settings) — EDIT FREELY
    constants/      # Custom permission definitions (CUSTOM_PERMISSIONS) — EDIT FREELY

  backend/src/
    core/           # Auth middleware, permissions, Firebase helpers — DON'T EDIT
    routes/         # API route handlers — EDIT FREELY
    services/       # Business logic — EDIT FREELY
    config/         # App configuration — EDIT FREELY
    openapi/        # API documentation — EDIT FREELY

  frontend/src/
    core/           # Auth hooks, permission gates, API client — DON'T EDIT
    pages/          # Page components — EDIT FREELY
    components/     # UI components — EDIT FREELY
    hooks/          # Custom hooks — EDIT FREELY
    stores/         # State stores — EDIT FREELY
    api/            # API client configuration — EDIT FREELY
    types/          # Frontend types — EDIT FREELY
```

## Adding a New Resource

Example: Adding a "Products" resource with CRUD operations.

### 1. Define Permissions

Edit `packages/shared/src/constants/permissions.ts` and add entries to the `CUSTOM_PERMISSIONS` record:

```typescript
export const CUSTOM_PERMISSIONS: Record<string, PermissionDefinition> = {
  'products:create': { resource: 'products', action: 'create', description: 'Create products' },
  'products:read':   { resource: 'products', action: 'read',   description: 'View product details' },
  'products:update': { resource: 'products', action: 'update', description: 'Update products' },
  'products:delete': { resource: 'products', action: 'delete', description: 'Delete products' },
  'products:list':   { resource: 'products', action: 'list',   description: 'View product list' },
};
```

No changes to the permission types are needed -- the `Permission` type in `packages/shared/src/core/types/permission.ts` is extensible and accepts any string.

### 2. Add Shared Types

Create `packages/shared/src/types/product.ts`:

```typescript
export interface Product {
  id: string;
  name: string;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductInput {
  name: string;
  price: number;
}

export interface UpdateProductInput {
  name?: string;
  price?: number;
}
```

Export from `packages/shared/src/types/index.ts`:

```typescript
export * from './product';
```

### 3. Add Backend Service

Create `packages/backend/src/services/product.service.ts`:

```typescript
import type { Product, CreateProductInput } from '@admin-dashboard/shared';
import { Collections, convertFirestoreDoc, getDb } from '../core/lib/firebase-admin';
import { NotFoundError } from '../core/errors';

export class ProductService {
  private db = getDb();

  async list(): Promise<Product[]> {
    const snapshot = await this.db.collection('products').get();
    return snapshot.docs.map(doc => convertFirestoreDoc<Product>(doc)!);
  }

  async getById(id: string): Promise<Product> {
    const doc = await this.db.collection('products').doc(id).get();
    const product = convertFirestoreDoc<Product>(doc);
    if (!product) throw new NotFoundError('Product');
    return product;
  }

  async create(input: CreateProductInput): Promise<Product> {
    const ref = await this.db.collection('products').add({
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return this.getById(ref.id);
  }
}
```

Register in `packages/backend/src/services/index.ts`:

```typescript
import { ProductService } from './product.service';
export const productService = new ProductService();
```

### 4. Add Backend Route

Create `packages/backend/src/routes/products.ts`:

```typescript
import { Hono } from 'hono';
import { authMiddleware } from '../core/middleware/auth';
import { requirePermission } from '../core/middleware/permissions';
import { productService } from '../services';
import type { AppEnv } from '../core/types/context';
import { successResponse } from '../core/utils/response';

const productRoutes = new Hono<AppEnv>();
productRoutes.use('*', authMiddleware);

productRoutes.get('/', requirePermission('products:list'), async (c) => {
  const products = await productService.list();
  return successResponse(c, products);
});

export { productRoutes };
```

Mount in `packages/backend/src/app.ts`:

```typescript
import { productRoutes } from './routes/products';
apiV1.route('/products', productRoutes);
```

### 5. Add Frontend Page

Create `packages/frontend/src/pages/Products.tsx` with your product list UI.

Add a route in `packages/frontend/src/App.tsx`:

```tsx
<Route path="/products" element={
  <RequirePermission permission="products:list">
    <Products />
  </RequirePermission>
} />
```

Add a sidebar link in `packages/frontend/src/components/layout/sidebar.tsx`.

### 6. Add API Methods

Add methods to the API client or create a new API module in `packages/frontend/src/api/`.

## Adding a New Permission to an Existing Resource

1. Add the permission definition to `CUSTOM_PERMISSIONS` in `packages/shared/src/constants/permissions.ts`
2. Use `requirePermission('resource:action')` in your backend route
3. Use `<WithPermission permission="resource:action">` in your frontend component

## Customizing the Auth Flow

The auth flow lives in `core/` and is normally updated via the template sync process.
For most use cases, extend auth **without editing core files**:

- **Add custom claims**: Extend the `AuthUser` type in `packages/frontend/src/types/index.ts`
- **Add post-login logic**: Add to the login route in `packages/backend/src/routes/auth.ts` (customizable)

**Advanced (breaks future template sync for modified files):**

- **Add login methods**: Modify `packages/frontend/src/core/hooks/useAuth.ts`. Because this is a core file, future template updates to this file will require manual merging. Only do this if you need a fundamentally different auth flow (e.g., adding email/password alongside Google OAuth).

## Customizing the AI System Prompt

The AI Assistant uses a default system prompt that describes the dashboard and available operations. To customize it for your project, set the `AI_SYSTEM_PROMPT` environment variable in the AI service configuration:

```bash
# packages/ai-service/.env
AI_SYSTEM_PROMPT="You are a helpful assistant for MyApp. You help users manage orders, products, and inventory."
```

When set, this replaces the default system prompt. The tool definitions (auto-generated from your OpenAPI spec) are always appended regardless of the prompt.

## Enabling/Disabling AI Assistant

The AI Assistant is controlled by the `aiAssistant` application setting, which can be changed by an admin via the Settings page or directly in Firestore:

| Value | Behavior |
|-------|----------|
| `'voice'` | Voice mode enabled (Gemini Live API with real-time audio) |
| `'chat'` | Text chat mode enabled (Gemini text API) |
| `'disabled'` | AI Assistant hidden from the UI entirely |

Users also need the `ai:use` permission assigned to their group to access the assistant. Add this permission to the appropriate groups via the Group Management screen.

## Adding Custom Tools to the AI Assistant

The AI Assistant auto-generates its tool definitions from the backend's OpenAPI spec. To make a new capability available to the AI:

1. Add a new API endpoint to the backend (see "Adding a New Resource" above)
2. Ensure the endpoint has OpenAPI documentation (Hono OpenAPI decorators)
3. Rebuild the AI service -- tool definitions regenerate automatically on build (`bun run build:ai-service`)

No manual tool registration is needed. Any endpoint documented in the OpenAPI spec becomes a callable tool.

## Voice vs Chat Mode

| Aspect | Voice Mode | Chat Mode |
|--------|-----------|-----------|
| **API** | Gemini Live API (`gemini-2.0-flash-live-001`) | Gemini text API (`gemini-2.0-flash`) |
| **Interaction** | Real-time spoken conversation | Text input/output |
| **Best for** | Hands-free operation, quick queries | Detailed instructions, structured responses |
| **Requirements** | Microphone access, modern browser | Text input only |

Choose voice mode for hands-free dashboard operation and quick administrative queries. Choose chat mode when users prefer text interaction or when audio is not practical.

## Customizing the UI Theme

- shadcn/ui components in `packages/frontend/src/components/ui/` are freely editable
- Theme store in `packages/frontend/src/stores/theme-store.ts` is customizable
- Global styles in `packages/frontend/src/index.css` are customizable
