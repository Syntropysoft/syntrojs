/**
 * FileDownloadSerializer - File Download Response Serializer
 *
 * Application Layer Service (Strategy Pattern)
 * Handles serialization of file download responses
 */

import type { IResponseSerializer, SerializedResponseDTO } from '../../domain/interfaces';
import { isFileDownloadResponse } from '../../infrastructure/FileDownloadHelper';

/**
 * File Download Response Serializer
 * Strategy for handling file download responses
 */
export class FileDownloadSerializer implements IResponseSerializer {
  /**
   * Check if result is a file download response
   * Guard clause: Type checking
   *
   * @param result - Handler result
   * @returns True if file download response
   */
  canSerialize(result: any): boolean {
    return isFileDownloadResponse(result);
  }

  /**
   * Serialize file download to HTTP response
   * Pure transformation: result -> Response
   *
   * @param result - File download response
   * @param _statusCode - Ignored (uses result.statusCode)
   * @returns HTTP Response with file data
   */
  serialize(result: any, _statusCode: number, request: Request): SerializedResponseDTO {
    // Extract headers
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(result.headers)) {
      headers[key] = value as string;
    }

    // Return DTO with file data
    return {
      body: result.data,
      statusCode: result.statusCode,
      headers,
    };
  }
}
