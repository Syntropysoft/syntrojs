# Changelog v0.7.0

## 🎉 Major Release: Router System + Type-Safe Client + Serializer Enhancements

**Release Date:** 2025-01-XX  
**Status:** Ready for Testing

---

## ✨ Added

### Router System (`SyntroRouter`)

- ✨ **SyntroRouter Class**: Group endpoints with common prefixes
  - Create routers with `new SyntroRouter('/api/v1')`
  - Register routes with `router.get()`, `router.post()`, etc.
  - Include routers with `app.include(router)`
  - Routes automatically prefixed (e.g., `/api/v1/users`)

- ✨ **Router-Level Middleware**: Apply middleware to all routes in a router
  - `router.use(middleware)` - Middleware for all router routes
  - `router.use(middleware, path)` - Scoped middleware with path pattern
  - Execution order: Global → Router → Handler

- ✨ **API Versioning Support**: Maintain multiple API versions simultaneously
  - Create separate routers for each version (`/api/v1`, `/api/v2`, `/api/v3`)
  - Backward compatibility with legacy versions
  - Different middleware per version
  - Deprecation headers support

### Type-Safe Client (`createClient`)

- ✨ **Local Mode**: Test your API without starting an HTTP server
  - Execute handlers directly (no HTTP overhead)
  - Full validation using Zod schemas
  - Perfect for unit/integration tests

- ✨ **Remote Mode**: Frontend integration with type-safe HTTP requests
  - Make HTTP requests to deployed APIs
  - Default headers support (auth tokens, etc.)
  - Same autocomplete as local mode

- ✨ **Type Inference**: Full TypeScript support with autocomplete
  - Autocomplete for all routes
  - Type-safe request options (params, query, body)
  - Type-safe responses

- ✨ **Route Navigation**: Dot notation for accessing routes
  - `client.users.get()` - Simple routes
  - `client.users[':id'].get({ params: { id: '123' } })` - Path parameters
  - `client.users[':id'].posts.get()` - Nested routes

### Serializer Enhancements

- ✨ **Chain of Responsibility**: `next()` parameter for decorator pattern
  - Add `next()` parameter to `IResponseSerializer.serialize()`
  - Enables decorator/interceptor pattern for serializers
  - Use cases: OpenTelemetry, logging, metrics, compression

- ✨ **Priority System**: Numeric priorities for explicit serializer ordering
  - Default priorities: CustomResponse=10, Redirect=20, FileDownload=30, Stream=40, Buffer=50, Custom=100, Json=999
  - API: `app.registerSerializer(serializer, name, { priority: 30 })`
  - JsonSerializer always last (priority=999)

- ✨ **Helper Methods**: Convenient methods for serializer positioning
  - `app.registerSerializerBefore(targetName, serializer)` - Insert before specific serializer
  - `app.registerSerializerAfter(targetName, serializer)` - Insert after specific serializer
  - `app.registerSerializerFirst(serializer)` - Highest priority (intercepts everything)

---

## 🔧 Changed

### Router System

- 🔧 **Route Registration**: Routes are registered immediately when calling router methods
  - No need to wait for `app.include()` - routes available immediately
  - `app.include()` validates router instance but doesn't re-register routes

- 🔧 **Middleware Execution Order**: Explicit order for middleware execution
  - Global middleware (registered with `app.use()`) executes first
  - Router middleware (registered with `router.use()`) executes second
  - Route handler executes last

### Serializer System

- 🔧 **Serializer Interface**: Updated `IResponseSerializer.serialize()` signature
  - Added optional `next` parameter: `serialize(result, status, request, next)`
  - Backward compatible - existing serializers work without changes
  - New serializers can use `next()` for chain of responsibility

---

## 📝 Documentation

- 📝 **Router Documentation**: Complete guide with 9 examples (`docs/ROUTER.md`)
  - Quick Start guide
  - Basic router usage
  - Router-level middleware
  - Multiple routers
  - API versioning (3 examples)
  - Scoped middleware
  - Logging middleware
  - Best practices
  - Troubleshooting

- 📝 **Client Documentation**: Complete guide with examples (`docs/CLIENT.md`)
  - Quick Start guide
  - Local mode (testing)
  - Remote mode (frontend)
  - 5 complete examples (CRUD, query params, nested routes, frontend, testing)
  - API Reference
  - Best practices
  - Troubleshooting

- 📝 **API Versioning Examples**: Best practices for versioning APIs
  - Multiple versions simultaneously
  - Deprecation headers
  - URL-based vs Header-based versioning
  - Migration strategies

- 📝 **README Updated**: Added v0.7.0 features to main README
  - Router System section
  - Type-Safe Client section
  - Updated roadmap

---

## 🧪 Tests

### Router Tests

- ✅ Router registration tests
- ✅ Route prefixing tests
- ✅ Router-level middleware tests
- ✅ Middleware execution order tests
- ✅ `app.include()` integration tests
- ✅ Multiple routers tests
- ✅ Path combination tests

### Client Tests

- ✅ Local mode tests (14 tests)
  - GET/POST route execution
  - Path parameters
  - Query parameters with transformations
  - Body validation
  - Nested routes
  - Multiple HTTP methods
  - Route not found errors

- ✅ Remote mode tests
  - Base URL validation
  - HTTP request execution
  - Default headers

- ✅ Guard clauses tests
  - App validation
  - Base URL validation

### Serializer Tests

- ✅ Chain of Responsibility tests
  - `next()` parameter functionality
  - Decorator pattern (OpenTelemetry example)
  - Compression decorator example

- ✅ Priority System tests
  - Default priorities
  - Custom priorities
  - Ordering verification

- ✅ Helper Methods tests
  - `registerFirst()` tests
  - `registerBefore()` tests
  - `registerAfter()` tests

**Total Tests:** 980 passing (100%)

---

## 🎯 Testing Checklist

Before publishing to NPM, please verify:

### Router System
- [ ] Create router with prefix: `new SyntroRouter('/api/v1')`
- [ ] Register routes: `router.get('/users', { handler })`
- [ ] Routes have correct prefix: `/api/v1/users`
- [ ] Include router: `app.include(router)`
- [ ] Router middleware executes: `router.use(middleware)`
- [ ] Middleware order: Global → Router → Handler
- [ ] Multiple routers work together
- [ ] API versioning: Multiple versions (`/api/v1`, `/api/v2`)

### Type-Safe Client
- [ ] Local mode: `createClient(app, { mode: 'local' })`
- [ ] Execute route: `client.users.get()`
- [ ] Path parameters: `client.users[':id'].get({ params: { id: '123' } })`
- [ ] Query parameters: `client.users.get({ query: { page: '1' } })`
- [ ] Body validation: Invalid body throws error
- [ ] Remote mode: `createClient(app, { mode: 'remote', baseUrl: '...' })`
- [ ] HTTP requests work in remote mode
- [ ] Default headers applied

### Serializer Enhancements
- [ ] Chain of Responsibility: Serializer calls `next()`
- [ ] Priority System: Serializers ordered by priority
- [ ] Helper Methods: `registerFirst()`, `registerBefore()`, `registerAfter()`
- [ ] Existing serializers still work (backward compatible)

### Documentation
- [ ] `docs/ROUTER.md` examples work
- [ ] `docs/CLIENT.md` examples work
- [ ] README examples work

---

## 🚀 Migration Guide

### From v0.6.x to v0.7.0

#### Using Routers (Optional)

**Before:**
```typescript
app.get('/api/v1/users', { handler: getUsers });
app.post('/api/v1/users', { handler: createUser });
```

**After (Optional - routers are optional):**
```typescript
const router = new SyntroRouter('/api/v1');
router.get('/users', { handler: getUsers });
router.post('/users', { handler: createUser });
app.include(router);
```

**Note:** Existing code continues to work. Routers are optional for better organization.

#### Using Type-Safe Client (New)

**New Feature - No Migration Required:**
```typescript
import { createClient } from 'syntrojs';

const client = createClient(app, { mode: 'local' });
const users = await client.users.get();
```

#### Serializer Changes (Backward Compatible)

**Existing serializers work without changes:**
```typescript
// Still works
class MySerializer implements IResponseSerializer {
  serialize(result, status, request) {
    // No next parameter needed
    return { body: result, statusCode: status };
  }
}
```

**New serializers can use next():**
```typescript
class DecoratorSerializer implements IResponseSerializer {
  serialize(result, status, request, next) {
    const dto = next(result, status, request);
    dto.headers['x-custom'] = 'value';
    return dto;
  }
}
```

---

## 📊 Statistics

- **Tests:** 980 passing (100%)
- **Typecheck:** ✅ No errors
- **Coverage:** 71.55%+
- **New Features:** 3 major features
- **Documentation:** 1,828+ lines (ROUTER.md + CLIENT.md)
- **Breaking Changes:** None (backward compatible)

---

## 🙏 Acknowledgments

This release represents a significant milestone in SyntroJS development:

- **Router System**: Enables better code organization and API versioning
- **Type-Safe Client**: Revolutionizes testing and frontend integration
- **Serializer Enhancements**: Opens up powerful decorator patterns

All features follow SOLID principles, Domain-Driven Design, Functional Programming, and Guard Clauses.

---

## 🔗 Related Documentation

- [Router System Guide](../ROUTER.md)
- [Type-Safe Client Guide](../CLIENT.md)
- [Architecture Guide](./architecture/ARCHITECTURE.md)

---

**Ready for Testing** ✅

