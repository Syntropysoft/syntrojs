/**
 * Form-urlencoded Support - Functional Tests
 * 
 * Validates that application/x-www-form-urlencoded is parsed correctly
 * Tests: parsing, validation with Zod, error handling
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { TinyTest } from '../../src/testing/TinyTest';

describe('Form-urlencoded E2E', () => {
  let api: TinyTest;

  beforeEach(() => {
    api = new TinyTest();
  });

  afterEach(async () => {
    await api.close();
  });

  test('should parse simple form data', async () => {
    api.post('/form', {
      handler: async (ctx) => {
        return { received: ctx.body };
      },
    });

    const response = await api.request('POST', '/form', {
      body: 'username=john&email=john@example.com',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    expect(response.status).toBe(200);
    expect((response.data as any).received).toEqual({
      username: 'john',
      email: 'john@example.com',
    });
  });

  test('should validate form data with Zod schema', async () => {
    const bodySchema = z.object({
      username: z.string().min(3),
      email: z.string().email(),
      age: z.coerce.number().positive(),
    });

    api.post('/validate-form', {
      body: bodySchema,
      handler: async (ctx) => {
        return { 
          valid: true,
          data: ctx.body,
        };
      },
    });

    const response = await api.request('POST', '/validate-form', {
      body: 'username=john&email=john@example.com&age=30',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    expect(response.status).toBe(200);
    expect((response.data as any).valid).toBe(true);
    expect((response.data as any).data.username).toBe('john');
    expect((response.data as any).data.email).toBe('john@example.com');
    expect((response.data as any).data.age).toBe(30);
  });

  test('should reject invalid form data', async () => {
    const bodySchema = z.object({
      email: z.string().email(),
    });

    api.post('/strict-form', {
      body: bodySchema,
      handler: async (ctx) => {
        return { data: ctx.body };
      },
    });

    const response = await api.request('POST', '/strict-form', {
      body: 'email=invalid-email',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    expect(response.status).toBe(422);
  });

  test('should handle URL-encoded special characters', async () => {
    api.post('/special-chars', {
      handler: async (ctx) => {
        return { received: ctx.body };
      },
    });

    const response = await api.request('POST', '/special-chars', {
      body: 'message=Hello%20World%21&tag=%23test',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    expect(response.status).toBe(200);
    expect((response.data as any).received.message).toBe('Hello World!');
    expect((response.data as any).received.tag).toBe('#test');
  });

  test('should handle arrays in form data', async () => {
    api.post('/arrays', {
      handler: async (ctx) => {
        return { received: ctx.body };
      },
    });

    const response = await api.request('POST', '/arrays', {
      body: 'tags=javascript&tags=typescript&tags=nodejs',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    expect(response.status).toBe(200);
    // Fastify parses repeated keys as arrays
    const received = (response.data as any).received;
    expect(Array.isArray(received.tags)).toBe(true);
    expect(received.tags).toContain('javascript');
    expect(received.tags).toContain('typescript');
    expect(received.tags).toContain('nodejs');
  });

  test('should handle nested objects (shallow)', async () => {
    // Note: @fastify/formbody does not support nested object parsing with bracket notation
    // It will parse user[name]=john as a flat key 'user[name]' rather than nested object
    // This is by design - Fastify keeps formbody simple and performant
    api.post('/nested', {
      handler: async (ctx) => {
        return { received: ctx.body };
      },
    });

    const response = await api.request('POST', '/nested', {
      body: 'user[name]=john&user[age]=30',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    expect(response.status).toBe(200);
    const received = (response.data as any).received;
    // @fastify/formbody parses this as flat keys, not nested objects
    expect(received['user[name]']).toBe('john');
    expect(received['user[age]']).toBe('30');
  });

  test('should handle empty form body', async () => {
    api.post('/empty-form', {
      handler: async (ctx) => {
        return { hasBody: !!ctx.body };
      },
    });

    const response = await api.request('POST', '/empty-form', {
      body: '',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    expect(response.status).toBe(200);
  });

  test('should coerce numeric strings with Zod', async () => {
    const bodySchema = z.object({
      id: z.coerce.number(),
      quantity: z.coerce.number().int().positive(),
    });

    api.post('/coerce', {
      body: bodySchema,
      handler: async (ctx) => {
        const body = ctx.body as any;
        return { 
          id: body.id,
          quantity: body.quantity,
          types: {
            id: typeof body.id,
            quantity: typeof body.quantity,
          },
        };
      },
    });

    const response = await api.request('POST', '/coerce', {
      body: 'id=123&quantity=5',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    expect(response.status).toBe(200);
    const data = response.data as any;
    expect(data.id).toBe(123);
    expect(data.quantity).toBe(5);
    expect(data.types.id).toBe('number');
    expect(data.types.quantity).toBe('number');
  });
});

