/**
 * HTTP Redirects E2E Tests
 *
 * Testing Strategy:
 * - E2E: Full integration from handler → adapter → HTTP response
 * - TinyTest: Server lifecycle managed automatically
 * - Test all redirect codes: 301, 302, 303, 307, 308
 * - Verify Location headers and status codes
 * - Test relative and absolute URLs
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { z } from 'zod';
import { inject } from '../../src/application/DependencyInjector';
import { createRedirect } from '../../src/infrastructure/RedirectHelper';
import { TinyTest } from '../../src/testing/TinyTest';

describe('HTTP Redirects E2E - Complete Flow', () => {
  let api: TinyTest;

  beforeEach(() => {
    api = new TinyTest();
  });

  afterEach(async () => {
    await api.close();
  });

  describe('API Level 1: Explicit createRedirect()', () => {
    test('redirects with 301 Moved Permanently', async () => {
      // Setup: Route with permanent redirect
      api.get('/old-page', {
        handler: () => createRedirect('/new-page', 301),
      });

      // Execute: Make request (don't follow redirects to test them)
      const response = await api.rawRequest('GET', '/old-page', {}, false);

      // Assert: Verify redirect response
      expect(response.status).toBe(301);
      expect(response.headers.get('location')).toBe('/new-page');
    });

    test('redirects with 302 Found (default)', async () => {
      api.get('/temp-redirect', {
        handler: () => createRedirect('/temp-page'),
      });

      const response = await api.rawRequest('GET', '/temp-redirect', {}, false);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('/temp-page');
    });

    test('redirects with 303 See Other (POST → GET)', async () => {
      api.post('/submit', {
        handler: () => createRedirect('/success', 303),
      });

      const response = await api.rawRequest('POST', '/submit', { body: {} }, false);

      expect(response.status).toBe(303);
      expect(response.headers.get('location')).toBe('/success');
    });

    test('redirects with 307 Temporary (preserves method)', async () => {
      api.post('/api/v1/resource', {
        handler: () => createRedirect('/api/v2/resource', 307),
      });

      const response = await api.rawRequest('POST', '/api/v1/resource', { body: {} }, false);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('/api/v2/resource');
    });

    test('redirects with 308 Permanent (preserves method)', async () => {
      api.put('/api/v1/users', {
        handler: () => createRedirect('/api/v2/users', 308),
      });

      const response = await api.rawRequest('PUT', '/api/v1/users', { body: {} }, false);

      expect(response.status).toBe(308);
      expect(response.headers.get('location')).toBe('/api/v2/users');
    });

    test('redirects to external URL', async () => {
      api.get('/external', {
        handler: () => createRedirect('https://example.com', 302),
      });

      const response = await api.rawRequest('GET', '/external', {}, false);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('https://example.com');
    });
  });

  describe('API Level 2: Context Helper ctx.redirect()', () => {
    test('uses ctx.redirect() helper for ergonomic API', async () => {
      api.get('/simple-redirect', {
        handler: ({ redirect }) => redirect('/target', 301),
      });

      const response = await api.rawRequest('GET', '/simple-redirect', {}, false);

      expect(response.status).toBe(301);
      expect(response.headers.get('location')).toBe('/target');
    });

    test('ctx.redirect() with default 302', async () => {
      api.get('/default-redirect', {
        handler: ({ redirect }) => redirect('/destination'),
      });

      const response = await api.rawRequest('GET', '/default-redirect', {}, false);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('/destination');
    });

    test('ctx.redirect() with query parameters', async () => {
      api.get('/redirect-with-query', {
        handler: ({ redirect }) => redirect('/search?q=test&page=2', 301),
      });

      const response = await api.rawRequest('GET', '/redirect-with-query', {}, false);

      expect(response.headers.get('location')).toBe('/search?q=test&page=2');
    });
  });

  describe('Dynamic Redirects Based on Conditions', () => {
    test('redirects based on authentication status', async () => {
      api.get('/admin', {
        handler: ({ query, redirect }) => {
          const isAuthenticated = query.token === 'valid';

          if (!isAuthenticated) {
            return redirect('/login', 302);
          }

          return { message: 'Welcome admin' };
        },
      });

      // Without auth
      const unauthed = await api.rawRequest('GET', '/admin', {}, false);
      expect(unauthed.status).toBe(302);
      expect(unauthed.headers.get('location')).toBe('/login');

      // With auth
      const authed = await api.expectSuccess('GET', '/admin?token=valid');
      expect(authed.data.message).toBe('Welcome admin');
    });

    test('redirects based on user role', async () => {
      api.get('/dashboard', {
        query: z.object({
          role: z.enum(['admin', 'user']).optional(),
        }),
        handler: ({ query, redirect }) => {
          if (query.role === 'admin') {
            return redirect('/admin/dashboard', 302);
          }

          return redirect('/user/dashboard', 302);
        },
      });

      const admin = await api.rawRequest('GET', '/dashboard?role=admin', {}, false);
      expect(admin.headers.get('location')).toBe('/admin/dashboard');

      const user = await api.rawRequest('GET', '/dashboard?role=user', {}, false);
      expect(user.headers.get('location')).toBe('/user/dashboard');
    });

    test('redirects based on path parameters', async () => {
      api.get('/users/:username', {
        params: z.object({ username: z.string() }),
        handler: ({ params, redirect }) => {
          // Redirect short username to full profile
          return redirect(`/profile/${params.username}`, 301);
        },
      });

      const response = await api.rawRequest('GET', '/users/johndoe', {}, false);

      expect(response.status).toBe(301);
      expect(response.headers.get('location')).toBe('/profile/johndoe');
    });
  });

  describe('Real-World Scenarios', () => {
    test('API versioning - redirect old to new', async () => {
      // Old API version
      api.get('/api/v1/users', {
        handler: ({ redirect }) => redirect('/api/v2/users', 301),
      });

      // New API version (actual endpoint)
      api.get('/api/v2/users', {
        handler: () => ({ users: [{ id: 1, name: 'John' }] }),
      });

      const oldApi = await api.rawRequest('GET', '/api/v1/users', {}, false);
      expect(oldApi.status).toBe(301);
      expect(oldApi.headers.get('location')).toBe('/api/v2/users');

      const newApi = await api.expectSuccess('GET', '/api/v2/users');
      expect(newApi.data.users).toHaveLength(1);
    });

    test('POST form submission → redirect to success page (303)', async () => {
      api.post('/users', {
        body: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
        handler: ({ body, redirect }) => {
          // Save user (simulated)
          const userId = 123;

          // Redirect to user profile with GET (303 changes method)
          return redirect(`/users/${userId}`, 303);
        },
      });

      const response = await api.rawRequest(
        'POST',
        '/users',
        {
          body: JSON.stringify({ name: 'John', email: 'john@example.com' }),
          headers: { 'Content-Type': 'application/json' },
        },
        false,
      );

      expect(response.status).toBe(303);
      expect(response.headers.get('location')).toBe('/users/123');
    });

    test('URL normalization - uppercase to lowercase', async () => {
      api.get('/Products', {
        handler: ({ redirect }) => redirect('/products', 301),
      });

      const response = await api.rawRequest('GET', '/Products', {}, false);

      expect(response.status).toBe(301);
      expect(response.headers.get('location')).toBe('/products');
    });

    test('OAuth flow - redirect to provider', async () => {
      api.get('/auth/google', {
        handler: ({ redirect }) => {
          const authUrl = 'https://accounts.google.com/oauth/authorize';
          const params = '?client_id=123&redirect_uri=http://localhost/callback';
          return redirect(authUrl + params, 302);
        },
      });

      const response = await api.rawRequest('GET', '/auth/google', {}, false);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('accounts.google.com');
      expect(response.headers.get('location')).toContain('client_id=123');
    });

    test('Maintenance mode - temporary redirect', async () => {
      api.get('/app', {
        query: z.object({ maintenance: z.string().optional() }),
        handler: ({ query, redirect }) => {
          const isMaintenanceMode = query.maintenance === 'true';

          if (isMaintenanceMode) {
            return redirect('/maintenance.html', 302);
          }

          return { status: 'operational' };
        },
      });

      const maintenance = await api.rawRequest('GET', '/app?maintenance=true', {}, false);
      expect(maintenance.status).toBe(302);
      expect(maintenance.headers.get('location')).toBe('/maintenance.html');

      const normal = await api.expectSuccess('GET', '/app');
      expect(normal.data.status).toBe('operational');
    });
  });

  describe('Edge Cases', () => {
    test('redirect has no body', async () => {
      api.get('/no-body', {
        handler: ({ redirect }) => redirect('/target', 301),
      });

      const response = await api.rawRequest('GET', '/no-body', {}, false);

      const body = await response.text();
      expect(body).toBe('');
    });

    test('redirect with very long URL', async () => {
      const longPath = `/path${'/segment'.repeat(50)}`;
      api.get('/long-redirect', {
        handler: ({ redirect }) => redirect(longPath, 301),
      });

      const response = await api.rawRequest('GET', '/long-redirect', {}, false);

      expect(response.status).toBe(301);
      expect(response.headers.get('location')).toBe(longPath);
    });

    test('redirect with unicode in URL', async () => {
      api.get('/unicode', {
        handler: ({ redirect }) => redirect('/usuarios/josé', 301),
      });

      const response = await api.rawRequest('GET', '/unicode', {}, false);

      expect(response.headers.get('location')).toBe('/usuarios/josé');
    });

    test('redirect with encoded characters', async () => {
      const encodedUrl = '/search?q=%E4%BD%A0%E5%A5%BD';
      api.get('/encoded', {
        handler: ({ redirect }) => redirect(encodedUrl, 301),
      });

      const response = await api.rawRequest('GET', '/encoded', {}, false);

      expect(response.headers.get('location')).toBe(encodedUrl);
    });

    test('redirect preserves trailing slash', async () => {
      api.get('/with-slash', {
        handler: ({ redirect }) => redirect('/new-path/', 301),
      });

      const response = await api.rawRequest('GET', '/with-slash', {}, false);

      expect(response.headers.get('location')).toBe('/new-path/');
    });
  });

  describe('Multiple Redirects (Chaining)', () => {
    test('can chain multiple redirects', async () => {
      // First redirect
      api.get('/step1', {
        handler: ({ redirect }) => redirect('/step2', 302),
      });

      // Second redirect
      api.get('/step2', {
        handler: ({ redirect }) => redirect('/step3', 302),
      });

      // Final destination
      api.get('/step3', {
        handler: () => ({ message: 'Final destination' }),
      });

      // First hop
      const hop1 = await api.rawRequest('GET', '/step1', {}, false);
      expect(hop1.status).toBe(302);
      expect(hop1.headers.get('location')).toBe('/step2');

      // Second hop
      const hop2 = await api.rawRequest('GET', '/step2', {}, false);
      expect(hop2.status).toBe(302);
      expect(hop2.headers.get('location')).toBe('/step3');

      // Final
      const final = await api.expectSuccess('GET', '/step3');
      expect(final.data.message).toBe('Final destination');
    });
  });

  describe('Conditional Redirects', () => {
    test('redirects based on query parameter', async () => {
      api.get('/docs', {
        query: z.object({
          version: z.string().optional(),
        }),
        handler: ({ query, redirect }) => {
          if (query.version === '5') {
            return redirect('/docs/v5', 302);
          }
          if (query.version === '6') {
            return redirect('/docs/v6', 302);
          }

          return redirect('/docs/latest', 302);
        },
      });

      const v5 = await api.rawRequest('GET', '/docs?version=5', {}, false);
      expect(v5.headers.get('location')).toBe('/docs/v5');

      const v6 = await api.rawRequest('GET', '/docs?version=6', {}, false);
      expect(v6.headers.get('location')).toBe('/docs/v6');

      const latest = await api.rawRequest('GET', '/docs', {}, false);
      expect(latest.headers.get('location')).toBe('/docs/latest');
    });

    test('redirects after validation', async () => {
      api.post('/login', {
        body: z.object({
          username: z.string(),
          password: z.string(),
        }),
        handler: ({ body, redirect }) => {
          // Simulate authentication
          const isValid = body.username === 'admin' && body.password === 'secret';

          if (isValid) {
            return redirect('/dashboard', 303);
          }

          // Return error instead of redirect
          return { error: 'Invalid credentials' };
        },
      });

      // Valid credentials
      const valid = await api.rawRequest(
        'POST',
        '/login',
        {
          body: JSON.stringify({ username: 'admin', password: 'secret' }),
          headers: { 'Content-Type': 'application/json' },
        },
        false,
      );
      expect(valid.status).toBe(303);
      expect(valid.headers.get('location')).toBe('/dashboard');

      // Invalid credentials
      const invalid = await api.expectSuccess('POST', '/login', {
        body: { username: 'wrong', password: 'wrong' },
      });
      expect(invalid.data.error).toBe('Invalid credentials');
    });
  });

  describe('Redirect vs Normal Response', () => {
    test('can choose between redirect and normal response', async () => {
      api.get('/flexible', {
        query: z.object({
          redirect: z.string().optional(),
        }),
        handler: ({ query, redirect }) => {
          if (query.redirect === 'yes') {
            return redirect('/other-page', 302);
          }

          return { message: 'Normal response' };
        },
      });

      // With redirect
      const redirected = await api.rawRequest('GET', '/flexible?redirect=yes', {}, false);
      expect(redirected.status).toBe(302);

      // Without redirect
      const normal = await api.expectSuccess('GET', '/flexible');
      expect(normal.data.message).toBe('Normal response');
    });
  });

  describe('Integration with Other Features', () => {
    test('redirect after background task', async () => {
      let taskExecuted = false;

      api.post('/process-and-redirect', {
        handler: ({ background, redirect }) => {
          // Add background task
          background.addTask(() => {
            taskExecuted = true;
          });

          // Redirect immediately (don't wait for task)
          return redirect('/processing', 303);
        },
      });

      const response = await api.rawRequest('POST', '/process-and-redirect', { body: {} }, false);

      expect(response.status).toBe(303);
      expect(response.headers.get('location')).toBe('/processing');

      // Wait a bit for background task
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(taskExecuted).toBe(true);
    });

    test('redirect with dependency injection', async () => {
      // Define dependency
      const userService = {
        getRedirectUrl: (userId: string) => `/users/${userId}/profile`,
      };

      api.get('/go-to-profile/:id', {
        params: z.object({ id: z.string() }),
        dependencies: {
          userService: inject(() => userService),
        },
        handler: ({ params, dependencies, redirect }) => {
          const url = dependencies.userService.getRedirectUrl(params.id);
          return redirect(url, 301);
        },
      });

      const response = await api.rawRequest('GET', '/go-to-profile/123', {}, false);

      expect(response.status).toBe(301);
      expect(response.headers.get('location')).toBe('/users/123/profile');
    });
  });

  describe('HTTP Semantics - Method Preservation', () => {
    test('301 and 302 may change method to GET', async () => {
      // Note: Browsers historically change POST to GET with 301/302
      // 303 is explicit about this behavior
      api.post('/old-form', {
        handler: ({ redirect }) => redirect('/new-form', 302),
      });

      const response = await api.rawRequest('POST', '/old-form', { body: {} }, false);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('/new-form');
    });

    test('307 and 308 preserve HTTP method', async () => {
      // POST should remain POST with 307/308
      api.post('/api/v1/submit', {
        handler: ({ redirect }) => redirect('/api/v2/submit', 307),
      });

      const response = await api.rawRequest('POST', '/api/v1/submit', { body: {} }, false);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('/api/v2/submit');
    });
  });

  describe('Security Validation', () => {
    test('accepts valid https:// URLs', async () => {
      api.get('/safe-external', {
        handler: ({ redirect }) => redirect('https://safe-site.com', 302),
      });

      const response = await api.rawRequest('GET', '/safe-external', {}, false);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('https://safe-site.com');
    });

    test('accepts valid http:// URLs', async () => {
      api.get('/local-redirect', {
        handler: ({ redirect }) => redirect('http://localhost:3000/test', 302),
      });

      const response = await api.rawRequest('GET', '/local-redirect', {}, false);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('http://localhost:3000/test');
    });

    test('accepts relative paths', async () => {
      api.get('/relative', {
        handler: ({ redirect }) => redirect('/safe/path', 302),
      });

      const response = await api.rawRequest('GET', '/relative', {}, false);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('/safe/path');
    });

    // Note: Dangerous URLs are validated in RedirectHelper.test.ts (unit tests)
    // Here we just verify they're rejected at E2E level
    test('handler throws on dangerous URL', async () => {
      api.get('/dangerous', {
        handler: ({ redirect }) => {
          // This should throw BadRequestException
          return redirect('javascript:alert(1)');
        },
      });

      const response = await api.rawRequest('GET', '/dangerous', {}, false);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.detail).toContain('Invalid redirect URL format');
    });
  });

  describe('Response Structure', () => {
    test('redirect response has correct structure', async () => {
      api.get('/check-structure', {
        handler: ({ redirect }) => redirect('/target', 301),
      });

      const response = await api.rawRequest('GET', '/check-structure', {}, false);

      // Should have Location header
      expect(response.headers.has('location')).toBe(true);

      // Should have no body (or empty body)
      const body = await response.text();
      expect(body).toBe('');

      // Should have redirect status
      expect(response.status).toBe(301);
    });

    test('redirect works with all HTTP methods', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;

      // Register all routes before testing
      for (const method of methods) {
        api[method.toLowerCase() as 'get'](`/redirect-${method.toLowerCase()}`, {
          handler: ({ redirect }) => redirect('/target', 302),
        });
      }

      // Test each method
      for (const method of methods) {
        // POST, PUT, PATCH need a body (even if empty)
        const options = ['POST', 'PUT', 'PATCH'].includes(method) ? { body: {} } : {};
        const response = await api.rawRequest(
          method,
          `/redirect-${method.toLowerCase()}`,
          options,
          false,
        );

        expect(response.status).toBe(302);
        expect(response.headers.get('location')).toBe('/target');
      }
    });
  });

  describe('Performance & Efficiency', () => {
    test('redirect is fast (no body processing)', async () => {
      api.get('/fast-redirect', {
        handler: ({ redirect }) => redirect('/destination', 302),
      });

      const start = performance.now();
      await api.rawRequest('GET', '/fast-redirect', {}, false);
      const duration = performance.now() - start;

      // Redirect should be very fast (< 50ms in tests)
      expect(duration).toBeLessThan(50);
    });

    test('multiple redirects have consistent performance', async () => {
      api.get('/perf-test', {
        handler: ({ redirect }) => redirect('/target', 302),
      });

      const durations: number[] = [];

      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await api.rawRequest('GET', '/perf-test', {}, false);
        durations.push(performance.now() - start);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

      // Average should be fast
      expect(avgDuration).toBeLessThan(50);
    });
  });
});
