/**
 * Auto-OPTIONS Example
 * 
 * This example demonstrates how to use the Auto-OPTIONS generator
 * to automatically respond to OPTIONS requests based on registered routes.
 */

import { SyntroJS } from 'syntrojs';
import { generateOptionsResponse } from 'syntrojs';
import { RouteRegistry } from 'syntrojs';
import { z } from 'zod';

const app = new SyntroJS({ 
  title: 'Auto-OPTIONS Example',
  version: '1.0.0',
  description: 'Automatic OPTIONS generation for CORS preflight'
});

// ============================================
// Register RESTful routes
// ============================================

const userIdSchema = z.object({ id: z.string().uuid() });

app.get('/users', {
  summary: 'List all users',
  handler: () => ({
    users: [
      { id: '1', name: 'John' },
      { id: '2', name: 'Jane' },
    ],
  }),
});

app.post('/users', {
  body: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
  summary: 'Create a new user',
  handler: ({ body }) => ({
    id: '3',
    ...body,
  }),
});

app.get('/users/:id', {
  params: userIdSchema,
  summary: 'Get user by ID',
  handler: ({ params }) => ({
    id: params.id,
    name: 'John Doe',
  }),
});

app.put('/users/:id', {
  params: userIdSchema,
  body: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
  summary: 'Update user',
  handler: ({ params, body }) => ({
    id: params.id,
    ...body,
  }),
});

app.delete('/users/:id', {
  params: userIdSchema,
  summary: 'Delete user',
  handler: ({ params }) => ({
    deleted: true,
    userId: params.id,
  }),
});

app.head('/users/:id', {
  params: userIdSchema,
  summary: 'Check if user exists',
  handler: ({ params }) => ({
    exists: true,
    userId: params.id,
  }),
});

// ============================================
// Auto-OPTIONS: Manual approach
// ============================================

/**
 * Instead of manually defining an OPTIONS handler for each route,
 * you can use generateOptionsResponse() to automatically return
 * the allowed methods based on registered routes.
 */

app.options('/users/:id', {
  params: userIdSchema,
  summary: 'Get allowed methods (auto-generated)',
  handler: ({ params }) => {
    // Automatically get allowed methods for this path
    const response = generateOptionsResponse(
      RouteRegistry,
      `/users/${params.id}`,
      {
        origin: 'https://example.com', // Your frontend origin
        maxAge: 86400, // 24 hours cache
        additionalHeaders: {
          'X-API-Version': '1.0',
        },
      }
    );

    return {
      status: response.status,
      body: {
        allowed: response.headers.Allow,
        resource: `/users/${params.id}`,
      },
      headers: response.headers,
    };
  },
});

// ============================================
// Auto-OPTIONS: Generic catch-all approach
// ============================================

/**
 * For simpler cases, you can create a generic OPTIONS handler
 * that works for any path pattern.
 */

app.options('/api/:resource', {
  params: z.object({ resource: z.string() }),
  summary: 'CORS preflight for API endpoints',
  handler: ({ params }) => {
    // Auto-generate based on registered routes
    const response = generateOptionsResponse(
      RouteRegistry,
      `/api/${params.resource}`,
      {
        origin: '*',
        maxAge: 3600,
      }
    );

    return response;
  },
});

// ============================================
// Utility endpoints
// ============================================

/**
 * Endpoint to discover all allowed methods for any path
 * (useful for debugging and API exploration)
 */
app.get('/api/discover/:path(*)', {
  params: z.object({ path: z.string() }),
  summary: 'Discover allowed methods for any path',
  handler: ({ params }) => {
    const response = generateOptionsResponse(
      RouteRegistry,
      `/${params.path}`
    );

    return {
      path: `/${params.path}`,
      status: response.status,
      allowedMethods: response.headers.Allow?.split(', ') || [],
      headers: response.headers,
    };
  },
});

// Start server
await app.listen(3000);

console.log('\n🎯 Try these examples:\n');

console.log('Manual OPTIONS request:');
console.log('  curl -X OPTIONS http://localhost:3000/users/123e4567-e89b-12d3-a456-426614174000 -v\n');

console.log('CORS preflight simulation:');
console.log('  curl -X OPTIONS http://localhost:3000/users \\');
console.log('    -H "Origin: https://example.com" \\');
console.log('    -H "Access-Control-Request-Method: POST" -v\n');

console.log('Discover allowed methods for any path:');
console.log('  curl http://localhost:3000/api/discover/users');
console.log('  curl http://localhost:3000/api/discover/users/123\n');

console.log('Compare with actual endpoints:');
console.log('  curl http://localhost:3000/users');
console.log('  curl http://localhost:3000/users/123e4567-e89b-12d3-a456-426614174000\n');

console.log('📖 Documentation: http://localhost:3000/docs\n');

