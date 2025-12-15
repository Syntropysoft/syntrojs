# Type-Safe Client

## 🎯 Overview

SyntroJS provides a **type-safe client** that lets you:
- **Test your API** without starting an HTTP server (local mode)
- **Integrate with your frontend** using type-safe HTTP requests (remote mode)
- **Get autocomplete** for all your routes
- **Validate requests** automatically using your route schemas

**Key Benefits:**
- ✅ Zero HTTP overhead in tests (local mode)
- ✅ Type-safe API calls with autocomplete
- ✅ Automatic validation using your Zod schemas
- ✅ Same code works for testing and frontend

---

## 🚀 Quick Start

### Installation

The client is included with SyntroJS - no additional installation needed:

```bash
npm install syntrojs zod
```

### Basic Usage

```typescript
import { SyntroJS, createClient } from 'syntrojs';
import { z } from 'zod';

// Define your API
const app = new SyntroJS({ title: 'My API' });

app.get('/users', {
  handler: () => [{ id: 1, name: 'John' }],
});

app.post('/users', {
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
  }),
  handler: ({ body }) => ({ id: 1, ...body }),
});

// Create client (local mode for testing)
const client = createClient(app);

// Use it!
const users = await client.users.get();
const newUser = await client.users.post({
  body: { name: 'Jane', email: 'jane@example.com' },
});
```

**That's it!** 🎉 No server needed for testing.

---

## 📖 Modes

### Local Mode (Testing)

**Use case:** Testing your API without starting an HTTP server.

```typescript
import { createClient } from 'syntrojs';

const client = createClient(app, { mode: 'local' });

// Executes handlers directly - no HTTP overhead
const response = await client.users.get();
```

**Benefits:**
- ⚡ **Fast** - No HTTP overhead
- 🧪 **Perfect for tests** - Execute handlers directly
- ✅ **Full validation** - Uses your Zod schemas
- 🔒 **Type-safe** - Full TypeScript support

### Remote Mode (Frontend)

**Use case:** Frontend integration with your API.

```typescript
import { createClient } from 'syntrojs';

const client = createClient(app, {
  mode: 'remote',
  baseUrl: 'https://api.example.com',
  defaultHeaders: {
    Authorization: 'Bearer token123',
  },
});

// Makes HTTP requests
const response = await client.users.get();
```

**Benefits:**
- 🌐 **Real HTTP requests** - Works with deployed APIs
- 🔐 **Default headers** - Set auth tokens once
- ✅ **Type-safe** - Same autocomplete as local mode
- 🎯 **Production-ready** - Use in React, Vue, etc.

---

## 📝 Complete Examples

### Example 1: Basic CRUD API

```typescript
import { SyntroJS, createClient } from 'syntrojs';
import { z } from 'zod';

const app = new SyntroJS({ title: 'Users API' });

// Define schemas
const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
});

const createUserSchema = userSchema.omit({ id: true });

// Define routes
app.get('/users', {
  handler: () => [
    { id: '1', name: 'John', email: 'john@example.com' },
    { id: '2', name: 'Jane', email: 'jane@example.com' },
  ],
});

app.get('/users/:id', {
  params: z.object({ id: z.string().uuid() }),
  handler: ({ params }) => ({
    id: params.id,
    name: 'John',
    email: 'john@example.com',
  }),
});

app.post('/users', {
  body: createUserSchema,
  handler: ({ body }) => ({
    id: Math.random().toString(),
    ...body,
  }),
});

app.put('/users/:id', {
  params: z.object({ id: z.string().uuid() }),
  body: createUserSchema,
  handler: ({ params, body }) => ({
    id: params.id,
    ...body,
  }),
});

app.delete('/users/:id', {
  params: z.object({ id: z.string().uuid() }),
  handler: ({ params }) => ({ deleted: params.id }),
});

// Create client
const client = createClient(app);

// Use it!
async function testAPI() {
  // GET /users
  const users = await client.users.get();
  console.log(users.data); // Array of users

  // GET /users/:id
  const user = await client.users[':id'].get({
    params: { id: '123e4567-e89b-12d3-a456-426614174000' },
  });
  console.log(user.data); // Single user

  // POST /users
  const newUser = await client.users.post({
    body: {
      name: 'Alice',
      email: 'alice@example.com',
    },
  });
  console.log(newUser.data); // Created user

  // PUT /users/:id
  const updated = await client.users[':id'].put({
    params: { id: '123e4567-e89b-12d3-a456-426614174000' },
    body: {
      name: 'Alice Updated',
      email: 'alice.updated@example.com',
    },
  });
  console.log(updated.data); // Updated user

  // DELETE /users/:id
  const deleted = await client.users[':id'].delete({
    params: { id: '123e4567-e89b-12d3-a456-426614174000' },
  });
  console.log(deleted.data); // { deleted: '...' }
}
```

### Example 2: Query Parameters

```typescript
import { SyntroJS, createClient } from 'syntrojs';
import { z } from 'zod';

const app = new SyntroJS();

app.get('/users', {
  query: z.object({
    page: z.string().transform(Number).default('1'),
    limit: z.string().transform(Number).default('10'),
    search: z.string().optional(),
  }),
  handler: ({ query }) => ({
    page: query.page,
    limit: query.limit,
    search: query.search,
    users: [],
  }),
});

const client = createClient(app);

// Use query parameters
const response = await client.users.get({
  query: {
    page: '1',
    limit: '20',
    search: 'john',
  },
});

console.log(response.data);
// {
//   page: 1,        // Transformed to number
//   limit: 20,      // Transformed to number
//   search: 'john',
//   users: []
// }
```

### Example 3: Nested Routes

```typescript
import { SyntroJS, createClient } from 'syntrojs';
import { z } from 'zod';

const app = new SyntroJS();

app.get('/users/:id/posts', {
  params: z.object({ id: z.string() }),
  handler: ({ params }) => ({
    userId: params.id,
    posts: [],
  }),
});

app.post('/users/:id/posts', {
  params: z.object({ id: z.string() }),
  body: z.object({
    title: z.string(),
    content: z.string(),
  }),
  handler: ({ params, body }) => ({
    userId: params.id,
    ...body,
  }),
});

const client = createClient(app);

// Access nested routes
const posts = await client.users[':id'].posts.get({
  params: { id: '123' },
});

const newPost = await client.users[':id'].posts.post({
  params: { id: '123' },
  body: {
    title: 'My Post',
    content: 'Post content',
  },
});
```

### Example 4: Frontend Integration

```typescript
// api-client.ts
import { createClient } from 'syntrojs';
import type { App } from '../server/app';

export const apiClient = createClient(window.APP_INSTANCE, {
  mode: 'remote',
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  defaultHeaders: {
    'Content-Type': 'application/json',
  },
});

// Or with authentication
export const authenticatedClient = createClient(window.APP_INSTANCE, {
  mode: 'remote',
  baseUrl: import.meta.env.VITE_API_URL,
  defaultHeaders: {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  },
});

// components/UserList.tsx
import { apiClient } from '../api-client';
import { useEffect, useState } from 'react';

export function UserList() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    apiClient.users.get().then((response) => {
      setUsers(response.data);
    });
  }, []);

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### Example 5: Testing with Vitest

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SyntroJS, createClient } from 'syntrojs';
import { RouteRegistry } from 'syntrojs';
import { z } from 'zod';

describe('Users API', () => {
  let app: SyntroJS;
  let client: ReturnType<typeof createClient>;

  beforeEach(() => {
    app = new SyntroJS();
    
    app.get('/users', {
      handler: () => [{ id: 1, name: 'John' }],
    });

    app.post('/users', {
      body: z.object({
        name: z.string().min(1),
        email: z.string().email(),
      }),
      handler: ({ body }) => ({ id: 1, ...body }),
    });

    client = createClient(app);
  });

  afterEach(() => {
    RouteRegistry.clear();
  });

  it('should get all users', async () => {
    const response = await client.users.get();
    
    expect(response.status).toBe(200);
    expect(response.data).toEqual([{ id: 1, name: 'John' }]);
  });

  it('should create a user', async () => {
    const response = await client.users.post({
      body: {
        name: 'Jane',
        email: 'jane@example.com',
      },
    });

    expect(response.status).toBe(200);
    expect(response.data.name).toBe('Jane');
    expect(response.data.email).toBe('jane@example.com');
  });

  it('should validate request body', async () => {
    await expect(
      client.users.post({
        body: {
          name: '', // Invalid: min length 1
          email: 'invalid', // Invalid: not an email
        },
      })
    ).rejects.toThrow();
  });
});
```

---

## 🔧 API Reference

### `createClient(app, config?)`

Creates a type-safe client for your SyntroJS application.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `app` | `SyntroJS` | Yes | Your SyntroJS application instance |
| `config` | `ClientConfig` | No | Client configuration |

**ClientConfig:**

```typescript
interface ClientConfig {
  mode?: 'local' | 'remote';        // Default: 'local'
  baseUrl?: string;                 // Required for 'remote' mode
  defaultHeaders?: Record<string, string>; // Default headers for all requests
}
```

**Returns:**

A type-safe client object with autocomplete for all routes.

### Client Methods

The client provides methods for each HTTP method on each route:

```typescript
// GET request
client.users.get(options?: ClientRequestOptions): Promise<ClientResponse>

// POST request
client.users.post(options?: ClientRequestOptions): Promise<ClientResponse>

// PUT request
client.users.put(options?: ClientRequestOptions): Promise<ClientResponse>

// DELETE request
client.users.delete(options?: ClientRequestOptions): Promise<ClientResponse>

// PATCH request
client.users.patch(options?: ClientRequestOptions): Promise<ClientResponse>
```

**ClientRequestOptions:**

```typescript
interface ClientRequestOptions {
  params?: Record<string, string>;      // Path parameters
  query?: Record<string, unknown>;      // Query parameters
  body?: unknown;                       // Request body
  headers?: Record<string, string>;     // Request headers
}
```

**ClientResponse:**

```typescript
interface ClientResponse<T = unknown> {
  data: T;                              // Response data
  status: number;                       // HTTP status code
  headers: Record<string, string>;      // Response headers
}
```

---

## 🎯 Route Navigation

The client uses **dot notation** to navigate routes:

```typescript
// Route: GET /users
client.users.get()

// Route: GET /users/:id
client.users[':id'].get({ params: { id: '123' } })

// Route: GET /users/:id/posts
client.users[':id'].posts.get({ params: { id: '123' } })

// Route: POST /api/v1/users
client.api.v1.users.post({ body: {...} })
```

**Path Parameters:**

Use bracket notation with `:paramName` for routes with path parameters:

```typescript
// Route: GET /users/:userId/posts/:postId
client.users[':userId'].posts[':postId'].get({
  params: {
    userId: '123',
    postId: '456',
  },
});
```

---

## ✅ Validation

The client **automatically validates** requests using your route schemas:

```typescript
app.post('/users', {
  body: z.object({
    name: z.string().min(3),
    email: z.string().email(),
  }),
  handler: ({ body }) => body,
});

const client = createClient(app);

// ✅ Valid - passes validation
await client.users.post({
  body: {
    name: 'John Doe',
    email: 'john@example.com',
  },
});

// ❌ Invalid - throws error
await client.users.post({
  body: {
    name: 'Jo', // Too short
    email: 'invalid', // Not an email
  },
});
// Throws: "Invalid body: name: String must contain at least 3 character(s)"
```

**Validation applies to:**
- ✅ Path parameters (`params`)
- ✅ Query parameters (`query`)
- ✅ Request body (`body`)
- ✅ Response data (`response` schema if provided)

---

## 🚨 Error Handling

### Route Not Found

```typescript
const client = createClient(app);

// Throws error if route doesn't exist
await client.nonexistent.get();
// Error: Route not found: nonexistent
```

### Validation Errors

```typescript
try {
  await client.users.post({
    body: { name: 'Jo' }, // Invalid
  });
} catch (error) {
  console.error(error.message);
  // "Invalid body: name: String must contain at least 3 character(s)"
}
```

### HTTP Errors (Remote Mode)

```typescript
const client = createClient(app, {
  mode: 'remote',
  baseUrl: 'https://api.example.com',
});

try {
  const response = await client.users.get();
  if (response.status >= 400) {
    // Handle HTTP error
    console.error('HTTP Error:', response.status);
  }
} catch (error) {
  // Handle network error
  console.error('Network error:', error);
}
```

---

## 💡 Best Practices

### 1. Use Local Mode for Testing

```typescript
// ✅ Good - Fast, no HTTP overhead
const client = createClient(app, { mode: 'local' });

// ❌ Avoid - Slower, requires server
const client = createClient(app, {
  mode: 'remote',
  baseUrl: 'http://localhost:3000',
});
```

### 2. Clean Up Between Tests

```typescript
import { RouteRegistry } from 'syntrojs';

afterEach(() => {
  RouteRegistry.clear(); // Clean up routes
});
```

### 3. Use Type Inference

```typescript
// ✅ Good - Type inference works
const client = createClient(app);
const response = await client.users.get();
// response.data is typed correctly

// ❌ Avoid - Loses type information
const client: any = createClient(app);
```

### 4. Set Default Headers for Remote Mode

```typescript
// ✅ Good - Set auth once
const client = createClient(app, {
  mode: 'remote',
  baseUrl: 'https://api.example.com',
  defaultHeaders: {
    Authorization: `Bearer ${token}`,
  },
});

// All requests include Authorization header
```

### 5. Handle Errors Gracefully

```typescript
// ✅ Good - Handle validation errors
try {
  await client.users.post({ body: invalidData });
} catch (error) {
  if (error.message.includes('Invalid')) {
    // Show user-friendly error
    showError('Please check your input');
  }
}
```

---

## 🔍 How It Works

### Local Mode

1. **Route Discovery**: Client reads all routes from `app.getRoutes()`
2. **Tree Building**: Routes are organized into a tree structure
3. **Handler Execution**: When you call a method, it:
   - Finds the matching route
   - Validates request data using Zod schemas
   - Creates a mock `RequestContext`
   - Executes the route handler directly
   - Returns the result

**No HTTP server needed!** ⚡

### Remote Mode

1. **Route Discovery**: Same as local mode
2. **Tree Building**: Same as local mode
3. **HTTP Request**: When you call a method, it:
   - Builds the URL with path and query parameters
   - Creates fetch options with body and headers
   - Makes an HTTP request to `baseUrl`
   - Parses the response
   - Returns the result

**Works with any deployed API!** 🌐

---

## 🎨 Type Safety

The client provides **full type safety**:

```typescript
const client = createClient(app);

// ✅ Autocomplete works
client.users.get() // TypeScript knows this exists

// ✅ Type inference for responses
const response = await client.users.get();
// response.data is typed based on your handler return type

// ✅ Type checking for request options
await client.users.post({
  body: {
    name: 'John', // ✅ Valid
    email: 'john@example.com', // ✅ Valid
    invalid: 123, // ❌ TypeScript error
  },
});
```

---

## 📚 Related Documentation

- [Router System](./ROUTER.md) - Group routes with prefixes
- [Testing Guide](./testing/TESTING_STRATEGY.md) - Testing best practices
- [Lambda Usage](./LAMBDA_USAGE.md) - Deploy to AWS Lambda

---

## 🐛 Troubleshooting

### Route Not Found

**Problem:** `Error: Route not found: users`

**Solution:** Make sure the route is registered before creating the client:

```typescript
// ✅ Good
app.get('/users', { handler: () => [] });
const client = createClient(app);

// ❌ Bad - Route registered after client creation
const client = createClient(app);
app.get('/users', { handler: () => [] });
```

### Validation Errors

**Problem:** Validation fails even with valid data

**Solution:** Check your Zod schema transformations:

```typescript
// ✅ Good - Transformations work
query: z.object({
  page: z.string().transform(Number),
})

// ❌ Bad - No transformation
query: z.object({
  page: z.number(), // Query params are always strings!
})
```

### Type Errors

**Problem:** TypeScript errors with client methods

**Solution:** Make sure you're using the latest version and have proper types:

```typescript
import { createClient } from 'syntrojs';
import type { SyntroJS } from 'syntrojs';

const client = createClient(app); // Type inference works
```

---

## 🎉 Summary

The Type-Safe Client gives you:

- ✅ **Fast testing** - No HTTP overhead
- ✅ **Type safety** - Full TypeScript support
- ✅ **Autocomplete** - Discover routes easily
- ✅ **Validation** - Automatic schema validation
- ✅ **Flexibility** - Works for testing and frontend

**Start using it today!** 🚀

