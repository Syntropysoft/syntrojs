/**
 * HEAD and OPTIONS HTTP Methods Example
 * 
 * This example demonstrates how to use HEAD and OPTIONS methods in SyntroJS
 */

import { SyntroJS } from 'syntrojs';
import { z } from 'zod';

const app = new SyntroJS({ 
  title: 'HEAD & OPTIONS Example',
  version: '1.0.0',
  description: 'Demonstrates HEAD and OPTIONS HTTP methods'
});

// ============================================
// HEAD Method Examples
// ============================================

/**
 * HEAD /users/:id
 * 
 * HEAD is identical to GET but only returns headers (no body).
 * Useful for checking if a resource exists without downloading it.
 */
app.head('/users/:id', {
  params: z.object({ id: z.string().uuid() }),
  summary: 'Check if user exists',
  description: 'Returns headers only - useful for existence checks',
  handler: ({ params }) => ({
    status: 200,
    body: { exists: true, userId: params.id },
    headers: {
      'X-Resource-Exists': 'true',
      'X-User-ID': params.id,
      'X-Last-Modified': new Date().toISOString(),
    },
  }),
});

/**
 * HEAD /documents/:id
 * 
 * Common use case: Check document existence and get metadata
 * without downloading the full document.
 */
app.head('/documents/:id', {
  params: z.object({ id: z.string() }),
  summary: 'Check document metadata',
  handler: ({ params }) => ({
    status: 200,
    body: { exists: true },
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': '1048576', // 1MB
      'Last-Modified': 'Wed, 21 Oct 2015 07:28:00 GMT',
      'ETag': '"33a64df551425fcc55e4d42a148795d9f25f89d4"',
      'X-Document-ID': params.id,
      'X-Document-Version': '2.0',
    },
  }),
});

/**
 * HEAD /api/health
 * 
 * Health check endpoint - HEAD is perfect for this.
 */
app.head('/api/health', {
  summary: 'Health check (HEAD only)',
  handler: () => ({
    status: 200,
    body: { healthy: true },
    headers: {
      'X-Service-Status': 'healthy',
      'X-Uptime': process.uptime().toString(),
    },
  }),
});

// ============================================
// OPTIONS Method Examples
// ============================================

/**
 * OPTIONS /users
 * 
 * Returns allowed HTTP methods for the /users endpoint.
 * Primarily used for CORS preflight requests.
 */
app.options('/users', {
  summary: 'Get allowed methods for /users',
  description: 'Returns the allowed HTTP methods and CORS headers',
  handler: () => ({
    status: 204, // No Content
    body: null,
    headers: {
      'Allow': 'GET, POST, HEAD, OPTIONS',
      'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  }),
});

/**
 * OPTIONS /users/:id
 * 
 * Returns allowed methods for a specific user resource.
 */
app.options('/users/:id', {
  params: z.object({ id: z.string() }),
  summary: 'Get allowed methods for specific user',
  handler: ({ params }) => ({
    status: 200,
    body: {
      resource: `/users/${params.id}`,
      allow: ['GET', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
    },
    headers: {
      'Allow': 'GET, PUT, DELETE, HEAD, OPTIONS',
    },
  }),
});

/**
 * OPTIONS /api/*
 * 
 * CORS preflight handler for all API endpoints.
 * Returns comprehensive CORS headers.
 */
app.options('/api/:resource', {
  params: z.object({ resource: z.string() }),
  summary: 'CORS preflight for API endpoints',
  handler: ({ params }) => ({
    status: 204, // No Content is standard for OPTIONS
    body: null,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Expose-Headers': 'X-Total-Count, X-Page-Count',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Allow-Credentials': 'true',
      'Allow': 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS',
    },
  }),
});

// ============================================
// Supporting GET endpoints for comparison
// ============================================

app.get('/users/:id', {
  params: z.object({ id: z.string().uuid() }),
  summary: 'Get user by ID',
  handler: ({ params }) => ({
    id: params.id,
    name: 'John Doe',
    email: 'john@example.com',
  }),
});

app.get('/documents/:id', {
  params: z.object({ id: z.string() }),
  summary: 'Download document',
  handler: ({ params }) => ({
    id: params.id,
    name: 'Important Document.pdf',
    size: 1048576,
    content: 'Base64EncodedContent...',
  }),
});

app.get('/api/health', {
  summary: 'Health check (full response)',
  handler: () => ({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  }),
});

// Start server
await app.listen(3000);

console.log('\n🎯 Try these examples:\n');
console.log('HEAD requests (headers only):');
console.log('  curl -I http://localhost:3000/users/123e4567-e89b-12d3-a456-426614174000');
console.log('  curl -I http://localhost:3000/documents/doc-123');
console.log('  curl -I http://localhost:3000/api/health\n');

console.log('OPTIONS requests (allowed methods):');
console.log('  curl -X OPTIONS http://localhost:3000/users');
console.log('  curl -X OPTIONS http://localhost:3000/users/123');
console.log('  curl -X OPTIONS http://localhost:3000/api/data -v\n');

console.log('Compare with GET (full response):');
console.log('  curl http://localhost:3000/users/123e4567-e89b-12d3-a456-426614174000');
console.log('  curl http://localhost:3000/api/health\n');

console.log('📖 Documentation: http://localhost:3000/docs\n');

