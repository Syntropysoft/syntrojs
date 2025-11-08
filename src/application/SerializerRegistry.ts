/**
 * SerializerRegistry - Response Serializer Management
 *
 * Application Layer Service
 * Manages registration and lookup of response serializers
 * Pattern: Registry Pattern + Strategy Pattern
 * Optimization: O(1) lookup via content-type Map
 */

import type { IResponseSerializer } from '../domain/interfaces';

/**
 * Registry for managing response serializers
 *
 * Responsibilities:
 * - Register/unregister serializers
 * - Find appropriate serializer for a result (O(1) when possible)
 * - Maintain serializer priority order
 *
 * Performance:
 * - O(1) lookup for content-type based serializers (TOON, JSON, etc)
 * - O(k) fallback for type-based serializers (Buffer, Stream, etc) where k is small
 */
export class SerializerRegistry {
  private serializers: Map<string, IResponseSerializer> = new Map();
  private orderedSerializers: IResponseSerializer[] = [];

  // O(1) content-type lookup optimization
  private contentTypeMap: Map<string, IResponseSerializer> = new Map();

  /**
   * Register a new serializer
   *
   * Serializers are inserted BEFORE JsonSerializer (which should always be last)
   * This ensures custom serializers have priority over the default JSON fallback
   *
   * @param serializer - Serializer to register
   * @param name - Optional name (defaults to constructor name)
   * @param contentTypes - Optional array of content types this serializer handles (for O(1) lookup)
   * @returns this (for chaining)
   */
  register(serializer: IResponseSerializer, name?: string, contentTypes?: string[]): this {
    const serializerName = name || serializer.constructor.name;

    // Guard clause: Already registered
    if (this.serializers.has(serializerName)) {
      throw new Error(`Serializer "${serializerName}" is already registered`);
    }

    this.serializers.set(serializerName, serializer);

    // O(1) optimization: Map content types to serializers
    if (contentTypes) {
      for (const contentType of contentTypes) {
        this.contentTypeMap.set(contentType, serializer);
      }
    }

    this.rebuildOrder();

    return this;
  }

  /**
   * Unregister a serializer by name
   *
   * @param name - Name of serializer to remove
   * @returns this (for chaining)
   */
  unregister(name: string): this {
    const serializer = this.serializers.get(name);

    // Remove from content type map
    if (serializer) {
      for (const [contentType, ser] of this.contentTypeMap.entries()) {
        if (ser === serializer) {
          this.contentTypeMap.delete(contentType);
        }
      }
    }

    this.serializers.delete(name);
    this.rebuildOrder();
    return this;
  }

  /**
   * Replace an existing serializer
   *
   * @param name - Name of serializer to replace
   * @param serializer - New serializer
   * @returns this (for chaining)
   */
  replace(name: string, serializer: IResponseSerializer): this {
    // Guard clause: Serializer doesn't exist
    if (!this.serializers.has(name)) {
      throw new Error(`Serializer "${name}" not found. Cannot replace.`);
    }

    this.serializers.set(name, serializer);
    this.rebuildOrder();

    return this;
  }

  /**
   * Find appropriate serializer for a result
   *
   * Performance optimized:
   * - O(1) lookup for content-type based serializers (via Accept header)
   * - O(k) fallback for type-based serializers where k is small
   *
   * @param result - Handler result to serialize
   * @param request - Optional HTTP Request (for content negotiation optimization)
   * @returns Serializer or undefined if none found
   */
  findSerializer(result: any, request?: Request): IResponseSerializer | undefined {
    // Guard clause: null/undefined result
    if (result === null || result === undefined) {
      return undefined;
    }

    // O(1) optimization: Check Accept header first for content-type serializers
    if (request) {
      const acceptHeader = request.headers.get('accept');
      if (acceptHeader) {
        // Parse Accept header to get content types in priority order
        // Format: "application/toon, application/json;q=0.9" or "application/toon, application/json"
        const acceptedTypes = acceptHeader
          .split(',')
          .map((type) => type.split(';')[0].trim()) // Remove quality values
          .filter((type) => type.length > 0);

        // Try exact match first (in priority order - first wins)
        for (const acceptType of acceptedTypes) {
          const exactMatch = this.contentTypeMap.get(acceptType);
          if (exactMatch?.canSerialize(result)) {
            return exactMatch;
          }
        }

        // Try partial match for wildcards
        for (const acceptType of acceptedTypes) {
          if (acceptType.includes('*')) {
            for (const [contentType, serializer] of this.contentTypeMap.entries()) {
              if (serializer.canSerialize(result)) {
                return serializer;
              }
            }
          }
        }
      }
    }

    // Fallback: O(k) iteration through type-based serializers
    return this.orderedSerializers.find((serializer) => serializer.canSerialize(result));
  }

  /**
   * Get all registered serializers
   *
   * @returns Array of serializers in registration order
   */
  getAll(): IResponseSerializer[] {
    return [...this.orderedSerializers];
  }

  /**
   * Check if a serializer is registered
   *
   * @param name - Name of serializer
   * @returns True if registered
   */
  has(name: string): boolean {
    return this.serializers.has(name);
  }

  /**
   * Clear all serializers
   *
   * @returns this (for chaining)
   */
  clear(): this {
    this.serializers.clear();
    this.orderedSerializers = [];
    this.contentTypeMap.clear();
    return this;
  }

  /**
   * Rebuild ordered serializers array
   *
   * IMPORTANT: JsonSerializer must always be LAST (fallback)
   * Custom serializers should be checked before JSON
   */
  private rebuildOrder(): void {
    const serializers = Array.from(this.serializers.values());

    // Find JsonSerializer and move it to the end
    const jsonIndex = serializers.findIndex((s) => s.constructor.name === 'JsonSerializer');

    if (jsonIndex !== -1) {
      const jsonSerializer = serializers[jsonIndex];
      serializers.splice(jsonIndex, 1);
      serializers.push(jsonSerializer);
    }

    this.orderedSerializers = serializers;
  }
}
