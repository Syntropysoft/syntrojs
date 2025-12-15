# Router Versioning - Practical Example

## 🎯 Scenario: Same Functionality, Different Versions

You have an API that functionally does the same thing in v1 and v2, but you want to keep both versions active.

## ✅ Solution: One SyntroJS Instance + Multiple Routers

**You do NOT need 2 instances of SyntroJS.** You only need:
- ✅ **1 instance of SyntroJS**
- ✅ **2 routers** (one for each version)
- ✅ **Same handlers** (or different ones if you want)

---

## 📝 Complete Example

```typescript
import { SyntroJS, SyntroRouter } from 'syntrojs';
import { z } from 'zod';

// ===== ONE SINGLE INSTANCE OF SyntroJS =====
const app = new SyntroJS({ title: 'Versioned API' });

// ===== VERSION 1 =====
const v1Router = new SyntroRouter('/api/v1');

v1Router.get('/users', {
  handler: () => [
    { id: 1, name: 'John', email: 'john@example.com' },
    { id: 2, name: 'Jane', email: 'jane@example.com' },
  ],
});

v1Router.get('/users/:id', {
  params: z.object({ id: z.string() }),
  handler: ({ params }) => ({
    id: params.id,
    name: 'John',
    email: 'john@example.com',
  }),
});

v1Router.post('/users', {
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
  }),
  handler: ({ body }) => ({
    id: Math.random().toString(),
    name: body.name,
    email: body.email,
  }),
});

// ===== VERSION 2 (Same functionality) =====
const v2Router = new SyntroRouter('/api/v2');

// Option A: Reuse the same handlers
const getUsers = () => [
  { id: 1, name: 'John', email: 'john@example.com' },
  { id: 2, name: 'Jane', email: 'jane@example.com' },
];

const getUser = ({ params }: { params: { id: string } }) => ({
  id: params.id,
  name: 'John',
  email: 'john@example.com',
});

const createUser = ({ body }: { body: { name: string; email: string } }) => ({
  id: Math.random().toString(),
  name: body.name,
  email: body.email,
});

v2Router.get('/users', { handler: getUsers });
v2Router.get('/users/:id', {
  params: z.object({ id: z.string() }),
  handler: getUser,
});
v2Router.post('/users', {
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
  }),
  handler: createUser,
});

// ===== INCLUDE BOTH ROUTERS IN THE SAME APP =====
app.include(v1Router);
app.include(v2Router);

// ===== READY! =====
await app.listen(3000);
```

**Result:**
- ✅ `GET /api/v1/users` - Works
- ✅ `GET /api/v2/users` - Works (same functionality)
- ✅ `POST /api/v1/users` - Works
- ✅ `POST /api/v2/users` - Works (same functionality)

**One single instance of SyntroJS handles both versions.**

---

## 🔄 Different Implementations per Version

If you want v1 and v2 to have different implementations:

```typescript
const app = new SyntroJS({ title: 'Versioned API' });

// ===== VERSION 1: Old implementation =====
const v1Router = new SyntroRouter('/api/v1');

v1Router.get('/users', {
  handler: async () => {
    // Old implementation (e.g., old database)
    return await oldDatabase.getUsers();
  },
});

// ===== VERSION 2: New implementation =====
const v2Router = new SyntroRouter('/api/v2');

v2Router.get('/users', {
  handler: async () => {
    // New implementation (e.g., new database)
    return await newDatabase.getUsers();
  },
});

app.include(v1Router);
app.include(v2Router);
```

---

## 🎨 Different Middleware per Version

You can apply different middleware to each version:

```typescript
const app = new SyntroJS({ title: 'Versioned API' });

// ===== VERSION 1: No authentication =====
const v1Router = new SyntroRouter('/api/v1');
v1Router.get('/users', { handler: getUsers });

// ===== VERSION 2: With authentication =====
const v2Router = new SyntroRouter('/api/v2');

v2Router.use(async (ctx, next) => {
  // Requires authentication in v2
  if (!ctx.headers.authorization) {
    throw new UnauthorizedException('Authentication required in v2');
  }
  await next();
});

v2Router.get('/users', { handler: getUsers });

app.include(v1Router);
app.include(v2Router);
```

**Result:**
- ✅ `GET /api/v1/users` - Works without authentication
- ✅ `GET /api/v2/users` - Requires authentication

---

## 📦 Organization by Modules

You can organize each version in its own file:

```typescript
// routers/v1.ts
export const v1Router = new SyntroRouter('/api/v1');
v1Router.get('/users', { handler: getUsers });
v1Router.post('/users', { handler: createUser });

// routers/v2.ts
export const v2Router = new SyntroRouter('/api/v2');
v2Router.get('/users', { handler: getUsers });
v2Router.post('/users', { handler: createUser });

// app.ts
import { SyntroJS } from 'syntrojs';
import { v1Router } from './routers/v1';
import { v2Router } from './routers/v2';

const app = new SyntroJS({ title: 'Versioned API' });
app.include(v1Router);
app.include(v2Router);

await app.listen(3000);
```

---

## 🧪 Testing with Type-Safe Client

The client also works with versions:

```typescript
const app = new SyntroJS();
const v1Router = new SyntroRouter('/api/v1');
const v2Router = new SyntroRouter('/api/v2');

v1Router.get('/users', { handler: () => [] });
v2Router.get('/users', { handler: () => [] });

app.include(v1Router);
app.include(v2Router);

// Create client
const client = createClient(app);

// Access v1
const v1Users = await client.api.v1.users.get();

// Access v2
const v2Users = await client.api.v2.users.get();
```

---

## 💡 Summary

**To differentiate versions:**

1. ✅ **One single instance of SyntroJS**
2. ✅ **Multiple routers** with different prefixes (`/api/v1`, `/api/v2`)
3. ✅ **Same or different handlers** as needed
4. ✅ **Different middleware** per version if desired
5. ✅ **Include all routers** in the same app: `app.include(v1Router); app.include(v2Router);`

**You do NOT need:**
- ❌ Multiple instances of SyntroJS
- ❌ Multiple servers
- ❌ Duplicated code (you can reuse handlers)

---

## 🎯 Common Use Cases

### Use Case 1: Gradual Migration
```typescript
// v1: Old version (deprecated but active)
const v1Router = new SyntroRouter('/api/v1');
v1Router.use(addDeprecationHeaders);
v1Router.get('/users', { handler: oldGetUsers });

// v2: New version (recommended)
const v2Router = new SyntroRouter('/api/v2');
v2Router.get('/users', { handler: newGetUsers });
```

### Use Case 2: A/B Testing
```typescript
// v1: Version A
const v1Router = new SyntroRouter('/api/v1');
v1Router.get('/feature', { handler: featureA });

// v2: Version B
const v2Router = new SyntroRouter('/api/v2');
v2Router.get('/feature', { handler: featureB });
```

### Use Case 3: Different Clients
```typescript
// v1: For old mobile clients
const v1Router = new SyntroRouter('/api/v1');
v1Router.get('/users', { handler: () => formatForOldClients() });

// v2: For new clients
const v2Router = new SyntroRouter('/api/v2');
v2Router.get('/users', { handler: () => formatForNewClients() });
```

---

**It's that simple!** One app, multiple routers, different versions. 🚀
