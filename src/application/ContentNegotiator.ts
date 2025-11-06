/**
 * ContentNegotiator - Application Service
 *
 * Responsibility: Parse Accept headers and negotiate content type
 * Pattern: Functional + Strategy
 * Principles: SOLID (Single Responsibility), Guard Clauses, Pure Functions
 *
 * RFC 7231 - HTTP/1.1 Semantics and Content (Section 5.3)
 * https://datatracker.ietf.org/doc/html/rfc7231#section-5.3
 */

/**
 * Supported MIME types for content negotiation
 */
export type SupportedMimeType =
  | 'application/json'
  | 'text/html'
  | 'application/xml'
  | 'text/plain'
  | 'application/toon';

/**
 * Media type with quality factor
 */
interface MediaType {
  type: string;
  subtype: string;
  quality: number;
  fullType: string;
}

/**
 * Content negotiation result
 */
export interface NegotiationResult {
  /** Selected MIME type */
  mimeType: SupportedMimeType;
  /** Quality factor (0-1) */
  quality: number;
  /** Whether negotiation was successful */
  acceptable: boolean;
}

/**
 * Parse Accept header and negotiate best content type
 * Pure function: No side effects, deterministic
 *
 * Algorithm (RFC 7231):
 * 1. Parse Accept header into media types with quality factors
 * 2. Sort by quality (q parameter, defaults to 1.0)
 * 3. Match against supported types
 * 4. Return best match or default
 *
 * @param acceptHeader - HTTP Accept header value
 * @param supportedTypes - Array of MIME types the server can produce
 * @param defaultType - Fallback type if no match (defaults to application/json)
 * @returns Negotiation result with selected type
 *
 * @example
 * ```typescript
 * // Client accepts JSON
 * negotiateContentType('application/json', ['application/json', 'text/html'])
 * // → { mimeType: 'application/json', quality: 1.0, acceptable: true }
 *
 * // Client prefers HTML, fallback to JSON
 * negotiateContentType('text/html;q=0.9, application/json;q=0.8', [...])
 * // → { mimeType: 'text/html', quality: 0.9, acceptable: true }
 *
 * // Client accepts anything
 * negotiateContentType('*\/*', [...])
 * // → { mimeType: 'application/json', quality: 1.0, acceptable: true }
 * ```
 */
export function negotiateContentType(
  acceptHeader: string | undefined,
  supportedTypes: SupportedMimeType[],
  defaultType: SupportedMimeType = 'application/json',
): NegotiationResult {
  // Guard clause 1: supportedTypes is required
  if (!supportedTypes || supportedTypes.length === 0) {
    return {
      mimeType: defaultType,
      quality: 1.0,
      acceptable: true,
    };
  }

  // Guard clause 2: no Accept header = use default
  if (!acceptHeader || acceptHeader.trim().length === 0) {
    return {
      mimeType: defaultType,
      quality: 1.0,
      acceptable: true,
    };
  }

  // Functional: Parse Accept header into media types
  const mediaTypes = parseAcceptHeader(acceptHeader);

  // Guard clause 3: parsing failed = use default
  if (mediaTypes.length === 0) {
    return {
      mimeType: defaultType,
      quality: 1.0,
      acceptable: true,
    };
  }

  // Functional: Find best match
  const bestMatch = findBestMatch(mediaTypes, supportedTypes);

  // Guard clause 4: no acceptable match
  if (!bestMatch) {
    return {
      mimeType: defaultType,
      quality: 0,
      acceptable: false,
    };
  }

  // Return result (immutable)
  return {
    mimeType: bestMatch.type as SupportedMimeType,
    quality: bestMatch.quality,
    acceptable: true,
  };
}

/**
 * Parse Accept header into media types with quality factors
 * Pure function: Transforms string to structured data
 *
 * Format: type/subtype;q=0.8, type2/subtype2;q=0.9
 *
 * @param acceptHeader - Raw Accept header
 * @returns Array of parsed media types (sorted by quality, descending)
 */
function parseAcceptHeader(acceptHeader: string): MediaType[] {
  // Guard clause: require header
  if (!acceptHeader) {
    return [];
  }

  try {
    // Functional: Split by comma, map to MediaType objects
    const types = acceptHeader
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .map(parseMediaType)
      .filter((type): type is MediaType => type !== null)
      .sort((a, b) => b.quality - a.quality); // Sort by quality (descending)

    return types;
  } catch {
    // Guard clause: parsing error = empty array
    return [];
  }
}

/**
 * Parse single media type with quality factor
 * Pure function: Transforms media type string to object
 *
 * Examples:
 * - "application/json" → { type: 'application', subtype: 'json', quality: 1.0 }
 * - "text/html;q=0.9" → { type: 'text', subtype: 'html', quality: 0.9 }
 * - "*\/*" → { type: '*', subtype: '*', quality: 1.0 }
 *
 * @param mediaTypeString - Media type with optional quality
 * @returns Parsed media type or null if invalid
 */
function parseMediaType(mediaTypeString: string): MediaType | null {
  // Guard clause: require string
  if (!mediaTypeString || mediaTypeString.trim().length === 0) {
    return null;
  }

  // Split by semicolon (type/subtype;q=0.9)
  const parts = mediaTypeString.split(';').map((p) => p.trim());
  const typePart = parts[0];

  // Guard clause: type part required
  if (!typePart) {
    return null;
  }

  // Parse type/subtype
  const [type, subtype] = typePart.split('/').map((p) => p.trim());

  // Guard clause: both type and subtype required
  if (!type || !subtype) {
    return null;
  }

  // Parse quality factor (q parameter)
  let quality = 1.0; // Default quality

  // Functional: Find q parameter
  const qParam = parts.find((p) => p.startsWith('q='));
  if (qParam) {
    const qValue = parseFloat(qParam.substring(2));
    // Guard clause: validate quality range [0, 1]
    if (!Number.isNaN(qValue) && qValue >= 0 && qValue <= 1) {
      quality = qValue;
    }
  }

  // Return immutable object
  return {
    type,
    subtype,
    quality,
    fullType: `${type}/${subtype}`,
  };
}

/**
 * Find best matching media type from supported types
 * Pure function: Matches client preferences against server capabilities
 *
 * Algorithm:
 * 1. Check for exact matches (application/json)
 * 2. Check for wildcard subtypes (application/*)
 * 3. Check for full wildcard (*\/*)
 * 4. Return highest quality match
 *
 * @param mediaTypes - Parsed media types from Accept header (sorted by quality)
 * @param supportedTypes - Server's supported MIME types
 * @returns Best matching media type or null
 */
function findBestMatch(
  mediaTypes: MediaType[],
  supportedTypes: SupportedMimeType[],
): { type: string; quality: number } | null {
  // Guard clause: require inputs
  if (!mediaTypes || mediaTypes.length === 0 || !supportedTypes || supportedTypes.length === 0) {
    return null;
  }

  // Functional: Iterate through media types (already sorted by quality)
  for (const mediaType of mediaTypes) {
    // Check for full wildcard (*/*) - accepts anything
    if (mediaType.type === '*' && mediaType.subtype === '*') {
      // Return first supported type with this quality
      return {
        type: supportedTypes[0],
        quality: mediaType.quality,
      };
    }

    // Check for subtype wildcard (application/*)
    if (mediaType.subtype === '*') {
      // Find first supported type that matches main type
      const match = supportedTypes.find((supported) => {
        const [supportedType] = supported.split('/');
        return supportedType === mediaType.type;
      });

      if (match) {
        return {
          type: match,
          quality: mediaType.quality,
        };
      }
    }

    // Check for exact match
    const exactMatch = supportedTypes.find((supported) => supported === mediaType.fullType);

    if (exactMatch) {
      return {
        type: exactMatch,
        quality: mediaType.quality,
      };
    }
  }

  // No match found
  return null;
}

/**
 * Simple content negotiation helper for route handlers
 * Provides ergonomic API for checking accepted types
 *
 * @example
 * ```typescript
 * app.get('/users', {
 *   handler: ({ accepts }) => {
 *     if (accepts.json()) {
 *       return { users: [...] };
 *     }
 *     if (accepts.html()) {
 *       return '<html>...</html>';
 *     }
 *     throw new HTTPException(406, 'Not Acceptable');
 *   }
 * });
 * ```
 */
export class AcceptsHelper {
  constructor(private readonly acceptHeader: string | undefined) {}

  /**
   * Check if client accepts JSON
   * Pure function: No side effects
   */
  json(): boolean {
    return this.type(['application/json']) === 'application/json';
  }

  /**
   * Check if client accepts HTML
   * Pure function: No side effects
   */
  html(): boolean {
    return this.type(['text/html']) === 'text/html';
  }

  /**
   * Check if client accepts XML
   * Pure function: No side effects
   */
  xml(): boolean {
    return this.type(['application/xml']) === 'application/xml';
  }

  /**
   * Check if client accepts plain text
   * Pure function: No side effects
   */
  text(): boolean {
    return this.type(['text/plain']) === 'text/plain';
  }

  /**
   * Check if client accepts TOON format (v0.5.0)
   * Pure function: No side effects
   */
  toon(): boolean {
    return this.type(['application/toon']) === 'application/toon';
  }

  /**
   * Negotiate best type from provided list
   * Pure function: Delegates to negotiateContentType
   *
   * @param types - Array of MIME types to check
   * @returns Best matching type or false if none match
   *
   * @example
   * ```typescript
   * const format = accepts.type(['json', 'html', 'xml']);
   * switch(format) {
   *   case 'json': return { data: '...' };
   *   case 'html': return '<html>...</html>';
   *   case 'xml': return '<xml>...</xml>';
   *   default: throw new HTTPException(406);
   * }
   * ```
   */
  type(types: string[]): string | false {
    // Guard clause: require types
    if (!types || types.length === 0) {
      return false;
    }

    // Normalize types (add application/ prefix if needed)
    const normalizedTypes = types.map(normalizeType);

    // Negotiate
    const result = negotiateContentType(this.acceptHeader, normalizedTypes as SupportedMimeType[]);

    // Return type or false if not acceptable
    return result.acceptable ? result.mimeType : false;
  }
}

/**
 * Normalize type strings (convenience)
 * Pure function: Adds application/ prefix if missing
 *
 * @param type - Type string (e.g., 'json', 'application/json')
 * @returns Full MIME type
 */
function normalizeType(type: string): string {
  // Guard clause
  if (!type) {
    return 'application/octet-stream';
  }

  // Already full MIME type
  if (type.includes('/')) {
    return type;
  }

  // Shorthand mappings
  const shorthands: Record<string, string> = {
    json: 'application/json',
    html: 'text/html',
    xml: 'application/xml',
    text: 'text/plain',
    toon: 'application/toon',
  };

  return shorthands[type] || `application/${type}`;
}

/**
 * Create AcceptsHelper from Accept header
 * Factory function: Pure function
 *
 * @param acceptHeader - HTTP Accept header value
 * @returns AcceptsHelper instance
 */
export function createAcceptsHelper(acceptHeader: string | undefined): AcceptsHelper {
  return new AcceptsHelper(acceptHeader);
}
