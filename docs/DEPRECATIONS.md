# Deprecations

## TinyTest (Deprecated in v0.4.0, will be removed in v0.5.0)

### Status: 🔴 DEPRECATED

### Why?

TinyTest was designed to make testing easier, but in practice it:

1. **Duplicates code** - You have to recreate all routes in tests
2. **Doesn't test real code** - Tests a copy, not your actual app
3. **Provides no value** - Standard testing with fetch is simpler
4. **Adds confusion** - Unclear when to use it vs standard testing

### What to use instead?

#### Option 1: Standard testing (recommended now)

```typescript
import { describe, test, expect, beforeAll, afterAll } from 'vitest'

describe('API Tests', () => {
  let server: string
  
  beforeAll(async () => {
    server = await app.listen(0)
  })
  
  afterAll(async () => {
    await app.close()
  })
  
  test('get users', async () => {
    const port = new URL(server).port
    const res = await fetch(`http://localhost:${port}/users`)
    const data = await res.json()
    
    expect(res.status).toBe(200)
    expect(data.users).toBeDefined()
  })
})
```

#### Option 2: Type-safe client (coming in v0.5.0)

```typescript
import { createClient } from 'syntrojs/client'
import type { App } from './app'

const client = createClient<App>(app)  // No server needed

test('get users', async () => {
  const { data } = await client.users.get()  // Autocomplete + Type-safe
  expect(data.users).toBeDefined()
})
```

**Benefits of new client:**
- ✅ Tests real application code
- ✅ Type-safe end-to-end
- ✅ Autocomplete for all routes
- ✅ No code duplication
- ✅ Works for both testing AND frontend

### Migration guide

**Before (TinyTest):**
```typescript
const api = new TinyTest()

api.get('/users', {
  handler: () => ({ users: [] })
})

const res = await api.request('GET', '/users')
```

**After (Standard testing):**
```typescript
// Start your real app
const server = await app.listen(0)
const port = new URL(server).port

// Test with fetch
const res = await fetch(`http://localhost:${port}/users`)
const data = await res.json()
```

**Coming soon (Type-safe client):**
```typescript
import { createClient } from 'syntrojs/client'
import type { App } from './app'

const client = createClient<App>(app)
const { data } = await client.users.get()
```

### Timeline

- **v0.4.0** - TinyTest marked as deprecated
- **v0.5.0** - TinyTest removed, type-safe client available

---

## Future deprecations

None planned at this time.

