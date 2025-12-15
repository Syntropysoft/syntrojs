# Testing Checklist v0.7.0

**Version:** 0.7.0  
**Date:** 2025-01-XX  
**Status:** Ready for Testing

---

## ✅ Pre-Testing Verification

- [ ] All tests passing: `pnpm test` (should show 980+ tests passing)
- [ ] Typecheck passing: `pnpm typecheck` (should show no errors)
- [ ] Build successful: `pnpm build` (should complete without errors)
- [ ] Version updated: `package.json` shows `0.7.0`
- [ ] Version updated: `src/index.ts` exports `VERSION = '0.7.0'`

---

## 🧪 Router System Tests

### Basic Router Functionality

- [ ] **Create Router**
  ```typescript
  const router = new SyntroRouter('/api/v1');
  expect(router.getPrefix()).toBe('/api/v1');
  ```

- [ ] **Register GET Route**
  ```typescript
  router.get('/users', { handler: () => [{ id: 1 }] });
  // Verify route exists at GET /api/v1/users
  ```

- [ ] **Register POST Route**
  ```typescript
  router.post('/users', { handler: ({ body }) => body });
  // Verify route exists at POST /api/v1/users
  ```

- [ ] **Register Multiple Routes**
  ```typescript
  router.get('/users', { handler: getUsers });
  router.post('/users', { handler: createUser });
  router.get('/users/:id', { handler: getUser });
  router.put('/users/:id', { handler: updateUser });
  router.delete('/users/:id', { handler: deleteUser });
  // Verify all routes exist with correct prefix
  ```

- [ ] **Include Router in App**
  ```typescript
  app.include(router);
  // Verify routes are accessible via HTTP
  ```

### Router Middleware

- [ ] **Router-Level Middleware**
  ```typescript
  const router = new SyntroRouter('/api/v1');
  router.use(async (ctx, next) => {
    console.log('Router middleware');
    await next();
  });
  router.get('/users', { handler: () => [] });
  // Verify middleware executes before handler
  ```

- [ ] **Middleware Execution Order**
  ```typescript
  app.use(async (ctx, next) => { console.log('1. Global'); await next(); });
  router.use(async (ctx, next) => { console.log('2. Router'); await next(); });
  router.get('/test', { handler: () => { console.log('3. Handler'); } });
  // Verify order: Global → Router → Handler
  ```

- [ ] **Scoped Middleware**
  ```typescript
  router.use(authMiddleware, '/protected');
  router.get('/protected/users', { handler: getUsers });
  router.get('/public/posts', { handler: getPosts });
  // Verify authMiddleware only applies to /protected routes
  ```

### API Versioning

- [ ] **Multiple Versions**
  ```typescript
  const v1Router = new SyntroRouter('/api/v1');
  const v2Router = new SyntroRouter('/api/v2');
  
  v1Router.get('/users', { handler: () => [{ id: 1, name: 'John' }] });
  v2Router.get('/users', { handler: () => [{ id: 1, firstName: 'John' }] });
  
  app.include(v1Router);
  app.include(v2Router);
  
  // Verify both versions work:
  // GET /api/v1/users returns old format
  // GET /api/v2/users returns new format
  ```

- [ ] **Version-Specific Middleware**
  ```typescript
  const v3Router = new SyntroRouter('/api/v3');
  v3Router.use(async (ctx, next) => {
    if (!ctx.headers['x-api-key']) {
      throw new UnauthorizedException('API key required');
    }
    await next();
  });
  // Verify v3 requires API key, v1/v2 don't
  ```

### Edge Cases

- [ ] **Prefix Normalization**
  ```typescript
  const router1 = new SyntroRouter('/api/v1');
  const router2 = new SyntroRouter('/api/v1/');
  // Both should work the same
  ```

- [ ] **Path Combination**
  ```typescript
  router.get('/users', { handler: () => [] });
  // Should create route at /api/v1/users (not /api/v1//users)
  ```

- [ ] **Multiple Routers**
  ```typescript
  const usersRouter = new SyntroRouter('/api/v1/users');
  const postsRouter = new SyntroRouter('/api/v1/posts');
  app.include(usersRouter);
  app.include(postsRouter);
  // Verify both routers work independently
  ```

---

## 🧪 Type-Safe Client Tests

### Local Mode (Testing)

- [ ] **Basic GET Request**
  ```typescript
  app.get('/users', { handler: () => [{ id: 1 }] });
  const client = createClient(app);
  const response = await client.users.get();
  expect(response.data).toEqual([{ id: 1 }]);
  expect(response.status).toBe(200);
  ```

- [ ] **POST Request with Body**
  ```typescript
  app.post('/users', {
    body: z.object({ name: z.string() }),
    handler: ({ body }) => ({ id: 1, ...body }),
  });
  const client = createClient(app);
  const response = await client.users.post({
    body: { name: 'John' },
  });
  expect(response.data.name).toBe('John');
  ```

- [ ] **Path Parameters**
  ```typescript
  app.get('/users/:id', {
    params: z.object({ id: z.string() }),
    handler: ({ params }) => ({ id: params.id }),
  });
  const client = createClient(app);
  const response = await client.users[':id'].get({
    params: { id: '123' },
  });
  expect(response.data.id).toBe('123');
  ```

- [ ] **Query Parameters**
  ```typescript
  app.get('/users', {
    query: z.object({
      page: z.string().transform(Number),
    }),
    handler: ({ query }) => ({ page: query.page }),
  });
  const client = createClient(app);
  const response = await client.users.get({
    query: { page: '1' },
  });
  expect(response.data.page).toBe(1); // Should be transformed to number
  ```

- [ ] **Body Validation**
  ```typescript
  app.post('/users', {
    body: z.object({ name: z.string().min(3) }),
    handler: () => ({ success: true }),
  });
  const client = createClient(app);
  await expect(
    client.users.post({ body: { name: 'Jo' } }) // Too short
  ).rejects.toThrow();
  ```

- [ ] **Nested Routes**
  ```typescript
  app.get('/users/:id/posts', {
    handler: ({ params }) => ({ userId: params.id, posts: [] }),
  });
  const client = createClient(app);
  const response = await client.users[':id'].posts.get({
    params: { id: '123' },
  });
  expect(response.data.userId).toBe('123');
  ```

- [ ] **Route Not Found**
  ```typescript
  const client = createClient(app);
  await expect(client.nonexistent.get()).rejects.toThrow('Route not found');
  ```

### Remote Mode (Frontend)

- [ ] **Create Remote Client**
  ```typescript
  const client = createClient(app, {
    mode: 'remote',
    baseUrl: 'http://localhost:3000',
  });
  // Should not throw error
  ```

- [ ] **HTTP Request**
  ```typescript
  // Start server first
  await app.listen(3000);
  
  const client = createClient(app, {
    mode: 'remote',
    baseUrl: 'http://localhost:3000',
  });
  
  const response = await client.users.get();
  expect(response.status).toBe(200);
  expect(response.data).toBeDefined();
  ```

- [ ] **Default Headers**
  ```typescript
  const client = createClient(app, {
    mode: 'remote',
    baseUrl: 'http://localhost:3000',
    defaultHeaders: {
      Authorization: 'Bearer token123',
    },
  });
  // Verify headers are sent with requests
  ```

- [ ] **Error Handling**
  ```typescript
  const client = createClient(app, {
    mode: 'remote',
    baseUrl: 'http://invalid-url',
  });
  await expect(client.users.get()).rejects.toThrow();
  ```

### Client with Routers

- [ ] **Client Works with Routers**
  ```typescript
  const router = new SyntroRouter('/api/v1');
  router.get('/users', { handler: () => [{ id: 1 }] });
  app.include(router);
  
  const client = createClient(app);
  const response = await client.api.v1.users.get();
  expect(response.data).toEqual([{ id: 1 }]);
  ```

---

## 🧪 Serializer Enhancements Tests

### Chain of Responsibility

- [ ] **Next Parameter Works**
  ```typescript
  class DecoratorSerializer implements IResponseSerializer {
    serialize(result, status, request, next) {
      const dto = next(result, status, request);
      dto.headers['x-decorated'] = 'true';
      return dto;
    }
  }
  // Verify decorator wraps response
  ```

- [ ] **OpenTelemetry Pattern**
  ```typescript
  // See tests/universal/application/SerializerRegistry-chain.test.ts
  // Verify OpenTelemetry decorator pattern works
  ```

### Priority System

- [ ] **Default Priorities**
  ```typescript
  // Verify serializers execute in correct order:
  // CustomResponse (10) → Redirect (20) → FileDownload (30) → 
  // Stream (40) → Buffer (50) → Json (999)
  ```

- [ ] **Custom Priorities**
  ```typescript
  app.registerSerializer(new MySerializer(), 'MySerializer', {
    priority: 25,
  });
  // Verify MySerializer executes between Redirect (20) and FileDownload (30)
  ```

### Helper Methods

- [ ] **registerFirst()**
  ```typescript
  app.registerSerializerFirst(new FirstSerializer(), 'First');
  // Verify FirstSerializer executes before all others
  ```

- [ ] **registerBefore()**
  ```typescript
  app.registerSerializerBefore('Json', new BeforeJsonSerializer(), 'BeforeJson');
  // Verify BeforeJsonSerializer executes before JsonSerializer
  ```

- [ ] **registerAfter()**
  ```typescript
  app.registerSerializerAfter('Redirect', new AfterRedirectSerializer(), 'AfterRedirect');
  // Verify AfterRedirectSerializer executes after RedirectSerializer
  ```

---

## 📝 Documentation Tests

### Router Documentation

- [ ] **Example 1: Basic Router** (`docs/ROUTER.md`)
  - Copy example code
  - Run it
  - Verify it works

- [ ] **Example 2: Router-Level Middleware**
  - Copy example code
  - Run it
  - Verify middleware executes

- [ ] **Example 7: API Versioning**
  - Copy example code
  - Run it
  - Verify multiple versions work

### Client Documentation

- [ ] **Example 1: Basic CRUD API** (`docs/CLIENT.md`)
  - Copy example code
  - Run it
  - Verify client works

- [ ] **Example 4: Frontend Integration**
  - Copy example code
  - Adapt for your environment
  - Verify HTTP requests work

---

## 🔍 Integration Tests

- [ ] **Router + Client Integration**
  ```typescript
  const router = new SyntroRouter('/api/v1');
  router.get('/users', { handler: () => [] });
  app.include(router);
  
  const client = createClient(app);
  const response = await client.api.v1.users.get();
  // Verify integration works
  ```

- [ ] **Router + Serializer Integration**
  ```typescript
  const router = new SyntroRouter('/api/v1');
  router.get('/users', { handler: () => ({ custom: true }) });
  app.include(router);
  
  // Register custom serializer
  app.registerSerializerFirst(new CustomResponseSerializer(), 'Custom');
  // Verify serializer handles router responses
  ```

---

## 🚨 Error Cases

- [ ] **Invalid Router Prefix**
  ```typescript
  expect(() => new SyntroRouter('')).toThrow();
  expect(() => new SyntroRouter('api/v1')).toThrow();
  ```

- [ ] **Invalid Client Config**
  ```typescript
  expect(() => createClient(null)).toThrow();
  expect(() => createClient(app, { mode: 'remote' })).toThrow(); // Missing baseUrl
  ```

- [ ] **Duplicate Routes**
  ```typescript
  router.get('/users', { handler: () => [] });
  router.get('/users', { handler: () => [] }); // Should throw or handle gracefully
  ```

---

## ✅ Final Checklist

- [ ] All router tests pass
- [ ] All client tests pass
- [ ] All serializer tests pass
- [ ] Documentation examples work
- [ ] Integration tests pass
- [ ] Error cases handled correctly
- [ ] No console errors or warnings
- [ ] Performance acceptable (no regressions)

---

## 📋 Notes for Tester

### What to Focus On

1. **Router System**: Most important new feature
   - Test API versioning thoroughly
   - Verify middleware execution order
   - Test with multiple routers

2. **Type-Safe Client**: Revolutionary for testing
   - Focus on local mode (testing)
   - Verify type inference works
   - Test validation

3. **Serializer Enhancements**: Advanced feature
   - Test Chain of Responsibility
   - Verify priorities work
   - Test helper methods

### Common Issues to Watch For

- Route prefixing incorrect
- Middleware not executing
- Client not finding routes
- Serializer order wrong
- Type errors in client

### If Issues Found

1. Document the issue clearly
2. Include code example
3. Include error message
4. Note expected vs actual behavior
5. Check if it's a breaking change

---

**Good luck with testing!** 🚀

