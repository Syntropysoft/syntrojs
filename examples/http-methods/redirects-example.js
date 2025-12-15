/**
 * HTTP Redirects Example
 *
 * Demonstrates all redirect status codes and use cases:
 * - 301: Moved Permanently
 * - 302: Found (temporary)
 * - 303: See Other (POST → GET)
 * - 307: Temporary (preserves method)
 * - 308: Permanent (preserves method)
 */

import { SyntroJS } from 'syntrojs';
import { z } from 'zod';

const app = new SyntroJS({
  title: 'HTTP Redirects Example',
  version: '1.0.0',
  description: 'Examples of HTTP redirect patterns',
});

// ============================================================================
// 1. Basic Redirects
// ============================================================================

// Default redirect (302 Found - temporary)
app.get('/old-page', {
  summary: 'Temporary redirect (302)',
  handler: ({ redirect }) => redirect('/new-page'),
});

// Permanent redirect (301 - SEO friendly)
app.get('/legacy/users', {
  summary: 'Permanent redirect (301)',
  handler: ({ redirect }) => redirect('/api/v2/users', 301),
});

// ============================================================================
// 2. API Versioning
// ============================================================================

// Redirect old API version to new
app.get('/api/v1/products', {
  summary: 'Redirect v1 to v2 (permanent)',
  handler: ({ redirect }) => redirect('/api/v2/products', 301),
});

// New API version (actual endpoint)
app.get('/api/v2/products', {
  summary: 'Get products (v2)',
  handler: () => ({
    products: [
      { id: 1, name: 'Product 1', price: 99.99 },
      { id: 2, name: 'Product 2', price: 149.99 },
    ],
  }),
});

// ============================================================================
// 3. Authentication Redirects
// ============================================================================

// Redirect to login if not authenticated
app.get('/admin', {
  summary: 'Admin dashboard (requires auth)',
  query: z.object({
    token: z.string().optional(),
  }),
  handler: ({ query, redirect }) => {
    const isAuthenticated = query.token === 'valid-token';

    if (!isAuthenticated) {
      return redirect('/login', 302);
    }

    return { message: 'Welcome to admin dashboard' };
  },
});

app.get('/login', {
  summary: 'Login page',
  handler: () => ({ message: 'Please login' }),
});

// ============================================================================
// 4. Form Submission Redirect (303 See Other)
// ============================================================================

// POST form → redirect to success page with GET
app.post('/submit-form', {
  summary: 'Submit form and redirect (303)',
  body: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
  handler: ({ body, redirect }) => {
    // Save data (simulated)
    console.log('Saving user:', body);

    // Redirect to success page (303 = use GET)
    return redirect('/success?name=' + encodeURIComponent(body.name), 303);
  },
});

app.get('/success', {
  summary: 'Success page',
  query: z.object({ name: z.string() }),
  handler: ({ query }) => ({
    message: `Thank you, ${query.name}! Form submitted successfully.`,
  }),
});

// ============================================================================
// 5. Method-Preserving Redirects (307, 308)
// ============================================================================

// Temporary redirect that preserves POST
app.post('/api/temp-endpoint', {
  summary: 'Temporary POST redirect (307)',
  handler: ({ redirect }) => redirect('/api/new-endpoint', 307),
});

// Permanent redirect that preserves PUT
app.put('/api/old-resource', {
  summary: 'Permanent PUT redirect (308)',
  handler: ({ redirect }) => redirect('/api/v2/resource', 308),
});

// ============================================================================
// 6. External Redirects
// ============================================================================

// Redirect to external documentation
app.get('/docs/external', {
  summary: 'Redirect to external docs',
  handler: ({ redirect }) => redirect('https://docs.example.com/guide', 302),
});

// OAuth flow example
app.get('/auth/google', {
  summary: 'Redirect to Google OAuth',
  handler: ({ redirect }) => {
    const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const params = new URLSearchParams({
      client_id: 'YOUR_CLIENT_ID',
      redirect_uri: 'http://localhost:3000/auth/callback',
      response_type: 'code',
      scope: 'email profile',
    });

    return redirect(`${authUrl}?${params.toString()}`, 302);
  },
});

app.get('/auth/callback', {
  summary: 'OAuth callback',
  query: z.object({
    code: z.string().optional(),
  }),
  handler: ({ query }) => ({
    message: 'OAuth callback received',
    code: query.code,
  }),
});

// ============================================================================
// 7. Conditional Redirects
// ============================================================================

// Redirect based on user role
app.get('/dashboard', {
  summary: 'Dashboard redirect based on role',
  query: z.object({
    role: z.enum(['admin', 'user', 'guest']).optional(),
  }),
  handler: ({ query, redirect }) => {
    const role = query.role || 'guest';

    switch (role) {
      case 'admin':
        return redirect('/admin/dashboard', 302);
      case 'user':
        return redirect('/user/dashboard', 302);
      case 'guest':
      default:
        return redirect('/login', 302);
    }
  },
});

// Version-specific docs redirect
app.get('/docs', {
  summary: 'Documentation (version-aware)',
  query: z.object({
    version: z.string().optional(),
  }),
  handler: ({ query, redirect }) => {
    const version = query.version || 'latest';

    if (version === 'v1') {
      return redirect('/docs/v1', 302);
    }
    if (version === 'v2') {
      return redirect('/docs/v2', 302);
    }

    return redirect('/docs/latest', 302);
  },
});

// ============================================================================
// 8. URL Normalization
// ============================================================================

// Force lowercase URLs (SEO best practice)
app.get('/Products', {
  summary: 'Normalize to lowercase',
  handler: ({ redirect }) => redirect('/products', 301),
});

app.get('/USERS', {
  summary: 'Normalize to lowercase',
  handler: ({ redirect }) => redirect('/users', 301),
});

// Redirect trailing slash
app.get('/api/items/', {
  summary: 'Remove trailing slash',
  handler: ({ redirect }) => redirect('/api/items', 301),
});

// ============================================================================
// 9. Short URLs / Vanity URLs
// ============================================================================

// Short URL redirect to full resource
app.get('/u/:username', {
  summary: 'Short user URL',
  params: z.object({ username: z.string() }),
  handler: ({ params, redirect }) => redirect(`/users/${params.username}`, 301),
});

app.get('/p/:productId', {
  summary: 'Short product URL',
  params: z.object({ productId: z.string() }),
  handler: ({ params, redirect }) => redirect(`/products/${params.productId}`, 301),
});

// ============================================================================
// 10. Maintenance Mode
// ============================================================================

const MAINTENANCE_MODE = false; // Toggle for maintenance

app.get('/app', {
  summary: 'Application (with maintenance check)',
  handler: ({ redirect }) => {
    if (MAINTENANCE_MODE) {
      return redirect('/maintenance.html', 302);
    }

    return { status: 'operational', message: 'App is running normally' };
  },
});

// ============================================================================
// Helper Endpoints (for testing redirects)
// ============================================================================

app.get('/new-page', {
  summary: 'Destination page',
  handler: () => ({ message: 'You have been redirected successfully!' }),
});

app.get('/products', {
  summary: 'Products list',
  handler: () => ({
    products: [
      { id: 1, name: 'Laptop' },
      { id: 2, name: 'Mouse' },
    ],
  }),
});

app.get('/users', {
  summary: 'Users list',
  handler: () => ({
    users: [
      { id: 1, username: 'john' },
      { id: 2, username: 'jane' },
    ],
  }),
});

// ============================================================================
// Start Server
// ============================================================================

const PORT = process.env.PORT || 3000;

await app.listen(PORT);

console.log(`
🚀 HTTP Redirects Example Server Running!

Try these endpoints:

Basic Redirects:
- GET http://localhost:${PORT}/old-page          → 302 to /new-page
- GET http://localhost:${PORT}/legacy/users      → 301 to /api/v2/users

API Versioning:
- GET http://localhost:${PORT}/api/v1/products   → 301 to /api/v2/products

Authentication:
- GET http://localhost:${PORT}/admin             → 302 to /login (no token)
- GET http://localhost:${PORT}/admin?token=valid-token → Welcome message

Form Submission (303):
- POST http://localhost:${PORT}/submit-form
  Body: { "name": "John", "email": "john@example.com" }
  → 303 to /success

External Redirects:
- GET http://localhost:${PORT}/docs/external     → External documentation
- GET http://localhost:${PORT}/auth/google       → Google OAuth

Conditional Redirects:
- GET http://localhost:${PORT}/dashboard?role=admin → /admin/dashboard
- GET http://localhost:${PORT}/docs?version=v2      → /docs/v2

URL Normalization (301):
- GET http://localhost:${PORT}/Products          → /products
- GET http://localhost:${PORT}/USERS             → /users

Short URLs (301):
- GET http://localhost:${PORT}/u/john            → /users/john
- GET http://localhost:${PORT}/p/123             → /products/123

📚 Interactive Docs: http://localhost:${PORT}/docs
`);
