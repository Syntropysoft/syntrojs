/**
 * TOONSerializer Unit Tests
 */

import { describe, expect, it } from 'vitest';
import { TOONSerializer } from '../../src/application/serializers/TOONSerializer';

describe('TOONSerializer', () => {
  const serializer = new TOONSerializer();

  describe('canSerialize', () => {
    it('returns true for plain objects', () => {
      expect(serializer.canSerialize({ foo: 'bar' })).toBe(true);
    });

    it('returns true for arrays', () => {
      expect(serializer.canSerialize([1, 2, 3])).toBe(true);
    });

    it('returns false for null', () => {
      expect(serializer.canSerialize(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(serializer.canSerialize(undefined)).toBe(false);
    });

    it('returns false for primitives', () => {
      expect(serializer.canSerialize('string')).toBe(false);
      expect(serializer.canSerialize(123)).toBe(false);
      expect(serializer.canSerialize(true)).toBe(false);
    });

    it('returns false for special response objects', () => {
      expect(serializer.canSerialize({ statusCode: 200 })).toBe(false);
      expect(serializer.canSerialize({ headers: {} })).toBe(false);
      expect(serializer.canSerialize({ data: 'test' })).toBe(false);
    });
  });

  describe('serialize', () => {
    it('returns TOON response when Accept header requests it', () => {
      const request = new Request('http://localhost/test', {
        headers: { Accept: 'application/toon' },
      });

      const result = { message: 'Hello', id: 123 };
      const response = serializer.serialize(result, 200, request);

      expect(response).not.toBeNull();
      expect(response?.status).toBe(200);
      expect(response?.headers.get('content-type')).toBe('application/toon');
    });

    it('returns null when Accept header does not request TOON', () => {
      const request = new Request('http://localhost/test', {
        headers: { Accept: 'application/json' },
      });

      const result = { message: 'Hello' };
      const response = serializer.serialize(result, 200, request);

      expect(response).toBeNull();
    });

    it('serializes array of objects correctly', async () => {
      const request = new Request('http://localhost/test', {
        headers: { Accept: 'application/toon' },
      });

      const result = {
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
      };

      const response = serializer.serialize(result, 200, request);
      const text = await response?.text();

      expect(text).toContain('users');
      expect(text).toContain('Alice');
      expect(text).toContain('Bob');
    });
  });
});
