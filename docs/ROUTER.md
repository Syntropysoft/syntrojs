# Router System

## 🎯 Overview

SyntroJS provides a **router system** that allows you to organize your API into logical groups with shared prefixes and middleware. This is similar to FastAPI's `APIRouter` or Express's router.

**Key Benefits:**
- ✅ **Code Organization** - Group related routes together
- ✅ **DRY Principle** - Share prefixes and middleware across routes
- ✅ **Modularity** - Separate routers into different files/modules
- ✅ **Middleware Scoping** - Apply middleware to specific route groups
- ✅ **API Versioning** - Maintain multiple API versions simultaneously 🚀

---

## 🚀 Quick Start

### Basic Usage

```typescript
import { SyntroJS, SyntroRouter } from 'syntrojs';
import { z } from 'zod';

const app = new SyntroJS({ title: 'My API' });

// Create a router with prefix
const apiRouter = new SyntroRouter('/api/v1');

// Register routes on the router
apiRouter.get('/users', {
  handler: () => [{ id: 1, name: 'John' }],
});

apiRouter.post('/users', {
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
  }),
  handler: ({ body }) => ({ id: 1, ...body }),
});

// Include router in app
app.include(apiRouter);

await app.listen(3000);
```

**Result:** Routes are available at:
- `GET /api/v1/users`
- `POST /api/v1/users`

**That's it!** 🎉 Your routes are automatically prefixed and registered.

---

## 📖 Complete Examples

### Example 1: Basic Router with Multiple Routes

```typescript
import { SyntroJS, SyntroRouter } from 'syntrojs';
import { z } from 'zod';

const app = new SyntroJS({ title: 'Users API' });

// Create users router
const usersRouter = new SyntroRouter('/api/v1/users');

// Register CRUD operations
usersRouter.get('/', {
  handler: () => [
    { id: 1, name: 'John', email: 'john@example.com' },
    { id: 2, name: 'Jane', email: 'jane@example.com' },
  ],
});

usersRouter.get('/:id', {
  params: z.object({ id: z.string().uuid() }),
  handler: ({ params }) => ({
    id: params.id,
    name: 'John',
    email: 'john@example.com',
  }),
});

usersRouter.post('/', {
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
  }),
  handler: ({ body }) => ({
    id: Math.random().toString(),
    ...body,
  }),
});

usersRouter.put('/:id', {
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
  }),
  handler: ({ params, body }) => ({
    id: params.id,
    ...body,
  }),
});

usersRouter.delete('/:id', {
  params: z.object({ id: z.string().uuid() }),
  handler: ({ params }) => ({ deleted: params.id }),
});

// Include router
app.include(usersRouter);

await app.listen(3000);
```

**Routes created:**
- `GET /api/v1/users` - List all users
- `GET /api/v1/users/:id` - Get user by ID
- `POST /api/v1/users` - Create user
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

### Example 2: Router-Level Middleware

```typescript
import { SyntroJS, SyntroRouter } from 'syntrojs';
import { UnauthorizedException } from 'syntrojs';

const app = new SyntroJS({ title: 'Protected API' });

// Create authenticated router
const protectedRouter = new SyntroRouter('/api/v1/protected');

// Add authentication middleware to router
protectedRouter.use(async (ctx, next) => {
  const token = ctx.headers.authorization;
  
  if (!token || !token.startsWith('Bearer ')) {
    throw new UnauthorizedException('Token required');
  }
  
  // Validate token (simplified)
  const isValid = validateToken(token.replace('Bearer ', ''));
  if (!isValid) {
    throw new UnauthorizedException('Invalid token');
  }
  
  await next();
});

// All routes in this router require authentication
protectedRouter.get('/profile', {
  handler: () => ({
    id: 1,
    name: 'John',
    email: 'john@example.com',
  }),
});

protectedRouter.get('/settings', {
  handler: () => ({
    theme: 'dark',
    notifications: true,
  }),
});

app.include(protectedRouter);

await app.listen(3000);
```

**Middleware execution order:**
1. Global middleware (if any)
2. Router middleware (`protectedRouter.use()`)
3. Route handler

### Example 3: Multiple Routers

```typescript
import { SyntroJS, SyntroRouter } from 'syntrojs';
import { z } from 'zod';

const app = new SyntroJS({ title: 'Multi-Router API' });

// Users router
const usersRouter = new SyntroRouter('/api/v1/users');
usersRouter.get('/', {
  handler: () => [{ id: 1, name: 'John' }],
});
usersRouter.post('/', {
  body: z.object({ name: z.string() }),
  handler: ({ body }) => ({ id: 1, ...body }),
});

// Posts router
const postsRouter = new SyntroRouter('/api/v1/posts');
postsRouter.get('/', {
  handler: () => [{ id: 1, title: 'Post 1' }],
});
postsRouter.post('/', {
  body: z.object({ title: z.string(), content: z.string() }),
  handler: ({ body }) => ({ id: 1, ...body }),
});

// Comments router
const commentsRouter = new SyntroRouter('/api/v1/comments');
commentsRouter.get('/', {
  handler: () => [{ id: 1, text: 'Great post!' }],
});

// Include all routers
app.include(usersRouter);
app.include(postsRouter);
app.include(commentsRouter);

await app.listen(3000);
```

**Routes created:**
- `GET /api/v1/users` - List users
- `POST /api/v1/users` - Create user
- `GET /api/v1/posts` - List posts
- `POST /api/v1/posts` - Create post
- `GET /api/v1/comments` - List comments

### Example 4: Nested Routers (Router Composition)

```typescript
import { SyntroJS, SyntroRouter } from 'syntrojs';

const app = new SyntroJS({ title: 'Nested Routers API' });

// Main API router
const apiRouter = new SyntroRouter('/api/v1');

// Users router (nested)
const usersRouter = new SyntroRouter('/users');
usersRouter.get('/', {
  handler: () => [{ id: 1, name: 'John' }],
});
usersRouter.get('/:id', {
  handler: ({ params }) => ({ id: params.id, name: 'John' }),
});

// Posts router (nested)
const postsRouter = new SyntroRouter('/posts');
postsRouter.get('/', {
  handler: () => [{ id: 1, title: 'Post 1' }],
});

// Include nested routers in main router
// Note: You need to manually combine prefixes
// This is a limitation - routers don't nest automatically
apiRouter.get('/users', {
  handler: () => [{ id: 1, name: 'John' }],
});
apiRouter.get('/users/:id', {
  handler: ({ params }) => ({ id: params.id, name: 'John' }),
});
apiRouter.get('/posts', {
  handler: () => [{ id: 1, title: 'Post 1' }],
});

// Include main router
app.include(apiRouter);

await app.listen(3000);
```

**Note:** Routers don't automatically nest. If you need nested routers, either:
1. Use a single router with the full prefix (`/api/v1/users`)
2. Manually combine prefixes when registering routes

### Example 5: Router with Scoped Middleware

```typescript
import { SyntroJS, SyntroRouter } from 'syntrojs';
import { z } from 'zod';

const app = new SyntroJS({ title: 'Scoped Middleware API' });

// Admin router with admin-only middleware
const adminRouter = new SyntroRouter('/api/v1/admin');

adminRouter.use(async (ctx, next) => {
  const role = ctx.headers['x-user-role'];
  
  if (role !== 'admin') {
    throw new UnauthorizedException('Admin access required');
  }
  
  await next();
});

adminRouter.get('/users', {
  handler: () => [
    { id: 1, name: 'John', role: 'user' },
    { id: 2, name: 'Jane', role: 'admin' },
  ],
});

adminRouter.delete('/users/:id', {
  params: z.object({ id: z.string() }),
  handler: ({ params }) => ({ deleted: params.id }),
});

// Public router (no middleware)
const publicRouter = new SyntroRouter('/api/v1/public');

publicRouter.get('/posts', {
  handler: () => [
    { id: 1, title: 'Post 1', public: true },
    { id: 2, title: 'Post 2', public: true },
  ],
});

app.include(adminRouter);
app.include(publicRouter);

await app.listen(3000);
```

**Middleware scoping:**
- `/api/v1/admin/*` - Requires admin role (via `x-user-role` header)
- `/api/v1/public/*` - No middleware, public access

### Example 6: Router with Logging Middleware

```typescript
import { SyntroJS, SyntroRouter } from 'syntrojs';

const app = new SyntroJS({ title: 'Logged API' });

// API router with logging
const apiRouter = new SyntroRouter('/api/v1');

apiRouter.use(async (ctx, next) => {
  const start = Date.now();
  
  console.log(`[${ctx.method}] ${ctx.path} - Request started`);
  
  await next();
  
  const duration = Date.now() - start;
  console.log(`[${ctx.method}] ${ctx.path} - Completed in ${duration}ms`);
});

apiRouter.get('/users', {
  handler: () => [{ id: 1, name: 'John' }],
});

apiRouter.post('/users', {
  handler: ({ body }) => ({ id: 1, ...body }),
});

app.include(apiRouter);

await app.listen(3000);
```

**Output:**
```
[GET] /api/v1/users - Request started
[GET] /api/v1/users - Completed in 5ms
[POST] /api/v1/users - Request started
[POST] /api/v1/users - Completed in 8ms
```

### Example 7: API Versioning 🚀

One of the most powerful features of routers is **API versioning**. You can easily maintain multiple API versions simultaneously.

**Important:** You only need **ONE instance of SyntroJS**. Create multiple routers with different prefixes and include them all in the same app.

See [Router Versioning Example](./ROUTER_VERSIONING_EXAMPLE.md) for detailed examples.

```typescript
import { SyntroJS, SyntroRouter } from 'syntrojs';
import { z } from 'zod';

const app = new SyntroJS({ title: 'Versioned API' });

// ===== API v1 =====
const v1Router = new SyntroRouter('/api/v1');

v1Router.get('/users', {
  handler: () => [
    { id: 1, name: 'John', email: 'john@example.com' }, // Old format
  ],
});

v1Router.post('/users', {
  body: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
  handler: ({ body }) => ({
    id: Math.random(),
    name: body.name,
    email: body.email,
  }),
});

// ===== API v2 =====
const v2Router = new SyntroRouter('/api/v2');

v2Router.get('/users', {
  handler: () => [
    {
      id: 1,
      firstName: 'John', // New format: firstName instead of name
      lastName: 'Doe',
      email: 'john@example.com',
      createdAt: '2024-01-01T00:00:00Z',
      metadata: {
        role: 'user',
        verified: true,
      },
    },
  ],
});

v2Router.post('/users', {
  body: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
  }),
  handler: ({ body }) => ({
    id: Math.random(),
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    createdAt: new Date().toISOString(),
    metadata: {
      role: 'user',
      verified: false,
    },
  }),
});

// ===== API v3 (Latest) =====
const v3Router = new SyntroRouter('/api/v3');

v3Router.use(async (ctx, next) => {
  // v3 requires authentication
  const apiKey = ctx.headers['x-api-key'];
  if (!apiKey) {
    throw new UnauthorizedException('API key required for v3');
  }
  await next();
});

v3Router.get('/users', {
  handler: () => [
    {
      id: 'uuid-123',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
      timestamps: {
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      status: 'active',
    },
  ],
});

// Include all versions
app.include(v1Router);
app.include(v2Router);
app.include(v3Router);

await app.listen(3000);
```

**Available endpoints:**
- `GET /api/v1/users` - Legacy format
- `POST /api/v1/users` - Legacy format
- `GET /api/v2/users` - Enhanced format
- `POST /api/v2/users` - Enhanced format
- `GET /api/v3/users` - Latest format (requires API key)
- `POST /api/v3/users` - Latest format (requires API key)

**Benefits:**
- ✅ **Backward Compatibility** - Old clients continue working
- ✅ **Gradual Migration** - Migrate clients at their own pace
- ✅ **Breaking Changes** - Introduce breaking changes in new versions
- ✅ **Feature Flags** - Different features per version
- ✅ **Deprecation** - Mark old versions as deprecated

### Example 8: Versioning with Deprecation Headers

```typescript
import { SyntroJS, SyntroRouter } from 'syntrojs';

const app = new SyntroJS({ title: 'Deprecated API Versions' });

// v1 - Deprecated
const v1Router = new SyntroRouter('/api/v1');

v1Router.use(async (ctx, next) => {
  // Add deprecation header
  ctx.headers['x-api-deprecated'] = 'true';
  ctx.headers['x-api-deprecation-date'] = '2024-12-31';
  ctx.headers['x-api-sunset-date'] = '2025-12-31';
  ctx.headers['x-api-version'] = 'v1';
  ctx.headers['link'] = '</api/v2>; rel="successor-version"';
  
  await next();
});

v1Router.get('/users', {
  handler: () => [{ id: 1, name: 'John' }],
});

// v2 - Current
const v2Router = new SyntroRouter('/api/v2');

v2Router.get('/users', {
  handler: () => [{ id: 1, firstName: 'John', lastName: 'Doe' }],
});

app.include(v1Router);
app.include(v2Router);

await app.listen(3000);
```

**Response headers for v1:**
```
x-api-deprecated: true
x-api-deprecation-date: 2024-12-31
x-api-sunset-date: 2025-12-31
x-api-version: v1
link: </api/v2>; rel="successor-version"
```

### Example 9: Versioning Strategy - URL vs Header

SyntroJS routers support both URL-based and header-based versioning:

```typescript
import { SyntroJS, SyntroRouter } from 'syntrojs';

const app = new SyntroJS({ title: 'Flexible Versioning' });

// ===== URL-based versioning (Recommended) =====
const urlV1Router = new SyntroRouter('/api/v1');
urlV1Router.get('/users', {
  handler: () => [{ id: 1, name: 'John' }],
});

// ===== Header-based versioning =====
const headerRouter = new SyntroRouter('/api');

headerRouter.use(async (ctx, next) => {
  const version = ctx.headers['api-version'] || 'v1';
  
  // Route to appropriate version handler based on header
  if (version === 'v2') {
    // Handle v2 logic
    ctx.headers['x-resolved-version'] = 'v2';
  } else {
    // Default to v1
    ctx.headers['x-resolved-version'] = 'v1';
  }
  
  await next();
});

headerRouter.get('/users', {
  handler: (ctx) => {
    const version = ctx.headers['x-resolved-version'];
    if (version === 'v2') {
      return [{ id: 1, firstName: 'John', lastName: 'Doe' }];
    }
    return [{ id: 1, name: 'John' }];
  },
});

app.include(urlV1Router);
app.include(headerRouter);

await app.listen(3000);
```

**Usage:**
```bash
# URL-based (Recommended)
curl http://localhost:3000/api/v1/users

# Header-based
curl -H "api-version: v2" http://localhost:3000/api/users
```

**Recommendation:** Use URL-based versioning (`/api/v1`, `/api/v2`) as it's:
- ✅ More explicit and clear
- ✅ Easier to cache
- ✅ Better for documentation
- ✅ Standard practice (GitHub, Stripe, etc.)

---

## 🔧 API Reference

### `SyntroRouter`

#### Constructor

```typescript
new SyntroRouter(prefix: string, routeRegistry?: RouteRegistry, middlewareRegistry?: MiddlewareRegistry)
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prefix` | `string` | Yes | Prefix for all routes (e.g., `/api/v1`) |
| `routeRegistry` | `RouteRegistry` | No | Custom route registry (defaults to singleton) |
| `middlewareRegistry` | `MiddlewareRegistry` | No | Custom middleware registry (defaults to new instance) |

**Example:**
```typescript
const router = new SyntroRouter('/api/v1');
```

#### Route Methods

All HTTP methods are supported:

```typescript
router.get(path: string, config: RouteConfig): this
router.post(path: string, config: RouteConfig): this
router.put(path: string, config: RouteConfig): this
router.delete(path: string, config: RouteConfig): this
router.patch(path: string, config: RouteConfig): this
router.head(path: string, config: RouteConfig): this
router.options(path: string, config: RouteConfig): this
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | `string` | Yes | Route path (relative to prefix, must start with `/`) |
| `config` | `RouteConfig` | Yes | Route configuration (same as `app.get()`, `app.post()`, etc.) |

**Returns:** `this` (for method chaining)

**Example:**
```typescript
router
  .get('/users', { handler: () => getUsers() })
  .post('/users', { handler: ({ body }) => createUser(body) })
  .get('/users/:id', { handler: ({ params }) => getUser(params.id) });
```

#### Middleware Method

```typescript
router.use(middleware: Middleware, path?: string): this
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `middleware` | `Middleware` | Yes | Middleware function `(ctx, next) => Promise<void>` |
| `path` | `string` | No | Path pattern (defaults to router prefix) |

**Returns:** `this` (for method chaining)

**Example:**
```typescript
router.use(async (ctx, next) => {
  console.log(`Request to ${ctx.path}`);
  await next();
});
```

#### Utility Methods

```typescript
router.getPrefix(): string
router.getRoutes(): readonly Route[]
```

**Example:**
```typescript
const router = new SyntroRouter('/api/v1');
console.log(router.getPrefix()); // '/api/v1'
console.log(router.getRoutes()); // Array of registered routes
```

### `app.include()`

Include a router in your SyntroJS application.

```typescript
app.include(router: SyntroRouter): void
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `router` | `SyntroRouter` | Yes | Router instance to include |

**Example:**
```typescript
const router = new SyntroRouter('/api/v1');
router.get('/users', { handler: () => [] });
app.include(router);
```

**Note:** Routes are automatically registered when you call methods on the router. `app.include()` validates the router instance but doesn't re-register routes (they're already in `RouteRegistry`).

---

## 🎯 Path Combination

Routes are automatically prefixed when registered:

```typescript
const router = new SyntroRouter('/api/v1');

// Route path: '/users'
// Full path: '/api/v1/users'
router.get('/users', { handler: () => [] });

// Route path: '/users/:id'
// Full path: '/api/v1/users/:id'
router.get('/users/:id', { handler: ({ params }) => params });
```

**Rules:**
- Router prefix must start with `/`
- Route path must start with `/`
- Trailing slashes are normalized
- Double slashes are avoided

**Examples:**

| Router Prefix | Route Path | Full Path |
|---------------|------------|-----------|
| `/api/v1` | `/users` | `/api/v1/users` |
| `/api/v1/` | `/users` | `/api/v1/users` |
| `/api/v1` | `/users/` | `/api/v1/users` |
| `/api/v1/` | `/users/` | `/api/v1/users` |

---

## 🔄 Middleware Execution Order

Middleware executes in the following order:

1. **Global middleware** (registered with `app.use()`)
2. **Router middleware** (registered with `router.use()`)
3. **Route handler**

**Example:**

```typescript
const app = new SyntroJS();

// Global middleware (executes first)
app.use(async (ctx, next) => {
  console.log('1. Global middleware');
  await next();
});

const router = new SyntroRouter('/api');

// Router middleware (executes second)
router.use(async (ctx, next) => {
  console.log('2. Router middleware');
  await next();
});

router.get('/test', {
  handler: () => {
    console.log('3. Route handler');
    return { message: 'test' };
  },
});

app.include(router);
```

**Output:**
```
1. Global middleware
2. Router middleware
3. Route handler
```

---

## 💡 Best Practices

### 1. Organize by Feature

```typescript
// ✅ Good - Separate routers by feature
const usersRouter = new SyntroRouter('/api/v1/users');
const postsRouter = new SyntroRouter('/api/v1/posts');
const commentsRouter = new SyntroRouter('/api/v1/comments');

// ❌ Avoid - Single router with everything
const apiRouter = new SyntroRouter('/api/v1');
// All routes mixed together
```

### 2. Use Router-Level Middleware for Shared Logic

```typescript
// ✅ Good - Authentication middleware on router
const protectedRouter = new SyntroRouter('/api/v1/protected');
protectedRouter.use(authMiddleware);
protectedRouter.get('/profile', { handler: getProfile });
protectedRouter.get('/settings', { handler: getSettings });

// ❌ Avoid - Duplicate middleware on each route
protectedRouter.get('/profile', {
  dependencies: { auth: authMiddleware },
  handler: getProfile,
});
protectedRouter.get('/settings', {
  dependencies: { auth: authMiddleware },
  handler: getSettings,
});
```

### 3. Keep Routers Focused

```typescript
// ✅ Good - Single responsibility
const usersRouter = new SyntroRouter('/api/v1/users');
usersRouter.get('/', { handler: getUsers });
usersRouter.post('/', { handler: createUser });
usersRouter.get('/:id', { handler: getUser });

// ❌ Avoid - Mixed concerns
const mixedRouter = new SyntroRouter('/api/v1');
mixedRouter.get('/users', { handler: getUsers });
mixedRouter.get('/posts', { handler: getPosts });
mixedRouter.get('/orders', { handler: getOrders });
```

### 4. Use Descriptive Prefixes

```typescript
// ✅ Good - Clear, versioned API
const v1Router = new SyntroRouter('/api/v1');
const v2Router = new SyntroRouter('/api/v2');

// ❌ Avoid - Unclear prefixes
const router1 = new SyntroRouter('/a');
const router2 = new SyntroRouter('/b');
```

### 5. Separate Routers into Modules

```typescript
// routers/users.ts
export const usersRouter = new SyntroRouter('/api/v1/users');
usersRouter.get('/', { handler: getUsers });
usersRouter.post('/', { handler: createUser });

// routers/posts.ts
export const postsRouter = new SyntroRouter('/api/v1/posts');
postsRouter.get('/', { handler: getPosts });
postsRouter.post('/', { handler: createPost });

// app.ts
import { usersRouter } from './routers/users';
import { postsRouter } from './routers/posts';

const app = new SyntroJS();
app.include(usersRouter);
app.include(postsRouter);
```

---

## 🚨 Troubleshooting

### Route Not Found

**Problem:** Route returns 404 even though it's registered

**Solution:** Check that:
1. Router prefix is correct
2. Route path is relative to prefix (starts with `/`)
3. `app.include(router)` was called

```typescript
// ✅ Correct
const router = new SyntroRouter('/api/v1');
router.get('/users', { handler: () => [] }); // Full path: /api/v1/users
app.include(router);

// ❌ Wrong - Missing app.include()
const router = new SyntroRouter('/api/v1');
router.get('/users', { handler: () => [] });
// Router not included!
```

### Middleware Not Executing

**Problem:** Router middleware doesn't run

**Solution:** Ensure middleware is registered before routes:

```typescript
// ✅ Correct - Middleware before routes
const router = new SyntroRouter('/api');
router.use(authMiddleware);
router.get('/users', { handler: getUsers });

// ❌ Wrong - Middleware after routes (still works, but confusing)
const router = new SyntroRouter('/api');
router.get('/users', { handler: getUsers });
router.use(authMiddleware);
```

### Duplicate Route Error

**Problem:** `Error: Route GET:/api/v1/users is already registered`

**Solution:** Routes are registered immediately when you call `router.get()`, `router.post()`, etc. You don't need to call `app.include()` multiple times:

```typescript
// ✅ Correct - Include once
const router = new SyntroRouter('/api/v1');
router.get('/users', { handler: () => [] });
app.include(router); // Routes already registered

// ❌ Wrong - Including multiple times
app.include(router);
app.include(router); // Error: routes already registered
```

### Prefix Not Applied

**Problem:** Route doesn't have the expected prefix

**Solution:** Check prefix format:

```typescript
// ✅ Correct - Prefix starts with /
const router = new SyntroRouter('/api/v1');
router.get('/users', { handler: () => [] }); // Full: /api/v1/users

// ❌ Wrong - Prefix doesn't start with /
const router = new SyntroRouter('api/v1'); // Error: must start with /
```

---

## 🔍 How It Works

### Route Registration

When you call `router.get('/users', config)`:

1. **Path Combination**: Router combines prefix (`/api/v1`) with route path (`/users`) → `/api/v1/users`
2. **Route Creation**: Creates a `Route` entity with the full path
3. **Registration**: Registers route with `RouteRegistry` (singleton)
4. **Tracking**: Stores route internally for `getRoutes()`

**Routes are registered immediately** - no need to wait for `app.include()`.

### Middleware Registration

When you call `router.use(middleware)`:

1. **Path Resolution**: Uses router prefix as default path (or provided path)
2. **Registration**: Registers middleware with `MiddlewareRegistry`
3. **Scoping**: Middleware applies to all routes with matching prefix

**Middleware executes before route handlers** in the order: global → router → handler.

### App Inclusion

When you call `app.include(router)`:

1. **Validation**: Validates router instance
2. **Routes**: Routes are already registered (no re-registration)
3. **Middleware**: Middleware is already registered (no re-registration)

**`app.include()` is mainly for validation** - routes are registered when you call `router.get()`, `router.post()`, etc.

---

## 📚 Related Documentation

- [Router Versioning Example](./ROUTER_VERSIONING_EXAMPLE.md) - Detailed examples for API versioning
- [Type-Safe Client](./CLIENT.md) - Test routers with type-safe client
- [Middleware Guide](./MIDDLEWARE.md) - Learn about middleware patterns
- [Testing Guide](./testing/TESTING_STRATEGY.md) - Testing best practices

---

## 🎉 Summary

The Router System provides:

- ✅ **Code Organization** - Group related routes
- ✅ **DRY Principle** - Share prefixes and middleware
- ✅ **Modularity** - Separate routers into modules
- ✅ **Middleware Scoping** - Apply middleware to route groups
- ✅ **API Versioning** - Maintain multiple API versions simultaneously 🚀

**Perfect for:**
- 🏢 **Enterprise APIs** - Version management and backward compatibility
- 🔄 **API Evolution** - Introduce breaking changes without breaking existing clients
- 📦 **Microservices** - Organize routes by service/domain
- 🎯 **Feature Flags** - Different features per version

**Start using routers today!** 🚀

