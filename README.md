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
[![Coverage](https://img.shields.io/badge/coverage-77.14%25-brightgreen)](./coverage)
[![Mutation Score](https://img.shields.io/badge/mutation%20score-58.72%25-yellow)](./reports/mutation)
[![Tests](https://img.shields.io/badge/tests-728%20passing-brightgreen)](./tests)

---

## ⚠️ ALPHA VERSION

**🚨 This is an ALPHA version and proof of concept. Do not use in production!**

- ✅ **Core functionality works** - Basic API creation, validation, and testing.
- ⚠️ **API may change** - Breaking changes are expected in future versions.
- ⚠️ **Not production-ready** - Missing features, optimizations, and stability improvements.

**Latest Release**: v0.4.0-alpha.3 - File downloads, critical bug fixes, SOLID refactoring ([CHANGELOG](./docs/CHANGELOG.md))

---

## 🎯 What is SyntroJS?

**SyntroJS is the world's first dual-runtime framework** that brings the simplicity and developer experience of FastAPI to the TypeScript ecosystem. Write your code once and run it on either **Node.js** for stability or **Bun** for maximum performance.

---

## ✨ Key Features

- **🚀 Dual Runtime Support**: Write once, run on both Node.js and Bun. Zero code changes required.
- **🔥 FastAPI-like Developer Experience**: Automatic validation with Zod, full TypeScript type safety, elegant error handling (`HTTPException`).
- **🎨 Automatic Interactive Docs**: Beautiful landing page + Swagger UI + ReDoc out of the box at `/docs`.
- **🧪 Testing Superpower**: `TinyTest` for effortless API testing + `SmartMutator` for mutation testing in seconds.
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

### TinyTest - API Testing

```javascript
import { TinyTest } from 'syntrojs/testing';
import { z } from 'zod';

test('POST /users creates a user', async () => {
  const api = new TinyTest();

  api.post('/users', {
    body: z.object({ name: z.string(), email: z.string().email() }),
    handler: ({ body }) => ({ id: 1, ...body }),
  });

  const { status, data } = await api.expectSuccess('POST', '/users', {
    body: { name: 'John', email: 'john@example.com' }
  });

  expect(status).toBe(201);
  expect(data.name).toBe('John');

  await api.close();
});
```

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

## 🗺️ Roadmap

### ✅ v0.4.0 - REST Completion (70% done)

- [x] File downloads (`ctx.download()`)
- [x] Streaming responses
- [x] File uploads (multipart)
- [x] Form data support
- [ ] Static file serving
- [ ] Redirects helper
- [ ] Content negotiation

### 🚀 v0.5.0 - Advanced Features

- [ ] **TOON Format**: 40-60% payload reduction for microservices
- [ ] Native Bun plugins (CORS, Helmet, etc.)
- [ ] Server-Sent Events (SSE)
- [ ] CSRF protection
- [ ] Template rendering

### 🏗️ v1.0.0 - Production Ready

- [ ] ORM adapters (Prisma, TypeORM, Drizzle)
- [ ] GraphQL support
- [ ] Official CLI (`create-syntrojs`)
- [ ] Graceful shutdown
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
