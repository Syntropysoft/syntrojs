/**
 * SerializerRegistry - Response Serializer Management
 *
 * Application Layer Service
 * Manages registration and lookup of response serializers
 * Pattern: Registry Pattern + Strategy Pattern
 * Optimization: O(1) lookup via content-type Map
 */

import type { IResponseSerializer } from '../domain/interfaces';

// ===== PURE FUNCTIONS (Functional Programming) =====

/**
 * Pure Function: Parse Accept header into content types array
 * Principio: Functional Programming + Immutability
 *
 * @param acceptHeader - Accept header value
 * @returns Array of content types (immutable)
 */
const parseAcceptHeader = (acceptHeader: string): readonly string[] => {
  // Guard clause: empty header
  if (!acceptHeader || typeof acceptHeader !== 'string') {
    return [];
  }

  // Functional: map + filter (no mutations)
  return Object.freeze(
    acceptHeader
      .split(',')
      .map((type) => type.split(';')[0].trim()) // Remove quality values
      .filter((type) => type.length > 0),
  );
};

/**
 * Pure Function: Find serializer by exact content type match
 * Principio: Functional Programming + Single Responsibility
 *
 * @param contentTypeMap - Content type to serializer map
 * @param acceptType - Content type to find
 * @param result - Handler result to check
 * @returns Matching serializer or undefined
 */
const findExactMatch = (
  contentTypeMap: Map<string, IResponseSerializer>,
  acceptType: string,
  result: any,
): IResponseSerializer | undefined => {
  const serializer = contentTypeMap.get(acceptType);
  return serializer?.canSerialize(result) ? serializer : undefined;
};

/**
 * Pure Function: Find serializer by wildcard match
 * Principio: Functional Programming + Single Responsibility
 *
 * @param contentTypeMap - Content type to serializer map
 * @param result - Handler result to check
 * @returns First matching serializer or undefined
 */
const findWildcardMatch = (
  contentTypeMap: Map<string, IResponseSerializer>,
  result: any,
): IResponseSerializer | undefined => {
  // Functional: find() instead of loop
  for (const serializer of contentTypeMap.values()) {
    if (serializer.canSerialize(result)) {
      return serializer;
    }
  }
  return undefined;
};

/**
 * Pure Function: Try content-type based serializers
 * Principio: Functional Programming + Composition
 *
 * @param contentTypeMap - Content type to serializer map
 * @param acceptTypes - Array of accepted content types
 * @param result - Handler result
 * @returns Matching serializer or undefined
 */
const tryContentTypeSerializers = (
  contentTypeMap: Map<string, IResponseSerializer>,
  acceptTypes: readonly string[],
  result: any,
): IResponseSerializer | undefined => {
  // Functional: find() with early return
  // Try exact matches first
  for (const acceptType of acceptTypes) {
    const exactMatch = findExactMatch(contentTypeMap, acceptType, result);
    if (exactMatch) {
      return exactMatch;
    }
  }

  // Try wildcard matches
  const hasWildcard = acceptTypes.some((type) => type.includes('*'));
  if (hasWildcard) {
    return findWildcardMatch(contentTypeMap, result);
  }

  return undefined;
};

/**
 * Serializer entry with metadata
 * Pure data structure for serializer registration
 */
interface SerializerEntry {
  serializer: IResponseSerializer;
  name: string;
  priority: number;
  contentTypes?: string[];
}

/**
 * Registry for managing response serializers
 *
 * Responsibilities:
 * - Register/unregister serializers with priorities
 * - Find appropriate serializer for a result (O(1) when possible)
 * - Maintain serializer priority order
 * - Support Chain of Responsibility pattern
 *
 * Performance:
 * - O(1) lookup for content-type based serializers (TOON, JSON, etc)
 * - O(k) fallback for type-based serializers (Buffer, Stream, etc) where k is small
 *
 * Principles Applied:
 * - SOLID: Single Responsibility (serializer management), Open/Closed (extensible)
 * - DDD: Application Service (orchestrates domain interfaces)
 * - Functional: Pure functions for ordering, immutable operations
 * - Guard Clauses: Early validation
 */
export class SerializerRegistry {
  private serializers: Map<string, SerializerEntry> = new Map();
  private orderedSerializers: IResponseSerializer[] = [];

  // O(1) content-type lookup optimization
  private contentTypeMap: Map<string, IResponseSerializer> = new Map();

  // Default priorities (lower number = higher priority)
  private static readonly DEFAULT_PRIORITIES = {
    CustomResponse: 10,
    Redirect: 20,
    FileDownload: 30,
    Stream: 40,
    Buffer: 50,
    TOON: 100,
    Custom: 100,
    Json: 999, // Always last
  } as const;

  /**
   * Register a new serializer
   *
   * Serializers are ordered by priority (lower number = higher priority)
   * JsonSerializer should always be last (priority 999)
   *
   * @param serializer - Serializer to register
   * @param name - Optional name (defaults to constructor name)
   * @param options - Optional registration options
   * @param options.contentTypes - Array of content types this serializer handles (for O(1) lookup)
   * @param options.priority - Priority number (lower = higher priority, default based on name)
   * @returns this (for chaining)
   */
  register(
    serializer: IResponseSerializer,
    name?: string,
    options?: { contentTypes?: string[]; priority?: number },
  ): this {
    // Guard clause: validate serializer
    if (!serializer) {
      throw new Error('Serializer is required');
    }

    if (typeof serializer !== 'object') {
      throw new Error('Serializer must be an object');
    }

    const serializerName = name || serializer.constructor.name;

    // Guard clause: validate name
    if (!serializerName || typeof serializerName !== 'string') {
      throw new Error('Serializer name must be a valid string');
    }

    // Guard clause: Already registered
    if (this.serializers.has(serializerName)) {
      throw new Error(`Serializer "${serializerName}" is already registered`);
    }

    // Determine priority (use provided, or default based on name, or 100)
    const priority =
      options?.priority ??
      SerializerRegistry.DEFAULT_PRIORITIES[
        serializerName as keyof typeof SerializerRegistry.DEFAULT_PRIORITIES
      ] ??
      100;

    // Guard clause: validate priority
    if (!Number.isInteger(priority) || priority < 0) {
      throw new Error('Priority must be a non-negative integer');
    }

    // Create serializer entry (immutable data structure)
    const entry: SerializerEntry = {
      serializer,
      name: serializerName,
      priority,
      contentTypes: options?.contentTypes,
    };

    this.serializers.set(serializerName, entry);

    // O(1) optimization: Map content types to serializers
    if (options?.contentTypes) {
      for (const contentType of options.contentTypes) {
        // Guard clause: validate content type
        if (!contentType || typeof contentType !== 'string') {
          throw new Error('Content type must be a valid string');
        }
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
    // Guard clause: validate name
    if (!name || typeof name !== 'string') {
      throw new Error('Serializer name must be a valid string');
    }

    const entry = this.serializers.get(name);

    // Remove from content type map
    if (entry) {
      for (const [contentType, ser] of this.contentTypeMap.entries()) {
        if (ser === entry.serializer) {
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
    // Guard clause: validate serializer
    if (!serializer) {
      throw new Error('Serializer is required');
    }

    // Guard clause: validate name
    if (!name || typeof name !== 'string') {
      throw new Error('Serializer name must be a valid string');
    }

    // Guard clause: Serializer doesn't exist
    const existingEntry = this.serializers.get(name);
    if (!existingEntry) {
      throw new Error(`Serializer "${name}" not found. Cannot replace.`);
    }

    // Preserve priority and content types from existing entry
    const entry: SerializerEntry = {
      serializer,
      name,
      priority: existingEntry.priority,
      contentTypes: existingEntry.contentTypes,
    };

    // Update content type map if needed
    if (existingEntry.contentTypes) {
      for (const contentType of existingEntry.contentTypes) {
        this.contentTypeMap.set(contentType, serializer);
      }
    }

    this.serializers.set(name, entry);
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
   * Principles Applied:
   * - Functional: Pure functions, composition, immutability
   * - Guard Clauses: Early validation
   * - Single Responsibility: Each step is a pure function
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
        // Pure function: Parse Accept header
        const acceptTypes = parseAcceptHeader(acceptHeader);

        // Pure function: Try content-type serializers
        const contentTypeSerializer = tryContentTypeSerializers(
          this.contentTypeMap,
          acceptTypes,
          result,
        );

        if (contentTypeSerializer) {
          return contentTypeSerializer;
        }
      }
    }

    // Fallback: Functional find() for type-based serializers (ordered by priority)
    return this.orderedSerializers.find((serializer) => serializer.canSerialize(result));
  }

  /**
   * Get all registered serializers
   *
   * @returns Array of serializers in priority order (lowest priority number first)
   */
  getAll(): IResponseSerializer[] {
    return [...this.orderedSerializers];
  }

  /**
   * Get serializer entry by name (for internal use)
   *
   * @param name - Name of serializer
   * @returns Serializer entry or undefined
   */
  getEntry(name: string): SerializerEntry | undefined {
    return this.serializers.get(name);
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
   * Orders serializers by priority (lower number = higher priority)
   * JsonSerializer should always be last (priority 999)
   *
   * Pure function: Creates new array without mutating existing
   */
  private rebuildOrder(): void {
    // Get all entries and sort by priority (functional: immutable sort)
    const entries = Array.from(this.serializers.values());
    const sortedEntries = [...entries].sort((a, b) => a.priority - b.priority);

    // Extract serializers in priority order
    this.orderedSerializers = sortedEntries.map((entry) => entry.serializer);
  }

  /**
   * Register serializer before a target serializer
   *
   * @param targetName - Name of target serializer to insert before
   * @param serializer - Serializer to register
   * @param name - Optional name (defaults to constructor name)
   * @param options - Optional registration options
   * @returns this (for chaining)
   */
  registerBefore(
    targetName: string,
    serializer: IResponseSerializer,
    name?: string,
    options?: { contentTypes?: string[] },
  ): this {
    // Guard clause: validate target exists
    const targetEntry = this.serializers.get(targetName);
    if (!targetEntry) {
      throw new Error(`Target serializer "${targetName}" not found`);
    }

    // Register with priority one less than target (higher priority)
    return this.register(serializer, name, {
      ...options,
      priority: targetEntry.priority - 1,
    });
  }

  /**
   * Register serializer after a target serializer
   *
   * @param targetName - Name of target serializer to insert after
   * @param serializer - Serializer to register
   * @param name - Optional name (defaults to constructor name)
   * @param options - Optional registration options
   * @returns this (for chaining)
   */
  registerAfter(
    targetName: string,
    serializer: IResponseSerializer,
    name?: string,
    options?: { contentTypes?: string[] },
  ): this {
    // Guard clause: validate target exists
    const targetEntry = this.serializers.get(targetName);
    if (!targetEntry) {
      throw new Error(`Target serializer "${targetName}" not found`);
    }

    // Register with priority one more than target (lower priority)
    return this.register(serializer, name, {
      ...options,
      priority: targetEntry.priority + 1,
    });
  }

  /**
   * Register serializer with highest priority (first in chain)
   *
   * @param serializer - Serializer to register
   * @param name - Optional name (defaults to constructor name)
   * @param options - Optional registration options
   * @returns this (for chaining)
   */
  registerFirst(
    serializer: IResponseSerializer,
    name?: string,
    options?: { contentTypes?: string[] },
  ): this {
    // Find highest priority number (lowest priority value)
    const entries = Array.from(this.serializers.values());
    const highestPriorityNumber =
      entries.length > 0 ? Math.min(...entries.map((e) => e.priority)) : 0;

    // Register with priority one less than highest (ensures it's first)
    // Use 0 if no serializers exist, or highestPriorityNumber - 1
    const firstPriority = entries.length > 0 ? highestPriorityNumber - 1 : 0;

    return this.register(serializer, name, {
      ...options,
      priority: firstPriority,
    });
  }
}
