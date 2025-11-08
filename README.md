<p align="center">
  <img src="https://raw.githubusercontent.com/Syntropysoft/sintrojs/main/assets/beaconLog-2.png" alt="SyntroJS Logo" width="170"/>
  <h1 align="center">SyntroJS 🚀</h1>
  <p align="center"><b>FastAPI for Node.js & Bun</b></p>
  <p align="center">⚡ <b>3.8x faster with Bun</b> | 🚀 <b>89.5% of Fastify with Node.js</b></p>
</p>

[![npm version](https://img.shields.io/npm/v/syntrojs.svg)](https://www.npmjs.com/package/syntrojs)
[![🚀 DUAL RUNTIME](https://img.shields.io/badge/🚀-DUAL%20RUNTIME-red.svg)](https://github.com/Syntropysoft/sintrojs)
[![⚡ Bun Performance](https://img.shields.io/badge/⚡-3.8x%20Faster%20than%20Fastify-green.svg)](https://github.com/Syntropysoft/sintrojs)
[![🚀 Node.js Performance](https://img.shields.io/badge/🚀-89.5%25%20of%20Fastify-blue.svg)](https://github.com/Syntropysoft/sintrojs)
[![Coverage](https://img.shields.io/badge/coverage-71.55%25-brightgreen)](./coverage)
[![Tests](https://img.shields.io/badge/tests-937%20passing-brightgreen)](./tests)
[![Bun Tests](https://img.shields.io/badge/bun-674%20passing-brightgreen)](./tests)

---

## 🚀 Status: Production Ready (Pre-1.0)

**SyntroJS is production-ready** with 937 passing tests and 71.55% code coverage. The core API is stable, though we're still adding features before v1.0.0.

- ✅ **Battle-tested** - 937 tests across Node.js and Bun (99.3% passing)
- ✅ **Stable core API** - We follow semantic versioning
- ✅ **Active development** - Regular updates and community support
- 🎯 **v0.5.0 in progress** - TOON Format + Architecture Refactor

**Latest Release**: **v0.5.0** - TOON Format + Serialization Refactor - [CHANGELOG](./docs/CHANGELOG_v0.5.0.md)

> 💡 **Note**: While the core is stable, we recommend pinning to specific versions until v1.0.0

---

## 🎯 What is SyntroJS?

**SyntroJS is the world's first dual-runtime framework** that brings the simplicity and developer experience of FastAPI to the TypeScript ecosystem. Write your code once and run it on either **Node.js** for stability or **Bun** for maximum performance.

Coming in v0.5.0: **TOON Format** - reduce your API bandwidth costs 40-60% (like gRPC) while keeping responses human-readable and debuggable (like JSON). No compilation. No protobuf. Just savings. Perfect for any high-traffic API.

---

## ✨ Key Features

- **🚀 Dual Runtime Support**: Write once, run on both Node.js and Bun. Zero code changes required.
- **🔥 FastAPI-like Developer Experience**: Automatic validation with Zod, full TypeScript type safety, elegant error handling (`HTTPException`).
- **🎨 Automatic Interactive Docs**: Beautiful landing page + Swagger UI + ReDoc out of the box at `/docs`.
- **🧪 Testing Superpower**: `SmartMutator` for mutation testing in seconds. Type-safe client coming in v0.5.0.
- **🔌 Rich Ecosystem**: Middleware system, WebSockets, dependency injection, background tasks, structured logging.
- **🔒 Security First**: JWT, OAuth2, API Keys, and security plugins built-in.

---

## 🚀 Quick Start

### 1. Install

```bash
npm install syntrojs zod
```

### 2. Create Your First API

```javascript
import { SyntroJS } from 'syntrojs';
import { z } from 'zod';

const app = new SyntroJS({ title: 'My API' });

// Simple GET endpoint
app.get('/hello', { handler: () => ({ message: 'Hello World!' }) });

// POST with automatic validation
app.post('/users', {
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
  }),
  handler: ({ body }) => ({ id: 1, ...body }),
});

await app.listen(3000);
```

**That's it!** 🎉 Visit `http://localhost:3000/docs` for interactive documentation.

### HTTP Redirects

```javascript
// Permanent redirect (301 - SEO friendly)
app.get('/old-url', {
  handler: ({ redirect }) => redirect('/new-url', 301)
});

// After form submission (303 - POST → GET)
app.post('/submit', {
  body: z.object({ name: z.string() }),
  handler: ({ body, redirect }) => {
    saveData(body);
    return redirect('/success', 303);
  }
});
```

### Content Negotiation

```javascript
// Serve JSON or HTML based on Accept header
app.get('/users', {
  handler: ({ accepts }) => {
    if (accepts.html()) {
      return '<html><h1>Users</h1>...</html>';
    }
    
    // Default: JSON
    return { users: [...] };
  }
});

// TOON format ready (v0.5.0)
app.get('/data', {
  handler: ({ accepts }) => {
    if (accepts.toon()) {
      return data; // Will be serialized as TOON
    }
    return data; // JSON
  }
});
```

---

## 🔥 Dual-Runtime: Node.js vs Bun

Same code, different runtimes:

```bash
# Node.js (stability + full ecosystem)
node app.js

# Bun (maximum performance)
bun app.js
```

| Runtime | Performance | Tests Passing | Use Case |
|---------|-------------|---------------|----------|
| **Node.js** | 89.5% of Fastify (5,819 req/s) | 728/728 (100%) | Production, plugins |
| **Bun** | 3.8x faster (~22,000 req/s) | 458/487 (94%) | Maximum speed |

### Bun Limitations

| Feature | Node.js | Bun | Status |
|---------|---------|-----|--------|
| Core API | ✅ Full | ✅ Full | Identical |
| Plugins (CORS, Helmet, etc.) | ✅ Full | ⚠️ Warnings only | v0.5.0 planned |
| Static files | ✅ Full | ❌ Not available | v0.5.0 planned |
| `getRawFastify()` | ✅ Works | ❌ Use `getRawServer()` | - |

---

## 🧪 Testing Made Easy

### Standard Testing

```javascript
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { app } from './app';

describe('API Tests', () => {
  let server: string;
  
  beforeAll(async () => {
    server = await app.listen(0); // Random port
  });
  
  afterAll(async () => {
    await app.close();
  });

  test('POST /users creates a user', async () => {
    const port = new URL(server).port;
    const res = await fetch(`http://localhost:${port}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'John', email: 'john@example.com' })
    });
    
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.name).toBe('John');
  });
});
```

> **Note**: TinyTest is deprecated and will be removed in v0.5.0. See [DEPRECATIONS.md](./docs/DEPRECATIONS.md) for details.
>
> **Coming in v0.5.0**: Type-safe client with autocomplete and zero code duplication!

### SmartMutator - Mutation Testing in Seconds

| Method | Mutants | Tests | Time |
|--------|---------|-------|------|
| Stryker (vanilla) | 1,247 | 187,050 | 43 min |
| **SmartMutator** | **142** | **284** | **12 sec** |

```bash
pnpm test:mutate
```

**Mutation Score: 58.72%** (742 killed, 144 survived)

---

## 📊 Quality Metrics

- **Tests**: 728/728 passing (Node.js 100%, Bun 94%)
- **Coverage**: 77.14% (Branch: 80.73%)
- **Mutation Score**: 58.72%
- **Code Quality**: 100% SOLID + DDD + Functional Programming
- **Top Performers**: RouteRegistry (100%), ZodAdapter (100%), DependencyInjector (95.83%)

---

## 🚀 Production & Security

```javascript
const app = new SyntroJS({
  title: 'Production API',
  docs: false  // ✅ REQUIRED for production
});
```

### Security Checklist

- [ ] Disable all documentation (`docs: false`)
- [ ] Set proper CORS origins (not `*`)
- [ ] Enable rate limiting
- [ ] Configure structured logging without sensitive data
- [ ] Use environment variables for secrets

---

## 💎 Why TOON Format?

**The Developer's Dilemma:**

Traditionally, you had to choose between simplicity and efficiency:

| Feature | JSON | **TOON** 🎯 | gRPC/Protobuf |
|---------|------|------------|---------------|
| **Payload Size** | 100% (large) | **40-50%** ⚡ | 35-45% |
| **Human-Readable** | ✅ Yes | ✅ **Yes** | ❌ Binary |
| **Debug with curl** | ✅ Easy | ✅ **Easy** | ❌ Requires tools |
| **Setup Time** | 5 minutes | **5 minutes** | 2+ hours |
| **Tooling Needed** | None | **None** | protoc, plugins |
| **Learning Curve** | Low | **Low** | High |
| **Type Safety** | Runtime only | ✅ **Built-in** | ✅ Built-in |
| **Production Costs** | High | **Low** ⚡ | Low |

**TOON gives you the best of both worlds:** gRPC's efficiency with JSON's simplicity.

### 🎯 Who Benefits from TOON?

**High-Traffic APIs**  
Save thousands on cloud bills by reducing bandwidth 40-60%

**Startups & MVPs**  
Get gRPC-level efficiency without the complexity overhead

**Public APIs**  
Give developers human-readable responses that are also bandwidth-efficient

**Mobile Apps**  
Reduce data usage for your users - faster loads, lower costs

**Microservices**  
Efficient service-to-service communication without binary protocols

**IoT Devices**  
Minimal bandwidth for resource-constrained environments

***Bonus:** LLM Integrations*  
*Reduce token costs when sending API context to AI models*

### Real-World Example

**Same endpoint, different formats:**

```bash
# JSON Response (traditional)
GET /api/users
Content-Length: 2,487 bytes
Monthly cost (1M requests): $225

# TOON Response (SyntroJS)
GET /api/users
Accept: application/toon
Content-Length: 1,024 bytes  # -59%
Monthly cost (1M requests): $92  # Save $133/month
```

**One line of code:**
```typescript
const app = new SyntroJS({ 
  serialization: 'toon'  // ✨ That's it
});
```

---

## 📖 API Reference

### Core API

#### Creating an Application

**`new SyntroJS(config?: SyntroJSConfig)`** - Creates a new SyntroJS application instance.

- **Parameters**:
  - `config.title?: string` - API title for OpenAPI docs
  - `config.version?: string` - API version
  - `config.description?: string` - API description
  - `config.logger?: boolean` - Enable Fastify logger
  - `config.syntroLogger?: LoggerIntegrationConfig | boolean` - Enable @syntrojs/logger
  - `config.runtime?: 'auto' | 'node' | 'bun'` - Force specific runtime
  - `config.docs?: boolean | object` - Configure documentation endpoints
  - `config.fluentConfig?: object` - Advanced adapter configuration

#### Route Registration

**`app.get(path, config)`** - Registers a GET route.  
**`app.post(path, config)`** - Registers a POST route.  
**`app.put(path, config)`** - Registers a PUT route.  
**`app.delete(path, config)`** - Registers a DELETE route.  
**`app.patch(path, config)`** - Registers a PATCH route.

- **Parameters**:
  - `path: string` - Route path (e.g., `/users/:id`)
  - `config.handler: (ctx) => any` - Route handler function
  - `config.params?: ZodSchema` - Path parameter validation
  - `config.query?: ZodSchema` - Query parameter validation
  - `config.body?: ZodSchema` - Request body validation
  - `config.response?: ZodSchema` - Response validation
  - `config.status?: number` - Default status code
  - `config.dependencies?: object` - Dependency injection

#### Server Management

**`app.listen(port, host?)`** - Starts the HTTP server.

- **Parameters**:
  - `port: number` - Port to listen on
  - `host?: string` - Host address (default: '::')
- **Returns**: `Promise<string>` - Server address

**`app.close()`** - Stops the HTTP server gracefully.

---

### Request Context

The request context is passed to all handlers:

```typescript
interface RequestContext {
  method: HttpMethod;              // HTTP method
  path: string;                    // Request path
  params: any;                     // Path parameters
  query: any;                      // Query parameters
  body: any;                       // Request body
  headers: Record<string, string>; // Request headers
  cookies: Record<string, string>; // Cookies
  correlationId: string;           // Request tracking ID
  timestamp: Date;                 // Request timestamp
  dependencies: Record<string, any>; // Injected dependencies
  background: {
    addTask(task: () => void): void; // Queue background task
  };
  download(data, options): FileDownloadResponse; // File download helper
  redirect(url, statusCode?): RedirectResponse;  // Redirect helper
  accepts: AcceptsHelper;          // Content negotiation helper
}
```

---

### Serialization & Content Negotiation

#### ResponseHandler

**`new ResponseHandler(serializerRegistry)`** - Creates response handler (used internally).

**`handler.serialize(result, statusCode, acceptHeader?)`** - Serializes response with content negotiation.

- **Parameters**:
  - `result: any` - Handler return value
  - `statusCode: number` - HTTP status code
  - `acceptHeader?: string` - Accept header for content negotiation
- **Returns**: `Promise<SerializedResponseDTO>`
- **Performance**: O(1) for content-type based lookup

#### Custom Serializers

Implement `IResponseSerializer` interface:

```typescript
interface IResponseSerializer {
  canSerialize(result: any): boolean;
  serialize(
    result: any,
    statusCode: number,
    request: Request
  ): SerializedResponseDTO | null;
}

interface SerializedResponseDTO {
  body: any;              // Raw object or string
  statusCode: number;
  headers: Record<string, string>;
}
```

**Register custom serializer**:

```typescript
app.registerSerializer(new MySerializer(), 'MyFormat', ['application/my-format']);
```

#### Built-in Serializers

**`JsonSerializer`** - Default JSON serialization (raw objects).  
**`TOONSerializer`** - Bandwidth-optimized format (40-60% reduction).  
**`CustomResponseSerializer`** - Custom status/headers pattern.  
**`RedirectSerializer`** - HTTP redirects (3xx).  
**`StreamSerializer`** - Node.js Readable streams.  
**`BufferSerializer`** - Binary buffers.  
**`FileDownloadSerializer`** - File downloads with Content-Disposition.

---

### Dependency Injection

**`inject(factory, options?)`** - Creates a dependency injection token.

- **Parameters**:
  - `factory: (ctx?) => T` - Factory function
  - `options.scope?: 'singleton' | 'request'` - Lifecycle scope
  - `options.cleanup?: (instance) => Promise<void>` - Cleanup function
- **Returns**: Dependency token

**Example**:

```typescript
const dbService = inject(() => new Database(), { scope: 'singleton' });

app.get('/users', {
  dependencies: { db: dbService },
  handler: ({ dependencies }) => dependencies.db.getUsers()
});
```

---

### Pagination

**Helper function for pagination**:

```typescript
function paginate<T>(
  items: T[],
  page: number = 1,
  limit: number = 10
) {
  const offset = (page - 1) * limit;
  const paginatedItems = items.slice(offset, offset + limit);
  
  return {
    data: paginatedItems,
    pagination: {
      page,
      limit,
      total: items.length,
      totalPages: Math.ceil(items.length / limit),
      hasNext: offset + limit < items.length,
      hasPrev: page > 1
    }
  };
}
```

**Example**:

```typescript
app.get('/products', {
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10)
  }),
  handler: ({ query }) => {
    const allProducts = getProducts();
    return paginate(allProducts, query.page, query.limit);
  }
});
```

---

### Background Tasks

**`ctx.background.addTask(task, options?)`** - Queues asynchronous task (non-blocking).

- **Parameters**:
  - `task: () => void | Promise<void>` - Task function
  - `options.name?: string` - Task name (for logging)
  - `options.timeout?: number` - Max execution time (ms)

**Example**:

```typescript
app.post('/users', {
  body: z.object({ email: z.string().email() }),
  handler: ({ body, background }) => {
    // Queue email send (non-blocking)
    background.addTask(async () => {
      await sendWelcomeEmail(body.email);
    }, { name: 'welcome-email', timeout: 5000 });
    
    return { success: true };
  }
});
```

---

### File Uploads

**Multipart form data** is automatically parsed:

```typescript
app.post('/upload', {
  handler: ({ body, files }) => {
    // files array contains uploaded files
    const file = files[0];
    return {
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype
    };
  }
});
```

**File structure**:

```typescript
interface UploadedFile {
  filename: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  stream: Readable;
}
```

---

### WebSockets

**`app.ws(path, handler)`** - Registers WebSocket endpoint.

```typescript
app.ws('/chat', {
  onConnect: (socket, request) => {
    console.log('Client connected');
  },
  onMessage: (socket, message) => {
    socket.send(`Echo: ${message}`);
  },
  onClose: (socket) => {
    console.log('Client disconnected');
  }
});
```

---

### OpenAPI / Swagger

Documentation is auto-generated from routes and schemas:

**Endpoints** (enabled by default):
- `GET /` - Landing page with API overview
- `GET /docs` - Swagger UI
- `GET /redoc` - ReDoc UI
- `GET /openapi.json` - OpenAPI 3.0 spec

**Configure**:

```typescript
new SyntroJS({
  title: 'My API',
  version: '1.0.0',
  description: 'API description',
  docs: {
    swagger: true,    // Swagger UI
    redoc: true,      // ReDoc
    landingPage: true,
    openapi: true     // JSON spec
  }
});
```

---

### Security

#### OAuth2 Password Bearer

```typescript
import { OAuth2PasswordBearer } from 'syntrojs';

const oauth2 = new OAuth2PasswordBearer({ tokenUrl: '/token' });

app.get('/protected', {
  dependencies: { user: oauth2 },
  handler: ({ dependencies }) => {
    return { user: dependencies.user };
  }
});
```

#### HTTP Bearer

```typescript
import { HTTPBearer } from 'syntrojs';

const bearer = new HTTPBearer();

app.get('/api/data', {
  dependencies: { token: bearer },
  handler: ({ dependencies }) => {
    const token = dependencies.token; // Validated token
    return { data: 'protected' };
  }
});
```

#### API Key

```typescript
import { APIKeyHeader, APIKeyQuery } from 'syntrojs';

// Via header
const apiKeyHeader = new APIKeyHeader({ name: 'X-API-Key' });

// Via query parameter  
const apiKeyQuery = new APIKeyQuery({ name: 'api_key' });

app.get('/api/data', {
  dependencies: { apiKey: apiKeyHeader },
  handler: ({ dependencies }) => {
    const key = dependencies.apiKey; // Validated key
    return { data: 'protected' };
  }
});
```

#### HTTP Basic Auth

```typescript
import { HTTPBasic } from 'syntrojs';

const basicAuth = new HTTPBasic();

app.get('/admin', {
  dependencies: { credentials: basicAuth },
  handler: ({ dependencies }) => {
    const { username, password } = dependencies.credentials;
    // Validate credentials
    return { admin: true };
  }
});
```

---

### Middleware

**`app.use(middleware)`** - Registers global middleware.  
**`app.use(path, middleware)`** - Registers path-specific middleware.

```typescript
interface Middleware {
  (ctx: RequestContext, next: () => Promise<void>): Promise<void>;
}
```

**Example**:

```typescript
// Global middleware
app.use(async (ctx, next) => {
  console.log(`${ctx.method} ${ctx.path}`);
  await next();
});

// Path-specific
app.use('/api/*', async (ctx, next) => {
  if (!ctx.headers.authorization) {
    throw new UnauthorizedException('Token required');
  }
  await next();
});
```

---

### Error Handling

**`app.registerExceptionHandler(errorClass, handler)`** - Registers custom error handler.

```typescript
app.registerExceptionHandler(MyError, (error, ctx) => ({
  status: 400,
  body: { error: error.message }
}));
```

**Built-in Exceptions**:
- `BadRequestException` (400)
- `UnauthorizedException` (401)
- `ForbiddenException` (403)
- `NotFoundException` (404)
- `ConflictException` (409)
- `UnprocessableEntityException` (422)
- `ServiceUnavailableException` (503)

---

### Registry Access

**`app.getSerializerRegistry()`** - Access serializer registry.  
**`app.getMiddlewareRegistry()`** - Access middleware registry.  
**`app.getRouteRegistry()`** - Access route registry.  
**`app.getWebSocketRegistry()`** - Access WebSocket registry.

---

## 🗺️ Roadmap

### ✅ v0.4.0 - REST Completion (100% COMPLETE 🎉)

- [x] File downloads (`ctx.download()`)
- [x] Streaming responses
- [x] File uploads (multipart)
- [x] Form data support
- [x] HTTP redirects (`ctx.redirect()`)
- [x] Content negotiation (`ctx.accepts`)

### ✅ v0.5.0 - TOON Format + Architecture Refactor (100% COMPLETE 🎉)

**TOON: The sweet spot between JSON's simplicity and gRPC's efficiency**

- [x] **TOON Format Support**: 40-60% payload reduction for any API
  - ✅ Human-readable (like JSON) - debug with `curl`
  - ✅ No compilation needed (like JSON) - no protoc, no tooling
  - ✅ Efficient (like gRPC) - 40-60% smaller payloads
  - ✅ Official `@toon-format/toon` package integration
  - ✅ Content negotiation via Accept header
  - ✅ Perfect for: High-traffic APIs, mobile apps, microservices, public APIs
- [x] **Serialization Architecture Refactor**
  - ✅ ResponseHandler centralized (SOLID)
  - ✅ Adapters unified: 5 → 2 (FluentAdapter + BunAdapter)
  - ✅ DTO-based serialization (runtime-agnostic)
  - ✅ O(1) content negotiation
  - ✅ Bundle size: -21KB (-10%)

### 🎨 v0.6.0 - Polish & Performance

- [ ] Native Bun plugins (CORS, Helmet, etc.)
- [ ] Server-Sent Events (SSE)
- [ ] CSRF protection

**Why TOON over gRPC?**
- No protobuf compilation required
- Readable in browser DevTools & logs
- Simple setup (5 minutes vs 2 hours)
- Same cost savings, zero complexity
- Works with any HTTP client (curl, fetch, axios)

### 🎨 v0.9.0 - Completeness (Optional Features)

- [ ] Static file serving _(optional)_
- [ ] Template rendering integrations _(optional)_
- [ ] Additional middleware helpers _(optional)_

### 🏗️ v1.0.0 - Production Ready

- [ ] Official CLI (`create-syntrojs`)
- [ ] Graceful shutdown
- [ ] Complete documentation (Docusaurus)
- [ ] Migration guides (Express, Fastify)
- [ ] Production deployment guide
- [ ] Security audit

### 🚀 v2.0.0 - Enterprise & Multi-Protocol

- [ ] **gRPC Support** - For maximum performance scenarios
  - Use alongside TOON for hybrid architectures
  - Public APIs: TOON (DX), Internal: gRPC (performance)
- [ ] GraphQL integration
- [ ] ORM adapters (Prisma, TypeORM, Drizzle)
- [ ] Metrics/Prometheus integration
- [ ] Distributed tracing (OpenTelemetry)

---

## 📚 Examples & Documentation

- **Examples Repository**: [syntrojs-example](https://github.com/Syntropysoft/syntrojs-example)
- **Architecture**: [ARCHITECTURE.md](./docs/architecture/ARCHITECTURE.md)
- **Full Documentation**: Coming soon

---

## 🤝 Contributing

We welcome contributions! Check out our [GitHub repository](https://github.com/Syntropysoft/sintrojs).

## 📄 License

Apache 2.0 - See [LICENSE](./LICENSE) for details.
