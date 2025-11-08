/**
 * TOONSerializer - TOON Response Serializer
 *
 * Application Layer Service (Strategy Pattern)
 * Handles serialization of responses using TOON format for bandwidth optimization
 * Uses the official @toon-format/toon package
 */

import { encode } from '@toon-format/toon';
import type { IResponseSerializer, SerializedResponseDTO } from '../../domain/interfaces';

// TOON format types (compatible with official package)
export interface TOONSerializerOptions {
  delimiter?: ',' | '\t' | '|';
  lengthMarker?: false | '#';
  indent?: number;
}

const TOON_CONTENT_TYPE = 'application/toon';

/**
 * TOON Response Serializer
 * Strategy for handling TOON format responses (40-60% bandwidth reduction)
 * Uses content negotiation via Accept header
 *
 * Uses official @toon-format/toon package for serialization
 */
export class TOONSerializer implements IResponseSerializer {
  private readonly options: TOONSerializerOptions;

  constructor(options: TOONSerializerOptions = {}) {
    this.options = {
      delimiter: options.delimiter ?? ',',
      lengthMarker: options.lengthMarker ?? false,
      indent: options.indent ?? 2,
    };
  }

  /**
   * Check if this serializer can handle the result
   *
   * TOON serializer can handle any plain object/array
   * Actual decision is made by checking Accept header in serialize()
   *
   * @param result - Handler result
   * @returns True if result is serializable
   */
  canSerialize(result: any): boolean {
    // Guard clause: null/undefined
    if (result === null || result === undefined) {
      return false;
    }

    // Guard clause: must be serializable object or array
    if (typeof result !== 'object') {
      return false;
    }

    // Check if this is a special response object (redirect, file download, etc.)
    // Those should be handled by their specific serializers
    if ('statusCode' in result || 'headers' in result || 'data' in result) {
      return false;
    }

    // TOON can serialize any plain object/array
    return true;
  }

  /**
   * Serialize object to TOON HTTP response
   * Uses content negotiation: only serializes if Accept header requests TOON
   *
   * @param result - Object to serialize
   * @param statusCode - HTTP status code
   * @param request - HTTP Request (for Content Negotiation)
   * @returns HTTP Response with TOON, or null to pass to next serializer
   */
  serialize(result: any, statusCode: number, request: Request): SerializedResponseDTO | null {
    // Check Accept header for TOON content type
    const acceptHeader = request.headers.get('accept') || '';
    const wantsTOON = acceptHeader.includes(TOON_CONTENT_TYPE);

    if (!wantsTOON) {
      // Client doesn't want TOON - pass to next serializer (JSON)
      return null;
    }

    // Client wants TOON - serialize using official @toon-format/toon package
    try {
      const toonString = encode(result, this.options);

      return {
        body: toonString,
        statusCode,
        headers: { 'Content-Type': TOON_CONTENT_TYPE },
      };
    } catch (error) {
      // If TOON serialization fails, return null to fall back to JSON
      console.error('[TOONSerializer] Failed to encode:', error);
      return null;
    }
  }
}
