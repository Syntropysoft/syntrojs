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
[![Tests](https://img.shields.io/badge/tests-1,019+-passing-brightgreen)](./tests)

---

## 🚀 Status: Stable Core - Lambda Alpha

**SyntroJS core is production-ready** with 1,019+ passing tests and 71.55% code coverage. The REST mode API is stable and battle-tested. Lambda mode is in active alpha development.

- ✅ **Battle-tested Core** - 1,019+ tests across Node.js and Bun (99.3% passing)
- ✅ **Stable REST API** - Production-ready for HTTP servers
- ✅ **Active development** - Regular updates and community support
- ⚠️ **AWS Lambda Support** (Alpha) - CORS bug fix in v0.6.8-alpha.1, requires thorough testing
- 🎯 **v0.7.0 planned** - Router + Advanced Middleware

**Latest Release**: **v0.6.8-alpha.2** - Lambda CORS multiValueHeaders Support & Code Quality Improvements - [CHANGELOG](./docs/CHANGELOG.md)

> 💡 **Note**: 
> - **REST Mode**: Production-ready, stable API
> - **Lambda Mode**: Alpha - Use with caution, test thoroughly before production
> - We recommend pinning to specific versions until v1.0.0

---

## 🎯 What is SyntroJS?

**SyntroJS is the world's first dual-runtime framework** that brings the simplicity and developer experience of FastAPI to the TypeScript ecosystem. Write your code once and run it on either **Node.js** for stability or **Bun** for maximum performance.

**Key Highlights:**
- 🚀 **Dual Runtime**: Same code runs on Node.js and Bun
- ⚠️ **AWS Lambda** (Alpha): Same code works in REST (dev) and Lambda (prod) modes
- 🔥 **FastAPI DX**: Automatic validation, type safety, elegant error handling
- 🎨 **Auto Docs**: Interactive Swagger UI + ReDoc out of the box
- 🧪 **Testing**: SmartMutator for mutation testing in seconds

---

## 🚀 Quick Start

### Installation

```bash
npm install syntrojs zod
```

### Basic REST API

```javascript
import { SyntroJS } from 'syntrojs';
import { z } from 'zod';

const app = new SyntroJS({ title: 'My API' });

// Simple GET endpoint
app.get('/hello', { 
  handler: () => ({ message: 'Hello World!' }) 
});

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

### AWS Lambda Mode ⚠️ (Alpha)

**Same code, Lambda deployment** - Just change one flag:

> ⚠️ **Alpha Status**: Lambda mode with CORS support is currently in alpha (v0.6.8-alpha.1). CORS origin extraction bug fixed. Please test thoroughly before using in production.

```javascript
import { SyntroJS } from 'syntrojs';
import { z } from 'zod';

// Lambda mode: rest: false
const app = new SyntroJS({ rest: false, title: 'My API' });

app.post('/users', {
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
  }),
  handler: ({ body }) => ({ id: 1, ...body }),
});

// Export handler for AWS Lambda
export const handler = app.handler();
```

**That's it!** 🎉 Deploy to AWS Lambda. Same validation, same type safety, same code.

See [Lambda Usage Guide](./docs/LAMBDA_USAGE.md) for complete examples.

---

## ✨ Key Features

### 🚀 Dual Runtime Support
Write once, run on both Node.js and Bun. Zero code changes required.

### ☁️ AWS Lambda Support ⚠️ (Alpha)
Same code works in REST mode (development) and Lambda mode (production). Just set `rest: false`. Full API Gateway integration with automatic event detection.

> ⚠️ **Alpha Status**: Lambda mode with CORS support is currently in alpha (v0.6.8-alpha.1). CORS origin extraction bug fixed. Please test thoroughly before using in production.

**Lambda Adapters Status:**
- ✅ **API Gateway**: Implemented
- ✅ **SQS**: Implemented
- ✅ **S3**: Implemented
- ✅ **EventBridge**: Implemented

### 🔥 FastAPI-like Developer Experience
Automatic validation with Zod, full TypeScript type safety, elegant error handling (`HTTPException`).

### 🎨 Automatic Interactive Docs
Beautiful landing page + Swagger UI + ReDoc out of the box at `/docs`.

### 🧪 Testing Superpower
`SmartMutator` for mutation testing in seconds. Type-safe client coming in v0.7.0.

### 🔌 Rich Ecosystem
Middleware system, WebSockets, dependency injection, background tasks, structured logging.

### 🔒 Security First
JWT, OAuth2, API Keys, and security plugins built-in.

### 🏗️ Extensible Architecture
Lambda adapters follow SOLID principles and can be extracted to separate packages. Test adapters independently without full framework.

---

## 📚 Examples

We have comprehensive examples in the [`examples/`](./examples/) directory:

### Getting Started
- **[Quick Start](./examples/quick-start/)** - Basic API example with tests
- **[Dual Runtime](./examples/dual-runtime/)** - Same code on Node.js and Bun

### Features
- **[HTTP Methods](./examples/http-methods/)** - Redirects, content negotiation, HEAD/OPTIONS
- **[Middleware](./examples/middleware-example/)** - Global and path-specific middleware
- **[WebSockets](./examples/websocket-example/)** - Real-time communication
- **[Documentation Config](./examples/docs-config/)** - Customizing OpenAPI docs

### Advanced
- **[Lambda Example](./examples/lambda-example/)** - Complete AWS Lambda deployment
- **[Bun Runtime](./examples/syntrojs-bun/)** - Bun-specific optimizations
- **[Demo Brutal](./examples/demo-brutal/)** - Performance benchmarks

### See All Examples
Check the [examples README](./examples/README.md) for a complete list.

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
| Plugins (CORS, Helmet, etc.) | ✅ Full | ⚠️ Warnings only | v0.7.0 planned |
| Static files | ✅ Full | ❌ Not available | v0.7.0 planned |
| `getRawFastify()` | ✅ Works | ❌ Use `getRawServer()` | - |

---

## 💡 Core Concepts

### Request Validation

Automatic validation with Zod schemas:

```javascript
app.post('/users', {
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({
    page: z.coerce.number().min(1).default(1),
  }),
  handler: ({ body, params, query }) => {
    // All validated and type-safe!
    return { ...body, id: params.id, page: query.page };
  },
});
```

### Dependency Injection

Share services across routes:

```javascript
import { inject } from 'syntrojs';

const dbService = inject(() => new Database(), { scope: 'singleton' });

app.get('/users', {
  dependencies: { db: dbService },
  handler: ({ dependencies }) => dependencies.db.getUsers()
});
```

### Error Handling

FastAPI-style exceptions:

```javascript
import { NotFoundException, BadRequestException } from 'syntrojs';

app.get('/users/:id', {
  handler: ({ params }) => {
    const user = findUser(params.id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  },
});
```

### Middleware

Global or path-specific:

```javascript
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

### Background Tasks

Non-blocking async tasks:

```javascript
app.post('/users', {
  handler: ({ body, background }) => {
    // Queue email send (non-blocking)
    background.addTask(async () => {
      await sendWelcomeEmail(body.email);
    });
    
    return { success: true };
  }
});
```

---

## 📖 API Reference

### Creating an Application

```typescript
new SyntroJS(config?: SyntroJSConfig)
```

**Configuration Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | `string` | - | API title for OpenAPI docs |
| `version` | `string` | - | API version |
| `description` | `string` | - | API description |
| `runtime` | `'auto' \| 'node' \| 'bun'` | `'auto'` | Force specific runtime |
| `rest` | `boolean` | `true` | REST mode (HTTP server) or Lambda mode |
| `docs` | `boolean \| object` | `true` | Configure documentation endpoints |
| `logger` | `boolean` | `false` | Enable Fastify logger |
| `syntroLogger` | `boolean \| object` | `false` | Enable @syntrojs/logger |

### Route Registration

```typescript
app.get(path: string, config: RouteConfig)
app.post(path: string, config: RouteConfig)
app.put(path: string, config: RouteConfig)
app.delete(path: string, config: RouteConfig)
app.patch(path: string, config: RouteConfig)
```

**Route Config:**

```typescript
interface RouteConfig {
  handler: (ctx: RequestContext) => any;
  body?: ZodSchema;        // Request body validation
  params?: ZodSchema;      // Path parameters validation
  query?: ZodSchema;       // Query parameters validation
  response?: ZodSchema;    // Response validation
  status?: number;         // Default status code
  dependencies?: object;   // Dependency injection
}
```

### Server Management

**REST Mode:**
```typescript
// Start server
const address = await app.listen(port: number, host?: string);

// Stop server
await app.close();
```

**Lambda Mode:**
```typescript
// Export handler
export const handler = app.handler();
```

### Request Context

```typescript
interface RequestContext {
  method: HttpMethod;              // HTTP method
  path: string;                    // Request path
  params: any;                     // Path parameters (validated)
  query: any;                      // Query parameters (validated)
  body: any;                       // Request body (validated)
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

## 🔒 Security

### OAuth2 Password Bearer

```typescript
import { OAuth2PasswordBearer } from 'syntrojs';

const oauth2 = new OAuth2PasswordBearer({ tokenUrl: '/token' });

app.get('/protected', {
  dependencies: { user: oauth2 },
  handler: ({ dependencies }) => ({ user: dependencies.user }),
});
```

### HTTP Bearer

```typescript
import { HTTPBearer } from 'syntrojs';

const bearer = new HTTPBearer();

app.get('/api/data', {
  dependencies: { token: bearer },
  handler: ({ dependencies }) => ({ data: 'protected' }),
});
```

### API Key

```typescript
import { APIKeyHeader, APIKeyQuery } from 'syntrojs';

// Via header
const apiKeyHeader = new APIKeyHeader({ name: 'X-API-Key' });

// Via query parameter
const apiKeyQuery = new APIKeyQuery({ name: 'api_key' });

app.get('/api/data', {
  dependencies: { apiKey: apiKeyHeader },
  handler: ({ dependencies }) => ({ data: 'protected' }),
});
```

### HTTP Basic Auth

```typescript
import { HTTPBasic } from 'syntrojs';

const basicAuth = new HTTPBasic();

app.get('/admin', {
  dependencies: { credentials: basicAuth },
  handler: ({ dependencies }) => {
    const { username, password } = dependencies.credentials;
    return { admin: true };
  },
});
```

---

## 🧪 Testing

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

### SmartMutator - Mutation Testing

```bash
pnpm test:mutate
```

| Method | Mutants | Tests | Time |
|--------|---------|-------|------|
| Stryker (vanilla) | 1,247 | 187,050 | 43 min |
| **SmartMutator** | **142** | **284** | **12 sec** |

**Mutation Score: 58.72%** (742 killed, 144 survived)

---

## 📊 Quality Metrics

- **Tests**: 1,019+ passing (Node.js 100%, Bun 94%)
- **Coverage**: 71.55% (Branch: 80.73%)
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

## 💎 TOON Format (v0.5.0+)

**Reduce API bandwidth costs 40-60%** while keeping responses human-readable.

| Feature | JSON | **TOON** 🎯 | gRPC/Protobuf |
|---------|------|------------|---------------|
| **Payload Size** | 100% | **40-50%** ⚡ | 35-45% |
| **Human-Readable** | ✅ Yes | ✅ **Yes** | ❌ Binary |
| **Debug with curl** | ✅ Easy | ✅ **Easy** | ❌ Requires tools |
| **Setup Time** | 5 minutes | **5 minutes** | 2+ hours |
| **Tooling Needed** | None | **None** | protoc, plugins |

**TOON gives you the best of both worlds:** gRPC's efficiency with JSON's simplicity.

See [TOON Format Documentation](./docs/TOON_FORMAT.md) for details.

---

## 🗺️ Roadmap

### ✅ v0.4.0 - REST Completion (100% COMPLETE 🎉)
- [x] File downloads, streaming, uploads
- [x] HTTP redirects, content negotiation

### ✅ v0.5.0 - TOON Format (100% COMPLETE 🎉)
- [x] TOON Format Support (40-60% payload reduction)
- [x] Serialization Architecture Refactor

### ✅ v0.6.0 - AWS Lambda Support (100% COMPLETE 🎉)
- [x] Lambda Mode (`rest: false`)
- [x] API Gateway Integration
- [x] Dynamic Routes with pattern matching
- [x] 82 Lambda tests passing

### 🎨 v0.7.0 - Router + Advanced Middleware
- [ ] `SyntroRouter` - Group endpoints with prefixes
- [ ] Router-level middleware
- [ ] Advanced middleware patterns

### 🎨 v0.8.0 - Security & Real-time Features
- [ ] CSRF protection
- [ ] Server-Sent Events (SSE)
- [ ] WebSocket rooms/namespaces
- [ ] Session management

### 🎨 v0.9.0 - Completeness (Optional Features)
- [ ] Static file serving _(optional)_
- [ ] Template rendering integrations _(optional)_
- [ ] Native Bun plugins

### 🏗️ v1.0.0 - Production Ready
- [ ] Official CLI (`create-syntrojs`)
- [ ] Graceful shutdown
- [ ] Complete documentation (Docusaurus)
- [ ] Migration guides
- [ ] Security audit

---

## 📚 Documentation

- **[Lambda Usage Guide](./docs/LAMBDA_USAGE.md)** - Complete Lambda documentation
- **[Lambda Architecture](./docs/LAMBDA_ADAPTERS_EXTRACTION.md)** - Adapter architecture guide
- **[Architecture](./docs/architecture/ARCHITECTURE.md)** - Framework architecture
- **[Examples](./examples/)** - Code examples and demos
- **[CHANGELOG](./docs/CHANGELOG.md)** - Version history

---

## 🤝 Contributing

We welcome contributions! Check out our [GitHub repository](https://github.com/Syntropysoft/sintrojs).

## 📄 License

Apache 2.0 - See [LICENSE](./LICENSE) for details.
